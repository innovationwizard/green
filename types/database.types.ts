export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'installer' | 'admin' | 'manager' | 'developer'
export type ProjectStatus = 'CREATED' | 'SCHEDULED' | 'IN_PROGRESS' | 'INSTALLED' | 'CLOSED' | 'CANCELLED'
export type ProjectType = 'residential' | 'commercial'
export type EventType =
  | 'MATERIAL_ADDED'
  | 'MATERIAL_RETURNED_WAREHOUSE'
  | 'MATERIAL_RETURNED_PROJECT'
  | 'EXPENSE_LOGGED'
  | 'LABOR_LOGGED'
  | 'SUBCONTRACTOR_COST'
  | 'CHANGE_ORDER_ADDED'
  | 'CLIENT_INVOICE_ISSUED'
  | 'CLIENT_PAYMENT_RECEIVED'
  | 'VENDOR_BILL_RECEIVED'
  | 'VENDOR_PAYMENT_MADE'
  | 'CASH_ADVANCE_ISSUED'
  | 'REIMBURSEMENT_ISSUED'
  | 'CREDIT_PURCHASE_RECORDED'
  | 'CLIENT_REFUND_ISSUED'
  | 'VENDOR_REFUND_RECEIVED'
  | 'PROJECT_STATUS_CHANGED'
  | 'EVENT_REVERSED'
export type PaymentMethod = 'cash' | 'transfer' | 'check' | 'credit_card' | 'debit_card' | 'other'
export type MaterialSource = 'purchase' | 'warehouse' | 'borrowed'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: UserRole
          active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          must_change_password: boolean
          password_changed_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: UserRole
          active?: boolean
          created_by?: string | null
          must_change_password?: boolean
          password_changed_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: UserRole
          active?: boolean
          updated_at?: string
          created_by?: string | null
          must_change_password?: boolean
          password_changed_at?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          human_id: string
          client_id: string
          installation_address: string
          project_type: ProjectType
          size_kw: number | null
          price: number | null
          expected_install_date: string | null
          actual_install_date: string | null
          salesperson_id: string | null
          status: ProjectStatus
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          human_id: string
          client_id: string
          installation_address: string
          project_type: ProjectType
          size_kw?: number | null
          price?: number | null
          expected_install_date?: string | null
          actual_install_date?: string | null
          salesperson_id?: string | null
          status?: ProjectStatus
          created_by?: string | null
        }
        Update: {
          id?: string
          human_id?: string
          client_id?: string
          installation_address?: string
          project_type?: ProjectType
          size_kw?: number | null
          price?: number | null
          expected_install_date?: string | null
          actual_install_date?: string | null
          salesperson_id?: string | null
          status?: ProjectStatus
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          client_uuid: string
          event_type: EventType
          project_id: string | null
          payload: Json
          created_by: string
          created_at: string
          device_id: string | null
          reason: string | null
          reversed_by: string | null
          hidden: boolean
          duplicate_flag: boolean
          geolocation: Json | null
        }
        Insert: {
          id?: string
          client_uuid: string
          event_type: EventType
          project_id?: string | null
          payload: Json
          created_by: string
          device_id?: string | null
          reason?: string | null
          reversed_by?: string | null
          hidden?: boolean
          duplicate_flag?: boolean
          geolocation?: Json | null
        }
        Update: {
          id?: string
          hidden?: boolean
          duplicate_flag?: boolean
        }
      }
      items: {
        Row: {
          id: string
          name: string
          sku: string | null
          unit: string
          category: string | null
          default_unit_cost: number | null
          active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          sku?: string | null
          unit: string
          category?: string | null
          default_unit_cost?: number | null
          active?: boolean
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          sku?: string | null
          unit?: string
          category?: string | null
          default_unit_cost?: number | null
          active?: boolean
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          nickname: string | null
          nit: string | null
          phone: string | null
          email: string | null
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          nickname?: string | null
          nit?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          active?: boolean
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          nickname?: string | null
          nit?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          active?: boolean
          updated_at?: string
        }
      }
      labor_rates: {
        Row: {
          id: string
          user_id: string | null
          role_name: string | null
          rate_per_hour: number
          effective_from: string
          effective_to: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          role_name?: string | null
          rate_per_hour: number
          effective_from?: string
          effective_to?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          role_name?: string | null
          rate_per_hour?: number
          effective_from?: string
          effective_to?: string | null
        }
      }
      salespeople: {
        Row: {
          id: string
          name: string
          active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          active?: boolean
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          active?: boolean
          updated_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          project_id: string
          quoted_revenue: number
          quoted_materials: number | null
          quoted_labor: number | null
          quoted_subcontractors: number | null
          quoted_expenses: number | null
          system_size_kw: number | null
          expected_duration_days: number | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          project_id: string
          quoted_revenue: number
          quoted_materials?: number | null
          quoted_labor?: number | null
          quoted_subcontractors?: number | null
          quoted_expenses?: number | null
          system_size_kw?: number | null
          expected_duration_days?: number | null
          created_by?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          quoted_revenue?: number
          quoted_materials?: number | null
          quoted_labor?: number | null
          quoted_subcontractors?: number | null
          quoted_expenses?: number | null
          system_size_kw?: number | null
          expected_duration_days?: number | null
          updated_at?: string
        }
      }
      cash_boxes: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
        }
        Update: {
          id?: string
          updated_at?: string
        }
      }
      project_costs_daily: {
        Row: {
          id: string
          project_id: string
          date: string
          materials_cost: number
          labor_cost: number
          subcontractor_cost: number
          expense_cost: number
          total_cost: number
          computed_at: string
        }
        Insert: {
          id?: string
          project_id: string
          date: string
          materials_cost?: number
          labor_cost?: number
          subcontractor_cost?: number
          expense_cost?: number
          total_cost?: number
          computed_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          date?: string
          materials_cost?: number
          labor_cost?: number
          subcontractor_cost?: number
          expense_cost?: number
          total_cost?: number
          computed_at?: string
        }
      }
      project_revenue_daily: {
        Row: {
          id: string
          project_id: string
          date: string
          invoice_amount: number
          payment_amount: number
          change_order_revenue: number
          total_revenue: number
          computed_at: string
        }
        Insert: {
          id?: string
          project_id: string
          date: string
          invoice_amount?: number
          payment_amount?: number
          change_order_revenue?: number
          total_revenue?: number
          computed_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          date?: string
          invoice_amount?: number
          payment_amount?: number
          change_order_revenue?: number
          total_revenue?: number
          computed_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      project_status: ProjectStatus
      project_type: ProjectType
      event_type: EventType
      payment_method: PaymentMethod
      material_source: MaterialSource
    }
  }
}

