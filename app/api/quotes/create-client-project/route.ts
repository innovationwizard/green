import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']
type ClientRow = Database['public']['Tables']['clients']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Check if user is admin or developer
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: Pick<UserRow, 'role'> | null }

    if (!userData || (userData.role !== 'admin' && userData.role !== 'developer')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { client_name, installation_address, project_type, system_size_kw, price } = body

    if (!client_name || !installation_address) {
      return NextResponse.json(
        { error: 'Nombre del cliente y dirección de instalación son requeridos' },
        { status: 400 }
      )
    }

    // Find or create client
    let clientId: string
    
    // Check if client exists (case-insensitive search)
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .ilike('name', client_name)
      .limit(1)
      .single() as { data: Pick<ClientRow, 'id'> | null }

    if (existingClient) {
      clientId = existingClient.id
    } else {
      // Create new client
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Supabase type inference fails for insert operations
        .insert({
          name: client_name,
          created_by: user.id,
        } as never)
        .select()
        .single() as { data: Pick<ClientRow, 'id'> | null; error: any }

      if (clientError || !newClient) {
        return NextResponse.json(
          { error: `Error al crear cliente: ${clientError?.message || 'Error desconocido'}` },
          { status: 500 }
        )
      }
      clientId = newClient.id
    }

    // Generate project human_id from client name
    const projectHumanId = client_name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 20) || 'PROY-' + Date.now().toString().slice(-6)

    // Create new project
    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Supabase type inference fails for insert operations
      .insert({
        human_id: projectHumanId,
        client_id: clientId,
        installation_address,
        project_type: project_type || 'residential',
        size_kw: system_size_kw || null,
        price: price || null,
        status: 'CREATED',
        created_by: user.id,
      } as never)
      .select()
      .single() as { data: Pick<ProjectRow, 'id'> | null; error: any }

    if (projectError || !newProject) {
      return NextResponse.json(
        { error: `Error al crear proyecto: ${projectError?.message || 'Error desconocido'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      client_id: clientId,
      project_id: newProject.id,
    })
  } catch (error) {
    console.error('Error creating client/project:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

