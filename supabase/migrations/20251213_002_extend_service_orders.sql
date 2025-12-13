-- Migration: Extend service_orders table
-- Description: Add sales tracking and actual time tracking columns

-- Add new columns to service_orders table
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS sales_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ;

-- Add comments to new columns
COMMENT ON COLUMN service_orders.sales_id IS 'Sales person who created this order';
COMMENT ON COLUMN service_orders.actual_start_time IS 'Actual time when technician started the job';
COMMENT ON COLUMN service_orders.actual_end_time IS 'Actual time when technician completed the job';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_orders_sales_id 
ON service_orders(sales_id);

CREATE INDEX IF NOT EXISTS idx_service_orders_actual_start_time 
ON service_orders(actual_start_time);

CREATE INDEX IF NOT EXISTS idx_service_orders_actual_end_time 
ON service_orders(actual_end_time);

-- Create composite index for time range queries
CREATE INDEX IF NOT EXISTS idx_service_orders_actual_times 
ON service_orders(actual_start_time, actual_end_time) 
WHERE actual_start_time IS NOT NULL;
