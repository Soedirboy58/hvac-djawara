# 📅 Maintenance Schedule Auto-Generation System

## Overview

Sistem otomatis untuk sinkronisasi maintenance schedules dengan calendar kerja platform. Service orders akan auto-generate berdasarkan jadwal recurring maintenance pelanggan.

---

## 🎯 Fitur Utama

### 1. **Auto-Generate Service Orders**
- Service orders otomatis dibuat 7 hari sebelum tanggal maintenance
- Support multiple frequencies: monthly, quarterly, semi-annual, annual, custom
- Auto-calculate next maintenance date
- Link orders ke maintenance schedule

### 2. **Follow-up Workflow**
- Dashboard widget menampilkan upcoming maintenance
- Urgency indicators: Overdue, Urgent (≤7d), Next 30 days
- One-click generate untuk pending schedules
- Track order creation status

### 3. **Reschedule System**
- Reschedule orders dengan reason logging
- Auto-update linked maintenance schedule
- History tracking di notes

---

## 📊 Database Schema

### New Columns in `property_maintenance_schedules`

```sql
auto_generate_orders BOOLEAN DEFAULT TRUE  -- Enable/disable auto-generation
days_before_reminder INT DEFAULT 7         -- Days before to create order
last_order_generated_at TIMESTAMP          -- Track generation time
```

### New Columns in `service_orders`

```sql
created_from_schedule BOOLEAN DEFAULT FALSE          -- Flag for auto-generated
maintenance_schedule_id UUID                         -- Link to schedule
```

### New View: `v_upcoming_maintenance`

```sql
SELECT 
  schedule_id,
  client_name,
  property_name,
  next_scheduled_date,
  days_until,                    -- Calculated: days until maintenance
  order_exists,                   -- Boolean: order already created?
  latest_order_id,               -- UUID of latest order
  unit_count
FROM property_maintenance_schedules
WHERE is_active = TRUE
ORDER BY next_scheduled_date;
```

---

## 🔧 Functions

### 1. `calculate_next_maintenance_date()`

Auto-calculate next date based on frequency:

```sql
SELECT calculate_next_maintenance_date(
  CURRENT_DATE,     -- last_date
  'quarterly',      -- frequency
  NULL             -- custom_interval_days
);
-- Returns: 3 months from today
```

**Supported Frequencies:**
- `monthly` → +1 month
- `quarterly` → +3 months
- `semi_annual` → +6 months
- `annual` → +1 year
- `custom` → +custom_interval_days

---

### 2. `auto_generate_maintenance_order()`

Generate single service order from schedule:

```sql
SELECT auto_generate_maintenance_order(
  '550e8400-e29b-41d4-a716-446655440000'  -- schedule_id
);
-- Returns: UUID of created service_order
```

**What it does:**
1. Get schedule details (client, property, units)
2. Create service_order with status='pending'
3. Link AC units to order
4. Update schedule tracking (last_order_generated_at, next_scheduled_date)

---

### 3. `check_and_generate_maintenance_orders()`

Batch generate orders for all due schedules:

```sql
SELECT * FROM check_and_generate_maintenance_orders();

-- Returns table:
-- schedule_id | order_id | client_name | property_name | scheduled_date
```

**Criteria for generation:**
- `is_active = TRUE`
- `auto_generate_orders = TRUE`
- `next_scheduled_date <= CURRENT_DATE + days_before_reminder`
- No order generated yet for this date

---

### 4. `reschedule_maintenance_order()`

Reschedule order and update linked schedule:

```sql
SELECT reschedule_maintenance_order(
  '123e4567-e89b-12d3-a456-426614174000',  -- order_id
  '2025-12-25',                             -- new_date
  'Customer requested to move to Friday'    -- reason (optional)
);
-- Returns: TRUE if successful
```

**What it does:**
1. Update service_order.scheduled_date
2. Update linked schedule.next_scheduled_date
3. Log reason to schedule.notes

---

## 🚀 Usage

### Step 1: Execute SQL Setup

Run in Supabase SQL Editor:

```bash
# File: AUTO_GENERATE_MAINTENANCE_ORDERS.sql
```

This creates:
- ✅ New columns
- ✅ 4 functions
- ✅ 1 view
- ✅ Indexes

---

### Step 2: Add Widget to Dashboard

```tsx
import UpcomingMaintenanceWidget from '@/components/maintenance/UpcomingMaintenanceWidget'

export default function DashboardPage() {
  return (
    <div>
      <UpcomingMaintenanceWidget />
    </div>
  )
}
```

---

### Step 3: Manual Trigger (Optional)

Run SQL manually to generate orders:

```sql
-- Check upcoming schedules
SELECT * FROM v_upcoming_maintenance 
WHERE days_until <= 14;

-- Generate all due orders
SELECT * FROM check_and_generate_maintenance_orders();
```

---

## 📱 API Endpoints

### POST `/api/maintenance/auto-generate`

Generate service orders for all due schedules:

```bash
curl -X POST http://localhost:3000/api/maintenance/auto-generate

Response:
{
  "success": true,
  "generated_orders": [
    {
      "schedule_id": "...",
      "order_id": "...",
      "client_name": "PT Maju Jaya",
      "scheduled_date": "2025-12-20"
    }
  ],
  "count": 3
}
```

---

### GET `/api/maintenance/auto-generate`

Get upcoming maintenance schedules:

```bash
curl http://localhost:3000/api/maintenance/auto-generate

Response:
{
  "success": true,
  "upcoming_maintenance": [
    {
      "schedule_id": "...",
      "client_name": "Bank Permata",
      "property_name": "Kantor Purbalingga",
      "next_scheduled_date": "2025-11-18",
      "days_until": 3,
      "order_exists": false,
      "unit_count": 25
    }
  ]
}
```

---

### POST `/api/maintenance/reschedule`

Reschedule maintenance order:

```bash
curl -X POST http://localhost:3000/api/maintenance/reschedule \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "123e4567-e89b-12d3-a456-426614174000",
    "new_date": "2025-12-25",
    "reason": "Customer request"
  }'

Response:
{
  "success": true,
  "message": "Order rescheduled successfully"
}
```

---

## 🎨 Dashboard Widget Features

### Summary Cards
- **Overdue**: Red badge, schedules past due
- **Urgent (≤7d)**: Orange badge, needs immediate attention
- **Next 30 Days**: Blue badge, upcoming schedules
- **Needs Action**: Yellow badge, orders pending creation

### Actions
- **Generate Orders Button**: One-click batch generation
- **Reschedule Button**: Per-order reschedule dialog
- **Create Order Button**: Generate single order

### Table Columns
- Client / Property name
- Frequency (monthly, quarterly, etc.)
- Scheduled date with urgency badge
- Unit count
- Order status (Created / Pending)
- Action buttons

---

## 🔄 Workflow Example

### Scenario: Bank Permata Quarterly Maintenance

1. **Schedule Created**
   ```sql
   INSERT INTO property_maintenance_schedules (
     client_id, property_id,
     frequency = 'quarterly',
     start_date = '2025-08-18',
     next_scheduled_date = '2025-11-18'
   )
   ```

2. **7 Days Before (Nov 11)**
   - System checks: `next_scheduled_date <= Nov 18`
   - Auto-generates service_order
   - Status: pending
   - Technicians can see in calendar

3. **Staff Action**
   - View in dashboard widget
   - Click "Reschedule" if needed
   - Assign technicians
   - Complete job

4. **After Completion**
   - Order status → completed
   - Schedule auto-updates: `next_scheduled_date = Feb 18, 2026`
   - Cycle repeats

---

## ⚙️ Configuration

### Per-Schedule Settings

```sql
UPDATE property_maintenance_schedules
SET 
  auto_generate_orders = TRUE,        -- Enable auto-generation
  days_before_reminder = 14,          -- Create orders 14 days before
  frequency = 'monthly'
WHERE id = '...';
```

### Frequency Options

| Frequency | Interval | Example Next Date |
|-----------|----------|-------------------|
| monthly | 1 month | Jan 15 → Feb 15 |
| quarterly | 3 months | Jan 15 → Apr 15 |
| semi_annual | 6 months | Jan 15 → Jul 15 |
| annual | 1 year | Jan 15, 2025 → Jan 15, 2026 |
| custom | N days | Custom: 45 days |

---

## 📧 Future Enhancements

### Phase 2 (Optional)
- [ ] Email notifications 7 days before
- [ ] SMS reminders 1 day before
- [ ] Auto-assign technicians based on availability
- [ ] Client portal: approve/reschedule maintenance
- [ ] WhatsApp integration
- [ ] Recurring invoice generation

---

## 🧪 Testing

### Test Auto-Generation

```sql
-- 1. Create test schedule
INSERT INTO property_maintenance_schedules (
  tenant_id, client_id, property_id,
  frequency, start_date, next_scheduled_date,
  auto_generate_orders, days_before_reminder
) VALUES (
  (SELECT id FROM tenants LIMIT 1),
  (SELECT id FROM clients LIMIT 1),
  (SELECT id FROM client_properties LIMIT 1),
  'monthly',
  CURRENT_DATE - INTERVAL '1 month',
  CURRENT_DATE + INTERVAL '3 days',
  TRUE,
  7
);

-- 2. Run generation
SELECT * FROM check_and_generate_maintenance_orders();

-- 3. Verify order created
SELECT * FROM service_orders 
WHERE created_from_schedule = TRUE
ORDER BY created_at DESC;
```

---

## 📝 Logs & Monitoring

### Check Generation History

```sql
SELECT 
  pms.id,
  c.company_name,
  cp.name as property,
  pms.last_order_generated_at,
  pms.next_scheduled_date,
  (
    SELECT COUNT(*) 
    FROM service_orders so
    WHERE so.maintenance_schedule_id = pms.id
  ) as total_orders_generated
FROM property_maintenance_schedules pms
JOIN clients c ON c.id = pms.client_id
JOIN client_properties cp ON cp.id = pms.property_id
WHERE pms.auto_generate_orders = TRUE
ORDER BY pms.last_order_generated_at DESC;
```

---

## 🎉 Summary

✅ **Auto-generate** service orders from maintenance schedules  
✅ **Follow-up** workflow dengan urgency indicators  
✅ **Reschedule** dengan reason tracking  
✅ **Dashboard widget** untuk monitoring  
✅ **API endpoints** untuk integration  
✅ **Flexible frequencies** (monthly, quarterly, etc.)

**Next:** Execute `AUTO_GENERATE_MAINTENANCE_ORDERS.sql` di Supabase untuk enable fitur ini!
