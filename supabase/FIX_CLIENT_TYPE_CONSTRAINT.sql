-- ============================================
-- FIX CLIENT TYPE CONSTRAINT
-- Update clients table to accept new 8 client types
-- ============================================

-- Drop old constraint
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_client_type_check;

-- Add new constraint with 8 types
ALTER TABLE public.clients ADD CONSTRAINT clients_client_type_check 
  CHECK (client_type IN (
    'rumah_tangga', 
    'perkantoran', 
    'komersial', 
    'perhotelan', 
    'sekolah_universitas', 
    'gedung_pertemuan', 
    'kantor_pemerintah', 
    'pabrik_industri'
  ));

-- Update existing client types to new values (if any)
UPDATE public.clients 
SET client_type = CASE 
  WHEN client_type = 'residential' THEN 'rumah_tangga'
  WHEN client_type = 'commercial' THEN 'perkantoran'
  ELSE client_type
END
WHERE client_type IN ('residential', 'commercial');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Client type constraint updated successfully!';
  RAISE NOTICE 'Now accepts 8 types: rumah_tangga, perkantoran, komersial, perhotelan, sekolah_universitas, gedung_pertemuan, kantor_pemerintah, pabrik_industri';
END $$;
