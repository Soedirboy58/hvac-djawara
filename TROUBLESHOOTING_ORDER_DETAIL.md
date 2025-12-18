# 🔧 Troubleshooting Guide - Order Detail Issues

## ❓ Masalah yang Dilaporkan

User mencoba buat order baru dan menemukan:
1. ❌ Status masih "pending" (tidak auto-update)
2. ❌ Tidak bisa melihat teknisi yang bertugas
3. ❌ Tidak ada tombol "Edit Order"
4. ❌ Timeline tidak menunjukkan detail waktu kerja

---

## ✅ Solusi yang Sudah Diimplementasi

### 1. **Fetch Technician dari work_order_assignments**
**File:** `hooks/use-orders.ts` - function `useOrder()`

**Sebelum:**
```typescript
// ❌ SALAH - Query ke profiles!assigned_to (kolom tidak ada)
technician:profiles!assigned_to(id, full_name)
```

**Sesudah:**
```typescript
// ✅ BENAR - Fetch dari work_order_assignments
const { data: assignments } = await supabase
  .from('work_order_assignments')
  .select('technician:technicians!technician_id(id, full_name)')
  .eq('service_order_id', orderId)

// Aggregate multiple technicians
technicianNames = techNames.join(', ')
```

---

### 2. **Fix Assign Technician Logic**
**File:** `app/dashboard/orders/[id]/page.tsx` - function `handleAssignTechnician()`

**Sebelum:**
```typescript
// ❌ SALAH - Update field assigned_to (deprecated)
updateOrder(order.id, { assigned_to: selectedTechnician })
```

**Sesudah:**
```typescript
// ✅ BENAR - Insert ke work_order_assignments
await supabase
  .from('work_order_assignments')
  .insert({
    service_order_id: order.id,
    technician_id: selectedTechnician,
    assigned_by: user.id,
    status: 'assigned',
  })
```

---

### 3. **Tombol Edit Order Sudah Ada**
**File:** `app/dashboard/orders/[id]/page.tsx` - Header section

```tsx
<Link href={`/dashboard/orders/${order.id}/edit`}>
  <Button variant="outline" size="sm">
    <Edit className="w-4 h-4 mr-2" />
    Edit Order
  </Button>
</Link>
```

**Lokasi:** Di header sebelah kanan, sebelah Badge status

---

### 4. **Timeline Sudah Enhanced**
**File:** `app/dashboard/orders/[id]/page.tsx` - Timeline section

**Fitur Timeline:**
- ✅ Visual timeline dengan bullet points berwarna
- ✅ Garis vertikal menghubungkan events
- ✅ Order Created (dengan creator name)
- ✅ Requested Date
- ✅ Scheduled Start (date + time)
- ✅ Estimated Completion (date + time + duration)
- ✅ Completed status (jika sudah selesai)
- ✅ Last Updated

---

## 🚀 Cara Test Setelah Deploy

### Step 1: Clear Browser Cache
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

### Step 2: Tunggu Vercel Deploy
- Cek status deploy di: https://vercel.com/dashboard
- Tunggu hingga status "Ready"
- Biasanya 1-2 menit setelah git push

### Step 3: Buat Order Baru
1. Buka `/dashboard/orders/new`
2. Isi semua field:
   - Client
   - Service Type & Description
   - Location
   - **Scheduled Date** (pilih tanggal hari ini atau besok)
   - **Scheduled Time** (pilih jam)
   - Priority
   - **Assign Technician** (pilih minimal 1)
3. Klik "Create Order"

### Step 4: Cek Order Detail
1. Klik order yang baru dibuat
2. **Harus terlihat:**
   - ✅ Tombol "Edit Order" di kanan atas
   - ✅ Nama teknisi di sidebar "Assign Technician"
   - ✅ Timeline lengkap dengan semua dates
   - ✅ Status sesuai tanggal (scheduled/pending)

---

## 🐛 Jika Masih Bermasalah

### Masalah: Teknisi tidak muncul di order LAMA
**Penyebab:** Order dibuat sebelum fix
**Solusi:**
1. Buka order lama
2. Gunakan dropdown "Assign Technician"
3. Pilih teknisi
4. Klik "Assign"
5. Refresh page

### Masalah: Status masih "pending" untuk order masa lalu
**Solusi:** Jalankan SQL di Supabase:
```sql
-- Jalankan di Supabase SQL Editor
SELECT auto_update_past_orders();
```

File: `supabase/AUTO_UPDATE_ORDER_STATUS.sql`

### Masalah: Tombol Edit tidak muncul
**Penyebab:** Browser cache belum clear
**Solusi:**
1. Hard refresh (Ctrl + Shift + R)
2. Atau buka Incognito/Private window
3. Atau clear site data di DevTools

### Masalah: Timeline tidak tampil detail
**Penyebab:** Order dibuat tanpa scheduled_date/time
**Solusi:**
1. Klik "Edit Order"
2. Isi Scheduled Date dan Time
3. Save
4. Kembali ke detail page

---

## 📊 Expected Behavior (Normal)

### Order Baru dengan Tanggal HARI INI
```
Status: scheduled
Technician: Aris (atau yang di-assign)
Timeline:
  - Order Created: 18 Des 2025, 11:48
  - Scheduled: 18 Des 2025 at 09:00
  - Estimated End: 18 Des 2025 at 11:00 (2 hours)
```

### Order Baru dengan Tanggal BESOK
```
Status: scheduled
Technician: Aris (atau yang di-assign)
Timeline:
  - Order Created: 18 Des 2025, 11:48
  - Scheduled: 19 Des 2025 at 14:00
  - Estimated End: 19 Des 2025 at 16:00 (2 hours)
```

### Order dengan Tanggal KEMARIN (setelah auto-update)
```
Status: completed (auto-updated by SQL function)
Category: history
Timeline:
  - Completed: 18 Des 2025, 11:48
```

---

## ⏱️ Timeline Deploy

1. **Git Push** → GitHub ✅ (Selesai)
2. **GitHub** → Vercel Webhook ⏳ (1-2 menit)
3. **Vercel Build** ⏳ (2-3 menit)
4. **Vercel Deploy** ⏳ (30 detik)
5. **Live** ✅ (Total ~5 menit)

**Status Deploy:** Check di https://vercel.com/dashboard

---

## 🎯 Next Steps

1. **Tunggu deploy selesai** (~5 menit dari sekarang)
2. **Hard refresh browser** (Ctrl + Shift + R)
3. **Buat order BARU** (jangan test dengan order lama)
4. **Verify semua fitur** (technician, timeline, edit button)
5. **Report back** jika masih ada masalah

---

## 📝 Commit History

1. `8b4a240` - Fix schedule technician display + auto-update past orders
2. `4ef1400` - Fix order detail fetch technicians from work_order_assignments ← **LATEST**

**Deployed:** Waiting Vercel... (~5 min)
