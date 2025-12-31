-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- Custom types
CREATE TYPE user_role AS ENUM ('installer', 'admin', 'manager', 'developer');
CREATE TYPE project_status AS ENUM ('CREATED', 'SCHEDULED', 'IN_PROGRESS', 'INSTALLED', 'CLOSED', 'CANCELLED');
CREATE TYPE project_type AS ENUM ('residential', 'commercial');
CREATE TYPE event_type AS ENUM (
  'MATERIAL_ADDED',
  'MATERIAL_RETURNED_WAREHOUSE',
  'MATERIAL_RETURNED_PROJECT',
  'EXPENSE_LOGGED',
  'LABOR_LOGGED',
  'SUBCONTRACTOR_COST',
  'CHANGE_ORDER_ADDED',
  'CLIENT_INVOICE_ISSUED',
  'CLIENT_PAYMENT_RECEIVED',
  'VENDOR_BILL_RECEIVED',
  'VENDOR_PAYMENT_MADE',
  'CASH_ADVANCE_ISSUED',
  'REIMBURSEMENT_ISSUED',
  'CREDIT_PURCHASE_RECORDED',
  'CLIENT_REFUND_ISSUED',
  'VENDOR_REFUND_RECEIVED',
  'PROJECT_STATUS_CHANGED',
  'EVENT_REVERSED'
);
CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'check', 'credit_card', 'debit_card', 'other');
CREATE TYPE material_source AS ENUM ('purchase', 'warehouse', 'borrowed');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'installer',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(email)
);

-- Salespeople (no login, just dropdown)
CREATE TABLE public.salespeople (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  nickname TEXT,
  nit TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Items catalog
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sku TEXT,
  unit TEXT NOT NULL,
  category TEXT,
  default_unit_cost DECIMAL(15, 2),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Labor rates
CREATE TABLE public.labor_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role_name TEXT, -- If role-based instead of user-based
  rate_per_hour DECIMAL(15, 2) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  human_id TEXT NOT NULL, -- Nickname
  client_id UUID NOT NULL REFERENCES public.clients(id),
  installation_address TEXT NOT NULL,
  project_type project_type NOT NULL,
  size_kw DECIMAL(10, 2),
  price DECIMAL(15, 2),
  expected_install_date DATE,
  actual_install_date DATE,
  salesperson_id UUID REFERENCES public.salespeople(id),
  status project_status NOT NULL DEFAULT 'CREATED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(human_id)
);

-- Quote headers
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  quoted_revenue DECIMAL(15, 2) NOT NULL,
  quoted_materials DECIMAL(15, 2),
  quoted_labor DECIMAL(15, 2),
  quoted_subcontractors DECIMAL(15, 2),
  quoted_expenses DECIMAL(15, 2),
  system_size_kw DECIMAL(10, 2),
  expected_duration_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Quote line items
CREATE TABLE public.quote_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id),
  quote_product_name TEXT, -- For BOM mapping
  quantity DECIMAL(15, 4) NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  total DECIMAL(15, 2) NOT NULL,
  line_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quote BOM mapping (Quote Product Name → catalog items)
CREATE TABLE public.quote_bom_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_product_name TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(quote_product_name, item_id)
);

-- Event ledger (append-only source of truth)
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_uuid UUID NOT NULL, -- Client-generated UUID for duplicate detection
  event_type event_type NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  payload JSONB NOT NULL, -- Typed payload per event type
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_id TEXT,
  reason TEXT, -- For corrections
  reversed_by UUID REFERENCES public.events(id), -- Points to reversing event
  hidden BOOLEAN NOT NULL DEFAULT false, -- For admin "Eliminar"
  duplicate_flag BOOLEAN NOT NULL DEFAULT false,
  geolocation JSONB, -- {lat, lng} if available
  CONSTRAINT events_client_uuid_unique UNIQUE(client_uuid)
);

-- Cash box (per installer)
CREATE TABLE public.cash_boxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Omission rules
CREATE TABLE public.omission_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  project_status project_status,
  event_type event_type NOT NULL,
  min_count INTEGER NOT NULL,
  days_window INTEGER NOT NULL,
  project_type project_type,
  min_size_kw DECIMAL(10, 2),
  max_size_kw DECIMAL(10, 2),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Projection tables (read models, computed server-side)
CREATE TABLE public.project_costs_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  materials_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  labor_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  subcontractor_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  expense_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, date)
);

CREATE TABLE public.project_revenue_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  invoice_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  payment_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  change_order_revenue DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_revenue DECIMAL(15, 2) NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, date)
);

CREATE TABLE public.cash_ledger_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  cash_in DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cash_out DECIMAL(15, 2) NOT NULL DEFAULT 0,
  net_cash_flow DECIMAL(15, 2) NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date)
);

CREATE TABLE public.ar_aging_snapshot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  invoice_id UUID NOT NULL, -- Reference to event
  invoice_date DATE NOT NULL,
  invoice_amount DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  outstanding_amount DECIMAL(15, 2) NOT NULL,
  days_old INTEGER NOT NULL,
  snapshot_date DATE NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(invoice_id, snapshot_date)
);

CREATE TABLE public.ap_aging_snapshot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_name TEXT NOT NULL,
  bill_id UUID NOT NULL, -- Reference to event
  bill_date DATE NOT NULL,
  bill_amount DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  outstanding_amount DECIMAL(15, 2) NOT NULL,
  days_old INTEGER NOT NULL,
  snapshot_date DATE NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bill_id, snapshot_date)
);

CREATE TABLE public.project_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  gross_margin DECIMAL(15, 2),
  gross_margin_percent DECIMAL(5, 2),
  gross_margin_per_watt DECIMAL(10, 4),
  total_cost DECIMAL(15, 2),
  total_revenue DECIMAL(15, 2),
  procurement_variance DECIMAL(15, 2),
  soft_cost_ratio DECIMAL(5, 2),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, date)
);

CREATE TABLE public.client_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_projects INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  average_margin_percent DECIMAL(5, 2),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, date)
);

-- Processing checkpoint for incremental updates
CREATE TABLE public.projection_checkpoint (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_processed_event_id UUID REFERENCES public.events(id),
  last_processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Indexes for performance
CREATE INDEX idx_events_project_id ON public.events(project_id);
CREATE INDEX idx_events_created_by ON public.events(created_by);
CREATE INDEX idx_events_created_at ON public.events(created_at);
CREATE INDEX idx_events_event_type ON public.events(event_type);
CREATE INDEX idx_events_hidden ON public.events(hidden) WHERE hidden = false;
CREATE INDEX idx_events_duplicate_flag ON public.events(duplicate_flag) WHERE duplicate_flag = true;
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_human_id ON public.projects(human_id);
CREATE INDEX idx_items_sku ON public.items(sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_items_name_trgm ON public.items USING gin(name gin_trgm_ops);
CREATE INDEX idx_project_costs_daily_project_date ON public.project_costs_daily(project_id, date);
CREATE INDEX idx_project_revenue_daily_project_date ON public.project_revenue_daily(project_id, date);
CREATE INDEX idx_ar_aging_snapshot_date ON public.ar_aging_snapshot(snapshot_date);
CREATE INDEX idx_ap_aging_snapshot_date ON public.ap_aging_snapshot(snapshot_date);

-- Partial unique indexes (for nullable columns)
CREATE UNIQUE INDEX idx_items_sku_unique ON public.items(sku) WHERE sku IS NOT NULL;
CREATE UNIQUE INDEX idx_labor_rates_user_effective_unique ON public.labor_rates(user_id, effective_from) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_labor_rates_role_effective_unique ON public.labor_rates(role_name, effective_from) WHERE role_name IS NOT NULL;

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salespeople ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_bom_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omission_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies will be added in a separate migration after auth setup
-- For now, we'll create basic policies

-- Users can see themselves and admins can see all
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'developer');

-- Installers can only see their own events
CREATE POLICY "Installers see own events" ON public.events
  FOR SELECT USING (
    created_by = auth.uid() OR
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'manager', 'developer')
  );

-- Installers can insert their own events
CREATE POLICY "Installers insert own events" ON public.events
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Admins can see all events (including hidden ones via separate query)
CREATE POLICY "Admins see all events" ON public.events
  FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'developer')
  );

-- Projects: installers see projects they have events for, admins/managers see all
CREATE POLICY "Projects visibility" ON public.projects
  FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'manager', 'developer') OR
    EXISTS (SELECT 1 FROM public.events WHERE events.project_id = projects.id AND events.created_by = auth.uid())
  );

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_bom_mapping_updated_at BEFORE UPDATE ON public.quote_bom_mapping
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_omission_rules_updated_at BEFORE UPDATE ON public.omission_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initialize checkpoint
INSERT INTO public.projection_checkpoint (id, last_processed_event_id, last_processed_at) 
VALUES (1, NULL, NOW()) ON CONFLICT (id) DO NOTHING;

