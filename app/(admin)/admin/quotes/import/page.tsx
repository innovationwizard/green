'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseCSVQuote, parseXLSXQuote, ParsedQuote } from '@/lib/import/quote-parser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ImportQuotePage() {
  const router = useRouter()
  const supabase = createClient()
  const [projectId, setProjectId] = useState<string>('')
  const [projects, setProjects] = useState<any[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [parsedQuote, setParsedQuote] = useState<ParsedQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
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

    setFile(selectedFile)
    setError(null)
    setParsedQuote(null)

    try {
      const extension = selectedFile.name.split('.').pop()?.toLowerCase()
      let quote: ParsedQuote

      if (extension === 'csv') {
        quote = await parseCSVQuote(selectedFile)
      } else if (extension === 'xlsx' || extension === 'xls') {
        quote = await parseXLSXQuote(selectedFile)
      } else {
        throw new Error('Formato no soportado. Use CSV o XLSX.')
      }

      setParsedQuote(quote)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar archivo')
    }
  }

  async function handleImport() {
    if (!projectId || !parsedQuote) {
      setError('Selecciona un proyecto y procesa un archivo primero')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // Create quote header
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          project_id: projectId,
          quoted_revenue: parsedQuote.quoted_revenue,
          quoted_materials: parsedQuote.quoted_materials,
          quoted_labor: parsedQuote.quoted_labor,
          quoted_subcontractors: parsedQuote.quoted_subcontractors,
          quoted_expenses: parsedQuote.quoted_expenses,
          system_size_kw: parsedQuote.system_size_kw,
          expected_duration_days: parsedQuote.expected_duration_days,
          created_by: user.id,
        })
        .select()
        .single()

      if (quoteError) throw quoteError

      // Create quote line items
      if (parsedQuote.line_items.length > 0) {
        const lineItems = parsedQuote.line_items.map((item, idx) => ({
          quote_id: quote.id,
          quote_product_name: item.quote_product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          line_order: idx + 1,
        }))

        const { error: itemsError } = await supabase
          .from('quote_line_items')
          .insert(lineItems)

        if (itemsError) throw itemsError
      }

      alert('Cotización importada exitosamente')
      router.push(`/admin/projects/${projectId}`)
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
              Archivo CSV o XLSX
            </label>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Formatos soportados: CSV, XLSX
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

              <Button
                onClick={handleImport}
                disabled={loading || !projectId}
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

