import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="512"
          height="512"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#16a34a"
          strokeWidth="8"
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
    ),
    {
      width: 512,
      height: 512,
    }
  )
}

