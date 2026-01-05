import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Check if user is admin, developer, or manager
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: Pick<UserRow, 'role'> | null }

    if (!userData || 
        (userData.role !== 'admin' && userData.role !== 'developer' && userData.role !== 'manager')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    // Build query
    // Type assertion needed because Supabase client types haven't been regenerated with purchase_orders table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('purchase_orders')
      .select(`
        *,
        purchase_order_items (
          *,
          item:items (
            id,
            name,
            sap_article_number
          )
        ),
        salesperson:salespeople (
          id,
          name
        )
      `)
      .order('issue_date', { ascending: false })
      .order('created_at', { ascending: false })

    // Filter by project if provided
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: purchaseOrders, error } = await query

    if (error) {
      console.error('Error fetching purchase orders:', error)
      return NextResponse.json(
        { error: error.message || 'Error al obtener órdenes de compra' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      purchase_orders: purchaseOrders || [],
    })
  } catch (error) {
    console.error('Error listing purchase orders:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar solicitud' },
      { status: 500 }
    )
  }
}

