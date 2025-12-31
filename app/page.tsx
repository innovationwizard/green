import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  // Get user role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const userDataTyped = userData as Pick<UserRow, 'role'> | null
  const role = userDataTyped?.role || 'installer'
  
  // Redirect based on role
  if (role === 'admin' || role === 'developer') {
    redirect('/admin')
  } else if (role === 'manager') {
    redirect('/manager')
  } else {
    redirect('/installer')
  }
}

