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
    const { id, email, full_name, role, must_change_password } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    // Get current user data to check if email changed
    const { data: currentUser } = await supabase
      .from('users')
      .select('email')
      .eq('id', id)
      .single() as { data: Pick<UserRow, 'email'> | null }

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Update user in public.users
    const { error: updateError } = await supabase
      .from('users')
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Supabase type inference fails for update operations
      .update({
        email,
        full_name: full_name || null,
        role,
        must_change_password: must_change_password ?? false,
      } as never)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    // Update email in auth.users if it changed
    if (email && email !== currentUser.email) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (supabaseUrl && supabaseServiceKey) {
        const adminClient = createAdminClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })

        const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
          email,
        })

        if (authError) {
          console.warn('Warning: Could not update email in auth.users:', authError)
          // Don't fail the request, just log the warning
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

