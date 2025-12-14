# CASE STUDY: Bank Permata Multi-Cabang Contract
## Kontrak Maintenance dengan Frequency Berbeda per Room Type

---

## 📋 Kasus Nyata

**Client**: Bank Permata (Multiple Locations)
**Marketing**: Freelance Marketing External
**Locations**: Cabang Purbalingga + Cabang Purwokerto

### Kontrak Details:
- **Contract Period**: 1 tahun (12 bulan)
- **Service Type**: Cuci AC (Maintenance)

### Maintenance Frequency:
- **Ruang ATM + Server**: Setiap **BULAN** (monthly)
- **Ruang Lain** (staff, meeting, dll): Setiap **4 BULAN** (quarterly)

### Pricing Model (Markup):
- **Cost ke Perusahaan**: Rp 35.000/unit (untuk AC split)
- **Harga Jual ke Bank**: Rp 65.000/unit
- **Margin**: Rp 30.000/unit → untuk marketing freelance

---

## 💾 SQL Implementation

### Step 1: Insert Client (Bank Permata)
```sql
-- IMPORTANT: Tabel clients tidak punya kolom client_type, pic_name, pic_phone
-- Gunakan kolom yang ada saja
INSERT INTO public.clients (
  tenant_id,
  name,
  phone,
  email,
  address,
  city,
  province,
  notes
) VALUES (
  (SELECT id FROM tenants WHERE slug = 'hvac-djawara'),
  'Bank Permata',
  '0271-123456',
  'purbalingga@bankmandiri.co.id',
  'Jl. Raya Purbalingga No. 1',
  'Purbalingga',
  'Jawa Tengah',
  'PIC: Bapak Hendra (Branch Manager) - 08123456789'
) RETURNING id; -- Salin UUID yang dikembalikan dan ganti @client_id di bawah
```

### Step 2: Insert Marketing Partner (Freelance)
```sql
-- Option 1: Jika marketing sudah punya akun di sistem
-- Gunakan marketing_partner_id

-- Option 2: Jika belum punya akun, pakai marketing_partner_name saja
-- (akan kita pakai di contract)
```

### Step 3: Insert Contract
```sql
INSERT INTO public.maintenance_contracts (
  tenant_id,
  client_id,
  contract_number,
  start_date,
  end_date,
  is_active,
  
  -- Recurring settings (tidak dipakai karena per-unit)
  frequency,
  service_notes,
  
  -- Service details
  job_type,
  job_category,
  
  -- Pricing (akan di-calculate dari units nanti)
  total_cost_value,
  total_selling_value,
  total_margin,
  
  -- Marketing freelance
  marketing_partner_name,
  marketing_fee_percentage,
  
  created_by
) VALUES (
  (SELECT id FROM tenants WHERE slug = 'hvac-djawara'),
  '@client_id', -- ID Bank Permata dari step 1
  'MC-BP-2025-001',
  '2025-01-01',
  '2025-12-31',
  true,
  
  'mixed', -- mixed frequency karena ada monthly dan quarterly
  'Kontrak maintenance Bank Permata: ATM+Server monthly, ruang lain 4 bulanan',
  
  'maintenance',
  'commercial',
  
  0, -- akan di-update setelah input units
  0,
  0,
  
  'Marketing Freelance (Pak Ahmad)', -- nama marketing
  100.00, -- 100% margin untuk marketing (30rb per unit)
  
  (SELECT id FROM profiles LIMIT 1) -- admin yang input
) RETURNING id; -- Save as @contract_id
```

### Step 4: Insert Locations (Cabang)
```sql
-- Cabang Purbalingga
INSERT INTO public.contract_locations (
  contract_id,
  location_name,
  address,
  city,
  province,
  contact_person,
  contact_phone
) VALUES (
  '@contract_id',
  'Bank Permata Cabang Purbalingga',
  'Jl. Jenderal Sudirman No. 123, Purbalingga',
  'Purbalingga',
  'Jawa Tengah',
  'Pak Hendra',
  '08123456789'
) RETURNING id; -- Save as @location_purbalingga_id

-- Cabang Purwokerto
INSERT INTO public.contract_locations (
  contract_id,
  location_name,
  address,
  city,
  province,
  contact_person,
  contact_phone
) VALUES (
  '@contract_id',
  'Bank Permata Cabang Purwokerto',
  'Jl. HR. Bunyamin No. 45, Purwokerto',
  'Purwokerto',
  'Jawa Tengah',
  'Bu Siti',
  '08198765432'
) RETURNING id; -- Save as @location_purwokerto_id
```

### Step 5: Insert Units - Cabang Purbalingga

#### Units di Ruang ATM (Monthly)
```sql
-- ATM 1
INSERT INTO public.contract_units (
  contract_id,
  location_id,
  unit_category,
  brand,
  capacity,
  room_name,
  room_type,
  maintenance_frequency,
  frequency_months,
  cost_price,
  selling_price
) VALUES (
  '@contract_id',
  '@location_purbalingga_id',
  'split',
  'Daikin',
  '1 PK',
  'Ruang ATM 1',
  'atm',
  'monthly',
  1,
  35000.00,
  65000.00
);

-- ATM 2
INSERT INTO public.contract_units (
  contract_id,
  location_id,
  unit_category,
  room_name,
  room_type,
  maintenance_frequency,
  frequency_months,
  cost_price,
  selling_price
) VALUES (
  '@contract_id',
  '@location_purbalingga_id',
  'split',
  'Ruang ATM 2',
  'atm',
  'monthly',
  1,
  35000.00,
  65000.00
);
```

#### Unit di Ruang Server (Monthly)
```sql
INSERT INTO public.contract_units (
  contract_id,
  location_id,
  unit_category,
  brand,
  capacity,
  room_name,
  room_type,
  maintenance_frequency,
  frequency_months,
  cost_price,
  selling_price
) VALUES (
  '@contract_id',
  '@location_purbalingga_id',
  'split',
  'Panasonic',
  '1.5 PK',
  'Ruang Server',
  'server',
  'monthly',
  1,
  35000.00,
  65000.00
);
```

#### Units di Ruang Lain (Quarterly - 4 bulan)
```sql
-- Ruang Staff 1
INSERT INTO public.contract_units (
  contract_id, location_id, unit_category, room_name, room_type,
  maintenance_frequency, frequency_months, cost_price, selling_price
) VALUES (
  '@contract_id', '@location_purbalingga_id', 'split', 'Ruang Staff 1', 'office',
  'custom_months', 4, 35000.00, 65000.00
);

-- Ruang Staff 2
INSERT INTO public.contract_units (
  contract_id, location_id, unit_category, room_name, room_type,
  maintenance_frequency, frequency_months, cost_price, selling_price
) VALUES (
  '@contract_id', '@location_purbalingga_id', 'split', 'Ruang Staff 2', 'office',
  'custom_months', 4, 35000.00, 65000.00
);

-- Ruang Meeting
INSERT INTO public.contract_units (
  contract_id, location_id, unit_category, room_name, room_type,
  maintenance_frequency, frequency_months, cost_price, selling_price
) VALUES (
  '@contract_id', '@location_purbalingga_id', 'cassette', 'Ruang Meeting', 'office',
  'custom_months', 4, 35000.00, 65000.00
);

-- Ruang Manager
INSERT INTO public.contract_units (
  contract_id, location_id, unit_category, room_name, room_type,
  maintenance_frequency, frequency_months, cost_price, selling_price
) VALUES (
  '@contract_id', '@location_purbalingga_id', 'split', 'Ruang Manager', 'office',
  'custom_months', 4, 35000.00, 65000.00
);
```

### Step 6: Insert Units - Cabang Purwokerto (Similar Structure)
```sql
-- Repeat similar pattern untuk Purwokerto:
-- - 2 unit ATM (monthly)
-- - 1 unit Server (monthly)
-- - 4 unit Office (quarterly - 4 months)

-- Total Purwokerto: 7 units
```

---

## 🔢 Calculation Example

### Cabang Purbalingga (7 units):
- **ATM + Server**: 3 units × monthly = 3 × 12 = **36 services/year**
- **Office**: 4 units × quarterly (3x/year) = 4 × 3 = **12 services/year**
- **Total Services**: 48 services/year

**Revenue per Year (Purbalingga)**:
- Cost: 48 × Rp 35.000 = Rp 1.680.000
- Selling: 48 × Rp 65.000 = Rp 3.120.000
- **Margin**: Rp 1.440.000 (untuk marketing)

### Cabang Purwokerto (7 units - same):
- Total Services: 48 services/year
- Margin: Rp 1.440.000

### TOTAL KONTRAK:
- **Total Services**: 96 services/year
- **Total Cost**: Rp 3.360.000
- **Total Selling**: Rp 6.240.000
- **Total Margin**: Rp 2.880.000 (marketing fee)

---

## 🔄 Function: Generate Schedules per Unit

```sql
CREATE OR REPLACE FUNCTION generate_schedules_by_units(contract_id_param UUID)
RETURNS TABLE(
  unit_id UUID, 
  room_name VARCHAR, 
  scheduled_date DATE, 
  location_name VARCHAR
) AS $$
DECLARE
  unit_rec RECORD;
  current_date_iter DATE;
  end_date_limit DATE;
  contract_start DATE;
BEGIN
  -- Get contract dates
  SELECT start_date, end_date INTO contract_start, end_date_limit
  FROM public.maintenance_contracts
  WHERE id = contract_id_param;
  
  -- Loop through each unit
  FOR unit_rec IN 
    SELECT 
      cu.id,
      cu.room_name,
      cu.maintenance_frequency,
      cu.frequency_months,
      cl.location_name,
      mc.tenant_id,
      mc.preferred_time
    FROM public.contract_units cu
    JOIN public.contract_locations cl ON cl.id = cu.location_id
    JOIN public.maintenance_contracts mc ON mc.id = cu.contract_id
    WHERE cu.contract_id = contract_id_param
    AND cu.is_active = true
  LOOP
    current_date_iter := contract_start;
    
    -- Generate schedules for this unit
    WHILE current_date_iter <= end_date_limit LOOP
      -- Insert schedule
      INSERT INTO public.generated_schedules (
        tenant_id,
        contract_id,
        scheduled_date,
        scheduled_time,
        status,
        notes
      ) VALUES (
        unit_rec.tenant_id,
        contract_id_param,
        current_date_iter,
        COALESCE(unit_rec.preferred_time, '09:00:00'::TIME),
        'pending',
        unit_rec.location_name || ' - ' || unit_rec.room_name
      ) ON CONFLICT (contract_id, scheduled_date) DO NOTHING;
      
      -- Return row
      unit_id := unit_rec.id;
      room_name := unit_rec.room_name;
      scheduled_date := current_date_iter;
      location_name := unit_rec.location_name;
      RETURN NEXT;
      
      -- Calculate next date based on frequency
      IF unit_rec.maintenance_frequency = 'monthly' THEN
        current_date_iter := current_date_iter + INTERVAL '1 month';
      ELSIF unit_rec.maintenance_frequency = 'custom_months' THEN
        current_date_iter := current_date_iter + (unit_rec.frequency_months || ' months')::INTERVAL;
      ELSE
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Test Generate
```sql
-- GANTI '@contract_id' dengan UUID actual dari RETURNING sebelumnya
-- Contoh: '123e4567-e89b-12d3-a456-426614174000'

-- Generate all schedules (ganti UUID!)
SELECT * FROM generate_schedules_by_units('paste-uuid-contract-disini');

-- View results grouped (ganti UUID!)
SELECT 
  scheduled_date,
  COUNT(*) as total_units,
  STRING_AGG(notes, ', ') as units_to_service
FROM public.generated_schedules
WHERE contract_id = 'paste-uuid-contract-disini'
GROUP BY scheduled_date
ORDER BY scheduled_date;
```

---

## 📊 Reporting Queries

### 1. Summary per Location
```sql
SELECT 
  cl.location_name,
  COUNT(cu.id) as total_units,
  SUM(CASE WHEN cu.room_type IN ('atm', 'server') THEN 1 ELSE 0 END) as critical_units,
  SUM(cu.cost_price) as cost_per_visit,
  SUM(cu.selling_price) as revenue_per_visit,
  SUM(cu.selling_price - cu.cost_price) as margin_per_visit
FROM contract_locations cl
JOIN contract_units cu ON cu.location_id = cl.id
WHERE cl.contract_id = '@contract_id'
GROUP BY cl.location_name;
```

### 2. Monthly Service Forecast
```sql
SELECT 
  TO_CHAR(gs.scheduled_date, 'YYYY-MM') as month,
  COUNT(DISTINCT gs.scheduled_date) as service_days,
  COUNT(*) as total_units_to_service,
  SUM(cu.cost_price) as estimated_cost,
  SUM(cu.selling_price) as estimated_revenue
FROM generated_schedules gs
JOIN contract_units cu ON cu.contract_id = gs.contract_id
WHERE gs.contract_id = '@contract_id'
AND gs.status = 'pending'
GROUP BY TO_CHAR(gs.scheduled_date, 'YYYY-MM')
ORDER BY month;
```

### 3. Marketing Fee Calculation
```sql
SELECT 
  mc.contract_number,
  c.name as client_name,
  mc.marketing_partner_name,
  mc.total_margin as total_marketing_fee,
  mc.total_margin / 12 as monthly_average_fee
FROM maintenance_contracts mc
JOIN clients c ON c.id = mc.client_id
WHERE mc.id = '@contract_id';
```

---

## 🎯 Expected Schedule Output

**January 2025**:
- Tgl 1: Purbalingga - ATM 1, ATM 2, Server (3 units)
- Tgl 1: Purwokerto - ATM 1, ATM 2, Server (3 units)
- Tgl 1: Purbalingga - Staff 1, Staff 2, Meeting, Manager (4 units)
- Tgl 1: Purwokerto - Staff 1, Staff 2, Meeting, Manager (4 units)
**Total Jan**: 14 units

**February 2025**:
- Tgl 1: ATM + Server saja (6 units total dari 2 cabang)

**March 2025**:
- Tgl 1: ATM + Server saja (6 units)

**April 2025** (bulan ke-4 untuk quarterly):
- Tgl 1: ATM + Server (6 units)
- Tgl 1: Office rooms quarterly (8 units)
**Total Apr**: 14 units

... dan seterusnya

---

## 🚀 Next Steps

1. **Run SQL CREATE_MAINTENANCE_CONTRACT_TABLES.sql**
2. **Run INSERT statements di atas** (sesuaikan dengan data real)
3. **Generate schedules**: `SELECT * FROM generate_schedules_by_units('@contract_id')`
4. **Verify**: Check total schedules, pricing calculations
5. **Build UI** untuk input kontrak dan view schedules

Silakan test SQL-nya dan report hasilnya!
