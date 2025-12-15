-- ============================================
-- FIX DUPLICATE CONTRACT REQUESTS
-- Delete sample data yang dobel
-- ============================================

-- Step 1: Check current data
SELECT 
  company_name,
  COUNT(*) as count,
  STRING_AGG(id::TEXT, ', ') as ids
FROM public.contract_requests
WHERE company_name IN (
  'PT Maju Jaya Elektronik',
  'Hotel Grand Permata',
  'RS Sehat Sentosa',
  'Warung Kopi Sejahtera'
)
GROUP BY company_name
HAVING COUNT(*) > 1
ORDER BY company_name;

-- Step 2: Delete ALL sample data (will re-insert clean data)
DELETE FROM public.contract_requests
WHERE company_name IN (
  'PT Maju Jaya Elektronik',
  'Hotel Grand Permata',
  'RS Sehat Sentosa',
  'Warung Kopi Sejahtera'
);

-- Step 3: Verify deletion
SELECT 
  COUNT(*) as remaining_records
FROM public.contract_requests;

-- Step 4: Re-insert clean data (1x only)
INSERT INTO public.contract_requests (
  company_name,
  contact_person,
  phone,
  email,
  address,
  city,
  province,
  unit_count,
  location_count,
  preferred_frequency,
  notes,
  status,
  quotation_amount,
  quotation_notes,
  quotation_sent_at,
  created_at
) VALUES
-- Request 1: Pending (baru masuk)
(
  'PT Maju Jaya Elektronik',
  'Budi Santoso',
  '081234567890',
  'budi@majujaya.com',
  'Jl. Sudirman No. 123, Blok A',
  'Jakarta Pusat',
  'DKI Jakarta',
  25,
  3,
  'monthly',
  'Kami memiliki 3 lokasi kantor cabang yang membutuhkan perawatan rutin bulanan. Total 25 unit AC split dan cassette.',
  'pending',
  NULL,
  NULL,
  NULL,
  NOW() - INTERVAL '2 days'
),

-- Request 2: Quoted (sudah dikirim penawaran)
(
  'Hotel Grand Permata',
  'Siti Nurhaliza',
  '082345678901',
  'info@grandpermata.com',
  'Jl. MH Thamrin No. 456',
  'Jakarta Selatan',
  'DKI Jakarta',
  50,
  1,
  'quarterly',
  'Hotel bintang 4 dengan 50 unit AC VRV. Butuh perawatan berkala setiap 3 bulan.',
  'quoted',
  12500000,
  'Penawaran maintenance quarterly untuk 50 unit AC VRV:
- Cleaning indoor & outdoor unit
- Pengecekan refrigerant
- Electrical check
- Report maintenance digital
- Garansi spare part 30 hari

Harga: Rp 12.500.000 per quarter (sudah include biaya transportasi)',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '5 days'
),

-- Request 3: Approved (sudah disetujui)
(
  'RS Sehat Sentosa',
  'Dr. Ahmad Fauzi',
  '083456789012',
  'admin@rssehat.com',
  'Jl. Gatot Subroto No. 789',
  'Bandung',
  'Jawa Barat',
  80,
  1,
  'monthly',
  'Rumah sakit dengan 80 unit AC central dan split. Perlu perawatan bulanan karena operasional 24/7.',
  'approved',
  28000000,
  'Paket maintenance bulanan RS Sehat Sentosa:
- 80 unit AC (central + split)
- Kunjungan 2x per bulan
- Emergency call 24/7
- Cleaning & checking menyeluruh
- Replacement part gratis untuk kerusakan normal

Harga kontrak tahunan: Rp 336.000.000 (Rp 28jt/bulan)
Pembayaran quarterly',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '7 days'
),

-- Request 4: Rejected (ditolak)
(
  'Warung Kopi Sejahtera',
  'Andi Wijaya',
  '084567890123',
  'andi@kopiku.com',
  'Jl. Kemanggisan No. 45',
  'Jakarta Barat',
  'DKI Jakarta',
  3,
  1,
  'semi_annual',
  'Warung kopi kecil dengan 3 unit AC split. Budget terbatas.',
  'rejected',
  NULL,
  NULL,
  NULL,
  NOW() - INTERVAL '10 days'
);

-- Step 5: Verify clean data
SELECT 
  company_name,
  contact_person,
  city,
  unit_count,
  status,
  TO_CHAR(created_at, 'DD Mon YYYY') as created_date,
  COUNT(*) OVER (PARTITION BY company_name) as duplicate_check
FROM public.contract_requests
WHERE company_name IN (
  'PT Maju Jaya Elektronik',
  'Hotel Grand Permata',
  'RS Sehat Sentosa',
  'Warung Kopi Sejahtera'
)
ORDER BY created_at DESC;

-- Success message
DO $$
DECLARE
  total_records INT;
BEGIN
  SELECT COUNT(*) INTO total_records FROM public.contract_requests;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Contract requests cleaned and re-inserted!';
  RAISE NOTICE '';
  RAISE NOTICE 'Total records: %', total_records;
  RAISE NOTICE '';
  RAISE NOTICE '📊 Data:';
  RAISE NOTICE '   • PT Maju Jaya Elektronik - Pending';
  RAISE NOTICE '   • Hotel Grand Permata - Quoted';
  RAISE NOTICE '   • RS Sehat Sentosa - Approved';
  RAISE NOTICE '   • Warung Kopi Sejahtera - Rejected';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Each company should appear ONCE only';
  RAISE NOTICE '';
END $$;
