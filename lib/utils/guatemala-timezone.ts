// Guatemala timezone utilities using native JavaScript Intl API
const GUATEMALA_TZ = 'America/Guatemala'

/**
 * Get date components in Guatemala timezone
 */
function getGuatemalaDateComponents(date: Date): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: GUATEMALA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  
  const parts = formatter.formatToParts(date)
  return {
    year: parseInt(parts.find(p => p.type === 'year')!.value),
    month: parseInt(parts.find(p => p.type === 'month')!.value) - 1,
    day: parseInt(parts.find(p => p.type === 'day')!.value),
    hour: parseInt(parts.find(p => p.type === 'hour')!.value),
    minute: parseInt(parts.find(p => p.type === 'minute')!.value),
    second: parseInt(parts.find(p => p.type === 'second')!.value),
  }
}

/**
 * Get current time in Guatemala timezone (as Date object)
 */
export function getGuatemalaTime(date: Date = new Date()): Date {
  const components = getGuatemalaDateComponents(date)
  // Create a date string and parse it as if it were UTC, then adjust
  const dateStr = `${components.year}-${String(components.month + 1).padStart(2, '0')}-${String(components.day).padStart(2, '0')}T${String(components.hour).padStart(2, '0')}:${String(components.minute).padStart(2, '0')}:${String(components.second).padStart(2, '0')}Z`
  return new Date(dateStr)
}

/**
 * Get next Saturday 23:59:59 in Guatemala timezone (as UTC Date for comparison)
 */
export function getNextSaturday23_59(): Date {
  const now = new Date()
  const guatemalaComponents = getGuatemalaDateComponents(now)
  
  // Create a date object representing current Guatemala time
  const guatemalaDate = new Date(
    Date.UTC(
      guatemalaComponents.year,
      guatemalaComponents.month,
      guatemalaComponents.day,
      guatemalaComponents.hour,
      guatemalaComponents.minute,
      guatemalaComponents.second
    )
  )
  
  // Get day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = guatemalaDate.getUTCDay()
  const daysUntilSaturday = dayOfWeek === 6 ? 7 : (6 - dayOfWeek)
  
  // Calculate next Saturday 23:59:59
  const nextSaturday = new Date(guatemalaDate)
  nextSaturday.setUTCDate(guatemalaDate.getUTCDate() + daysUntilSaturday)
  nextSaturday.setUTCHours(23, 59, 59, 999)
  
  return nextSaturday
}

/**
 * Check if an event can still be anulated (until next Saturday 23:59 Guatemala time)
 */
export function canAnularEvent(eventDate: Date): boolean {
  const deadline = getNextSaturday23_59()
  
  // Get event date components in Guatemala timezone
  const eventComponents = getGuatemalaDateComponents(eventDate)
  const eventGuatemalaDate = new Date(
    Date.UTC(
      eventComponents.year,
      eventComponents.month,
      eventComponents.day,
      eventComponents.hour,
      eventComponents.minute,
      eventComponents.second
    )
  )
  
  return eventGuatemalaDate <= deadline
}

