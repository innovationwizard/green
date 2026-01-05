-- Migration: Rename Purchase Orders to Sales Orders
-- Renames purchase_orders → sales_orders and purchase_order_items → sales_order_items

-- Rename tables
ALTER TABLE public.purchase_order_items RENAME TO sales_order_items;
ALTER TABLE public.purchase_orders RENAME TO sales_orders;

-- Rename foreign key column
ALTER TABLE public.sales_order_items 
  RENAME COLUMN purchase_order_id TO sales_order_id;

-- Rename indexes
ALTER INDEX idx_purchase_orders_project_id RENAME TO idx_sales_orders_project_id;
ALTER INDEX idx_purchase_orders_po_number RENAME TO idx_sales_orders_po_number;
ALTER INDEX idx_purchase_orders_issue_date RENAME TO idx_sales_orders_issue_date;
ALTER INDEX idx_purchase_order_items_po_id RENAME TO idx_sales_order_items_so_id;
ALTER INDEX idx_purchase_order_items_article_number RENAME TO idx_sales_order_items_article_number;
ALTER INDEX idx_purchase_order_items_item_id RENAME TO idx_sales_order_items_item_id;

-- Rename trigger
DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON public.sales_orders;
CREATE TRIGGER update_sales_orders_updated_at 
BEFORE UPDATE ON public.sales_orders
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Drop old RLS policies
DROP POLICY IF EXISTS "Admins can view purchase orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Admins can insert purchase orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Admins can update purchase orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Admins can delete purchase orders" ON public.sales_orders;

DROP POLICY IF EXISTS "Admins can view purchase order items" ON public.sales_order_items;
DROP POLICY IF EXISTS "Admins can insert purchase order items" ON public.sales_order_items;
DROP POLICY IF EXISTS "Admins can update purchase order items" ON public.sales_order_items;
DROP POLICY IF EXISTS "Admins can delete purchase order items" ON public.sales_order_items;

-- Create new RLS policies for sales_orders
CREATE POLICY "Admins can view sales orders" ON public.sales_orders
  FOR SELECT USING (
    public.is_admin_or_developer() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'
  );

CREATE POLICY "Admins can insert sales orders" ON public.sales_orders
  FOR INSERT WITH CHECK (public.is_admin_or_developer());

CREATE POLICY "Admins can update sales orders" ON public.sales_orders
  FOR UPDATE USING (public.is_admin_or_developer());

CREATE POLICY "Admins can delete sales orders" ON public.sales_orders
  FOR DELETE USING (public.is_admin_or_developer());

-- Create new RLS policies for sales_order_items
CREATE POLICY "Admins can view sales order items" ON public.sales_order_items
  FOR SELECT USING (
    public.is_admin_or_developer() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'
  );

CREATE POLICY "Admins can insert sales order items" ON public.sales_order_items
  FOR INSERT WITH CHECK (public.is_admin_or_developer());

CREATE POLICY "Admins can update sales order items" ON public.sales_order_items
  FOR UPDATE USING (public.is_admin_or_developer());

CREATE POLICY "Admins can delete sales order items" ON public.sales_order_items
  FOR DELETE USING (public.is_admin_or_developer());

