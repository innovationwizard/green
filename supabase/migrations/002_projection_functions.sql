-- Function to compute project costs for a given date range
CREATE OR REPLACE FUNCTION compute_project_costs_daily(
  start_date DATE,
  end_date DATE
)
RETURNS void AS $$
DECLARE
  loop_date DATE;
  event_record RECORD;
BEGIN
  -- Clear existing data for the date range
  DELETE FROM public.project_costs_daily
  WHERE date >= start_date AND date <= end_date;

  -- Process each day in the range
  loop_date := start_date;
  WHILE loop_date <= end_date LOOP
    -- Aggregate costs by project for this day
    INSERT INTO public.project_costs_daily (
      project_id,
      date,
      materials_cost,
      labor_cost,
      subcontractor_cost,
      expense_cost,
      total_cost,
      computed_at
    )
    SELECT
      e.project_id,
      loop_date,
      COALESCE(SUM(
        CASE WHEN e.event_type IN ('MATERIAL_ADDED', 'CREDIT_PURCHASE_RECORDED')
        THEN (e.payload->>'items')::jsonb @> '[]'::jsonb
          ? (SELECT SUM((item->>'quantity')::numeric * (item->>'unit_cost')::numeric)
             FROM jsonb_array_elements(e.payload->'items') item)
          : 0
        ELSE 0 END
      ), 0) as materials_cost,
      COALESCE(SUM(
        CASE WHEN e.event_type = 'LABOR_LOGGED'
        THEN (e.payload->>'hours')::numeric * (
          SELECT rate_per_hour
          FROM public.labor_rates
          WHERE user_id = e.created_by
            AND effective_from <= loop_date
            AND (effective_to IS NULL OR effective_to >= loop_date)
          ORDER BY effective_from DESC
          LIMIT 1
        )
        ELSE 0 END
      ), 0) as labor_cost,
      COALESCE(SUM(
        CASE WHEN e.event_type = 'SUBCONTRACTOR_COST'
        THEN (e.payload->>'amount')::numeric
        ELSE 0 END
      ), 0) as subcontractor_cost,
      COALESCE(SUM(
        CASE WHEN e.event_type = 'EXPENSE_LOGGED'
        THEN (e.payload->>'amount')::numeric
        ELSE 0 END
      ), 0) as expense_cost,
      COALESCE(SUM(
        CASE WHEN e.event_type IN ('MATERIAL_ADDED', 'CREDIT_PURCHASE_RECORDED')
        THEN (SELECT SUM((item->>'quantity')::numeric * (item->>'unit_cost')::numeric)
              FROM jsonb_array_elements(e.payload->'items') item)
        WHEN e.event_type = 'LABOR_LOGGED'
        THEN (e.payload->>'hours')::numeric * (
          SELECT rate_per_hour
          FROM public.labor_rates
          WHERE user_id = e.created_by
            AND effective_from <= loop_date
            AND (effective_to IS NULL OR effective_to >= loop_date)
          ORDER BY effective_from DESC
          LIMIT 1
        )
        WHEN e.event_type = 'SUBCONTRACTOR_COST'
        THEN (e.payload->>'amount')::numeric
        WHEN e.event_type = 'EXPENSE_LOGGED'
        THEN (e.payload->>'amount')::numeric
        ELSE 0 END
      ), 0) as total_cost,
      NOW() as computed_at
    FROM public.events e
    WHERE DATE(e.created_at) = loop_date
      AND e.hidden = false
      AND e.project_id IS NOT NULL
    GROUP BY e.project_id
    ON CONFLICT (project_id, date) DO UPDATE SET
      materials_cost = EXCLUDED.materials_cost,
      labor_cost = EXCLUDED.labor_cost,
      subcontractor_cost = EXCLUDED.subcontractor_cost,
      expense_cost = EXCLUDED.expense_cost,
      total_cost = EXCLUDED.total_cost,
      computed_at = NOW();

    loop_date := loop_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to compute project revenue for a given date range
CREATE OR REPLACE FUNCTION compute_project_revenue_daily(
  start_date DATE,
  end_date DATE
)
RETURNS void AS $$
DECLARE
  loop_date DATE;
BEGIN
  DELETE FROM public.project_revenue_daily
  WHERE date >= start_date AND date <= end_date;

  loop_date := start_date;
  WHILE loop_date <= end_date LOOP
    INSERT INTO public.project_revenue_daily (
      project_id,
      date,
      invoice_amount,
      payment_amount,
      change_order_revenue,
      total_revenue,
      computed_at
    )
    SELECT
      e.project_id,
      loop_date,
      COALESCE(SUM(
        CASE WHEN e.event_type = 'CLIENT_INVOICE_ISSUED'
        THEN (e.payload->>'amount')::numeric
        ELSE 0 END
      ), 0) as invoice_amount,
      COALESCE(SUM(
        CASE WHEN e.event_type = 'CLIENT_PAYMENT_RECEIVED'
        THEN (e.payload->>'amount')::numeric
        ELSE 0 END
      ), 0) as payment_amount,
      COALESCE(SUM(
        CASE WHEN e.event_type = 'CHANGE_ORDER_ADDED'
        THEN COALESCE((e.payload->>'revenue_delta')::numeric, 0)
        ELSE 0 END
      ), 0) as change_order_revenue,
      COALESCE(SUM(
        CASE WHEN e.event_type = 'CLIENT_INVOICE_ISSUED'
        THEN (e.payload->>'amount')::numeric
        WHEN e.event_type = 'CLIENT_PAYMENT_RECEIVED'
        THEN (e.payload->>'amount')::numeric
        WHEN e.event_type = 'CHANGE_ORDER_ADDED'
        THEN COALESCE((e.payload->>'revenue_delta')::numeric, 0)
        ELSE 0 END
      ), 0) as total_revenue,
      NOW() as computed_at
    FROM public.events e
    WHERE DATE(e.created_at) = loop_date
      AND e.hidden = false
      AND e.project_id IS NOT NULL
    GROUP BY e.project_id
    ON CONFLICT (project_id, date) DO UPDATE SET
      invoice_amount = EXCLUDED.invoice_amount,
      payment_amount = EXCLUDED.payment_amount,
      change_order_revenue = EXCLUDED.change_order_revenue,
      total_revenue = EXCLUDED.total_revenue,
      computed_at = NOW();

    loop_date := loop_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update projection checkpoint
CREATE OR REPLACE FUNCTION update_projection_checkpoint()
RETURNS void AS $$
DECLARE
  last_event_id UUID;
BEGIN
  SELECT id INTO last_event_id
  FROM public.events
  WHERE hidden = false
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.projection_checkpoint
  SET
    last_processed_event_id = last_event_id,
    last_processed_at = NOW()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

