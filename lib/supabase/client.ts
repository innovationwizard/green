import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // During build, env vars might not be available - return a mock client
  // This prevents build errors while still allowing runtime functionality
  if (!url || !key) {
    // Return a client that will fail gracefully at runtime
    // This is only for build-time, runtime will have proper env vars
    return createBrowserClient<Database>(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-key'
    )
  }
  
  return createBrowserClient<Database>(url, key)
}

