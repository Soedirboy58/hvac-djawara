# 🚀 QUICK START GUIDE - Lanjutan Project

**Tanggal:** 14 Desember 2025  
**Status Project:** Code Complete - Butuh Database Migration

---

## ✅ YANG SUDAH SELESAI

### 1. Order Management System - COMPLETE ✅
- ✅ Order List Page dengan filters & search
- ✅ Order Detail Page dengan edit capability
- ✅ Create Order Form (internal staff)
- ✅ Technician assignment
- ✅ Status workflow management
- ✅ Hooks: `useOrders`, `useOrder`, `useUpdateOrder`, `useTechnicians`

**Files:**
- [app/dashboard/orders/page.tsx](app/dashboard/orders/page.tsx)
- [app/dashboard/orders/[id]/page.tsx](app/dashboard/orders/[id]/page.tsx)
- [app/dashboard/orders/new/page.tsx](app/dashboard/orders/new/page.tsx)
- [hooks/use-orders.ts](hooks/use-orders.ts)

### 2. Contract Request System - CODE DEPLOYED ✅
- ✅ Public form dengan contract checkbox
- ✅ API endpoint `/api/contract-requests`
- ✅ Dashboard page `/dashboard/contract-requests`
- ⚠️ **Database table belum di-create**

---

## 🔴 ACTION REQUIRED - PRIORITY 1

### WAJIB: Run Database Migration Sekarang!

#### Step 1: Buka Supabase SQL Editor
1. Buka browser, login ke: https://supabase.com/dashboard
2. Pilih project: **tukbuzdngodvcysncwke**
3. Klik menu "SQL Editor" di sidebar kiri
4. Atau langsung: https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/sql

#### Step 2: Execute SQL Migration
1. Buka file ini di VS Code: `supabase/CREATE_CONTRACT_REQUESTS_TABLE.sql`
2. Copy SEMUA isi file (Ctrl+A, Ctrl+C)
3. Paste ke SQL Editor di Supabase
4. Klik tombol **"RUN"** (atau tekan Ctrl+Enter)
5. Tunggu sampai muncul pesan sukses

#### Step 3: Verify Table Created
Run query ini untuk verify:
```sql
SELECT * FROM contract_requests LIMIT 1;
```

Jika tidak ada error, berarti table berhasil dibuat! ✅

#### Step 4: Check RLS Policies
```sql
SELECT 
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE tablename = 'contract_requests';
```

Harus ada 3 policies:
- `Anyone can submit contract request` (INSERT)
- `Users can view all contract requests` (SELECT)
- `Users can update contract requests` (UPDATE)

---

## 🧪 TESTING SETELAH MIGRATION

### Test 1: Public Contract Request
1. Buka: https://hvac-djawara-gtwbwa79m-djawara.vercel.app
2. Klik "Request Service"
3. Pilih service type: **"Maintenance/Service Rutin"**
4. Checkbox "💼 Ajukan Kontrak Maintenance Berkala" akan muncul
5. Check checkbox tersebut
6. Isi form:
   - Company: Bank Permata
   - Contact: John Doe
   - Phone: 081234567890
   - Email: john@bankpermata.com
   - Unit count: 15
   - Location count: 2
   - Frequency: Monthly
7. Submit
8. ✅ Harus sukses tanpa error

### Test 2: Dashboard View
1. Login ke dashboard: https://hvac-djawara-gtwbwa79m-djawara.vercel.app/auth
2. Credentials:
   - Email: `admin@hvac-djawara.com`
   - Password: `admin123`
3. Navigate ke: `/dashboard/contract-requests`
4. ✅ Harus muncul list contract requests
5. Click "View Details" pada request
6. Isi quotation:
   - Amount: 50000000 (50 juta)
   - Notes: "Penawaran maintenance 15 unit, 2 lokasi"
7. Click "Send Quotation"
8. ✅ Status harus berubah jadi "quoted"

### Test 3: Approval Workflow
1. Di detail page, click "Approve Request"
2. ✅ Status berubah jadi "approved"
3. Atau click "Reject Request"
4. Isi rejection reason
5. ✅ Status berubah jadi "rejected"

---

## 📁 FILE STRUCTURE TERBARU

```
hvac_djawara/
├── app/
│   ├── dashboard/
│   │   ├── orders/
│   │   │   ├── page.tsx              # ✅ Order list
│   │   │   ├── [id]/page.tsx         # ✅ Order detail
│   │   │   └── new/page.tsx          # ✅ Create order
│   │   └── contract-requests/
│   │       └── page.tsx              # ✅ Contract requests dashboard
│   ├── api/
│   │   ├── service-requests/         # ✅ Public service form
│   │   └── contract-requests/        # ✅ Contract request API
│   └── page.tsx                      # ✅ Landing page
├── components/
│   ├── RequestServiceForm.tsx        # ✅ Public form dengan contract checkbox
│   └── RequestServiceModal.tsx       # ✅ Modal wrapper
├── hooks/
│   ├── use-orders.ts                 # ✅ Order management hooks
│   ├── use-clients.ts                # ✅ Client management
│   └── use-contracts.ts              # ⚠️ Contract hooks (if needed)
└── supabase/
    ├── CREATE_CONTRACT_REQUESTS_TABLE.sql  # ⚠️ RUN THIS!
    ├── PHASE_1_WORKFLOW.sql          # ✅ Already executed
    └── FIX_PUBLIC_FORM_NOW.sql       # ✅ Already executed
```

---

## 🎯 FITUR YANG SUDAH BERFUNGSI

### Public Features
✅ Landing page dengan hero carousel  
✅ Service request form (regular)  
✅ Contract request form (checkbox untuk maintenance)  
✅ Auto-generate order number (SO-202512-XXXX)  
✅ Anonymous submission dengan RLS policies  

### Dashboard Features - Orders
✅ Order list dengan filters (status, search)  
✅ Order detail page  
✅ Status update (pending → scheduled → in_progress → completed)  
✅ Technician assignment  
✅ Schedule management  
✅ Add notes  
✅ Create new order (internal staff)  

### Dashboard Features - Contract Requests
✅ Contract request list  
✅ Request detail view  
✅ Send quotation dengan amount & notes  
✅ Approve/reject workflow  
⚠️ Butuh database table (belum di-create)

### Authentication
✅ Login system  
✅ Role-based access control  
✅ Multi-tenant support  
✅ Active tenant switching  

---

## 🔄 WORKFLOW LENGKAP

### Workflow 1: Regular Service Order
```
1. Customer → Isi form di landing page
2. System → Create client (if new) + service_order (status: pending)
3. Admin → View di /dashboard/orders
4. Admin → Assign technician + set schedule
5. System → Status berubah: pending → scheduled
6. Technician → Update status: in_progress
7. Technician → Complete work
8. System → Status: completed
```

### Workflow 2: Contract Request
```
1. Customer → Isi form + check "Ajukan Kontrak"
2. System → Create contract_request (status: pending)
3. Owner → View di /dashboard/contract-requests
4. Owner → Review request
5. Owner → Send quotation (amount + notes)
6. System → Status: pending → quoted
7. Owner → Approve (if customer agrees)
8. System → Status: quoted → approved
9. [FUTURE] → Convert to maintenance_contracts
10. [FUTURE] → Auto-generate maintenance schedules
```

---

## 🚨 TROUBLESHOOTING

### Issue 1: Contract Form Submit Error
**Error:** "relation 'contract_requests' does not exist"  
**Solution:** Run `CREATE_CONTRACT_REQUESTS_TABLE.sql` di Supabase!

### Issue 2: Permission Denied
**Error:** "new row violates row-level security policy"  
**Solution:** Check RLS policies dengan query di Step 4 diatas

### Issue 3: Dashboard Tidak Muncul Data
**Error:** Empty list atau loading forever  
**Solution:** 
1. Check user punya `active_tenant_id`:
```sql
SELECT id, full_name, active_tenant_id 
FROM profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@hvac-djawara.com');
```
2. Jika `active_tenant_id` NULL, set manual:
```sql
UPDATE profiles 
SET active_tenant_id = (SELECT id FROM tenants WHERE slug = 'hvac-djawara')
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@hvac-djawara.com');
```

---

## 📊 DATABASE STATUS

### ✅ Tables Yang Sudah Ada
- `tenants` - Multi-tenant support
- `profiles` - User profiles
- `user_tenant_roles` - Role-based access
- `clients` - Customer data
- `service_orders` - Regular orders
- `auth.users` - Supabase auth

### ⚠️ Tables Yang Belum Ada (Butuh Migration)
- `contract_requests` - **RUN SQL NOW!**
- `maintenance_contracts` - Future (complex schema)
- `contract_locations` - Future
- `contract_units` - Future
- `generated_schedules` - Future

---

## 🎓 NEXT STEPS RECOMMENDATIONS

### Short Term (Hari Ini)
1. ✅ Run database migration `CREATE_CONTRACT_REQUESTS_TABLE.sql`
2. ✅ Test contract request flow end-to-end
3. ✅ Test order management CRUD operations
4. ✅ Verify RLS policies bekerja

### Medium Term (Minggu Ini)
1. Add pagination ke order list (jika data banyak)
2. Add export to Excel/PDF untuk orders
3. Add email notification untuk quotation
4. Add WhatsApp notification integration
5. Improve UI/UX berdasarkan feedback user

### Long Term (Bulan Ini)
1. Implement full `maintenance_contracts` schema
2. Auto-generate maintenance schedules
3. Attendance tracking system
4. BAST (Berita Acara Serah Terima) digital
5. Invoice & payment tracking
6. Reporting & analytics dashboard

---

## 🔗 QUICK LINKS

### Production
- **Live Site:** https://hvac-djawara-gtwbwa79m-djawara.vercel.app
- **Dashboard:** https://hvac-djawara-gtwbwa79m-djawara.vercel.app/dashboard
- **Login:** https://hvac-djawara-gtwbwa79m-djawara.vercel.app/auth

### Supabase
- **Dashboard:** https://supabase.com/dashboard/project/tukbuzdngodvcysncwke
- **SQL Editor:** https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/sql
- **Table Editor:** https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/editor

### GitHub
- **Main Repo:** https://github.com/Soedirboy58/hvac-djawara
- **Deploy Repo:** https://github.com/putra22-debug/hvac-djawara

### Vercel
- **Dashboard:** https://vercel.com/djawara/hvac-djawara
- **Deployments:** Auto-deploy dari push ke `putra22` repo

---

## 👤 LOGIN CREDENTIALS

### Dashboard Access
```
Admin:
Email: admin@hvac-djawara.com
Password: admin123

Owner:
Email: aris@hvac-djawara.com
Password: aris123
```

### Supabase
Check: `pasword database.txt` atau `.env.local`

---

## 💡 TIPS DEVELOPMENT

### Local Development
```bash
# Run dev server
npm run dev

# Open http://localhost:3000

# Test with real Supabase data (not local)
```

### Deploy Changes
```bash
# Commit and push
git add .
git commit -m "feat: your feature description"
git push origin main
git push putra22 main:main  # Triggers Vercel deploy
```

### Check Logs
- **Vercel:** Check deployment logs di dashboard
- **Supabase:** Check logs di dashboard
- **Browser:** Open DevTools Console (F12)

---

## 📞 SUPPORT

Jika ada masalah:
1. Check browser console untuk error
2. Check Supabase logs
3. Check Vercel deployment logs
4. Refer to handoff documents
5. Check SQL execution guide

---

**Last Updated:** 14 Desember 2025  
**Platform Status:** 🟢 Production Ready (after migration)  
**Priority:** 🔴 Run database migration ASAP!

---

Selamat melanjutkan development! Semua foundation sudah solid, tinggal execute SQL migration dan test! 🚀
