import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GREEN APP - Solar EPC Operations',
  description: 'Solar EPC Operations Ledger, Analytics, and AI Insights',
  manifest: '/manifest.json',
  themeColor: '#16a34a',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'GREEN APP - Solar EPC Operations',
    description: 'Solar EPC Operations Ledger, Analytics, and AI Insights',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'GREEN APP',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GREEN APP - Solar EPC Operations',
    description: 'Solar EPC Operations Ledger, Analytics, and AI Insights',
    images: ['/opengraph-image'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GREEN APP',
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

