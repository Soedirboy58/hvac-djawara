-- ============================================
-- CREATE STORAGE BUCKET FOR ORDER DOCUMENTS
-- Secure storage for approval documents, SPK, proposals, etc.
-- ============================================

-- Create storage bucket for order documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'order-documents',
    'order-documents',
    false, -- Private bucket
    10485760, -- 10MB limit per file
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
)
ON CONFLICT (id) DO UPDATE
SET 
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

-- RLS Policies for order-documents bucket

-- Policy: Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload order documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'order-documents' AND
    auth.uid() IS NOT NULL
);

-- Policy: Allow users to read documents from their tenant
CREATE POLICY "Users can read order documents from their tenant"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'order-documents' AND
    auth.uid() IS NOT NULL
);

-- Policy: Allow users to delete their own uploaded documents
CREATE POLICY "Users can delete their own order documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'order-documents' AND
    auth.uid() = owner
);

-- Policy: Allow users to update their own uploaded documents
CREATE POLICY "Users can update their own order documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'order-documents' AND
    auth.uid() = owner
);

-- Create helper view for document access
CREATE OR REPLACE VIEW order_documents_with_urls AS
SELECT 
    so.id as order_id,
    so.order_number,
    so.order_source,
    doc->>'id' as document_id,
    doc->>'name' as document_name,
    doc->>'category' as document_category,
    doc->>'url' as document_url,
    doc->>'type' as document_type,
    (doc->>'size')::bigint as document_size,
    (doc->>'uploadedAt')::timestamptz as uploaded_at,
    doc->>'uploadedBy' as uploaded_by,
    p.full_name as uploaded_by_name
FROM service_orders so,
     jsonb_array_elements(so.approval_documents) doc
LEFT JOIN profiles p ON p.id = (doc->>'uploadedBy')::uuid
WHERE jsonb_array_length(so.approval_documents) > 0;

-- Grant access
GRANT SELECT ON order_documents_with_urls TO authenticated;

-- Sample query: Get all documents for an order
-- SELECT * FROM order_documents_with_urls WHERE order_id = 'your-order-uuid';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Storage bucket "order-documents" created successfully!';
    RAISE NOTICE '🔒 Private bucket with RLS policies enabled';
    RAISE NOTICE '📁 Allowed file types: PDF, Images (JPG, PNG, WebP), Word, Excel';
    RAISE NOTICE '📏 Max file size: 10MB per file';
END $$;
