import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { generateProjectHumanId } from '@/lib/utils/text-format'

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
        .single() as { data: Pick<ClientRow, 'id'> | null; error: { message: string } | null }

      if (clientError || !newClient) {
        return NextResponse.json(
          { error: `Error al crear cliente: ${clientError?.message || 'Error desconocido'}` },
          { status: 500 }
        )
      }
      clientId = newClient.id
    }

    // Generate base project human_id from client name (title case)
    const baseHumanId = generateProjectHumanId(client_name, 20)

    // Check if project with this human_id already exists
    let projectHumanId = baseHumanId
    let existingProject: Pick<ProjectRow, 'id'> | null = null
    let attempt = 0
    const maxAttempts = 100

    // Try to find existing project or generate unique human_id
    while (attempt < maxAttempts) {
      const { data: existing, error: checkError } = await supabase
        .from('projects')
        .select('id, client_id, installation_address')
        .eq('human_id', projectHumanId)
        .maybeSingle() as { data: Pick<ProjectRow, 'id' | 'client_id' | 'installation_address'> | null; error: { message: string } | null }

      // If error or no existing project, human_id is available
      if (checkError || !existing) {
        // human_id is available, break and create new project
        break
      }

      // Check if existing project matches client and address (reuse it)
      if (existing.client_id === clientId && existing.installation_address === installation_address) {
        existingProject = { id: existing.id }
        break
      }

      // human_id exists but for different client/address, generate unique suffix
      attempt++
      const suffix = attempt.toString().padStart(2, '0')
      const maxBaseLength = Math.max(15, 20 - suffix.length - 1) // Reserve space for suffix
      projectHumanId = baseHumanId.substring(0, maxBaseLength) + '-' + suffix
    }

    // If we found an existing project that matches, return it
    if (existingProject) {
      return NextResponse.json({
        success: true,
        client_id: clientId,
        project_id: existingProject.id,
      })
    }

    // Create new project with unique human_id
    // Retry logic in case of race condition (duplicate key error)
    let insertAttempt = 0
    let newProject: Pick<ProjectRow, 'id'> | null = null
    let projectError: { message: string } | null = null

    while (insertAttempt < 5 && !newProject) {
      const { data: insertData, error: insertError } = await supabase
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
        .single() as { data: Pick<ProjectRow, 'id'> | null; error: { message: string } | null }

      if (insertData) {
        newProject = insertData
        break
      }

      projectError = insertError

      // If duplicate key error, generate new human_id and retry
      if (projectError?.message?.includes('duplicate key') || projectError?.message?.includes('unique constraint')) {
        insertAttempt++
        attempt++
        const suffix = attempt.toString().padStart(2, '0')
        const maxBaseLength = Math.max(15, 20 - suffix.length - 1)
        projectHumanId = baseHumanId.substring(0, maxBaseLength) + '-' + suffix
        projectError = null // Reset error for retry
      } else {
        // Other error, break and return
        break
      }
    }

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

