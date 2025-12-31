import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GREENTELLIGENCE'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/jpeg'

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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
            <path d="M10 18v-6"/>
            <path d="M14 14v-2"/>
            <path d="M18 18v-4"/>
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
    }
  )
}

