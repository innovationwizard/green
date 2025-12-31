export interface DashboardKPIData {
  totalRevenue: number
  totalCosts: number
  netProfit: number
  netProfitMargin: number
}

export interface ProjectionResult {
  success: boolean
  message?: string
  processed?: {
    start_date: string
    end_date: string
  }
  errors?: {
    costs?: string
    revenue?: string
    checkpoint?: string
  }
}

export interface ExceptionEvent {
  id: string
  event_type: string
  created_at: string
  payload: unknown
  project?: {
    human_id: string
  }
  created_by_user?: {
    full_name?: string
    email?: string
  }
}

export interface OmissionWarning {
  id: string
  message: string
}

