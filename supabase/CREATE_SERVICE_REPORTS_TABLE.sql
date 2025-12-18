-- ============================================
-- Service Reports Table
-- Store technician work reports and client ratings
-- ============================================

CREATE TABLE IF NOT EXISTS service_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Work timestamps
  work_started_at TIMESTAMPTZ NOT NULL,
  work_completed_at TIMESTAMPTZ NOT NULL,
  
  -- Work details
  work_description TEXT NOT NULL,
  findings TEXT,
  recommendations TEXT,
  parts_used JSONB DEFAULT '[]'::jsonb,
  
  -- Photos
  before_photos TEXT[] DEFAULT '{}',
  after_photos TEXT[] DEFAULT '{}',
  
  -- Signatures
  client_signature TEXT,
  technician_signature TEXT,
  
  -- Client rating (Premium feature)
  technician_rating INTEGER CHECK (technician_rating >= 1 AND technician_rating <= 5),
  client_feedback TEXT,
  rated_at TIMESTAMPTZ,
  
  -- Metadata
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(service_order_id)  -- One report per order
);

-- Indexes
CREATE INDEX idx_service_reports_order ON service_reports(service_order_id);
CREATE INDEX idx_service_reports_technician ON service_reports(technician_id);
CREATE INDEX idx_service_reports_tenant ON service_reports(tenant_id);
CREATE INDEX idx_service_reports_rating ON service_reports(technician_rating) WHERE technician_rating IS NOT NULL;

-- RLS Policies
ALTER TABLE service_reports ENABLE ROW LEVEL SECURITY;

-- Technicians can insert their own reports
CREATE POLICY "Technicians can create reports"
  ON service_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = technician_id
    AND tenant_id = (SELECT active_tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Technicians can update their own reports (before rating)
CREATE POLICY "Technicians can update own reports"
  ON service_reports FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = technician_id
    AND technician_rating IS NULL  -- Cannot edit after client rated
  )
  WITH CHECK (
    auth.uid() = technician_id
    AND technician_rating IS NULL
  );

-- Staff can view all reports in their tenant
CREATE POLICY "Staff can view reports"
  ON service_reports FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT active_tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Public access for client portal (via RPC function with token validation)
CREATE POLICY "Allow service role full access"
  ON service_reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Note: Client access is handled through RPC functions with public token validation
-- No direct authenticated access for clients since they don't have user accounts

-- Updated timestamp trigger
CREATE TRIGGER update_service_reports_updated_at
  BEFORE UPDATE ON service_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RPC Functions for Client Portal Access
-- ================================================

-- Function: Get service report by order ID with token validation
CREATE OR REPLACE FUNCTION get_service_report_by_order(
  p_order_id UUID,
  p_client_token TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  service_order_id UUID,
  technician_id UUID,
  technician_name TEXT,
  work_started_at TIMESTAMPTZ,
  work_completed_at TIMESTAMPTZ,
  work_description TEXT,
  findings TEXT,
  recommendations TEXT,
  parts_used JSONB,
  before_photos TEXT[],
  after_photos TEXT[],
  technician_rating INTEGER,
  client_feedback TEXT,
  rated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate client has access to this order
  IF p_client_token IS NOT NULL THEN
    -- Public token access
    IF NOT EXISTS (
      SELECT 1 FROM service_orders so
      JOIN clients c ON c.id = so.client_id
      WHERE so.id = p_order_id 
      AND c.public_token = p_client_token
    ) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  ELSE
    -- Authenticated staff access
    IF NOT EXISTS (
      SELECT 1 FROM service_orders so
      WHERE so.id = p_order_id
      AND so.tenant_id = (SELECT active_tenant_id FROM profiles WHERE id = auth.uid())
    ) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;

  -- Return report data
  RETURN QUERY
  SELECT 
    sr.id,
    sr.service_order_id,
    sr.technician_id,
    p.full_name as technician_name,
    sr.work_started_at,
    sr.work_completed_at,
    sr.work_description,
    sr.findings,
    sr.recommendations,
    sr.parts_used,
    sr.before_photos,
    sr.after_photos,
    sr.technician_rating,
    sr.client_feedback,
    sr.rated_at,
    sr.created_at
  FROM service_reports sr
  LEFT JOIN profiles p ON p.id = sr.technician_id
  WHERE sr.service_order_id = p_order_id;
END;
$$;

-- Function: Submit client rating (Premium feature)
CREATE OR REPLACE FUNCTION submit_service_rating(
  p_order_id UUID,
  p_rating INTEGER,
  p_feedback TEXT DEFAULT NULL,
  p_client_token TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_report_id UUID;
  v_client_id UUID;
BEGIN
  -- Validate rating
  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating must be between 1 and 5');
  END IF;

  -- Validate client access
  IF p_client_token IS NOT NULL THEN
    SELECT c.id INTO v_client_id
    FROM service_orders so
    JOIN clients c ON c.id = so.client_id
    WHERE so.id = p_order_id 
    AND c.public_token = p_client_token;
    
    IF v_client_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Access denied');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Token required');
  END IF;

  -- Check if report exists
  SELECT id INTO v_report_id
  FROM service_reports
  WHERE service_order_id = p_order_id;

  IF v_report_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No report found for this order');
  END IF;

  -- Check if already rated
  IF EXISTS (
    SELECT 1 FROM service_reports 
    WHERE id = v_report_id 
    AND technician_rating IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already rated');
  END IF;

  -- Update rating
  UPDATE service_reports
  SET 
    technician_rating = p_rating,
    client_feedback = p_feedback,
    rated_at = NOW()
  WHERE id = v_report_id;

  RETURN jsonb_build_object('success', true, 'message', 'Rating submitted successfully');
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_service_report_by_order TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_service_rating TO anon, authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ service_reports table created successfully';
  RAISE NOTICE '📊 Technicians can create and update reports';
  RAISE NOTICE '⭐ Clients can view reports and add ratings (Premium)';
  RAISE NOTICE '🔐 RPC functions for secure client portal access created';
END $$;
