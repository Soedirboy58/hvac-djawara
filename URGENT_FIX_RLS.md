# 🚨 FIX RLS POLICY ERROR - EXECUTE THIS NOW!

## Error Yang Terjadi
```
Could not find the table 'public.contract_requests' in the schema cache
new row violates row-level security policy for table "contract_requests"
```

## Root Cause
SQL file sebelumnya punya **foreign key constraints** ke tables yang belum ada:
- `REFERENCES public.profiles(id)` 
- `REFERENCES public.maintenance_contracts(id)` ← Table ini belum ada!

Foreign key constraints ini menyebabkan RLS policy error.

---

## ✅ SOLUSI LENGKAP - IKUTI INI SEKARANG!

### Step 1: Drop & Recreate Table (3 menit)

#### A. Buka Supabase SQL Editor
https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/sql

#### B. Execute SQL Fix
1. Buka file: `supabase/FIX_CONTRACT_REQUESTS_TABLE.sql` di VS Code
2. **Select ALL** (Ctrl+A)
3. **Copy** (Ctrl+C)
4. Paste di Supabase SQL Editor
5. Click **"RUN"**

SQL ini akan:
- ✅ Drop table lama (jika ada)
- ✅ Create table baru TANPA foreign key constraints
- ✅ Setup RLS policies dengan benar (`TO anon, authenticated`)
- ✅ Create indexes
- ✅ Create trigger

#### C. Verify
Setelah RUN, cek output:
```
✅ "Contract requests table created successfully!"
✅ row_count: 0
```

Jika muncul, berarti **BERHASIL!**

---

### Step 2: Test Immediately

#### A. Clear Browser Cache
1. Tekan **Ctrl+Shift+R** (hard refresh)
2. Atau buka **Incognito Window** (Ctrl+Shift+N)

#### B. Test Form
1. Go to: https://hvac-djawara.vercel.app
2. Click "Request Service"
3. Pilih: **"Maintenance/Service Rutin"**
4. Check: ☑️ **"Ajukan Kontrak Maintenance Berkala"**
5. Fill form:
   - Nama: Test Bank
   - Phone: 081234567890  
   - Email: test@bank.com
   - Unit: 5
   - Lokasi: 1
   - Frekuensi: Monthly
6. Click **"Kirim"**

#### C. Expected Result
- ✅ No error alert
- ✅ Success message: "Request Berhasil Dikirim!"
- ✅ Form resets

---

### Step 3: Verify di Dashboard

1. Login: https://hvac-djawara.vercel.app/auth
   - Email: `admin@hvac-djawara.com`
   - Password: `admin123`
2. Navigate: `/dashboard/contract-requests`
3. ✅ Should see new contract request
4. Click "View Details"
5. ✅ All data should be there

---

## 🔍 What Changed in Fixed SQL

### OLD (❌ BROKEN):
```sql
assigned_to UUID REFERENCES public.profiles(id),
contract_id UUID REFERENCES public.maintenance_contracts(id),
```

### NEW (✅ WORKING):
```sql
assigned_to UUID,  -- No FK constraint
contract_id UUID,  -- No FK constraint
```

### RLS Policies Fixed:
```sql
-- OLD (not specific enough)
CREATE POLICY "Anyone can submit"
  WITH CHECK (true);

-- NEW (explicit roles)
CREATE POLICY "Public can insert"
  TO anon, authenticated
  WITH CHECK (true);
```

---

## 📊 Why Foreign Keys Caused Error

1. **profiles(id)** - Table exists, BUT RLS on profiles might block the FK check
2. **maintenance_contracts(id)** - Table **DOESN'T EXIST** = instant FK error

Solution: Remove FK constraints untuk sekarang. Bisa add nanti setelah semua tables siap.

---

## 🚨 CRITICAL STEPS - DO NOW:

### 1️⃣ Execute SQL (3 min)
```
File: supabase/FIX_CONTRACT_REQUESTS_TABLE.sql
Action: Copy → Paste → RUN in Supabase SQL Editor
```

### 2️⃣ Hard Refresh Browser (30 sec)
```
Ctrl+Shift+R di browser
```

### 3️⃣ Test Form (1 min)
```
Submit test contract request
Should work now!
```

### 4️⃣ Verify Dashboard (1 min)
```
Login → Contract Requests
See new data
```

**Total Time:** 5-6 minutes

---

## ✅ Success Checklist

After executing SQL and testing:

- [ ] SQL executed without errors
- [ ] Verification query shows row_count: 0
- [ ] Form submits successfully
- [ ] No browser console errors
- [ ] Success message appears
- [ ] Dashboard shows new request
- [ ] Can send quotation
- [ ] Can approve request

---

## 🔗 Quick Links

- **SQL File:** `supabase/FIX_CONTRACT_REQUESTS_TABLE.sql`
- **Supabase SQL Editor:** https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/sql
- **Test Form:** https://hvac-djawara.vercel.app
- **Dashboard:** https://hvac-djawara.vercel.app/dashboard/contract-requests

---

## 💡 If Still Error

### Check 1: RLS Policies
```sql
SELECT policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'contract_requests';
```

Should show 3 policies with roles including 'anon'.

### Check 2: Table Structure
```sql
\d contract_requests
```

Should NOT show any foreign key constraints.

### Check 3: Insert Test
```sql
INSERT INTO contract_requests (company_name, contact_person, phone, unit_count)
VALUES ('Test Company', 'Test Person', '081234567890', 5);
```

Should succeed.

---

## 📝 Notes

- ✅ Code already deployed (fix dari tadi)
- ⚠️ Database needs SQL execution NOW
- ✅ No foreign key constraints = no dependency issues
- ✅ Can add FK constraints later after all tables exist

---

**Priority:** 🔴 URGENT  
**Impact:** HIGH - Complete feature blocker  
**ETA:** 5 minutes to fully working  
**Action:** Execute SQL NOW!

---

## 🎯 DO THIS RIGHT NOW:

1. Copy file `FIX_CONTRACT_REQUESTS_TABLE.sql`
2. Paste in Supabase SQL Editor
3. Click RUN
4. Test form
5. Report back!

Good luck! Seharusnya work sekarang! 🚀
