import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']

interface MatchItemsRequest {
  line_items: Array<{
    article_number?: string
    description: string
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

    const body: MatchItemsRequest = await request.json()

    if (!body.line_items || body.line_items.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos un item' }, { status: 400 })
    }

    // Fetch all items with SAP article numbers
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Supabase type inference doesn't recognize sap_article_number field yet
    const { data: itemsData, error: itemsError } = await supabase
      .from('items')
      .select('id, name, sap_article_number, unit, default_unit_cost')
      .eq('active', true)

    if (itemsError) {
      console.error('Error fetching items:', itemsError)
      return NextResponse.json(
        { error: 'Error al obtener items del catálogo' },
        { status: 500 }
      )
    }

    // Type assertion for items with sap_article_number
    type ItemWithSAP = {
      id: string
      name: string
      sap_article_number: string | null
      unit: string
      default_unit_cost: number | null
    }
    const items = (itemsData || []) as ItemWithSAP[]

    // Match items by SAP article number first, then by description similarity
    const matches = body.line_items.map(lineItem => {
      let matchedItem: ItemWithSAP | null = null
      let matchMethod: 'sap_article' | 'description' | null = null

      if (!items || items.length === 0) {
        return {
          article_number: lineItem.article_number,
          description: lineItem.description,
          matched_item: null,
          match_method: null,
        }
      }

      // Try to match by SAP article number
      if (lineItem.article_number) {
        matchedItem = items.find(
          item => item.sap_article_number === lineItem.article_number
        ) || null
        if (matchedItem) {
          matchMethod = 'sap_article'
        }
      }

      // If no SAP match, try to match by description (simple contains check)
      if (!matchedItem && lineItem.description) {
        const descriptionUpper = lineItem.description.toUpperCase()
        matchedItem = items.find(item => {
          const itemNameUpper = item.name.toUpperCase()
          // Check if description contains item name or vice versa
          return descriptionUpper.includes(itemNameUpper) || itemNameUpper.includes(descriptionUpper)
        }) || null
        if (matchedItem) {
          matchMethod = 'description'
        }
      }

      return {
        article_number: lineItem.article_number,
        description: lineItem.description,
        matched_item: matchedItem ? {
          id: matchedItem.id,
          name: matchedItem.name,
          sap_article_number: matchedItem.sap_article_number,
          unit: matchedItem.unit,
          default_unit_cost: matchedItem.default_unit_cost,
        } : null,
        match_method: matchMethod,
      }
    })

    return NextResponse.json({
      success: true,
      matches,
    })
  } catch (error) {
    console.error('Error matching items:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar solicitud' },
      { status: 500 }
    )
  }
}

