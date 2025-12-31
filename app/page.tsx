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
  
  // Get user role and password reset requirement
  const { data: userData } = await supabase
    .from('users')
    .select('role, must_change_password')
    .eq('id', user.id)
    .single()

  const userDataTyped = userData as Pick<UserRow, 'role' | 'must_change_password'> | null
  
  // Check if password reset is required
  if (userDataTyped?.must_change_password) {
    redirect('/auth/reset-password')
  }
  
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

