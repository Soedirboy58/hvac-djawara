-- ============================================
-- ADD ORDER SOURCE TRACKING & APPROVAL DOCUMENTS
-- Tracks how orders were created and stores approval documentation
-- ============================================

-- Create order_source enum type
DO $$ 
BEGIN
    CREATE TYPE order_source AS ENUM (
        'landing_page',      -- Automatic: Customer ordered via website
        'customer_request',  -- Manual: Customer requested schedule
        'approved_proposal', -- Manual: Proposal accepted with approval proof
        'admin_manual',      -- Manual: Admin created without specific source
        'phone_call',        -- Manual: Order via phone
        'email',            -- Manual: Order via email
        'walk_in'           -- Manual: Customer walk-in
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'order_source type already exists';
END $$;

-- Add order_source column to service_orders
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS order_source order_source DEFAULT 'admin_manual';

-- Add approval_documents column (JSONB array of document metadata)
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS approval_documents JSONB DEFAULT '[]'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_orders_order_source 
ON service_orders(order_source);

CREATE INDEX IF NOT EXISTS idx_service_orders_approval_documents 
ON service_orders USING gin(approval_documents);

-- Add comments for documentation
COMMENT ON COLUMN service_orders.order_source IS 'How this order was created - automatic via landing page or manual entry by admin';
COMMENT ON COLUMN service_orders.approval_documents IS 'Array of approval documents (SPK, approval proofs, etc.) with URLs and metadata';

-- Verify columns added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'service_orders'
AND column_name IN ('order_source', 'approval_documents');

-- Sample approval_documents structure:
-- [
--   {
--     "id": "uuid",
--     "name": "SPK_Project_ABC.pdf",
--     "url": "https://storage-url/path/to/file.pdf",
--     "type": "application/pdf",
--     "size": 1024567,
--     "uploadedAt": "2024-12-16T10:30:00Z",
--     "uploadedBy": "user-uuid",
--     "category": "spk" | "approval" | "proposal" | "other"
--   }
-- ]

-- Helper function to add approval document
CREATE OR REPLACE FUNCTION add_approval_document(
    p_order_id UUID,
    p_document JSONB
)
RETURNS VOID AS $$
BEGIN
    UPDATE service_orders
    SET approval_documents = approval_documents || jsonb_build_array(p_document)
    WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to remove approval document by id
CREATE OR REPLACE FUNCTION remove_approval_document(
    p_order_id UUID,
    p_document_id TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE service_orders
    SET approval_documents = (
        SELECT jsonb_agg(doc)
        FROM jsonb_array_elements(approval_documents) doc
        WHERE doc->>'id' != p_document_id
    )
    WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample queries:

-- Get orders with approval documents
SELECT 
    order_number,
    service_title,
    order_source,
    jsonb_array_length(approval_documents) as document_count,
    approval_documents
FROM service_orders
WHERE jsonb_array_length(approval_documents) > 0
ORDER BY created_at DESC;

-- Get orders by source
SELECT 
    order_source,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders
FROM service_orders
GROUP BY order_source
ORDER BY total_orders DESC;

-- Get orders with specific document type
SELECT 
    order_number,
    service_title,
    doc->>'name' as document_name,
    doc->>'category' as document_category,
    doc->>'uploadedAt' as uploaded_at
FROM service_orders,
     jsonb_array_elements(approval_documents) doc
WHERE doc->>'category' = 'spk'
ORDER BY created_at DESC;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_approval_document(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_approval_document(UUID, TEXT) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Order source tracking and approval documents added successfully!';
    RAISE NOTICE '📋 Available order sources: landing_page, customer_request, approved_proposal, admin_manual, phone_call, email, walk_in';
    RAISE NOTICE '📎 Approval documents stored as JSONB array with metadata';
END $$;
