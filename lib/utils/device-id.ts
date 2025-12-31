// Generate or retrieve a persistent device ID
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server'
  }

  const STORAGE_KEY = 'green_device_id'
  let deviceId = localStorage.getItem(STORAGE_KEY)

  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(STORAGE_KEY, deviceId)
  }

  return deviceId
}

