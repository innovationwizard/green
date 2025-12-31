import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type EventRow = Database['public']['Tables']['events']['Row']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { originalEventId, reason } = await request.json()

    if (!originalEventId || !reason) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // Get original event
    const { data: originalEvent, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', originalEventId)
      .single()

    if (fetchError || !originalEvent) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    const originalEventTyped = originalEvent as EventRow

    // Check permissions
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const userDataTyped = userData as { role: string } | null
    const role = userDataTyped?.role || 'installer'

    // Installers can only reverse their own events
    if (role === 'installer' && originalEventTyped.created_by !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Create reversing event
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Supabase type inference fails for insert operations
    const { error: insertError } = await supabase.from('events').insert({
      client_uuid: crypto.randomUUID(),
      event_type: 'EVENT_REVERSED',
      project_id: originalEventTyped.project_id,
      payload: {
        original_event_id: originalEventId,
        reason,
      },
      created_by: user.id,
      device_id: 'server',
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // If admin, mark original as hidden
    if (role === 'admin' || role === 'developer') {
      await supabase
        .from('events')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Supabase type inference fails for update operations
        .update({ hidden: true })
        .eq('id', originalEventId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

