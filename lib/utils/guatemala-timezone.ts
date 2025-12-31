// Guatemala timezone utilities using native JavaScript Intl API
const GUATEMALA_TZ = 'America/Guatemala'

/**
 * Get current time in Guatemala timezone
 */
export function getGuatemalaTime(date: Date = new Date()): Date {
  // Format date in Guatemala timezone and parse it back
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
  const year = parseInt(parts.find(p => p.type === 'year')!.value)
  const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1
  const day = parseInt(parts.find(p => p.type === 'day')!.value)
  const hour = parseInt(parts.find(p => p.type === 'hour')!.value)
  const minute = parseInt(parts.find(p => p.type === 'minute')!.value)
  const second = parseInt(parts.find(p => p.type === 'second')!.value)
  
  return new Date(Date.UTC(year, month, day, hour, minute, second))
}

/**
 * Convert a date/time in Guatemala timezone to UTC
 */
function guatemalaToUTC(year: number, month: number, day: number, hour: number, minute: number, second: number): Date {
  // Create a date string in Guatemala timezone format
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
  
  // Use Intl.DateTimeFormat to get the UTC equivalent
  const tempDate = new Date(dateStr)
  const guatemalaOffset = getTimezoneOffset(GUATEMALA_TZ, tempDate)
  const utcDate = new Date(tempDate.getTime() - guatemalaOffset * 60000)
  
  return utcDate
}

/**
 * Get timezone offset in minutes for a given timezone at a specific date
 */
function getTimezoneOffset(timeZone: string, date: Date): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }))
  return (tzDate.getTime() - utcDate.getTime()) / 60000
}

/**
 * Get next Saturday 23:59:59 in Guatemala timezone (as UTC Date)
 */
export function getNextSaturday23_59(): Date {
  const now = new Date()
  
  // Get current time in Guatemala
  const guatemalaNow = getGuatemalaTime(now)
  
  // Get day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = guatemalaNow.getUTCDay()
  const daysUntilSaturday = dayOfWeek === 6 ? 7 : (6 - dayOfWeek)
  
  // Calculate next Saturday
  const nextSaturday = new Date(guatemalaNow)
  nextSaturday.setUTCDate(guatemalaNow.getUTCDate() + daysUntilSaturday)
  nextSaturday.setUTCHours(23, 59, 59, 999)
  
  return nextSaturday
}

/**
 * Check if an event can still be anulated (until next Saturday 23:59 Guatemala time)
 */
export function canAnularEvent(eventDate: Date): boolean {
  const deadline = getNextSaturday23_59()
  
  // Convert event date to Guatemala timezone for comparison
  const eventDateGuatemala = getGuatemalaTime(eventDate)
  const deadlineGuatemala = getGuatemalaTime(deadline)
  
  return eventDateGuatemala <= deadlineGuatemala
}

