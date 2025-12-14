# Update: Maintenance Schedule Enhancements

## ✅ Changes Completed

### 1. **Edit, Pause, Resume, Delete Functionality**
Maintenance schedules sekarang memiliki kontrol penuh:

#### UI Enhancements:
- **Edit Button**: Merevisi frequency dan tanggal schedule yang sudah ada
- **Pause/Resume Toggle**: Menonaktifkan schedule sementara tanpa menghapus
- **Delete Button**: Menghapus schedule dengan konfirmasi

#### Next Date Display:
- Ditampilkan dengan lebih prominent (blue color, calendar icon)
- Format: "15 Des 2024" (dd MMM yyyy)
- Menampilkan "Last service" date jika ada

#### Status Badge:
- **Active** (hijau): Schedule berjalan normal
- **Paused** (kuning): Schedule dinonaktifkan sementara

#### Visual Example:
```
┌─────────────────────────────────────────────────────┐
│ 🏢 Bank Permata Purbalingga          [Active]      │
│ Jl. Jenderal Sudirman No. 123                      │
│                                                     │
│ Frequency: 📅 Quarterly (3 months)                 │
│ Next Maintenance: 📆 15 Jan 2025                   │
│ Last service: 10 Oct 2024                          │
│                                                     │
│ [Edit] [Pause] [Delete]                            │
└─────────────────────────────────────────────────────┘
```

---

### 2. **Contract Service Flow Access**
Untuk uji coba scheduling kompleks dengan kontrak (seperti Bank Permata 2 lokasi, ATM monthly, office quarterly):

#### Navigation:
Dashboard Sidebar → **"Maintenance Contracts"** (menu baru di bawah Contract Requests)

#### Features:
- **Contract List Page** (`/dashboard/contracts`)
  - View all maintenance contracts
  - Shows: Contract number, client, period, locations count, units count
  - Quick stats: Active contracts, total locations, total units

- **Create Contract Wizard** (`/dashboard/contracts/new`)
  - **Step 1**: Select client
  - **Step 2**: Enter contract details (number, start date, end date)
  - **Step 3**: Add locations & set frequency per location
  
#### Complex Scheduling Example:
```
Contract: CTR-2024-PERMATA
Client: Bank Permata
Period: Jan 2024 - Dec 2025

Locations:
├─ Bank Permata Jakarta
│  └─ Frequency: Monthly (untuk ATM rooms)
│
└─ Bank Permata Purbalingga  
   └─ Frequency: Quarterly (untuk office spaces)
```

---

## 🎯 How to Use

### Scenario 1: Edit Schedule
1. Go to **Client Portal** → **Maintenance Schedule**
2. Lihat "Active Maintenance Schedules" section
3. Click **[Edit]** button
4. Form akan ter-populate dengan data existing
5. Ubah frequency atau tanggal, lalu **Save**

### Scenario 2: Pause Schedule Temporarily
1. Go to **Client Portal** → **Maintenance Schedule**
2. Find schedule yang ingin di-pause
3. Click **[Pause]** button
4. Status badge berubah jadi "Paused" (kuning)
5. Cron job akan skip schedule ini
6. Click **[Resume]** untuk mengaktifkan kembali

### Scenario 3: Delete Schedule
1. Go to **Client Portal** → **Maintenance Schedule**
2. Click **[Delete]** button
3. Konfirmasi dialog akan muncul
4. Schedule akan dihapus permanen dari database

### Scenario 4: Create Contract-Based Maintenance
1. Go to **Dashboard** → **Maintenance Contracts**
2. Click **"New Contract"** button
3. Follow wizard:
   - Select client (e.g., Bank Permata)
   - Enter contract number (e.g., CTR-2024-001)
   - Set contract period (start & end date)
   - Add locations one by one
   - Set frequency per location (monthly, quarterly, etc.)
4. Click **"Create Contract"**
5. Contract akan aktif dan mulai generate orders sesuai schedule

---

## 📊 Database Impact

### Tables Modified:
- `property_maintenance_schedules`
  - UPDATE: `is_active` field untuk pause/resume
  - UPDATE: frequency, start_date untuk edit
  - DELETE: untuk hapus schedule

### Cron Job Behavior:
- Cron daily 6 AM UTC: `SELECT batch_generate_simple_maintenance_orders()`
- Will skip schedules where `is_active = FALSE`
- Only processes schedules where `next_scheduled_date <= CURRENT_DATE`

---

## 🚀 Next Steps

### Immediate Testing:
1. **Test Edit**: 
   - Edit Bank Permata Purbalingga dari Quarterly → Monthly
   - Verify next_scheduled_date recalculated correctly

2. **Test Pause**:
   - Pause schedule
   - Wait until next_scheduled_date passes
   - Verify no service orders generated

3. **Test Resume**:
   - Resume paused schedule
   - Verify next_scheduled_date updated
   - Orders should generate on next run

4. **Test Delete**:
   - Create dummy schedule
   - Delete it
   - Verify removed from database

### Contract System Testing (Advanced):
1. Create contract for Bank Permata with 2 locations
2. Set Jakarta location: Monthly
3. Set Purbalingga location: Quarterly
4. Wait for cron job execution
5. Verify orders generated separately per location frequency

---

## 📝 Files Modified

### Frontend:
1. **components/client-portal/MaintenanceSchedule.tsx**
   - Added: `handleEdit()`, `handlePauseResume()`, `handleDelete()`
   - Enhanced: Active Schedules UI with action buttons
   - Added: Prominent next date display

2. **components/layout/sidebar.tsx**
   - Added: "Maintenance Contracts" menu item

3. **app/dashboard/contracts/page.tsx** (NEW)
   - Contract list page
   - Empty state with "Create First Contract" CTA
   - Contract cards with status badges

4. **app/dashboard/contracts/new/page.tsx** (NEW)
   - 3-step wizard for contract creation
   - Client selection → Details → Location scheduling

### Backend:
- No SQL changes needed (handlers use existing schema)
- Cron job already configured in `CREATE_SIMPLE_MAINTENANCE_SCHEDULE.sql`

---

## 💡 Tips

### For Simple Clients:
- Use **"Simple Setup"** in Client Portal → Maintenance Schedule
- No contract needed, just property-level scheduling
- Perfect for 1-2 locations with same frequency

### For Enterprise Clients:
- Use **"Maintenance Contracts"** in Dashboard
- Ideal for multi-location with different frequencies
- Example: Bank with ATMs (monthly) and offices (quarterly)

### Best Practice:
- Simple Setup untuk pelanggan walk-in atau sukarela
- Contract untuk klien enterprise dengan SLA formal
- Pause/Resume untuk holiday seasons atau temporary closure
- Delete hanya jika benar-benar salah buat schedule

---

## 🔍 Verification

### Check Active Schedules:
```sql
SELECT 
  id,
  property_id,
  frequency,
  next_scheduled_date,
  is_active,
  last_generated_date
FROM property_maintenance_schedules
WHERE is_active = TRUE
ORDER BY next_scheduled_date;
```

### Check Generated Orders:
```sql
SELECT 
  id,
  order_number,
  property_id,
  is_recurring,
  created_at
FROM service_orders
WHERE is_recurring = TRUE
ORDER BY created_at DESC
LIMIT 10;
```

### Check Cron Job Status:
```sql
SELECT 
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname LIKE '%maintenance%';
```

---

## ✨ Summary

**What's New:**
- ✅ Edit, Pause/Resume, Delete buttons on maintenance schedules
- ✅ Enhanced next date display (prominent with calendar icon)
- ✅ Maintenance Contracts menu in sidebar
- ✅ Contract creation wizard (3 steps)
- ✅ Contract list page with stats

**Ready for Testing:**
- Simple maintenance schedule CRUD operations
- Contract-based complex scheduling
- Multi-location per-unit frequency control
- Bank Permata use case (ATM monthly, office quarterly)

**Status:**
All features deployed and ready to test! 🚀
