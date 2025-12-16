-- ============================================
-- ADD SALES REFERRAL TRACKING TO SERVICE ORDERS
-- Track which sales/marketing person brought the job
-- ============================================

-- Add sales_referral_id column to service_orders
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS sales_referral_id UUID REFERENCES profiles(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_service_orders_sales_referral 
ON service_orders(sales_referral_id);

-- Add comment for documentation
COMMENT ON COLUMN service_orders.sales_referral_id IS 'Sales/Marketing person who brought this job (for commission tracking)';

-- Verify column added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'service_orders'
AND column_name = 'sales_referral_id';

-- Create view for sales performance tracking
CREATE OR REPLACE VIEW sales_performance AS
SELECT 
    p.id as sales_id,
    p.full_name as sales_name,
    utr.role as sales_role,
    COUNT(so.id) as total_jobs,
    COUNT(CASE WHEN so.status = 'completed' THEN 1 END) as completed_jobs,
    COUNT(CASE WHEN so.status IN ('listing', 'pending', 'scheduled', 'in_progress') THEN 1 END) as active_jobs,
    MIN(so.created_at) as first_job_date,
    MAX(so.created_at) as latest_job_date
FROM profiles p
JOIN user_tenant_roles utr ON p.id = utr.user_id
LEFT JOIN service_orders so ON p.id = so.sales_referral_id
WHERE utr.role IN ('sales', 'marketing', 'business_dev', 'account_manager')
AND utr.is_active = true
GROUP BY p.id, p.full_name, utr.role
ORDER BY total_jobs DESC;

-- Grant access to view
GRANT SELECT ON sales_performance TO authenticated;

-- Sample query: Get top performers
SELECT 
    sales_name,
    sales_role,
    total_jobs,
    completed_jobs,
    ROUND(completed_jobs::numeric / NULLIF(total_jobs, 0) * 100, 2) as completion_rate
FROM sales_performance
WHERE total_jobs > 0
ORDER BY total_jobs DESC
LIMIT 10;

-- Sample query: Get sales referral details for an order
SELECT 
    so.order_number,
    so.service_title,
    so.status,
    p.full_name as referred_by,
    utr.role as referral_role,
    so.created_at as job_date
FROM service_orders so
LEFT JOIN profiles p ON so.sales_referral_id = p.id
LEFT JOIN user_tenant_roles utr ON p.id = utr.user_id
WHERE so.sales_referral_id IS NOT NULL
ORDER BY so.created_at DESC
LIMIT 20;
