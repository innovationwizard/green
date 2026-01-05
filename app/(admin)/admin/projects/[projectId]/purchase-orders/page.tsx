'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, CheckCircle2, XCircle } from 'lucide-react'
import { ParsedPurchaseOrder } from '@/app/api/purchase-orders/extract-pdf/route'

type SalespersonRow = Database['public']['Tables']['salespeople']['Row']

interface PurchaseOrderWithItems {
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
  purchase_order_items: Array<{
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

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  const supabase = createClient()
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithItems[]>([])
  const [salespeople, setSalespeople] = useState<SalespersonRow[]>([])
  const [parsedPO, setParsedPO] = useState<ParsedPurchaseOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showImportForm, setShowImportForm] = useState(false)
  const [matchingItems, setMatchingItems] = useState<Record<number, string | null>>({})

  useEffect(() => {
    loadPurchaseOrders()
    loadSalespeople()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function loadPurchaseOrders() {
    setLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/list?project_id=${projectId}`)
      const result = await response.json()
      
      if (result.success) {
        setPurchaseOrders(result.purchase_orders || [])
      } else {
        setError(result.error || 'Error al cargar órdenes de compra')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar órdenes de compra')
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
    setParsedPO(null)
    setMatchingItems({})

    if (selectedFile.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/purchase-orders/extract-pdf', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setParsedPO(result.purchase_order)
        // Auto-match items
        await matchItems(result.purchase_order.line_items)
      } else {
        setError(result.error || 'Error al procesar PDF')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar PDF')
    } finally {
      setLoading(false)
    }
  }

  async function matchItems(lineItems: ParsedPurchaseOrder['line_items']) {
    try {
      const response = await fetch('/api/purchase-orders/match-items', {
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

      const response = await fetch('/api/purchase-orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          po_number: parsedPO.po_number,
          vendor: parsedPO.vendor,
          issue_date: parsedPO.issue_date,
          delivery_date: parsedPO.delivery_date,
          salesperson_id: salespersonId,
          subtotal: parsedPO.subtotal,
          tax: parsedPO.tax,
          total: parsedPO.total,
          source: 'pdf_import',
          line_items: parsedPO.line_items.map((item, index) => ({
            ...item,
            item_id: matchingItems[index] || null,
          })),
        }),
      })

      const result = await response.json()

      if (result.success) {
        setParsedPO(null)
        setMatchingItems({})
        setShowImportForm(false)
        await loadPurchaseOrders()
      } else {
        setError(result.error || 'Error al importar orden de compra')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar orden de compra')
    } finally {
      setLoading(false)
    }
  }

  if (loading && purchaseOrders.length === 0) {
    return <div className="p-4">Cargando órdenes de compra...</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold">Órdenes de Compra</h1>
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
            <CardTitle>Importar Orden de Compra desde PDF</CardTitle>
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

            {parsedPO && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Número de PO</label>
                    <p className="text-lg font-semibold">{parsedPO.po_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Total</label>
                    <p className="text-lg font-semibold">
                      Q {parsedPO.total.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  {parsedPO.vendor && (
                    <div>
                      <label className="text-sm font-medium">Proveedor</label>
                      <p>{parsedPO.vendor}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Fecha de Emisión</label>
                    <p>{new Date(parsedPO.issue_date).toLocaleDateString('es-GT')}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Items ({parsedPO.line_items.length})</label>
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
                        {parsedPO.line_items.map((item, index) => (
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
                  {loading ? 'Importando...' : 'Importar Orden de Compra'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {purchaseOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay órdenes de compra para este proyecto
            </CardContent>
          </Card>
        ) : (
          purchaseOrders.map((po) => (
            <Card key={po.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>PO #{po.po_number}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(po.issue_date).toLocaleDateString('es-GT', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      Q {po.total.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {po.subtotal && po.tax && (
                      <p className="text-sm text-muted-foreground">
                        Subtotal: Q {po.subtotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        {' | '}
                        Impuesto: Q {po.tax.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {po.vendor && (
                  <p className="text-sm mb-2">
                    <span className="font-medium">Proveedor:</span> {po.vendor}
                  </p>
                )}
                {po.salesperson && (
                  <p className="text-sm mb-2">
                    <span className="font-medium">Vendedor:</span> {po.salesperson.name}
                  </p>
                )}
                {po.delivery_date && (
                  <p className="text-sm mb-4">
                    <span className="font-medium">Fecha de Entrega:</span>{' '}
                    {new Date(po.delivery_date).toLocaleDateString('es-GT')}
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
                      {po.purchase_order_items.map((item) => (
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

