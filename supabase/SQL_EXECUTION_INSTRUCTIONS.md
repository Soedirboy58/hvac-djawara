# 🚀 INSTRUKSI EKSEKUSI SQL

## ⚠️ PENTING: Jalankan SQL ini secara berurutan!

### 📋 Urutan Eksekusi:

#### 1️⃣ **SETUP_COMPANY_SETTINGS.sql** (Wajib dulu!)
**File:** `supabase/SETUP_COMPANY_SETTINGS.sql`

**Apa yang dilakukan:**
- Menambah kolom company info ke tabel `tenants`
- Set data PT. Djawara Tiga Gunung
- Buat function `generate_quotation_number()` dengan format DTG-QT/[Roman]/NNN
- Buat function `get_company_settings()`

**Cara eksekusi:**
1. Buka Supabase Dashboard
2. Klik **SQL Editor** di sidebar kiri
3. Klik **New Query**
4. Copy-paste isi file `SETUP_COMPANY_SETTINGS.sql`
5. Klik **Run** atau tekan `Ctrl+Enter`
6. Lihat output: Harus ada ✅ success message

**Expected Output:**
```
✅ Company settings configured successfully!

📋 Company Info:
   Legal Name: PT. Djawara Tiga Gunung
   Trade Name: HVAC Djawara
   ...
```

---

#### 2️⃣ **CREATE_QUOTATIONS_TABLE.sql**
**File:** `supabase/CREATE_QUOTATIONS_TABLE.sql`

**Apa yang dilakukan:**
- Buat tabel `quotations` untuk menyimpan penawaran
- Setup RLS policies (Admin can CRUD)
- Buat function `calculate_quotation_totals()`
- Buat function `create_quotation_from_request()`

**Cara eksekusi:**
1. New Query lagi di SQL Editor
2. Copy-paste isi file `CREATE_QUOTATIONS_TABLE.sql`
3. Run
4. Lihat output: Harus ada ✅ success message

---

#### 3️⃣ **FIX_DUPLICATE_CONTRACT_REQUESTS.sql**
**File:** `supabase/FIX_DUPLICATE_CONTRACT_REQUESTS.sql`

**Apa yang dilakukan:**
- Hapus data duplicate (PT Maju Jaya, Hotel, RS, Warung Kopi)
- Re-insert data bersih (1 record per company)

**Cara eksekusi:**
1. New Query
2. Copy-paste isi file
3. Run
4. Verify: Setiap company hanya muncul 1x

---

## ✅ Verifikasi Setelah Eksekusi

### Test Query 1: Check Company Settings
```sql
SELECT 
  company_legal_name,
  company_trade_name,
  company_phone,
  company_email,
  quotation_prefix,
  quotation_validity_days,
  bank_name,
  bank_account_number
FROM tenants
WHERE company_legal_name IS NOT NULL;
```

**Expected:** Muncul data PT. Djawara Tiga Gunung

---

### Test Query 2: Generate Quotation Number
```sql
SELECT generate_quotation_number(
  (SELECT id FROM tenants LIMIT 1)
);
```

**Expected:** `DTG-QT/XII/001` (Desember 2025)

---

### Test Query 3: Check Contract Requests (No Duplicates)
```sql
SELECT 
  company_name,
  COUNT(*) as jumlah
FROM contract_requests
GROUP BY company_name
HAVING COUNT(*) > 1;
```

**Expected:** Empty (No duplicates)

---

### Test Query 4: Check Quotations Table
```sql
SELECT COUNT(*) FROM quotations;
```

**Expected:** 0 (Empty, belum ada quotation)

---

## 🎯 Setelah SQL Berhasil

1. **Refresh browser** di `localhost:3000/dashboard/contract-requests`
2. Anda akan melihat:
   - ✅ Data contract requests (tanpa duplicate)
   - ✅ Tombol **"Buat Penawaran"** yang prominent
   - ✅ Form quotation professional dengan logo perusahaan

3. **Test Create Quotation:**
   - Klik tombol "Buat Penawaran" di request "PT Maju Jaya"
   - Isi item breakdown (nama, qty, harga)
   - Klik "Kirim Penawaran"
   - Check di database: `SELECT * FROM quotations;`

---

## 🐛 Troubleshooting

### Error: "column does not exist"
**Solusi:** Jalankan SETUP_COMPANY_SETTINGS.sql dulu

### Error: "function does not exist"
**Solusi:** Jalankan CREATE_QUOTATIONS_TABLE.sql

### Data masih duplicate
**Solusi:** Jalankan FIX_DUPLICATE_CONTRACT_REQUESTS.sql

### Form tidak muncul
**Solusi:** 
1. Check console browser (F12)
2. Pastikan dev server jalan: `npm run dev`
3. Refresh browser

---

## 📞 Next Steps

Setelah semua SQL executed:
1. Buat penawaran pertama
2. Test print/PDF
3. Buat halaman list quotations (TODO #6)
4. Deploy ke Vercel

---

**File ini dibuat:** December 15, 2025
**Last update:** SQL creation complete, ready for execution
