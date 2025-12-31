import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { Logo } from '@/components/shared/logo'
import Link from 'next/link'

type UserRow = Database['public']['Tables']['users']['Row']

export default async function ManagerLayout({
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
    .select('role, full_name')
    .eq('id', user.id)
    .single()
  
  const userDataTyped = userData as Pick<UserRow, 'role' | 'full_name'> | null
  if (userDataTyped?.role !== 'manager') {
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
            <Link href="/manager/dashboards" className="hover:text-primary">Dashboards</Link>
          </div>
        </div>
      </nav>
      <main className="p-4">{children}</main>
    </div>
  )
}

