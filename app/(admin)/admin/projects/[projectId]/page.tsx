import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Building2, MapPin, Calendar, DollarSign, Zap, FileText, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'

type UserRow = Database['public']['Tables']['users']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type ClientRow = Database['public']['Tables']['clients']['Row']
type QuoteRow = Database['public']['Tables']['quotes']['Row']

interface ProjectWithClient extends ProjectRow {
  client: ClientRow
  quotes: QuoteRow[]
}

interface Params {
  params: { projectId: string }
}

export default async function ProjectPage({ params }: Params) {
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

  // Fetch project with client information
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.projectId)
    .single() as { data: ProjectRow | null; error: { message: string } | null }

  if (projectError || !project) {
    notFound()
  }

  // Fetch client information
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', project.client_id)
    .single() as { data: ClientRow | null }

  // Fetch quotes for this project
  const { data: quotes } = await supabase
    .from('quotes')
    .select('*')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false }) as { data: QuoteRow[] | null }

  const projectWithClient: ProjectWithClient = {
    ...project,
    client: client || {} as ClientRow,
    quotes: quotes || [],
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
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboards">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Proyecto: {project.human_id}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Información del Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">ID del Proyecto</label>
              <p className="text-lg font-semibold">{project.human_id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cliente</label>
              <p className="text-lg">{projectWithClient.client?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Dirección de Instalación
              </label>
              <p className="text-base">{project.installation_address}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tipo</label>
              <p className="text-base">{projectTypeLabels[project.project_type]}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <p className="text-base font-medium">{statusLabels[project.status]}</p>
            </div>
            {project.size_kw && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  Tamaño del Sistema
                </label>
                <p className="text-base">{project.size_kw} kW</p>
              </div>
            )}
            {project.price && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Precio
                </label>
                <p className="text-base font-semibold">Q {project.price.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            )}
            {project.expected_install_date && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Fecha Esperada de Instalación
                </label>
                <p className="text-base">
                  {new Date(project.expected_install_date).toLocaleDateString('es-GT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'America/Guatemala',
                  })}
                </p>
              </div>
            )}
            {project.actual_install_date && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Fecha Real de Instalación
                </label>
                <p className="text-base">
                  {new Date(project.actual_install_date).toLocaleDateString('es-GT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'America/Guatemala',
                  })}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Creado</label>
              <p className="text-sm text-muted-foreground">
                {new Date(project.created_at).toLocaleString('es-GT', {
                  timeZone: 'America/Guatemala',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Órdenes de Compra
              </div>
              <Link href={`/admin/projects/${params.projectId}/purchase-orders`}>
                <Button variant="outline" size="sm">
                  Ver Todas
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">
              <Link 
                href={`/admin/projects/${params.projectId}/purchase-orders`}
                className="text-primary hover:underline"
              >
                Gestionar órdenes de compra
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Quotes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Cotizaciones ({projectWithClient.quotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectWithClient.quotes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay cotizaciones para este proyecto
              </p>
            ) : (
              <div className="space-y-4">
                {projectWithClient.quotes.map((quote) => (
                  <div key={quote.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">
                          Q {quote.quoted_revenue.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(quote.created_at).toLocaleDateString('es-GT', {
                            timeZone: 'America/Guatemala',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    {quote.system_size_kw && (
                      <p className="text-sm text-muted-foreground">
                        Sistema: {quote.system_size_kw} kW
                      </p>
                    )}
                    {quote.quoted_materials && (
                      <p className="text-sm text-muted-foreground">
                        Materiales: Q {quote.quoted_materials.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

