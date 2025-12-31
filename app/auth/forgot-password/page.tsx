'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Logo } from '@/components/shared/logo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      // Get the site URL for the redirect - PRODUCTION ONLY APP
      // NEXT_PUBLIC_SITE_URL MUST be set in production environment
      let siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      
      if (!siteUrl) {
        // Fallback to window.location.origin (client-side only)
        siteUrl = window.location.origin
      }
      
      // CRITICAL: This is a production-only app - NEVER allow localhost
      if (siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1')) {
        throw new Error(
          'PRODUCTION ERROR: Site URL cannot be localhost. ' +
          'Please set NEXT_PUBLIC_SITE_URL environment variable to your production domain (e.g., https://yourdomain.com). ' +
          'Current URL: ' + siteUrl + '. ' +
          'Also ensure your Supabase Dashboard → Authentication → Settings → Site URL is set to your production domain.'
        )
      }
      
      // Ensure HTTPS in production
      if (process.env.NODE_ENV === 'production' && !siteUrl.startsWith('https://')) {
        siteUrl = siteUrl.replace(/^http:\/\//, 'https://')
      }
      
      // Remove trailing slash if present
      siteUrl = siteUrl.replace(/\/$/, '')
      
      const redirectTo = `${siteUrl}/auth/reset-password-confirm`
      
      // Log for debugging (remove in production if needed)
      console.log('[Password Recovery] Using redirect URL:', redirectTo)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) throw error

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el email de recuperación')
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
          <CardDescription>Recuperar Contraseña</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  Se ha enviado un enlace de recuperación a <strong>{email}</strong>
                </p>
                <p className="text-sm text-green-700 mt-2">
                  Revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
                </p>
              </div>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  Volver al inicio de sesión
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </p>
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </Button>
              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="text-sm text-primary hover:underline"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

