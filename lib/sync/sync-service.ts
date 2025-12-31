import { createClient } from '@/lib/supabase/client'
import { getOutboxEvents, markEventSynced, markEventSyncError, removeFromOutbox } from '@/lib/indexeddb/outbox'
import { PendingEvent } from '@/types/events.types'
import { getDeviceId } from '@/lib/utils/device-id'

export interface SyncResult {
  success: boolean
  synced: number
  errors: number
  errorMessages: string[]
}

export async function syncOutbox(userId: string): Promise<SyncResult> {
  const supabase = createClient()
  const events = await getOutboxEvents()
  const deviceId = getDeviceId()
  
  const result: SyncResult = {
    success: true,
    synced: 0,
    errors: 0,
    errorMessages: [],
  }
  
  for (const event of events) {
    try {
      // Upload photos first if they exist
      const photoUrls: string[] = []
      if (event.photos && event.photos.length > 0) {
        for (const photo of event.photos) {
          const photoPath = `events/${event.client_uuid}/${Date.now()}_${photo.name}`
          const { error: uploadError } = await supabase.storage
            .from('event-photos')
            .upload(photoPath, photo)
          
          if (uploadError) {
            throw new Error(`Photo upload failed: ${uploadError.message}`)
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('event-photos')
            .getPublicUrl(photoPath)
          
          photoUrls.push(publicUrl)
        }
      }
      
      // Update payload with photo URLs if needed
      let payload = event.payload
      if (photoUrls.length > 0 && 'receipt_photo_url' in payload) {
        payload = {
          ...payload,
          receipt_photo_url: photoUrls[0],
        } as typeof payload
      }
      
      // Insert event
      const { error } = await supabase.from('events').insert({
        client_uuid: event.client_uuid,
        event_type: event.event_type,
        project_id: event.project_id,
        payload,
        created_by: userId,
        device_id: deviceId,
        geolocation: event.geolocation,
      })
      
      if (error) {
        // Check for duplicate (client_uuid unique constraint)
        if (error.code === '23505') {
          // Duplicate detected, remove from outbox
          await removeFromOutbox(event.client_uuid)
          result.synced++
          continue
        }
        
        throw error
      }
      
      await markEventSynced(event.client_uuid)
      result.synced++
    } catch (error) {
      result.success = false
      result.errors++
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      result.errorMessages.push(`${event.client_uuid}: ${errorMessage}`)
      await markEventSyncError(event.client_uuid, errorMessage)
    }
  }
  
  return result
}

export async function checkDuplicateEvent(
  projectId: string | null,
  eventType: PendingEvent['event_type'],
  payload: PendingEvent['payload']
): Promise<boolean> {
  const supabase = createClient()
  
  // Check for same-day duplicate based on event type and payload
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const { data, error } = await supabase
    .from('events')
    .select('id')
    .eq('project_id', projectId)
    .eq('event_type', eventType)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .eq('hidden', false)
  
  if (error || !data) {
    return false
  }
  
  // For material events, check if item lines match
  if (eventType === 'MATERIAL_ADDED' && 'items' in payload) {
    const materialEvents = data
    // This would require fetching and comparing payloads
    // For now, we'll flag potential duplicates in the UI
    return materialEvents.length > 0
  }
  
  return false
}

