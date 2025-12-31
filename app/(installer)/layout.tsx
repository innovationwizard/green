import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InstallerNav from '@/components/installer/nav'

export default async function InstallerLayout({
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
  
  if (userData?.role !== 'installer') {
    redirect('/')
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <InstallerNav userName={userData.full_name || user.email || ''} />
      <main className="pb-20">{children}</main>
    </div>
  )
}

