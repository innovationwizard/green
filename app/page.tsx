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
  
  // Industry best practice: DEV/superuser should ALWAYS land at admin interface
  // Never default to installer - if role is missing, it's an error condition
  const role = userDataTyped?.role
  
  if (!role) {
    // Role lookup failed - this is an error condition, not a default to installer
    console.error('User role not found for user:', user.id)
    redirect('/auth/login')
  }
  
  // Redirect based on role
  // DEV is a superuser with dedicated top-level route (separate from admin/accounting)
  if (role === 'developer') {
    redirect('/dev')
  } else if (role === 'admin') {
    redirect('/admin')
  } else if (role === 'manager') {
    redirect('/manager')
  } else if (role === 'installer') {
    redirect('/installer')
  } else {
    // Unknown role - redirect to login
    console.error('Unknown role:', role)
    redirect('/auth/login')
  }
}

