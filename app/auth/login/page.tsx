'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Logo } from '@/components/shared/logo'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Check for error query parameter
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'user_not_configured') {
      setError(
        'Tu cuenta no está completamente configurada. ' +
        'Por favor, contacte al administrador para completar la configuración de tu cuenta.'
      )
    } else if (errorParam === 'role_not_found') {
      setError(
        'No se pudo determinar el rol del usuario. ' +
        'Por favor, contacte al administrador para asignar un rol a tu cuenta.'
      )
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Get user data including password reset requirement
        const { data: userData, error: userDataError } = await supabase
          .from('users')
          .select('role, must_change_password')
          .eq('id', data.user.id)
          .single()

        // Check if user exists in public.users table
        if (userDataError || !userData) {
          // User exists in auth.users but not in public.users
          // This happens when a user is created in Supabase Auth but the corresponding
          // row in public.users was not created (manual creation or trigger missing)
          console.error('User not found in public.users:', {
            userId: data.user.id,
            email: data.user.email,
            error: userDataError,
          })
          setError(
            'Error: Tu cuenta no está completamente configurada. ' +
            'Por favor, contacte al administrador para completar la configuración de tu cuenta. ' +
            `(Usuario autenticado: ${data.user.email}, pero no encontrado en la base de datos)`
          )
          setLoading(false)
          return
        }

        const userDataTyped = userData as Pick<UserRow, 'role' | 'must_change_password'> | null
        
        // Industry best practice: DEV/superuser should ALWAYS land at admin interface
        // Never default to installer - if role is missing, it's an error condition
        const role = userDataTyped?.role
        
        if (!role) {
          // Role lookup failed - this is an error condition
          console.error('User role is null:', {
            userId: data.user.id,
            email: data.user.email,
            userData: userDataTyped,
          })
          setError(
            'Error: No se pudo determinar el rol del usuario. ' +
            'Por favor, contacte al administrador para asignar un rol a tu cuenta. ' +
            `(Usuario: ${data.user.email})`
          )
          setLoading(false)
          return
        }
        
        const mustChangePassword = userDataTyped?.must_change_password ?? true

        // If user must change password, redirect to reset page
        if (mustChangePassword) {
          router.push('/auth/reset-password')
          router.refresh()
          return
        }

        // Redirect based on role
        // DEV is a superuser with dedicated top-level route (separate from admin/accounting)
        if (role === 'developer') {
          router.push('/dev')
        } else if (role === 'admin') {
          router.push('/admin')
        } else if (role === 'manager') {
          router.push('/manager')
        } else if (role === 'installer') {
          router.push('/installer')
        } else {
          // Unknown role - show error
          setError(`Error: Rol desconocido: ${role}. Contacte al administrador.`)
          setLoading(false)
          return
        }
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size={48} />
          </div>
          <CardDescription>Iniciar sesión</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="tu@email.com"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <a
              href="/auth/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            Powered by <span style={{ color: '#dc2626' }}>Artificial Intelligence Developments</span> © 2025
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size={48} />
            </div>
            <CardDescription>Cargando...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

