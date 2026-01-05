-- Migration: Add Purchase Order system
-- Enables tracking of procurement costs (what Green pays suppliers) vs revenue (what clients pay)

-- Add SAP article number column to items table for automatic matching
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS sap_article_number TEXT;

-- Create unique index for SAP article numbers (allows NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_sap_article_number_unique 
ON public.items(sap_article_number) 
WHERE sap_article_number IS NOT NULL;

-- Create index for SAP article number lookups
CREATE INDEX IF NOT EXISTS idx_items_sap_article_number 
ON public.items(sap_article_number) 
WHERE sap_article_number IS NOT NULL;

-- Purchase Orders (header)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,           -- "2657"
  vendor TEXT,                        -- SAP source or manual vendor name
  issue_date DATE NOT NULL,
  delivery_date DATE,
  salesperson_id UUID REFERENCES public.salespeople(id),
  subtotal DECIMAL(12,2),
  tax DECIMAL(12,2),
  total DECIMAL(12,2),
  source TEXT DEFAULT 'manual',       -- 'manual' | 'pdf_import' | 'sap_import'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Purchase Order Items (lines)
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  line_number INT NOT NULL,
  article_number TEXT,               -- SAP: "41111011935"
  item_id UUID REFERENCES public.items(id), -- Link to catalog item
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(12,6) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id 
ON public.purchase_orders(project_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number 
ON public.purchase_orders(po_number);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_issue_date 
ON public.purchase_orders(issue_date);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id 
ON public.purchase_order_items(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_article_number 
ON public.purchase_order_items(article_number) 
WHERE article_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_id 
ON public.purchase_order_items(item_id) 
WHERE item_id IS NOT NULL;

-- Add updated_at trigger for purchase_orders
CREATE TRIGGER update_purchase_orders_updated_at 
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_orders
-- SELECT: Admins, developers, and managers can view purchase orders
CREATE POLICY "Admins can view purchase orders" ON public.purchase_orders
  FOR SELECT USING (
    public.is_admin_or_developer() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'
  );

-- INSERT: Admins and developers can create purchase orders
CREATE POLICY "Admins can insert purchase orders" ON public.purchase_orders
  FOR INSERT WITH CHECK (public.is_admin_or_developer());

-- UPDATE: Admins and developers can update purchase orders
CREATE POLICY "Admins can update purchase orders" ON public.purchase_orders
  FOR UPDATE USING (public.is_admin_or_developer());

-- DELETE: Admins and developers can delete purchase orders
CREATE POLICY "Admins can delete purchase orders" ON public.purchase_orders
  FOR DELETE USING (public.is_admin_or_developer());

-- RLS Policies for purchase_order_items
-- SELECT: Admins, developers, and managers can view purchase order items
CREATE POLICY "Admins can view purchase order items" ON public.purchase_order_items
  FOR SELECT USING (
    public.is_admin_or_developer() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'
  );

-- INSERT: Admins and developers can create purchase order items
CREATE POLICY "Admins can insert purchase order items" ON public.purchase_order_items
  FOR INSERT WITH CHECK (public.is_admin_or_developer());

-- UPDATE: Admins and developers can update purchase order items
CREATE POLICY "Admins can update purchase order items" ON public.purchase_order_items
  FOR UPDATE USING (public.is_admin_or_developer());

-- DELETE: Admins and developers can delete purchase order items
CREATE POLICY "Admins can delete purchase order items" ON public.purchase_order_items
  FOR DELETE USING (public.is_admin_or_developer());

