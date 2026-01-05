import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Database } from '@/types/database.types'
import { Logo } from '@/components/shared/logo'

type UserRow = Database['public']['Tables']['users']['Row']

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
    .select('role, must_change_password')
    .eq('id', user.id)
    .single()
  
  const userDataTyped = userData as Pick<UserRow, 'role' | 'must_change_password'> | null
  
  // Check if password reset is required
  if (userDataTyped?.must_change_password) {
    redirect('/auth/reset-password')
  }
  
  if (userDataTyped?.role !== 'admin' && userDataTyped?.role !== 'developer') {
    redirect('/')
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <Logo showText={false} />
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
          <div className="flex gap-4 text-sm">
            <Link href="/admin/dashboards" className="hover:text-primary">Panel</Link>
            <Link href="/admin/projects" className="hover:text-primary">Proyectos</Link>
            <Link href="/admin/users" className="hover:text-primary">Usuarios</Link>
            <Link href="/admin/projections" className="hover:text-primary">Proyecciones</Link>
            <Link href="/admin/quotes/import" className="hover:text-primary">Importar Cotización</Link>
            <Link href="/admin/exceptions" className="hover:text-primary">Excepciones</Link>
            <Link href="/admin/audit/export" className="hover:text-primary">Auditoría</Link>
            <Link href="/admin/onboarding" className="hover:text-primary">Configuración</Link>
          </div>
        </div>
      </nav>
      <main className="p-4">{children}</main>
    </div>
  )
}
