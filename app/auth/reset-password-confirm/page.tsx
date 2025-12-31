'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Logo } from '@/components/shared/logo'

export default function ResetPasswordConfirmPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [validToken, setValidToken] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Check if we have a valid password reset token
    const checkToken = async () => {
      // Supabase handles the token via URL hash, so we check if user session is valid
      // The token is automatically processed by Supabase when the page loads
      const { data: { user } } = await supabase.auth.getUser()
      
      // If user is null, the token might be invalid or expired
      // But we still allow them to try to reset (Supabase will handle validation)
      setValidToken(true)
      setChecking(false)
    }

    checkToken()
  }, [supabase])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      // Update password using Supabase Auth
      // Supabase automatically validates the token from the URL
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw updateError
      }

      if (!data.user) {
        throw new Error('Token inválido o expirado. Por favor solicita un nuevo enlace de recuperación.')
      }

      // Mark password as changed in database
      const { error: dbError } = await supabase
        .from('users')
        .update({
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
        })
        .eq('id', data.user.id)

      if (dbError) {
        console.error('Error updating password flag:', dbError)
        // Don't throw - password was changed successfully
      }

      // Get user role for redirect
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const role = userData?.role || 'installer'

      // Show success message briefly before redirect
      setError(null)

      // Redirect based on role
      if (role === 'admin' || role === 'developer') {
        router.push('/admin')
      } else if (role === 'manager') {
        router.push('/manager')
      } else {
        router.push('/installer')
      }
      router.refresh()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al restablecer la contraseña'
      setError(errorMessage)
      
      // If token is invalid, suggest requesting a new one
      if (errorMessage.includes('token') || errorMessage.includes('expired') || errorMessage.includes('invalid')) {
        setError(`${errorMessage}. Por favor solicita un nuevo enlace de recuperación.`)
      }
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Verificando enlace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size={48} />
          </div>
          <CardDescription>Restablecer Contraseña</CardDescription>
          <p className="text-sm text-muted-foreground mt-2">
            Ingresa tu nueva contraseña
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
                {error.includes('token') || error.includes('expired') || error.includes('invalid') ? (
                  <div className="mt-2">
                    <a
                      href="/auth/forgot-password"
                      className="text-sm text-primary hover:underline"
                    >
                      Solicitar nuevo enlace
                    </a>
                  </div>
                ) : null}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">
                Nueva Contraseña
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                La contraseña debe tener al menos 8 caracteres
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar Nueva Contraseña
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Restableciendo contraseña...' : 'Restablecer Contraseña'}
            </Button>
            <div className="text-center">
              <a
                href="/auth/login"
                className="text-sm text-primary hover:underline"
              >
                Volver al inicio de sesión
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

