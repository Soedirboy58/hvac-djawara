-- ============================================
-- CLIENT PUBLIC VIEW TOKEN SYSTEM
-- Share unique link to client for viewing their data
-- No login required, premium upgrade optional
-- ============================================

-- ================================================
-- ADD PUBLIC VIEW TOKEN TO CLIENTS
-- ================================================

ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS public_view_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS public_view_token_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_view_last_accessed TIMESTAMPTZ;

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_clients_public_token 
  ON public.clients(public_view_token) 
  WHERE public_view_token IS NOT NULL;

COMMENT ON COLUMN public.clients.public_view_token IS 
'Permanent token untuk public view link.
Client bisa lihat data mereka tanpa login via link ini.
Token tidak expire - permanent per client.
Format: 32 char random string.';

-- ================================================
-- FUNCTION: Generate Public View Link
-- ================================================

CREATE OR REPLACE FUNCTION public.generate_public_view_link(
  p_client_id UUID
)
RETURNS TABLE (
  token TEXT,
  public_link TEXT,
  whatsapp_link TEXT
) AS $$
DECLARE
  v_token TEXT;
  v_base_url TEXT := 'https://hvac-djawara.vercel.app';
  v_client RECORD;
BEGIN
  -- Use new public_token column
  SELECT public_token INTO v_token
  FROM public.clients
  WHERE id = p_client_id;
  
  -- Generate new token if not exists
  IF v_token IS NULL THEN
    v_token := encode(gen_random_bytes(32), 'hex');
    
    UPDATE public.clients
    SET public_token = v_token
    WHERE id = p_client_id;
  END IF;
  
  -- Get client info for WhatsApp message
  SELECT name, phone INTO v_client
  FROM public.clients
  WHERE id = p_client_id;
  
  -- Return links
  RETURN QUERY
  SELECT 
    v_token,
    v_base_url || '/c/' || v_token,
    'https://wa.me/' || regexp_replace(v_client.phone, '[^0-9]', '', 'g') || 
    '?text=' || encode(
      ('Halo ' || v_client.name || ',%0A%0A' ||
       'Terima kasih telah menggunakan layanan kami! 🎉%0A%0A' ||
       '📱 Lihat data service Anda disini:%0A' ||
       v_base_url || '/c/' || v_token || '%0A%0A' ||
       '✨ Upgrade ke Member Premium untuk mendapat:%0A' ||
       '• Loyalty Points%0A' ||
       '• Priority Service%0A' ||
       '• Exclusive Discounts%0A%0A' ||
       'Salam,%0AHVAC Djawara Team')::bytea, 
      'escape'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.generate_public_view_link IS 
'Generate permanent public view link untuk client.
Token tidak expire - permanent per client.
Returns: token, public_link, whatsapp_link (pre-filled message).
Example: SELECT * FROM generate_public_view_link(client_id);';

-- ================================================
-- FUNCTION: Get Client Data by Public Token
-- ================================================

CREATE OR REPLACE FUNCTION public.get_client_by_public_token(
  p_token TEXT
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_type TEXT,
  portal_enabled BOOLEAN,
  portal_activated_at TIMESTAMPTZ,
  total_orders INT,
  loyalty_points INT
) AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Find client by token
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE public_view_token = p_token;
  
  IF v_client_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Update last accessed
  UPDATE public.clients
  SET public_view_last_accessed = NOW()
  WHERE id = v_client_id;
  
  -- Return client data
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.address,
    c.client_type,
    c.portal_enabled,
    c.portal_activated_at,
    COUNT(DISTINCT so.id)::INT as total_orders,
    COALESCE(c.loyalty_points, 0)::INT
  FROM public.clients c
  LEFT JOIN public.service_orders so ON so.client_id = c.id
  WHERE c.id = v_client_id
  GROUP BY c.id, c.name, c.email, c.phone, c.address, c.client_type, 
           c.portal_enabled, c.portal_activated_at, c.loyalty_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_client_by_public_token IS 
'Get client data via public token.
Used for public view page - no authentication required.
Updates last_accessed timestamp for analytics.';

-- ================================================
-- ADD LOYALTY POINTS COLUMN
-- ================================================

ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS loyalty_points INT DEFAULT 0;

COMMENT ON COLUMN public.clients.loyalty_points IS 
'Loyalty points untuk premium members.
Earned from completed services, referrals, etc.
Can be redeemed for discounts.';

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ PUBLIC VIEW TOKEN SYSTEM READY!';
  RAISE NOTICE '  - Each client gets permanent unique link';
  RAISE NOTICE '  - No login required to view data';
  RAISE NOTICE '  - Premium upgrade optional';
  RAISE NOTICE '  - WhatsApp share with pre-filled message';
END $$;
