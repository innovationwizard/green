import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// Get base URL for absolute OG image URLs (required by WhatsApp)
function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  // Fallback for local development
  return 'http://localhost:3000'
}

const baseUrl = getBaseUrl()
const ogImageUrl = `${baseUrl}/opengraph-image`

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'GREENTELLIGENCE',
  description: 'Optimización y Automatización de Procesos con Inteligencia Artificial',
  manifest: '/manifest.json',
  themeColor: '#16a34a',
  openGraph: {
    title: 'GREENTELLIGENCE',
    description: 'Optimización y Automatización de Procesos con Inteligencia Artificial',
    type: 'website',
    url: baseUrl,
    siteName: 'GREENTELLIGENCE',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'GREENTELLIGENCE',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GREENTELLIGENCE',
    description: 'Optimización y Automatización de Procesos con Inteligencia Artificial',
    images: [ogImageUrl],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GREENTELLIGENCE',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

