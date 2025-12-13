-- Migration: Extend order_type enum with new values
-- Description: Add 'konsultasi' and 'pengadaan' to existing order_type enum

-- Add new order types if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'konsultasi' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_type')
    ) THEN
        ALTER TYPE order_type ADD VALUE 'konsultasi';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'pengadaan' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_type')
    ) THEN
        ALTER TYPE order_type ADD VALUE 'pengadaan';
    END IF;
END $$;

-- Comment on enum values
COMMENT ON TYPE order_type IS 'Types of service orders: pemasangan, perbaikan, perawatan, konsultasi, pengadaan';
