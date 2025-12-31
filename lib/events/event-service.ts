import { addToOutbox } from '@/lib/indexeddb/outbox'
import { PendingEvent, EventPayload, EventType } from '@/types/events.types'
import { generateUUID } from '@/lib/utils/uuid'
import { getDeviceId } from '@/lib/utils/device-id'

export async function createEvent<T extends EventType>(
  eventType: T,
  projectId: string | null,
  payload: EventPayload<T>,
  photos?: File[]
): Promise<string> {
  const clientUuid = generateUUID()
  const deviceId = getDeviceId()
  
  // Get geolocation if available (best-effort, non-blocking)
  let geolocation: { lat: number; lng: number } | null = null
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 3000,
          maximumAge: 60000,
        })
      })
      geolocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }
    } catch {
      // Ignore geolocation errors
    }
  }
  
  const event: PendingEvent = {
    client_uuid: clientUuid,
    event_type: eventType,
    project_id: projectId,
    payload,
    device_id: deviceId,
    geolocation,
    photos,
    created_at: new Date().toISOString(),
    synced: false,
  }
  
  await addToOutbox(event)
  return clientUuid
}

export async function reverseEvent(
  originalEventId: string,
  reason: string,
  _userId: string
): Promise<string> {
  // This will be called from the server-side API route
  // For now, we'll create the reversing event in the outbox
  const clientUuid = generateUUID()
  const deviceId = getDeviceId()
  
  const event: PendingEvent = {
    client_uuid: clientUuid,
    event_type: 'EVENT_REVERSED',
    project_id: null, // Will be set from original event
    payload: {
      original_event_id: originalEventId,
      reason,
    },
    device_id: deviceId,
    geolocation: null,
    created_at: new Date().toISOString(),
    synced: false,
  }
  
  await addToOutbox(event)
  return clientUuid
}

