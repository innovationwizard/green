'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseCSVQuote, parseXLSXQuote, extractPDFQuote, ParsedQuote } from '@/lib/import/quote-parser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Database } from '@/types/database.types'

type QuoteInsert = Database['public']['Tables']['quotes']['Insert']
type QuoteRow = Database['public']['Tables']['quotes']['Row']

export default function ImportQuotePage() {
  const router = useRouter()
  const supabase = createClient()
  const [projectId, setProjectId] = useState<string>('')
  const [projects, setProjects] = useState<Array<{ id: string; human_id: string; installation_address: string }>>([])
  const [parsedQuote, setParsedQuote] = useState<ParsedQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, human_id, installation_address')
      .order('human_id')
      .limit(100)
    
    if (data) {
      setProjects(data)
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setError(null)
    setParsedQuote(null)

    try {
      const extension = selectedFile.name.split('.').pop()?.toLowerCase()
      let quote: ParsedQuote

      if (extension === 'csv') {
        quote = await parseCSVQuote(selectedFile)
      } else if (extension === 'xlsx' || extension === 'xls') {
        quote = await parseXLSXQuote(selectedFile)
      } else if (extension === 'pdf') {
        quote = await extractPDFQuote(selectedFile)
      } else {
        throw new Error('Formato no soportado. Use CSV, XLSX o PDF.')
      }

      setParsedQuote(quote)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar archivo')
    }
  }

  async function handleImport() {
    if (!parsedQuote) {
      setError('Procesa un archivo primero')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      let finalProjectId = projectId

      // If no project selected but we have client/address info, create project automatically
      if (!finalProjectId && parsedQuote.client_name && parsedQuote.installation_address) {
        // Find or create client
        let clientId: string
        
        // Check if client exists
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .ilike('name', parsedQuote.client_name)
          .limit(1)
          .single()

        if (existingClient) {
          clientId = existingClient.id
        } else {
          // Create new client
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Supabase type inference fails for insert operations
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              name: parsedQuote.client_name,
              created_by: user.id,
            })
            .select()
            .single()

          if (clientError || !newClient) {
            throw new Error(`Error al crear cliente: ${clientError?.message || 'Error desconocido'}`)
          }
          clientId = newClient.id
        }

        // Generate project human_id from client name
        const projectHumanId = parsedQuote.client_name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 20) || 'PROY-' + Date.now().toString().slice(-6)

        // Create new project
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Supabase type inference fails for insert operations
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            human_id: projectHumanId,
            client_id: clientId,
            installation_address: parsedQuote.installation_address,
            project_type: parsedQuote.project_type || 'residential',
            size_kw: parsedQuote.system_size_kw || null,
            price: parsedQuote.quoted_revenue || null,
            status: 'CREATED',
            created_by: user.id,
          })
          .select()
          .single()

        if (projectError || !newProject) {
          throw new Error(`Error al crear proyecto: ${projectError?.message || 'Error desconocido'}`)
        }
        finalProjectId = newProject.id
        setProjectId(finalProjectId)
      } else if (!finalProjectId) {
        throw new Error('Selecciona un proyecto o asegúrate de que el PDF contenga información del cliente y dirección de instalación')
      }

      // Create quote header
      const insertData: QuoteInsert = {
        project_id: finalProjectId,
        quoted_revenue: parsedQuote.quoted_revenue,
        quoted_materials: parsedQuote.quoted_materials,
        quoted_labor: parsedQuote.quoted_labor,
        quoted_subcontractors: parsedQuote.quoted_subcontractors,
        quoted_expenses: parsedQuote.quoted_expenses,
        system_size_kw: parsedQuote.system_size_kw,
        expected_duration_days: parsedQuote.expected_duration_days,
        created_by: user.id,
      }
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Supabase type inference fails for insert operations
        .insert(insertData)
        .select()
        .single()

      if (quoteError) throw quoteError
      if (!quote) throw new Error('Failed to create quote')

      const quoteTyped = quote as QuoteRow

      // Create quote line items
      if (parsedQuote.line_items.length > 0) {
        const lineItems = parsedQuote.line_items.map((item, idx) => ({
          quote_id: quoteTyped.id,
          quote_product_name: item.quote_product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          line_order: idx + 1,
        }))

        const { error: itemsError } = await supabase
          .from('quote_line_items')
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Supabase type inference fails for insert operations
          .insert(lineItems)

        if (itemsError) throw itemsError
      }

      alert('Cotización importada exitosamente')
      router.push(`/admin/projects/${finalProjectId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar cotización')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Importar Cotización</h1>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
            required
          >
            <option value="">Selecciona un proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.human_id} - {p.installation_address}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subir Archivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Archivo CSV, XLSX o PDF
            </label>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              onChange={handleFileSelect}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Formatos soportados: CSV, XLSX, PDF
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {error}
            </div>
          )}

          {parsedQuote && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <h3 className="font-semibold mb-2">Vista Previa de Cotización</h3>
                <div className="space-y-1 text-sm">
                  {(parsedQuote.client_name || parsedQuote.installation_address) && (
                    <div className="mb-3 p-2 bg-white rounded border">
                      <div className="font-medium text-xs text-gray-600 mb-1">Información del Proyecto:</div>
                      {parsedQuote.client_name && (
                        <div><strong>Cliente:</strong> {parsedQuote.client_name}</div>
                      )}
                      {parsedQuote.installation_address && (
                        <div><strong>Dirección:</strong> {parsedQuote.installation_address}</div>
                      )}
                      {parsedQuote.project_type && (
                        <div><strong>Tipo:</strong> {parsedQuote.project_type === 'residential' ? 'Residencial' : 'Comercial'}</div>
                      )}
                    </div>
                  )}
                  <div>Ingresos Totales: Q {parsedQuote.quoted_revenue.toFixed(2)}</div>
                  {parsedQuote.quoted_materials && (
                    <div>Materiales: Q {parsedQuote.quoted_materials.toFixed(2)}</div>
                  )}
                  {parsedQuote.quoted_labor && (
                    <div>Mano de Obra: Q {parsedQuote.quoted_labor.toFixed(2)}</div>
                  )}
                  {parsedQuote.system_size_kw && (
                    <div>Tamaño del Sistema: {parsedQuote.system_size_kw} kW</div>
                  )}
                  <div className="mt-2">
                    <strong>Items ({parsedQuote.line_items.length}):</strong>
                    <ul className="list-disc list-inside mt-1">
                      {parsedQuote.line_items.slice(0, 5).map((item, idx) => (
                        <li key={idx}>
                          {item.quote_product_name} - Q {item.total.toFixed(2)}
                        </li>
                      ))}
                      {parsedQuote.line_items.length > 5 && (
                        <li>... y {parsedQuote.line_items.length - 5} más</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {!projectId && parsedQuote.client_name && parsedQuote.installation_address && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm mb-2">
                  ℹ️ Se creará automáticamente un proyecto para: <strong>{parsedQuote.client_name}</strong> en <strong>{parsedQuote.installation_address}</strong>
                </div>
              )}
              {!projectId && (!parsedQuote.client_name || !parsedQuote.installation_address) && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm mb-2">
                  ⚠️ Selecciona un proyecto o asegúrate de que el PDF contenga información del cliente y dirección de instalación.
                </div>
              )}
              <Button
                onClick={handleImport}
                disabled={loading || !parsedQuote || (!projectId && (!parsedQuote.client_name || !parsedQuote.installation_address))}
                className="w-full"
              >
                {loading ? 'Importando...' : 'Importar Cotización'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

