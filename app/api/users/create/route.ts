import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']

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
    const { email, full_name, role, password, must_change_password } = body

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
    }

    // Create admin client with service role key for user creation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      )
    }

    const adminClient = createAdminClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || null,
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Error al crear usuario en Auth' },
        { status: 500 }
      )
    }

    // Step 2: Check if user already exists in public.users (trigger may have created it)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', authData.user.id)
      .single() as { data: Pick<UserRow, 'id'> | null }

    if (existingUser) {
      // User already exists (created by trigger), update it with admin-provided values
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Supabase type inference fails for update operations
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email,
          full_name: full_name || null,
          role,
          must_change_password: must_change_password ?? true,
          created_by: user.id,
        } as never)
        .eq('id', authData.user.id)

      if (updateError) {
        // If update fails, try to delete the auth user
        await adminClient.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json(
          { error: `Error al actualizar usuario: ${updateError.message}` },
          { status: 500 }
        )
      }
    } else {
      // User doesn't exist, create it
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Supabase type inference fails for insert operations
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          full_name: full_name || null,
          role,
          must_change_password: must_change_password ?? true,
          created_by: user.id,
        } as never)

      if (userError) {
        // If user creation in public.users fails, try to delete the auth user
        await adminClient.auth.admin.deleteUser(authData.user.id)
        
        // Check if error is due to duplicate key
        if (userError.code === '23505' || userError.message?.includes('duplicate key')) {
          return NextResponse.json(
            { error: 'El usuario ya existe en el sistema. Por favor, recarga la página.' },
            { status: 409 }
          )
        }
        
        return NextResponse.json(
          { error: `Error al crear usuario: ${userError.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: authData.user.id,
        email,
        full_name,
        role,
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

