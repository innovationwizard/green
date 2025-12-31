import { getDB } from './db'

export interface CachedItem {
  id: string
  name: string
  sku: string | null
  unit: string
  category: string | null
  default_unit_cost: number | null
  active: boolean
  cached_at: number
}

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export async function cacheItems(items: CachedItem[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('items', 'readwrite')
  
  for (const item of items) {
    await tx.store.put({
      ...item,
      cached_at: Date.now(),
    })
  }
  
  await tx.done
}

export async function getCachedItems(): Promise<CachedItem[]> {
  const db = await getDB()
  const now = Date.now()
  const items: CachedItem[] = []
  
  const tx = db.transaction('items', 'readonly')
  const store = tx.store
  let cursor = await store.openCursor()
  
  while (cursor) {
    const item = cursor.value
    // Only return active, non-expired items
    if (item.active && now - item.cached_at < CACHE_TTL) {
      items.push(item)
    }
    cursor = await cursor.continue()
  }
  
  await tx.done
  return items
}

export async function searchItems(query: string): Promise<CachedItem[]> {
  const allItems = await getCachedItems()
  const lowerQuery = query.toLowerCase().trim()
  
  if (!lowerQuery) {
    return allItems.slice(0, 50) // Limit results
  }
  
  return allItems
    .filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(lowerQuery)
      const skuMatch = item.sku?.toLowerCase().includes(lowerQuery)
      return nameMatch || skuMatch
    })
    .slice(0, 50) // Limit results
}

export async function getItemById(id: string): Promise<CachedItem | null> {
  const db = await getDB()
  const tx = db.transaction('items', 'readonly')
  const item = await tx.store.get(id)
  await tx.done
  
  if (!item) return null
  
  // Check if expired
  const now = Date.now()
  if (now - item.cached_at >= CACHE_TTL) {
    return null
  }
  
  return item.active ? item : null
}

