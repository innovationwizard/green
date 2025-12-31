import { createClient } from '@/lib/supabase/client'
import { EventType } from '@/types/database.types'
import { EventPayloadMap } from '@/types/events.types'

export interface CashBoxMovement {
  id: string
  event_type: EventType
  amount: number
  description: string
  created_at: string
}

export async function getCashBoxBalance(userId: string): Promise<{
  balance: number
  movements: CashBoxMovement[]
}> {
  const supabase = createClient()
  
  // Get all cash-related events for this user
  const cashEventTypes: EventType[] = [
    'CASH_ADVANCE_ISSUED',
    'REIMBURSEMENT_ISSUED',
    'EXPENSE_LOGGED',
    'CLIENT_PAYMENT_RECEIVED', // If cash
    'VENDOR_PAYMENT_MADE', // If cash
  ]
  
  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_type, payload, created_at')
    .in('event_type', cashEventTypes)
    .eq('hidden', false)
    .or(`created_by.eq.${userId},payload->>recipient_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100) // Get recent events
  
  if (error || !events) {
    return { balance: 0, movements: [] }
  }
  
  let balance = 0
  const movements: CashBoxMovement[] = []
  
  // Process events in chronological order
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  
  for (const event of sortedEvents) {
    const payload = event.payload as EventPayloadMap[EventType]
    let amount = 0
    let description = ''
    
    switch (event.event_type) {
      case 'CASH_ADVANCE_ISSUED':
        if ('recipient_user_id' in payload && payload.recipient_user_id === userId) {
          amount = 'amount' in payload ? (payload.amount as number) : 0
          balance += amount
          description = `Adelanto recibido: Q ${amount.toFixed(2)}`
        }
        break
        
      case 'REIMBURSEMENT_ISSUED':
        if ('recipient_user_id' in payload && payload.recipient_user_id === userId) {
          amount = 'amount' in payload ? (payload.amount as number) : 0
          balance += amount
          description = `Reembolso recibido: Q ${amount.toFixed(2)}`
        }
        break
        
      case 'EXPENSE_LOGGED':
        if (event.created_by === userId) {
          amount = 'amount' in payload ? -(payload.amount as number) : 0
          balance += amount
          const category = 'category' in payload ? payload.category : 'Gasto'
          description = `${category}: Q ${Math.abs(amount).toFixed(2)}`
        }
        break
        
      case 'CLIENT_PAYMENT_RECEIVED':
        if (event.created_by === userId && 'payment_method' in payload && payload.payment_method === 'cash') {
          amount = 'amount' in payload ? (payload.amount as number) : 0
          balance += amount
          description = `Pago recibido: Q ${amount.toFixed(2)}`
        }
        break
        
      case 'VENDOR_PAYMENT_MADE':
        if (event.created_by === userId && 'payment_method' in payload && payload.payment_method === 'cash') {
          amount = 'amount' in payload ? -(payload.amount as number) : 0
          balance += amount
          description = `Pago realizado: Q ${Math.abs(amount).toFixed(2)}`
        }
        break
    }
    
    if (amount !== 0) {
      movements.push({
        id: event.id,
        event_type: event.event_type,
        amount,
        description,
        created_at: event.created_at,
      })
    }
  }
  
  // Return last 5 movements (most recent)
  const last5Movements = movements.slice(-5).reverse()
  
  return {
    balance,
    movements: last5Movements,
  }
}

