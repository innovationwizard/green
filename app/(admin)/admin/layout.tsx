import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
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
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (userData?.role !== 'admin' && userData?.role !== 'developer') {
    redirect('/')
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="font-semibold">GREEN APP - Administración</div>
          <a href="/admin/dashboards" className="text-sm text-primary">Dashboards</a>
        </div>
      </nav>
      <main className="p-4">{children}</main>
    </div>
  )
}

