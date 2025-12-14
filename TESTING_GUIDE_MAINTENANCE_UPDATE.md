# Quick Guide: Testing Maintenance Schedule Updates

## ✅ What's New (Just Deployed)

### 1. **Edit, Pause, Resume, Delete** pada Simple Maintenance Schedules
### 2. **Maintenance Contracts Menu** untuk enterprise multi-location scheduling
### 3. **Contract Creation Wizard** dengan 3-step process

---

## 🧪 Test Scenarios

### **Test 1: Edit Existing Schedule**
**Goal**: Ubah Bank Permata Purbalingga dari Quarterly → Monthly

**Steps**:
1. Login ke Client Portal Bank Permata
2. Go to **Maintenance Schedule** tab
3. Di "Active Maintenance Schedules" section, lihat schedule Bank Permata Purbalingga
4. Click **[Edit]** button
5. Ubah Frequency dari "Quarterly" → "Monthly"
6. Ubah First Maintenance Date ke tanggal yang lebih dekat (e.g., besok)
7. Click **Save Schedule**
8. Verify: Schedule updated, next_scheduled_date recalculated

**Expected Result**:
- Schedule frequency berubah jadi "Monthly"
- Next Maintenance Date updated sesuai perhitungan baru
- No errors

---

### **Test 2: Pause Schedule**
**Goal**: Pause schedule temporarily (untuk liburan/tutup sementara)

**Steps**:
1. Go to **Maintenance Schedule** tab
2. Find active schedule
3. Click **[Pause]** button
4. Verify: Status badge berubah dari "Active" (hijau) → "Paused" (kuning)
5. Wait until next_scheduled_date passes (or manual trigger cron)
6. Check database: No new service orders generated for paused schedule

**Database Check**:
```sql
SELECT * FROM property_maintenance_schedules 
WHERE is_active = FALSE;
```

**Expected Result**:
- Badge shows "Paused"
- Cron job skips this schedule
- No orders created when date passes

---

### **Test 3: Resume Paused Schedule**
**Goal**: Reactivate paused schedule

**Steps**:
1. Find paused schedule (yellow badge)
2. Click **[Resume]** button
3. Verify: Status badge back to "Active" (hijau)
4. Check next_scheduled_date recalculated from today

**Expected Result**:
- Badge shows "Active"
- next_scheduled_date updated
- Orders will generate on next cron run

---

### **Test 4: Delete Schedule**
**Goal**: Permanently remove incorrect schedule

**Steps**:
1. Create dummy schedule for test
2. Click **[Delete]** button
3. Confirm deletion in dialog
4. Verify: Schedule removed from list
5. Database check: Record deleted

**Database Check**:
```sql
SELECT COUNT(*) FROM property_maintenance_schedules;
-- Should decrease by 1
```

**Expected Result**:
- Schedule disappears from UI
- Record deleted from database
- No errors

---

### **Test 5: Access Maintenance Contracts (NEW)**
**Goal**: Navigate to contract management for complex scheduling

**Steps**:
1. Login ke Dashboard (Owner/Admin role)
2. Look at sidebar → Find **"Maintenance Contracts"** menu
3. Click menu item
4. Verify: Page loads showing "No maintenance contracts yet"
5. See info alert explaining difference between Simple vs Contract-based
6. Click **"New Contract"** button
7. Verify: Wizard opens with 3 steps (Client → Details → Schedule)

**Expected Result**:
- Menu visible in sidebar
- Empty state page loads correctly
- Wizard accessible and functional

---

### **Test 6: Create Contract (Advanced)**
**Goal**: Create multi-location contract with different frequencies

**Example Scenario**: Bank Permata - 2 Locations
- Jakarta: Monthly (ATM rooms)
- Purbalingga: Quarterly (office spaces)

**Steps**:
1. Go to **Dashboard** → **Maintenance Contracts**
2. Click **"New Contract"**
3. **Step 1 - Select Client**: Choose "Bank Permata"
4. **Step 2 - Contract Details**:
   - Contract Number: `CTR-2025-PERMATA`
   - Start Date: `2025-01-01`
   - End Date: `2025-12-31`
5. **Step 3 - Locations & Schedule**:
   - Add Jakarta location → Set frequency: **Monthly**
   - Add Purbalingga location → Set frequency: **Quarterly**
6. Click **"Create Contract"**
7. Verify: Success message, redirect to contracts list

**Expected Result**:
- Contract created successfully
- Shows in contracts list with 2 locations
- Each location has different frequency settings

---

## 🔍 Verification Queries

### Check Active Schedules:
```sql
SELECT 
  id,
  property_id,
  frequency,
  next_scheduled_date,
  is_active,
  last_generated_date,
  created_at
FROM property_maintenance_schedules
ORDER BY created_at DESC;
```

### Check Generated Orders (After Cron Runs):
```sql
SELECT 
  id,
  order_number,
  property_id,
  is_recurring,
  status,
  created_at
FROM service_orders
WHERE is_recurring = TRUE
ORDER BY created_at DESC
LIMIT 10;
```

### Manual Trigger Cron Job (Testing):
```sql
-- Trigger simple maintenance generation
SELECT trigger_simple_maintenance_generation();
```

### Check Cron Job Exists:
```sql
SELECT 
  jobname,
  schedule,
  command,
  active,
  nodename
FROM cron.job
WHERE jobname LIKE '%maintenance%';
```

---

## 📱 UI Features Quick Reference

### Maintenance Schedule Card (Enhanced):
```
┌─────────────────────────────────────────────────────┐
│ 🏢 Bank Permata Purbalingga      [Active] [Paused] │
│ Jl. Jenderal Sudirman No. 123                      │
│                                                     │
│ Frequency          | Next Maintenance               │
│ 📅 Quarterly       | 📆 15 Jan 2025                │
│                                                     │
│ Last service: 10 Oct 2024                          │
│                                                     │
│ [Edit] [Pause/Resume] [Delete]                     │
└─────────────────────────────────────────────────────┘
```

### Navigation:
- **Client Portal** → **Maintenance Schedule** (Simple setup)
- **Dashboard** → **Maintenance Contracts** (Complex enterprise)

### Icons Legend:
- ✏️ **Edit**: Modify frequency/date
- ⏸️ **Pause**: Temporarily disable
- ▶️ **Resume**: Reactivate paused
- 🗑️ **Delete**: Permanently remove

---

## ⚠️ Known Limitations (TODO)

### Edit Function:
- Currently creates NEW schedule when editing
- Need to add `editingId` state for true UPDATE
- Workaround: Delete old → Create new with updated data

### Contract System:
- UI only (no database tables yet)
- Need to create `maintenance_contracts` table
- Need contract-based order generation logic

### Future Enhancements:
- Contract approval workflow
- Per-unit frequency control (not just per-property)
- Schedule conflict detection
- Maintenance history tracking per schedule

---

## 🚀 Deployment Status

**Commit**: `68cfe69` - "feat: Add maintenance schedule CRUD + Contract management UI"
**Pushed to**: 
- ✅ origin/main (backup)
- ✅ putra22/main (Vercel)

**Vercel Status**: Auto-deploying...
**Expected URL**: https://hvac-djawara.vercel.app

**Files Changed**:
1. `components/client-portal/MaintenanceSchedule.tsx` (+150 lines)
2. `components/layout/sidebar.tsx` (+2 lines)
3. `app/dashboard/contracts/page.tsx` (NEW - 267 lines)
4. `app/dashboard/contracts/new/page.tsx` (NEW - 435 lines)
5. `MAINTENANCE_SCHEDULE_UPDATE.md` (NEW - documentation)

---

## 📞 Feedback Checklist

After testing, please confirm:
- [ ] Edit button works? (loads data into form)
- [ ] Pause button works? (badge turns yellow, is_active=false)
- [ ] Resume button works? (badge turns green, is_active=true)
- [ ] Delete button works? (confirmation + removal)
- [ ] Next date displayed prominently? (blue color, calendar icon)
- [ ] "Maintenance Contracts" menu visible in sidebar?
- [ ] Contract page loads without errors?
- [ ] Contract wizard shows 3 steps?

**Any issues? Please screenshot and report!** 📸

---

## 💡 Tips

### Best Practice:
1. **Simple Setup** untuk:
   - Client walk-in
   - 1-2 locations
   - Same frequency semua unit
   
2. **Contract-based** untuk:
   - Enterprise clients (Bank, Hotel, Mall)
   - Multi-location (3+ branches)
   - Different frequencies per location/unit type

### Troubleshooting:
- **Edit tidak menyimpan**: Check browser console for errors
- **Pause tidak work**: Verify is_active field di database
- **Delete konfirmasi tidak muncul**: Check browser popup blocker
- **Contract menu tidak muncul**: Verify role = owner/admin

Happy Testing! 🎉
