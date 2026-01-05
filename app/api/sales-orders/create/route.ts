import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']

interface CreateSalesOrderRequest {
  project_id: string
  po_number: string
  vendor?: string
  issue_date: string // ISO date string
  delivery_date?: string // ISO date string
  salesperson_id?: string
  subtotal?: number
  tax?: number
  total: number
  source?: 'manual' | 'pdf_import' | 'sap_import'
  line_items: Array<{
    line_number: number
    article_number?: string
    item_id?: string // Matched catalog item ID
    description: string
    unit: string
    quantity: number
    unit_price: number
    line_total: number
  }>
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Check if user is admin or developer
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: Pick<UserRow, 'role'> | null }

    if (!userData || (userData.role !== 'admin' && userData.role !== 'developer')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body: CreateSalesOrderRequest = await request.json()

    // Validate required fields
    if (!body.project_id || !body.po_number || !body.issue_date || !body.total) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: project_id, po_number, issue_date, total' },
        { status: 400 }
      )
    }

    if (!body.line_items || body.line_items.length === 0) {
      return NextResponse.json(
        { error: 'Debe incluir al menos un item en la orden de venta' },
        { status: 400 }
      )
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', body.project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Create sales order header
    // Type assertion needed because Supabase client types haven't been regenerated with sales_orders table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const soResult = await (supabase
      .from('sales_orders') as any)
      .insert({
        project_id: body.project_id,
        po_number: body.po_number,
        vendor: body.vendor || null,
        issue_date: body.issue_date,
        delivery_date: body.delivery_date || null,
        salesperson_id: body.salesperson_id || null,
        subtotal: body.subtotal || null,
        tax: body.tax || null,
        total: body.total,
        source: body.source || 'manual',
        created_by: user.id,
      })
      .select()
      .single() as any
    
    const salesOrder = soResult?.data as Database['public']['Tables']['sales_orders']['Row'] | null
    const soError = soResult?.error as { message: string } | null

    if (soError || !salesOrder) {
      console.error('Error creating sales order:', soError)
      return NextResponse.json(
        { error: soError?.message || 'Error al crear orden de venta' },
        { status: 500 }
      )
    }

    // Create sales order items
    const itemsToInsert = body.line_items.map(item => ({
      sales_order_id: salesOrder.id,
      line_number: item.line_number,
      article_number: item.article_number || null,
      item_id: item.item_id || null,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
    }))

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Supabase type inference doesn't recognize sales_order_items table yet
    // Type assertion needed because Supabase client types haven't been regenerated with sales_order_items table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemsError } = await (supabase
      .from('sales_order_items') as any)
      .insert(itemsToInsert) as any

    if (itemsError) {
      console.error('Error creating sales order items:', itemsError)
      // Rollback: delete the sales order if items insertion fails
      await supabase.from('sales_orders').delete().eq('id', salesOrder.id)
      return NextResponse.json(
        { error: itemsError.message || 'Error al crear items de orden de venta' },
        { status: 500 }
      )
    }

    // Fetch the complete sales order with items
    const { data: completeSO, error: fetchError } = await supabase
      .from('sales_orders')
      .select(`
        *,
        sales_order_items (*)
      `)
      .eq('id', salesOrder.id)
      .single()

    if (fetchError) {
      console.error('Error fetching complete sales order:', fetchError)
    }

    return NextResponse.json({
      success: true,
      sales_order: completeSO || salesOrder,
    })
  } catch (error) {
    console.error('Error creating sales order:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar solicitud' },
      { status: 500 }
    )
  }
}

