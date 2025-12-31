import { getDB } from './db'
import { Database } from '@/types/database.types'

export interface CachedProject {
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

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export async function cacheProjects(projects: CachedProject[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('projects', 'readwrite')
  
  for (const project of projects) {
    await tx.store.put({
      ...project,
      cached_at: Date.now(),
    })
  }
  
  await tx.done
}

export async function getCachedProjects(): Promise<CachedProject[]> {
  const db = await getDB()
  const now = Date.now()
  const projects: CachedProject[] = []
  
  const tx = db.transaction('projects', 'readonly')
  const store = tx.store
  let cursor = await store.openCursor()
  
  while (cursor) {
    const project = cursor.value
    // Only return non-expired projects
    if (now - project.cached_at < CACHE_TTL) {
      projects.push(project)
    }
    cursor = await cursor.continue()
  }
  
  await tx.done
  return projects
}

export async function getProjectByHumanId(humanId: string): Promise<CachedProject | null> {
  const db = await getDB()
  const tx = db.transaction('projects', 'readonly')
  const index = tx.store.index('by-human-id')
  const project = await index.get(humanId)
  await tx.done
  
  if (!project) return null
  
  // Check if expired
  const now = Date.now()
  if (now - project.cached_at >= CACHE_TTL) {
    return null
  }
  
  return project
}

