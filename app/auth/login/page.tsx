'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Logo } from '@/components/shared/logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
        const { data: userData } = await supabase
          .from('users')
          .select('role, must_change_password')
          .eq('id', data.user.id)
          .single()

        const userDataTyped = userData as Pick<UserRow, 'role' | 'must_change_password'> | null
        
        // Industry best practice: DEV/superuser should ALWAYS land at admin interface
        // Never default to installer - if role is missing, it's an error condition
        const role = userDataTyped?.role
        
        if (!role) {
          // Role lookup failed - this is an error condition
          setError('Error: No se pudo determinar el rol del usuario. Contacte al administrador.')
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

