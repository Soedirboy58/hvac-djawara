# 🚀 QUICK START - Maintenance Schedule

## 📝 Execute SQL (5 Minutes)

### Step 1: Simple System
```sql
-- File: supabase/CREATE_SIMPLE_MAINTENANCE_SCHEDULE.sql
-- Copy → Paste to Supabase SQL Editor → RUN
```

### Step 2: Unified Generation
```sql
-- File: supabase/CREATE_UNIFIED_MAINTENANCE_GENERATION.sql  
-- Copy → Paste to Supabase SQL Editor → RUN
```

---

## 🧪 Quick Test (3 Minutes)

### 1. Setup Schedule
1. Go to client detail → **Properties** tab
2. Click **"Setup Schedule"** button (blue)
3. Fill:
   - Frequency: **Monthly**
   - Date: **Today**
4. Save

### 2. Trigger Generation
```sql
SELECT * FROM trigger_simple_maintenance_generation();
```

### 3. Check Order Created
```sql
SELECT order_number, service_title, scheduled_date 
FROM service_orders 
WHERE is_recurring = TRUE 
ORDER BY created_at DESC LIMIT 1;
```

---

## ✅ Success Indicators

- ✅ Property shows green badge: "Monthly • Next: [date]"
- ✅ Manual trigger returns 1+ orders
- ✅ Service order created with `is_recurring = TRUE`
- ✅ Cron job listed in `cron.job`

---

## 🐛 Quick Troubleshooting

**No badge showing?**
→ Check: `SELECT * FROM property_maintenance_schedules;`

**No orders generated?**
→ Check start_date not in future

**Permission denied?**
→ Check RLS: `SELECT * FROM pg_policies WHERE tablename = 'property_maintenance_schedules';`

---

## 📚 Full Documentation

- **Implementation Guide:** `MAINTENANCE_SCHEDULE_IMPLEMENTATION.md`
- **Design Rationale:** `MAINTENANCE_SCHEDULE_REDESIGN.md`
- **Database Schema:** SQL files in `supabase/`

---

**Total Setup Time:** < 10 minutes  
**Auto-runs Daily:** 6:00 AM UTC  
**Manual Trigger:** Available anytime
