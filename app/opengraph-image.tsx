import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GREENTELLIGENCE'
export const size = {
  width: 1200,
  height: 630,
}
// PNG format - WhatsApp supports PNG. ImageResponse generates optimized PNG files.
// Simple design (gradient + SVG + text) ensures file size stays well under 300KB limit.
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '40px',
          }}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>
            <path d="M14 2v5a1 1 0 0 0 1 1h5"/>
            <path d="M8 18v-2"/>
            <path d="M12 18v-4"/>
            <path d="M16 18v-6"/>
          </svg>
        </div>
        <div
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '20px',
          }}
        >
          GREENTELLIGENCE
        </div>
        <div
          style={{
            fontSize: '28px',
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center',
            maxWidth: '1000px',
            padding: '0 40px',
          }}
        >
          Optimización y Automatización de Procesos con Inteligencia Artificial
        </div>
      </div>
    ),
    {
      ...size,
      // ImageResponse generates optimized PNG files
      // Simple design ensures file size stays well under WhatsApp's 300KB limit
    }
  )
}

