import { EventType, PaymentMethod, MaterialSource, ProjectStatus } from './database.types'

export interface EventPayloadBase {
  notes?: string
}

// Material Added
export interface MaterialAddedPayload extends EventPayloadBase {
  source: MaterialSource
  vendor?: string // For purchase
  payment_method?: PaymentMethod // For purchase
  receipt_photo_url?: string // For purchase
  warehouse_id?: string // For warehouse
  issuer?: string // For warehouse
  from_project_id?: string // For borrowed
  items: Array<{
    item_id: string
    quantity: number
    unit_cost: number
  }>
}

// Material Returned
export interface MaterialReturnedPayload extends EventPayloadBase {
  items: Array<{
    item_id: string
    quantity: number
  }>
  destination: 'warehouse' | 'project'
  to_project_id?: string // If returning to project
  warehouse_id?: string // If returning to warehouse
}

// Expense Logged
export interface ExpenseLoggedPayload extends EventPayloadBase {
  category: string
  amount: number
  payment_method: PaymentMethod
  receipt_photo_url?: string
  vendor?: string
}

// Labor Logged
export interface LaborLoggedPayload extends EventPayloadBase {
  hours: number
  start_time?: string // ISO datetime
  end_time?: string // ISO datetime
  manual_entry: boolean // true if typed, false if from timer
}

// Subcontractor Cost
export interface SubcontractorCostPayload extends EventPayloadBase {
  subcontractor_name: string
  amount: number
  payment_method: PaymentMethod
  invoice_number?: string
  receipt_photo_url?: string
}

// Change Order
export interface ChangeOrderPayload extends EventPayloadBase {
  revenue_delta?: number
  cost_delta?: number
  description: string
  approved_by?: string
}

// Client Invoice
export interface ClientInvoicePayload extends EventPayloadBase {
  invoice_number: string
  amount: number
  invoice_date: string // ISO date
}

// Client Payment
export interface ClientPaymentPayload extends EventPayloadBase {
  invoice_id: string // Reference to CLIENT_INVOICE_ISSUED event
  amount: number
  payment_method: PaymentMethod
  payment_date: string // ISO date
}

// Vendor Bill
export interface VendorBillPayload extends EventPayloadBase {
  vendor_name: string
  bill_number: string
  amount: number
  bill_date: string // ISO date
  items?: Array<{
    item_id?: string
    description: string
    quantity: number
    unit_cost: number
  }>
}

// Vendor Payment
export interface VendorPaymentPayload extends EventPayloadBase {
  bill_id: string // Reference to VENDOR_BILL_RECEIVED event
  amount: number
  payment_method: PaymentMethod
  payment_date: string // ISO date
}

// Cash Advance
export interface CashAdvancePayload extends EventPayloadBase {
  amount: number
  recipient_user_id: string
}

// Reimbursement
export interface ReimbursementPayload extends EventPayloadBase {
  amount: number
  recipient_user_id: string
  expense_event_id?: string // Reference to expense event
}

// Credit Purchase
export interface CreditPurchasePayload extends EventPayloadBase {
  vendor: string
  items: Array<{
    item_id: string
    quantity: number
    unit_cost: number
  }>
  total_amount: number
}

// Client Refund
export interface ClientRefundPayload extends EventPayloadBase {
  invoice_id: string // Reference to CLIENT_INVOICE_ISSUED event
  amount: number
  reason: string
}

// Vendor Refund
export interface VendorRefundPayload extends EventPayloadBase {
  bill_id: string // Reference to VENDOR_BILL_RECEIVED event
  amount: number
  reason: string
}

// Project Status Changed
export interface ProjectStatusChangedPayload extends EventPayloadBase {
  old_status: ProjectStatus
  new_status: ProjectStatus
}

// Event Reversed
export interface EventReversedPayload extends EventPayloadBase {
  original_event_id: string
  reason: string
}

export type EventPayloadMap = {
  MATERIAL_ADDED: MaterialAddedPayload
  MATERIAL_RETURNED_WAREHOUSE: MaterialReturnedPayload
  MATERIAL_RETURNED_PROJECT: MaterialReturnedPayload
  EXPENSE_LOGGED: ExpenseLoggedPayload
  LABOR_LOGGED: LaborLoggedPayload
  SUBCONTRACTOR_COST: SubcontractorCostPayload
  CHANGE_ORDER_ADDED: ChangeOrderPayload
  CLIENT_INVOICE_ISSUED: ClientInvoicePayload
  CLIENT_PAYMENT_RECEIVED: ClientPaymentPayload
  VENDOR_BILL_RECEIVED: VendorBillPayload
  VENDOR_PAYMENT_MADE: VendorPaymentPayload
  CASH_ADVANCE_ISSUED: CashAdvancePayload
  REIMBURSEMENT_ISSUED: ReimbursementPayload
  CREDIT_PURCHASE_RECORDED: CreditPurchasePayload
  CLIENT_REFUND_ISSUED: ClientRefundPayload
  VENDOR_REFUND_RECEIVED: VendorRefundPayload
  PROJECT_STATUS_CHANGED: ProjectStatusChangedPayload
  EVENT_REVERSED: EventReversedPayload
}

export type EventPayload<T extends EventType> = EventPayloadMap[T]

export interface Event {
  id: string
  client_uuid: string
  event_type: EventType
  project_id: string | null
  payload: EventPayload<EventType>
  created_by: string
  created_at: string
  device_id: string | null
  reason: string | null
  reversed_by: string | null
  hidden: boolean
  duplicate_flag: boolean
  geolocation: { lat: number; lng: number } | null
}

export interface PendingEvent {
  client_uuid: string
  event_type: EventType
  project_id: string | null
  payload: EventPayload<EventType>
  device_id: string | null
  geolocation: { lat: number; lng: number } | null
  photos?: File[]
  created_at: string
  synced: boolean
  sync_error?: string
}

