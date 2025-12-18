-- ============================================
-- Update generate_public_view_link Function
-- Fix to use new public_token column
-- ============================================

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
  -- Use new public_token column (NOT public_view_token)
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

GRANT EXECUTE ON FUNCTION public.generate_public_view_link(UUID) TO authenticated, service_role;
