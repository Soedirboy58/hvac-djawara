# 🚨 ERROR FIX & CARA MENJALANKAN SQL

## ❌ Masalah yang Terjadi

1. **Error: relation "maintenance_contracts" does not exist**
   - Artinya: Tabel belum dibuat, harus run migration dulu

2. **Error: column "client_type" does not exist**
   - Artinya: Tabel clients tidak punya kolom itu, sudah saya fix

3. **Error: invalid input syntax for type uuid: "@contract_id"**
   - Artinya: '@contract_id' itu placeholder, harus diganti dengan UUID real

---

## ✅ LANGKAH BENAR (Step by Step)

### **STEP 1: Run CREATE_MAINTENANCE_CONTRACT_TABLES.sql**

1. **Buka Supabase SQL Editor**:
   - https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/sql
   
2. **Copy file ini**:
   ```
   supabase/CREATE_MAINTENANCE_CONTRACT_TABLES.sql
   ```

3. **Paste ke SQL Editor** dan **klik RUN**

4. **Tunggu sukses**, harus muncul:
   ```
   ✅ MAINTENANCE CONTRACT TABLES CREATED!
   Tables created:
     1. maintenance_contracts
     2. contract_locations  
     3. contract_units
     4. generated_schedules
   ```

---

### **STEP 2: Insert Client Bank Permata**

Run SQL ini (sudah diperbaiki):

```sql
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
) RETURNING id;
```

**COPY UUID yang dikembalikan!** Contoh:
```
id: 123e4567-e89b-12d3-a456-426614174000
```

---

### **STEP 3: Insert Contract**

**GANTI** `@client_id` dengan UUID dari step 2!

```sql
INSERT INTO public.maintenance_contracts (
  tenant_id,
  client_id,
  contract_number,
  start_date,
  end_date,
  is_active,
  frequency,
  service_notes,
  job_type,
  job_category,
  total_cost_value,
  total_selling_value,
  total_margin,
  marketing_partner_name,
  marketing_fee_percentage,
  created_by
) VALUES (
  (SELECT id FROM tenants WHERE slug = 'hvac-djawara'),
  '123e4567-e89b-12d3-a456-426614174000', -- <<<< GANTI INI!
  'MC-BP-2025-001',
  '2025-01-01',
  '2025-12-31',
  true,
  'mixed',
  'Kontrak maintenance Bank Permata: ATM+Server monthly, ruang lain 4 bulanan',
  'maintenance',
  'commercial',
  0,
  0,
  0,
  'Marketing Freelance (Pak Ahmad)',
  100.00,
  (SELECT id FROM profiles LIMIT 1)
) RETURNING id;
```

**COPY UUID contract!** Misalnya:
```
id: 987fbc97-4bed-5078-9f07-9141ba07c9f3
```

---

### **STEP 4: Insert Locations**

**GANTI** `@contract_id` dengan UUID dari step 3!

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
  '987fbc97-4bed-5078-9f07-9141ba07c9f3', -- <<<< GANTI!
  'Bank Permata Cabang Purbalingga',
  'Jl. Jenderal Sudirman No. 123, Purbalingga',
  'Purbalingga',
  'Jawa Tengah',
  'Pak Hendra',
  '08123456789'
) RETURNING id;
-- COPY UUID location!
```

```sql
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
  '987fbc97-4bed-5078-9f07-9141ba07c9f3', -- <<<< GANTI!
  'Bank Permata Cabang Purwokerto',
  'Jl. HR. Bunyamin No. 45, Purwokerto',
  'Purwokerto',
  'Jawa Tengah',
  'Bu Siti',
  '08198765432'
) RETURNING id;
-- COPY UUID location!
```

---

### **STEP 5: Insert Units**

**GANTI** `@contract_id` dan `@location_purbalingga_id` dengan UUID real!

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
  '987fbc97-4bed-5078-9f07-9141ba07c9f3', -- contract_id
  'abc12345-location-uuid-purbalingga',    -- location_id
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
  '987fbc97-4bed-5078-9f07-9141ba07c9f3',
  'abc12345-location-uuid-purbalingga',
  'split',
  'Ruang ATM 2',
  'atm',
  'monthly',
  1,
  35000.00,
  65000.00
);

-- Server
INSERT INTO public.contract_units (
  contract_id, location_id, unit_category, brand, capacity,
  room_name, room_type, maintenance_frequency, frequency_months,
  cost_price, selling_price
) VALUES (
  '987fbc97-4bed-5078-9f07-9141ba07c9f3',
  'abc12345-location-uuid-purbalingga',
  'split', 'Panasonic', '1.5 PK',
  'Ruang Server', 'server', 'monthly', 1,
  35000.00, 65000.00
);

-- Office units (quarterly - 4 bulan)
INSERT INTO public.contract_units (
  contract_id, location_id, unit_category, room_name, room_type,
  maintenance_frequency, frequency_months, cost_price, selling_price
) VALUES 
  ('987fbc97-4bed-5078-9f07-9141ba07c9f3', 'abc12345-location-uuid-purbalingga', 
   'split', 'Ruang Staff 1', 'office', 'custom_months', 4, 35000.00, 65000.00),
  ('987fbc97-4bed-5078-9f07-9141ba07c9f3', 'abc12345-location-uuid-purbalingga',
   'split', 'Ruang Staff 2', 'office', 'custom_months', 4, 35000.00, 65000.00),
  ('987fbc97-4bed-5078-9f07-9141ba07c9f3', 'abc12345-location-uuid-purbalingga',
   'cassette', 'Ruang Meeting', 'office', 'custom_months', 4, 35000.00, 65000.00),
  ('987fbc97-4bed-5078-9f07-9141ba07c9f3', 'abc12345-location-uuid-purbalingga',
   'split', 'Ruang Manager', 'office', 'custom_months', 4, 35000.00, 65000.00);
```

**Ulangi untuk cabang Purwokerto** (ganti location_id dengan UUID Purwokerto!)

---

### **STEP 6: Generate Schedules**

**GANTI** UUID dengan contract_id real!

```sql
SELECT * FROM generate_schedules_by_units('987fbc97-4bed-5078-9f07-9141ba07c9f3');
```

Hasilnya akan muncul list jadwal maintenance untuk 1 tahun!

---

## 📝 Tips

1. **Jangan langsung copy-paste semua**, run satu per satu
2. **Simpan UUID** setiap kali ada RETURNING id
3. **Replace @placeholder** dengan UUID real sebelum run
4. **Kalau error "already exists"**, skip aja (table sudah ada)
5. **Kalau mau reset**, drop table dulu:
   ```sql
   DROP TABLE IF EXISTS generated_schedules CASCADE;
   DROP TABLE IF EXISTS contract_units CASCADE;
   DROP TABLE IF EXISTS contract_locations CASCADE;
   DROP TABLE IF EXISTS maintenance_contracts CASCADE;
   ```

---

## ✅ Checklist Progress

- [ ] Step 1: CREATE_MAINTENANCE_CONTRACT_TABLES.sql berhasil
- [ ] Step 2: Insert client dapat UUID
- [ ] Step 3: Insert contract dapat UUID
- [ ] Step 4: Insert 2 locations dapat UUID
- [ ] Step 5: Insert units (7 unit per cabang)
- [ ] Step 6: Generate schedules berhasil
- [ ] Lihat hasil di tabel generated_schedules

Kalau sudah selesai, kasih tau hasilnya! 🎯
