import { getDB } from './db'
import { PendingEvent, EventPayload } from '@/types/events.types'
import { EventType } from '@/types/database.types'

export async function addToOutbox(event: PendingEvent): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('outbox', 'readwrite')
  
  // Store photos separately if they exist
  if (event.photos && event.photos.length > 0) {
    const photoTx = db.transaction('photos', 'readwrite')
    await photoTx.store.put({
      client_uuid: event.client_uuid,
      files: event.photos,
    })
    await photoTx.done
  }
  
  // Store event without photos (photos stored separately)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { photos: _photos, ...eventWithoutPhotos } = event
  await tx.store.put({
    ...eventWithoutPhotos,
    payload: eventWithoutPhotos.payload as unknown as Record<string, unknown>,
    synced: false,
  })
  
  await tx.done
}

export async function getOutboxEvents(): Promise<PendingEvent[]> {
  const db = await getDB()
  const tx = db.transaction('outbox', 'readonly')
  const index = tx.store.index('by-synced')
  const unsynced = await index.getAll(false)
  await tx.done
  
  // Load photos for each event
  const eventsWithPhotos: PendingEvent[] = []
  for (const event of unsynced) {
    const photoTx = db.transaction('photos', 'readonly')
    const photoData = await photoTx.store.get(event.client_uuid)
    await photoTx.done
    
    eventsWithPhotos.push({
      ...event,
      payload: event.payload as unknown as EventPayload<EventType>,
      photos: photoData?.files,
    })
  }
  
  return eventsWithPhotos.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

export async function markEventSynced(clientUuid: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('outbox', 'readwrite')
  const event = await tx.store.get(clientUuid)
  
  if (event) {
    await tx.store.put({
      ...event,
      synced: true,
    })
  }
  
  await tx.done
  
  // Clean up photos after successful sync
  const photoTx = db.transaction('photos', 'readwrite')
  await photoTx.store.delete(clientUuid)
  await photoTx.done
}

export async function markEventSyncError(clientUuid: string, error: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('outbox', 'readwrite')
  const event = await tx.store.get(clientUuid)
  
  if (event) {
    await tx.store.put({
      ...event,
      sync_error: error,
    })
  }
  
  await tx.done
}

export async function removeFromOutbox(clientUuid: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('outbox', 'readwrite')
  await tx.store.delete(clientUuid)
  await tx.done
  
  // Clean up photos
  const photoTx = db.transaction('photos', 'readwrite')
  await photoTx.store.delete(clientUuid)
  await photoTx.done
}

export async function getSyncStatus(): Promise<{
  pending: number
  lastSyncTime: Date | null
  errors: number
}> {
  const db = await getDB()
  const tx = db.transaction('outbox', 'readonly')
  const index = tx.store.index('by-synced')
  const unsynced = await index.getAll(false)
  const synced = await index.getAll(true)
  
  await tx.done
  
  const errors = unsynced.filter((e) => e.sync_error).length
  const lastSynced = synced.length > 0
    ? synced.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
    : null
  
  return {
    pending: unsynced.length,
    lastSyncTime: lastSynced ? new Date(lastSynced.created_at) : null,
    errors,
  }
}

