'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, CheckCircle2, XCircle } from 'lucide-react'
import { ParsedSalesOrder } from '@/app/api/sales-orders/extract-pdf/route'

type SalespersonRow = Database['public']['Tables']['salespeople']['Row']

interface SalesOrderWithItems {
  id: string
  project_id: string
  po_number: string
  vendor: string | null
  issue_date: string
  delivery_date: string | null
  salesperson_id: string | null
  subtotal: number | null
  tax: number | null
  total: number
  source: string
  created_at: string
  sales_order_items: Array<{
    id: string
    line_number: number
    article_number: string | null
    item_id: string | null
    description: string
    unit: string
    quantity: number
    unit_price: number
    line_total: number
    item?: {
      id: string
      name: string
      sap_article_number: string | null
    } | null
  }>
  salesperson?: {
    id: string
    name: string
  } | null
}

export default function SalesOrdersPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  const supabase = createClient()
  
  const [salesOrders, setSalesOrders] = useState<SalesOrderWithItems[]>([])
  const [salespeople, setSalespeople] = useState<SalespersonRow[]>([])
  const [parsedSO, setParsedSO] = useState<ParsedSalesOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showImportForm, setShowImportForm] = useState(false)
  const [matchingItems, setMatchingItems] = useState<Record<number, string | null>>({})
  // Editable fields for missing values
  const [editablePO, setEditablePO] = useState<{
    po_number: string
    issue_date: string
    total: number
  } | null>(null)

  useEffect(() => {
    loadSalesOrders()
    loadSalespeople()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function loadSalesOrders() {
    setLoading(true)
    try {
      const response = await fetch(`/api/sales-orders/list?project_id=${projectId}`)
      const result = await response.json()
      
      if (result.success) {
        setSalesOrders(result.sales_orders || [])
      } else {
        setError(result.error || 'Error al cargar órdenes de venta')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar órdenes de venta')
    } finally {
      setLoading(false)
    }
  }

  async function loadSalespeople() {
    const { data } = await supabase
      .from('salespeople')
      .select('*')
      .eq('active', true)
      .order('name')
    
    if (data) {
      setSalespeople(data)
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setError(null)
    setParsedSO(null)
    setMatchingItems({})
    setEditablePO(null)

    if (selectedFile.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/sales-orders/extract-pdf', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        const so = result.sales_order
        setParsedSO(so)
        
        // Check for missing required fields and prepare editable form
        const needsInput = !so.po_number || !so.issue_date || !so.total || so.total === 0
        if (needsInput) {
          setEditablePO({
            po_number: so.po_number || '',
            issue_date: so.issue_date || new Date().toISOString().split('T')[0],
            total: so.total || 0,
          })
        } else {
          setEditablePO(null)
        }
        
        // Auto-match items
        await matchItems(so.line_items)
      } else {
        setError(result.error || 'Error al procesar PDF')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar PDF')
    } finally {
      setLoading(false)
    }
  }

  async function matchItems(lineItems: ParsedSalesOrder['line_items']) {
    try {
      const response = await fetch('/api/sales-orders/match-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_items: lineItems }),
      })

      const result = await response.json()

      if (result.success) {
        const matches: Record<number, string | null> = {}
        result.matches.forEach((match: { matched_item: { id: string } | null }, index: number) => {
          if (match.matched_item) {
            matches[index] = match.matched_item.id
          }
        })
        setMatchingItems(matches)
      }
    } catch (err) {
      console.error('Error matching items:', err)
    }
  }

  async function handleImport() {
    if (!parsedPO) {
      setError('Procesa un archivo primero')
      return
    }

    // Validate required fields - use editable values if available, otherwise use parsed values
    const finalPONumber = editablePO?.po_number || parsedPO.po_number
    const finalIssueDate = editablePO?.issue_date || parsedPO.issue_date
    const finalTotal = editablePO?.total || parsedPO.total

    if (!finalPONumber || !finalIssueDate || !finalTotal || finalTotal === 0) {
      setError('Por favor completa los campos requeridos: Número de PO, Fecha de Emisión, y Total')
      return
    }

    if (!projectId) {
      setError('No se pudo identificar el proyecto')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // Find salesperson by name if provided
      let salespersonId: string | undefined
      if (parsedPO.salesperson_name) {
        const salesperson = salespeople.find(
          sp => sp.name.toLowerCase().includes(parsedPO.salesperson_name!.toLowerCase()) ||
                parsedPO.salesperson_name!.toLowerCase().includes(sp.name.toLowerCase())
        )
        if (salesperson) {
          salespersonId = salesperson.id
        }
      }

      const response = await fetch('/api/sales-orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          po_number: finalPONumber,
          vendor: parsedSO.vendor,
          issue_date: finalIssueDate,
          delivery_date: parsedSO.delivery_date,
          salesperson_id: salespersonId,
          subtotal: parsedSO.subtotal,
          tax: parsedSO.tax,
          total: finalTotal,
          source: 'pdf_import',
          line_items: parsedSO.line_items.map((item, index) => ({
            ...item,
            item_id: matchingItems[index] || null,
          })),
        }),
      })

      const result = await response.json()

      if (result.success) {
        setParsedSO(null)
        setMatchingItems({})
        setEditablePO(null)
        setShowImportForm(false)
        await loadSalesOrders()
      } else {
        setError(result.error || 'Error al importar orden de venta')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar orden de venta')
    } finally {
      setLoading(false)
    }
  }

  if (loading && salesOrders.length === 0) {
    return <div className="p-4">Cargando órdenes de venta...</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold">Órdenes de Venta</h1>
        </div>
        <Button onClick={() => setShowImportForm(!showImportForm)}>
          <Plus className="w-4 h-4 mr-2" />
          {showImportForm ? 'Cancelar' : 'Importar PO'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showImportForm && (
        <Card>
          <CardHeader>
            <CardTitle>Importar Orden de Venta desde PDF</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Seleccionar archivo PDF
              </label>
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                disabled={loading}
              />
            </div>

            {parsedSO && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">
                      Número de PO {!parsedSO.po_number && <span className="text-red-500">*</span>}
                    </label>
                    {editablePO ? (
                      <Input
                        type="text"
                        value={editablePO.po_number}
                        onChange={(e) => setEditablePO({ ...editablePO, po_number: e.target.value })}
                        placeholder="Ej: 2657"
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-lg font-semibold">{parsedSO.po_number}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Total {(!parsedSO.total || parsedSO.total === 0) && <span className="text-red-500">*</span>}
                    </label>
                    {editablePO ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editablePO.total || ''}
                        onChange={(e) => setEditablePO({ ...editablePO, total: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-lg font-semibold">
                        Q {parsedSO.total.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                  {parsedSO.vendor && (
                    <div>
                      <label className="text-sm font-medium">Proveedor</label>
                      <p>{parsedSO.vendor}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">
                      Fecha de Emisión {!parsedSO.issue_date && <span className="text-red-500">*</span>}
                    </label>
                    {editablePO ? (
                      <Input
                        type="date"
                        value={editablePO.issue_date}
                        onChange={(e) => setEditablePO({ ...editablePO, issue_date: e.target.value })}
                        className="mt-1"
                      />
                    ) : (
                      <p>{parsedSO.issue_date ? new Date(parsedSO.issue_date).toLocaleDateString('es-GT') : 'No encontrada'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Items ({parsedSO.line_items.length})</label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">#</th>
                          <th className="px-4 py-2 text-left">Artículo</th>
                          <th className="px-4 py-2 text-left">Descripción</th>
                          <th className="px-4 py-2 text-right">Cantidad</th>
                          <th className="px-4 py-2 text-right">Precio Unit.</th>
                          <th className="px-4 py-2 text-right">Total</th>
                          <th className="px-4 py-2 text-center">Match</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedSO.line_items.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{item.line_number}</td>
                            <td className="px-4 py-2 font-mono text-xs">
                              {item.article_number || '-'}
                            </td>
                            <td className="px-4 py-2">{item.description}</td>
                            <td className="px-4 py-2 text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-right">
                              Q {item.unit_price.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2 text-right font-semibold">
                              Q {item.line_total.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {matchingItems[index] ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                              ) : (
                                <XCircle className="w-5 h-5 text-gray-400 mx-auto" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Button onClick={handleImport} disabled={loading} className="w-full">
                  {loading ? 'Importando...' : 'Importar Orden de Venta'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {salesOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay órdenes de venta para este proyecto
            </CardContent>
          </Card>
        ) : (
          salesOrders.map((so) => (
            <Card key={so.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>PO #{so.po_number}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(so.issue_date).toLocaleDateString('es-GT', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      Q {so.total.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {so.subtotal && so.tax && (
                      <p className="text-sm text-muted-foreground">
                        Subtotal: Q {so.subtotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        {' | '}
                        Impuesto: Q {so.tax.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {so.vendor && (
                  <p className="text-sm mb-2">
                    <span className="font-medium">Proveedor:</span> {so.vendor}
                  </p>
                )}
                {so.salesperson && (
                  <p className="text-sm mb-2">
                    <span className="font-medium">Vendedor:</span> {so.salesperson.name}
                  </p>
                )}
                {so.delivery_date && (
                  <p className="text-sm mb-4">
                    <span className="font-medium">Fecha de Entrega:</span>{' '}
                    {new Date(so.delivery_date).toLocaleDateString('es-GT')}
                  </p>
                )}
                <div className="border rounded-lg overflow-hidden mt-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">#</th>
                        <th className="px-4 py-2 text-left">Artículo</th>
                        <th className="px-4 py-2 text-left">Descripción</th>
                        <th className="px-4 py-2 text-right">Cantidad</th>
                        <th className="px-4 py-2 text-right">Precio Unit.</th>
                        <th className="px-4 py-2 text-right">Total</th>
                        <th className="px-4 py-2 text-center">Item Catálogo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {so.sales_order_items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-4 py-2">{item.line_number}</td>
                          <td className="px-4 py-2 font-mono text-xs">
                            {item.article_number || '-'}
                          </td>
                          <td className="px-4 py-2">{item.description}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">
                            Q {item.unit_price.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            Q {item.line_total.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {item.item ? (
                              <div className="flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="text-xs">{item.item.name}</span>
                              </div>
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

