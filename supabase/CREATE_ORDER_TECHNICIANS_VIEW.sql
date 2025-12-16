-- ============================================
-- CREATE VIEW FOR ORDER TECHNICIANS
-- Aggregates assigned technicians from work_order_assignments
-- ============================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS order_with_technicians;

-- Create a view that shows service orders with their assigned technicians
CREATE OR REPLACE VIEW order_with_technicians AS
SELECT 
  so.*,
  -- Aggregate technician names and IDs
  STRING_AGG(DISTINCT t.full_name, ', ' ORDER BY t.full_name) AS assigned_technician_names,
  STRING_AGG(DISTINCT t.id::text, ',') AS assigned_technician_ids,
  COUNT(DISTINCT woa.technician_id) AS technician_count,
  -- Client info
  c.name AS client_name,
  c.phone AS client_phone,
  c.email AS client_email,
  c.address AS client_address,
  c.type AS client_type,
  -- Creator info
  p.full_name AS creator_name
FROM service_orders so
LEFT JOIN clients c ON so.client_id = c.id
LEFT JOIN profiles p ON so.created_by = p.id
LEFT JOIN work_order_assignments woa ON so.id = woa.order_id
LEFT JOIN technicians t ON woa.technician_id = t.id
GROUP BY 
  so.id,
  so.tenant_id,
  so.client_id,
  so.order_number,
  so.order_type,
  so.status,
  so.priority,
  so.service_title,
  so.service_description,
  so.location_address,
  so.location_lat,
  so.location_lng,
  so.requested_date,
  so.scheduled_date,
  so.scheduled_time,
  so.estimated_duration,
  so.assigned_to,
  so.notes,
  so.is_survey,
  so.created_by,
  so.created_at,
  so.updated_at,
  c.name,
  c.phone,
  c.email,
  c.address,
  c.type,
  p.full_name;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_work_order_assignments_order_id 
ON work_order_assignments(order_id);

CREATE INDEX IF NOT EXISTS idx_work_order_assignments_technician_id 
ON work_order_assignments(technician_id);

-- Grant permissions
GRANT SELECT ON order_with_technicians TO authenticated;

-- Add RLS policy for the view (inherits from base tables)
ALTER VIEW order_with_technicians SET (security_invoker = on);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ order_with_technicians view created successfully!';
    RAISE NOTICE '📋 This view aggregates all assigned technicians for each order';
    RAISE NOTICE '🔧 Fields: assigned_technician_names, assigned_technician_ids, technician_count';
END $$;
