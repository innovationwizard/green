'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createEvent } from '@/lib/events/event-service'
import { checkDuplicateEvent } from '@/lib/duplicate-detection/detector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getCachedProjects, CachedProject } from '@/lib/indexeddb/projects'
import { searchItems, CachedItem } from '@/lib/indexeddb/items'
import { EventType, MaterialSource, PaymentMethod } from '@/types/database.types'

export default function NuevoEventoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [eventType, setEventType] = useState<EventType | ''>('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projects, setProjects] = useState<CachedProject[]>([])
  const [items, setItems] = useState<CachedItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    const cached = await getCachedProjects()
    if (cached.length > 0) {
      setProjects(cached)
    } else {
      // Fetch from server and cache
      const { data } = await supabase
        .from('projects')
        .select('id, human_id, client_id, installation_address, project_type, size_kw, price, status')
        .eq('status', 'IN_PROGRESS')
        .limit(100)
      
      if (data) {
        const formatted = data.map(p => ({
          ...p,
          cached_at: Date.now(),
        }))
        setProjects(formatted as CachedProject[])
        // Cache them
        const { cacheProjects } = await import('@/lib/indexeddb/projects')
        await cacheProjects(formatted as CachedProject[])
      }
    }
  }

  async function handleItemSearch(query: string) {
    if (query.length < 2) {
      setItems([])
      return
    }
    const results = await searchItems(query)
    setItems(results)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!eventType || !projectId) {
      alert('Completa todos los campos requeridos')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      
      switch (eventType) {
        case 'MATERIAL_ADDED': {
          const source = formData.get('source') as MaterialSource
          const itemLines = JSON.parse(formData.get('itemLines') as string || '[]')
          
          const payload: any = {
            source,
            items: itemLines,
          }
          
          if (source === 'purchase') {
            payload.vendor = formData.get('vendor') || ''
            payload.payment_method = formData.get('payment_method') as PaymentMethod || 'cash'
          } else if (source === 'warehouse') {
            payload.warehouse_id = formData.get('warehouse_id') || ''
            payload.issuer = formData.get('issuer') || ''
          } else if (source === 'borrowed') {
            payload.from_project_id = formData.get('from_project_id') || ''
          }
          
          await createEvent(eventType, projectId, payload)
          break
        }
        
        case 'EXPENSE_LOGGED': {
          await createEvent(eventType, projectId, {
            category: formData.get('category') as string || '',
            amount: parseFloat(formData.get('amount') as string || '0'),
            payment_method: formData.get('payment_method') as PaymentMethod || 'cash',
            vendor: formData.get('vendor') as string || undefined,
          })
          break
        }
        
        default:
          alert('Tipo de evento no implementado aún')
          return
      }
      
      alert('Evento creado exitosamente')
      router.push('/installer/eventos')
    } catch (error) {
      alert('Error al crear evento: ' + (error instanceof Error ? error.message : 'Desconocido'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Nuevo Evento</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Tipo de Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
              required
            >
              <option value="">Selecciona un tipo</option>
              <option value="MATERIAL_ADDED">Material Agregado</option>
              <option value="MATERIAL_RETURNED_WAREHOUSE">Material Devuelto a Almacén</option>
              <option value="MATERIAL_RETURNED_PROJECT">Material Devuelto a Proyecto</option>
              <option value="EXPENSE_LOGGED">Gasto Registrado</option>
              <option value="LABOR_LOGGED">Mano de Obra</option>
              <option value="SUBCONTRACTOR_COST">Subcontratista</option>
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={projectId || ''}
              onChange={(e) => setProjectId(e.target.value || null)}
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

        {eventType === 'MATERIAL_ADDED' && (
          <MaterialAddedForm onItemSearch={handleItemSearch} items={items} setItems={setItems} />
        )}

        {eventType === 'EXPENSE_LOGGED' && <ExpenseForm />}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Evento'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function MaterialAddedForm({ onItemSearch, items, setItems }: { onItemSearch: (q: string) => void; items: CachedItem[]; setItems: (items: CachedItem[]) => void }) {
  const [source, setSource] = useState<MaterialSource>('purchase')
  const [itemLines, setItemLines] = useState<Array<{ item_id: string; quantity: number; unit_cost: number }>>([])
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Origen del Material</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <select
            name="source"
            value={source}
            onChange={(e) => setSource(e.target.value as MaterialSource)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
            required
          >
            <option value="purchase">Compra</option>
            <option value="warehouse">Almacén</option>
            <option value="borrowed">Prestado de otro proyecto</option>
          </select>

          {source === 'purchase' && (
            <>
              <Input name="vendor" placeholder="Proveedor" required />
              <select
                name="payment_method"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                required
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="check">Cheque</option>
                <option value="credit_card">Tarjeta de Crédito</option>
                <option value="debit_card">Tarjeta de Débito</option>
              </select>
            </>
          )}

          {source === 'warehouse' && (
            <>
              <Input name="warehouse_id" placeholder="ID del Almacén" required />
              <Input name="issuer" placeholder="Quien entrega" required />
            </>
          )}

          {source === 'borrowed' && (
            <Input name="from_project_id" placeholder="ID del Proyecto Origen" required />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar item..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                onItemSearch(e.target.value)
              }}
            />
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              {items.slice(0, 10).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setItemLines([...itemLines, { item_id: item.id, quantity: 1, unit_cost: item.default_unit_cost || 0 }])
                    setSearchQuery('')
                    setItems([])
                  }}
                  className="w-full text-left p-2 border rounded hover:bg-gray-50"
                >
                  {item.name} ({item.unit}) - Q {item.default_unit_cost?.toFixed(2) || '0.00'}
                </button>
              ))}
            </div>
          )}

          {itemLines.length > 0 && (
            <div className="space-y-2">
              {itemLines.map((line, idx) => (
                <div key={idx} className="flex gap-2 items-center p-2 border rounded">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Cantidad"
                    value={line.quantity}
                    onChange={(e) => {
                      const newLines = [...itemLines]
                      newLines[idx].quantity = parseFloat(e.target.value) || 0
                      setItemLines(newLines)
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Costo unitario"
                    value={line.unit_cost}
                    onChange={(e) => {
                      const newLines = [...itemLines]
                      newLines[idx].unit_cost = parseFloat(e.target.value) || 0
                      setItemLines(newLines)
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setItemLines(itemLines.filter((_, i) => i !== idx))}
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          )}

          <input type="hidden" name="itemLines" value={JSON.stringify(itemLines)} />
        </CardContent>
      </Card>
    </>
  )
}

function ExpenseForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalles del Gasto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input name="category" placeholder="Categoría" required />
        <Input name="amount" type="number" step="0.01" placeholder="Monto" required />
        <select
          name="payment_method"
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
          required
        >
          <option value="cash">Efectivo</option>
          <option value="transfer">Transferencia</option>
          <option value="check">Cheque</option>
          <option value="credit_card">Tarjeta de Crédito</option>
          <option value="debit_card">Tarjeta de Débito</option>
        </select>
        <Input name="vendor" placeholder="Proveedor (opcional)" />
      </CardContent>
    </Card>
  )
}

