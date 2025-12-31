import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz'

const GUATEMALA_TZ = 'America/Guatemala'

export function getGuatemalaTime(date: Date = new Date()): Date {
  return new Date(formatInTimeZone(date, GUATEMALA_TZ, 'yyyy-MM-dd HH:mm:ss'))
}

export function getNextSaturday23_59(): Date {
  const now = new Date()
  const guatemalaNow = getGuatemalaTime(now)
  
  const dayOfWeek = guatemalaNow.getDay() // 0 = Sunday, 6 = Saturday
  const daysUntilSaturday = dayOfWeek === 6 ? 7 : (6 - dayOfWeek)
  
  const nextSaturday = new Date(guatemalaNow)
  nextSaturday.setDate(guatemalaNow.getDate() + daysUntilSaturday)
  nextSaturday.setHours(23, 59, 59, 999)
  
  return zonedTimeToUtc(nextSaturday, GUATEMALA_TZ)
}

export function canAnularEvent(eventDate: Date): boolean {
  const deadline = getNextSaturday23_59()
  const eventDateUtc = zonedTimeToUtc(eventDate, GUATEMALA_TZ)
  return eventDateUtc <= deadline
}

