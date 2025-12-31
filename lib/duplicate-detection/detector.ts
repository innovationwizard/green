import { createClient } from '@/lib/supabase/client'
import { PendingEvent } from '@/types/events.types'

export interface DuplicateCheckResult {
  isDuplicate: boolean
  similarEvents: Array<{
    id: string
    created_at: string
    payload: any
  }>
}

export async function checkDuplicateEvent(
  event: PendingEvent
): Promise<DuplicateCheckResult> {
  const supabase = createClient()

  if (!event.project_id) {
    return { isDuplicate: false, similarEvents: [] }
  }

  // Get today's date range (Guatemala timezone)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Find events from same project, same type, same day
  const { data: sameDayEvents, error } = await supabase
    .from('events')
    .select('id, created_at, payload, event_type')
    .eq('project_id', event.project_id)
    .eq('event_type', event.event_type)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .eq('hidden', false)

  if (error || !sameDayEvents || sameDayEvents.length === 0) {
    return { isDuplicate: false, similarEvents: [] }
  }

  // For material events, compare item lines
  if (event.event_type === 'MATERIAL_ADDED' && 'items' in event.payload) {
    const eventItems = (event.payload as any).items || []
    const eventItemsKey = eventItems
      .map((item: any) => `${item.item_id}:${item.quantity}`)
      .sort()
      .join('|')

    const similarEvents = sameDayEvents.filter((existingEvent) => {
      const existingPayload = existingEvent.payload as any
      if (!existingPayload.items) return false

      const existingItems = existingPayload.items || []
      const existingItemsKey = existingItems
        .map((item: any) => `${item.item_id}:${item.quantity}`)
        .sort()
        .join('|')

      return eventItemsKey === existingItemsKey
    })

    return {
      isDuplicate: similarEvents.length > 0,
      similarEvents: similarEvents.map((e) => ({
        id: e.id,
        created_at: e.created_at,
        payload: e.payload,
      })),
    }
  }

  // For other event types, compare payload structure
  const similarEvents = sameDayEvents.filter((existingEvent) => {
    return JSON.stringify(existingEvent.payload) === JSON.stringify(event.payload)
  })

  return {
    isDuplicate: similarEvents.length > 0,
    similarEvents: similarEvents.map((e) => ({
      id: e.id,
      created_at: e.created_at,
      payload: e.payload,
    })),
  }
}

export async function flagDuplicateEvents(): Promise<void> {
  const supabase = createClient()

  // Get all events from today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: todayEvents } = await supabase
    .from('events')
    .select('*')
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .eq('hidden', false)
    .eq('duplicate_flag', false)

  if (!todayEvents || todayEvents.length === 0) return

  // Group by project_id, event_type
  const groups = new Map<string, typeof todayEvents>()
  for (const event of todayEvents) {
    const key = `${event.project_id}:${event.event_type}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(event)
  }

  // Check each group for duplicates
  for (const [key, events] of groups) {
    if (events.length < 2) continue

    // For material events, compare item lines
    if (events[0].event_type === 'MATERIAL_ADDED') {
      const itemSignatures = events.map((e) => {
        const payload = e.payload as any
        const items = payload.items || []
        return items
          .map((item: any) => `${item.item_id}:${item.quantity}`)
          .sort()
          .join('|')
      })

      // Find duplicates
      const seen = new Set<string>()
      for (let i = 0; i < events.length; i++) {
        const signature = itemSignatures[i]
        if (seen.has(signature)) {
          // Flag as duplicate (keep first, flag rest)
          await supabase
            .from('events')
            .update({ duplicate_flag: true })
            .eq('id', events[i].id)
        } else {
          seen.add(signature)
        }
      }
    } else {
      // For other events, compare full payload
      const seen = new Set<string>()
      for (let i = 0; i < events.length; i++) {
        const payloadStr = JSON.stringify(events[i].payload)
        if (seen.has(payloadStr)) {
          await supabase
            .from('events')
            .update({ duplicate_flag: true })
            .eq('id', events[i].id)
        } else {
          seen.add(payloadStr)
        }
      }
    }
  }
}

