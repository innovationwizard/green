import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Building2, ShoppingCart, ArrowRight } from 'lucide-react'
import { toTitleCase } from '@/lib/utils/text-format'

type UserRow = Database['public']['Tables']['users']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type ClientRow = Database['public']['Tables']['clients']['Row']

interface ProjectWithClient extends ProjectRow {
  client: ClientRow
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Check if user is admin or developer
  const { data: userData } = await supabase
    .from('users')
    .select('role, must_change_password')
    .eq('id', user.id)
    .single() as { data: Pick<UserRow, 'role' | 'must_change_password'> | null }

  if (!userData) {
    redirect('/auth/login')
  }

  // Check if password reset is required
  if (userData.must_change_password) {
    redirect('/auth/reset-password')
  }

  if (userData.role !== 'admin' && userData.role !== 'developer') {
    redirect('/')
  }

  // Fetch all projects with client information
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(*)
    `)
    .order('created_at', { ascending: false })
    .limit(100) as { data: ProjectWithClient[] | null; error: { message: string } | null }

  if (projectsError) {
    console.error('Error fetching projects:', projectsError)
  }

  const statusLabels: Record<ProjectRow['status'], string> = {
    CREATED: 'Creado',
    SCHEDULED: 'Programado',
    IN_PROGRESS: 'En Progreso',
    INSTALLED: 'Instalado',
    CLOSED: 'Cerrado',
    CANCELLED: 'Cancelado',
  }

  const projectTypeLabels: Record<ProjectRow['project_type'], string> = {
    residential: 'Residencial',
    commercial: 'Comercial',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Proyectos</h1>
      </div>

      {projectsError ? (
        <Card>
          <CardContent className="py-8 text-center text-red-600">
            Error al cargar proyectos: {projectsError.message}
          </CardContent>
        </Card>
      ) : !projects || projects.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay proyectos registrados
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/admin/projects/${project.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      {toTitleCase(project.human_id)}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                    <p className="text-base">{project.client?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Dirección</p>
                    <p className="text-sm">{project.installation_address}</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tipo</p>
                      <p className="font-medium">{projectTypeLabels[project.project_type]}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Estado</p>
                      <p className="font-medium">{statusLabels[project.status]}</p>
                    </div>
                  </div>
                  {project.size_kw && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tamaño</p>
                      <p className="text-sm font-medium">{project.size_kw} kW</p>
                    </div>
                  )}
                  {project.price && (
                    <div>
                      <p className="text-sm text-muted-foreground">Precio</p>
                      <p className="text-sm font-semibold">
                        Q {project.price.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2 border-t">
                    <Link
                      href={`/admin/projects/${project.id}/sales-orders`}
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Órdenes de Venta
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

