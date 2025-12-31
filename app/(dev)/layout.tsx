import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { Logo } from '@/components/shared/logo'
import Link from 'next/link'

type UserRow = Database['public']['Tables']['users']['Row']

export default async function DevLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  const { data: userData } = await supabase
    .from('users')
    .select('role, full_name, must_change_password')
    .eq('id', user.id)
    .single()
  
  const userDataTyped = userData as Pick<UserRow, 'role' | 'full_name' | 'must_change_password'> | null
  
  // Check if password reset is required
  if (userDataTyped?.must_change_password) {
    redirect('/auth/reset-password')
  }
  
  // DEV layout is ONLY for developer role (superuser)
  // This is separate from admin (accounting/paperwork personnel)
  if (userDataTyped?.role !== 'developer') {
    redirect('/')
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <Logo showText={false} />
            <div className="text-sm text-muted-foreground">{userDataTyped?.full_name || user.email}</div>
          </div>
          <div className="flex gap-4 text-sm">
            <Link href="/dev" className="hover:text-primary font-medium">Developer Dashboard</Link>
          </div>
        </div>
      </nav>
      <main className="p-4">{children}</main>
    </div>
  )
}

