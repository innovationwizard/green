import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ServiceWorkerHandler } from '@/components/shared/service-worker-handler'
import { toTitleCase } from '@/lib/utils/text-format'

const inter = Inter({ subsets: ['latin'] })

// Get base URL for absolute OG image URLs (required by WhatsApp)
// PRODUCTION ONLY APP - Never use localhost in production
function getBaseUrl() {
  // Priority 1: NEXT_PUBLIC_SITE_URL (should be set in production)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const url = process.env.NEXT_PUBLIC_SITE_URL
    // Ensure HTTPS in production and reject localhost
    if (process.env.NODE_ENV === 'production') {
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        console.error('ERROR: NEXT_PUBLIC_SITE_URL cannot be localhost in production. Set it to your production domain.')
        // Don't throw during build - let it fail at runtime instead
        if (typeof window === 'undefined') {
          // Server-side: use a placeholder that will fail validation
          return 'https://PRODUCTION_URL_REQUIRED'
        }
      }
      return url.startsWith('https://') ? url : url.replace(/^http:\/\//, 'https://')
    }
    return url
  }
  
  // Priority 2: VERCEL_URL (always HTTPS, production environment)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Priority 3: Only allow localhost in development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  
  // Production without URL configured - use placeholder (will be caught at runtime)
  console.warn('WARNING: NEXT_PUBLIC_SITE_URL or VERCEL_URL not set. This will fail at runtime in production.')
  return 'https://PRODUCTION_URL_REQUIRED'
}

const baseUrl = getBaseUrl()
const ogImageUrl = `${baseUrl}/opengraph-image`

const appTitle = toTitleCase('GREENTELLIGENCE')

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: appTitle,
  description: 'Optimización y Automatización de Procesos con Inteligencia Artificial',
  manifest: '/manifest.json',
  icons: {
    // SVG favicon for modern browsers (scalable, crisp at any size)
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    // Apple touch icon - iOS requires 180x180 with solid background
    apple: [
      { url: '/apple-icon', type: 'image/png', sizes: '180x180' },
    ],
    // PWA icons are handled via manifest.json
    // Additional sizes can be added here if needed for specific browser support
  },
  openGraph: {
    title: appTitle,
    description: 'Optimización y Automatización de Procesos con Inteligencia Artificial',
    type: 'website',
    url: baseUrl,
    siteName: appTitle,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: appTitle,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: appTitle,
    description: 'Optimización y Automatización de Procesos con Inteligencia Artificial',
    images: [ogImageUrl],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: appTitle,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#16a34a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <ServiceWorkerHandler />
      </body>
    </html>
  )
}

