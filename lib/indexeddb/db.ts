import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { Database } from '@/types/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface GreenDB extends DBSchema {
  projects: {
    key: string
    value: {
      id: string
      human_id: string
      client_id: string
      installation_address: string
      project_type: Database['public']['Enums']['project_type']
      size_kw: number | null
      price: number | null
      status: Database['public']['Enums']['project_status']
      cached_at: number
    }
    indexes: { 'by-human-id': string }
  }
  items: {
    key: string
    value: {
      id: string
      name: string
      sku: string | null
      unit: string
      category: string | null
      default_unit_cost: number | null
      active: boolean
      cached_at: number
    }
    indexes: { 'by-sku': string; 'by-name': string }
  }
  // @ts-expect-error - IndexedDB schema type checking is too strict for complex payload types
  outbox: {
    key: string
    value: {
      client_uuid: string
      event_type: Database['public']['Enums']['event_type']
      project_id: string | null
      payload: Record<string, unknown>
      device_id: string | null
      geolocation: { lat: number; lng: number } | null
      created_at: string
      synced: boolean
      sync_error?: string
    }
    indexes: { 'by-synced': boolean; 'by-created-at': number }
  }
  photos: {
    key: string // client_uuid of event
    value: {
      client_uuid: string
      files: File[]
    }
  }
}

const DB_NAME = 'green-app'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<GreenDB> | null = null

export async function getDB(): Promise<IDBPDatabase<GreenDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<GreenDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Projects store
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' })
        projectStore.createIndex('by-human-id', 'human_id', { unique: true })
      }

      // Items store
      if (!db.objectStoreNames.contains('items')) {
        const itemStore = db.createObjectStore('items', { keyPath: 'id' })
        itemStore.createIndex('by-sku', 'sku', { unique: true })
        itemStore.createIndex('by-name', 'name')
      }

      // Outbox store
      if (!db.objectStoreNames.contains('outbox')) {
        const outboxStore = db.createObjectStore('outbox', {
          keyPath: 'client_uuid',
          autoIncrement: true,
        })
        outboxStore.createIndex('by-synced', 'synced')
        outboxStore.createIndex('by-created-at', 'created_at')
      }

      // Photos store
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'client_uuid' })
      }
    },
  })

  return dbInstance
}

export async function clearDB() {
  const db = await getDB()
  await db.clear('projects')
  await db.clear('items')
  await db.clear('outbox')
  await db.clear('photos')
}

