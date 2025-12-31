// Generate UUID v4 for client-side event IDs
export function generateUUID(): string {
  if (typeof window !== 'undefined' && 'crypto' in window && 'randomUUID' in window.crypto) {
    return window.crypto.randomUUID()
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

