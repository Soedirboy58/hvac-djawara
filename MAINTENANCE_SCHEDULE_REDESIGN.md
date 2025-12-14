# 🔄 MAINTENANCE SCHEDULE SYSTEM - REDESIGN

**Date:** December 14, 2025  
**Status:** Proposed Architecture  
**Goal:** Support both simple clients & complex enterprise contracts

---

## 🎯 BUSINESS REQUIREMENTS

### Problem 1: Subscription Without Formal Contract
**Question:** Bagaimana bila pelanggan ingin berlangganan maintenance berkala tanpa kontrak formal?

**Answer:** Buat 2 jalur sistem:
- **Simple Maintenance** - Tidak butuh kontrak, langsung setup dari client
- **Contract Maintenance** - Butuh kontrak approval formal

### Problem 2: Multi-Property with Different Frequencies
**Question:** 1 client punya beberapa properti, setiap unit beda frekuensi (ATM monthly, office quarterly)?

**Answer:** Maintenance schedule **HARUS PER PROPERTY** dengan:
- Property-level default frequency
- Unit-level override (optional)

---

## 🏗️ NEW ARCHITECTURE

### Level 1: Simple Maintenance (No Contract Required)

```
Client → Property → Maintenance Schedule
                  ↓
            Auto-generate Orders
```

**Use Case:**
- Pelanggan rumah tangga: 2 AC split, cuci 3 bulan sekali
- Toko kecil: 3 AC, service 6 bulan sekali
- Warung: 1 AC, maintenance annual

**Database:**
```sql
-- New table: property_maintenance_schedules
CREATE TABLE property_maintenance_schedules (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    client_id UUID NOT NULL,
    property_id UUID NOT NULL, -- Link to client_properties
    
    -- Schedule settings
    frequency TEXT CHECK (frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual', 'custom')),
    custom_interval_days INTEGER,
    start_date DATE NOT NULL,
    maintenance_type TEXT DEFAULT 'cleaning_inspection',
    
    -- Auto-generation
    is_active BOOLEAN DEFAULT TRUE,
    last_generated_date DATE,
    next_scheduled_date DATE,
    
    -- Optional: Select specific units (if NULL = all units in property)
    apply_to_all_units BOOLEAN DEFAULT TRUE,
    selected_unit_ids UUID[], -- Array of ac_units IDs (if apply_to_all = FALSE)
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Workflow:**
1. User masuk ke Client Detail → Property Tab
2. Pilih property → Click "Setup Maintenance Schedule"
3. Pilih frequency + start date
4. Optional: Select specific units atau apply to all
5. Save → Schedule auto-generate orders

**Advantages:**
- ✅ No contract approval needed
- ✅ Quick setup for small clients
- ✅ Per-property configuration
- ✅ Can select specific units

---

### Level 2: Contract-based Maintenance (Enterprise)

```
Contract Request → Approval → Maintenance Contract
                              ↓
                   Contract Locations (multi-property)
                              ↓
                   Contract Units (per-unit frequency)
                              ↓
                   Auto-generate Orders
```

**Use Case:**
- Bank Permata: 2 branches (Purbalingga + Purwokerto)
  - ATM rooms: Monthly
  - Server rooms: Monthly
  - Office spaces: Quarterly
- Hotel: 50 rooms
  - Guest rooms: Quarterly
  - Lobby: Monthly
  - Restaurant: Monthly

**Database:** (Already exists in `CREATE_MAINTENANCE_CONTRACT_TABLES.sql`)
```sql
maintenance_contracts (contract header)
  ↓
contract_locations (branches/properties)
  ↓
contract_units (units with individual frequency)
  ↓
generated_schedules (auto-generated orders)
```

**Workflow:**
1. Customer submit contract request via public form
2. Owner reviews → Send quotation
3. Customer approves → Owner creates formal contract
4. Setup contract:
   - Add locations (Purbalingga, Purwokerto)
   - Add units per location with room_type
   - Set frequency per unit or per room_type
5. System auto-generates schedules per frequency
6. Monthly cron job creates service orders

**Advantages:**
- ✅ Full contract lifecycle (request → approval)
- ✅ Multi-location support
- ✅ Per-unit frequency control
- ✅ Professional quotation process
- ✅ Marketing fee tracking

---

## 📊 COMPARISON TABLE

| Feature | Simple Maintenance | Contract Maintenance |
|---------|-------------------|---------------------|
| **Approval Required** | ❌ No | ✅ Yes (Request → Quote → Approve) |
| **Target User** | Small clients | Enterprise clients |
| **Multi-property** | ✅ Yes (per property) | ✅ Yes (contract locations) |
| **Per-unit Frequency** | ⚠️ Optional (select units) | ✅ Yes (full control) |
| **Quotation** | ❌ No | ✅ Yes |
| **Marketing Fee** | ❌ No | ✅ Yes |
| **Contract Document** | ❌ No | ✅ Yes |
| **Formal Pricing** | ❌ No | ✅ Yes (cost + sell) |
| **Setup Time** | Fast (2 minutes) | Longer (15 minutes) |

---

## 🔄 AUTO-GENERATION LOGIC

### Common Logic (Both Systems)

**Function: `generate_maintenance_orders()`**

```sql
CREATE OR REPLACE FUNCTION generate_maintenance_orders()
RETURNS TABLE(order_id UUID, source_type TEXT) AS $$
DECLARE
    v_order_id UUID;
BEGIN
    -- Generate from Simple Maintenance Schedules
    FOR schedule IN 
        SELECT * FROM property_maintenance_schedules
        WHERE is_active = TRUE
        AND (
            last_generated_date IS NULL AND start_date <= CURRENT_DATE
            OR last_generated_date + get_interval_days(frequency, custom_interval_days) <= CURRENT_DATE
        )
    LOOP
        -- Create service order
        v_order_id := generate_maintenance_order_from_simple_schedule(schedule.id);
        
        RETURN QUERY SELECT v_order_id, 'simple_maintenance'::TEXT;
    END LOOP;
    
    -- Generate from Contract-based Schedules
    FOR contract_unit IN
        SELECT * FROM contract_units cu
        JOIN maintenance_contracts mc ON mc.id = cu.contract_id
        WHERE mc.is_active = TRUE
        AND cu.is_active = TRUE
        AND should_generate_order_for_unit(cu.id)
    LOOP
        -- Create service order for contract unit
        v_order_id := generate_maintenance_order_from_contract(contract_unit.id);
        
        RETURN QUERY SELECT v_order_id, 'contract_maintenance'::TEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

**Cron Job:** Daily at 6:00 AM
```sql
SELECT cron.schedule(
    'generate-all-maintenance-orders',
    '0 6 * * *',
    $$SELECT * FROM generate_maintenance_orders()$$
);
```

---

## 🎨 UI/UX CHANGES

### 1. Client Detail Page - Property Tab

**Current:**
```
[Properties List]
  - Bank Permata Purbalingga
  - Bank Permata Purwokerto
```

**New:**
```
[Properties List]
  - Bank Permata Purbalingga
    📅 Maintenance: Monthly (Next: Jan 15, 2026)
    [Edit Schedule] [View Orders]
  
  - Bank Permata Purwokerto  
    ⚠️ No maintenance schedule
    [Setup Schedule]
```

**Action: Click "Setup Schedule"**
```
┌─────────────────────────────────────────┐
│  🛠️ Setup Maintenance Schedule          │
│                                          │
│  Property: Bank Permata Purbalingga     │
│                                          │
│  Frequency: [Monthly ▼]                 │
│  Start Date: [Jan 15, 2026]             │
│  Maintenance Type: [Cleaning ▼]         │
│                                          │
│  Apply to:                               │
│  ⦿ All units in this property (10 AC)  │
│  ○ Selected units only                   │
│                                          │
│  Notes: [____________________________]  │
│                                          │
│  [ Cancel ]  [ Save Schedule ]          │
└─────────────────────────────────────────┘
```

---

### 2. Client Detail Page - Maintenance Schedule Tab (Enhanced)

**Current Issue:**
- Shows error "No contract found" immediately
- Confusing for simple clients

**New Design:**
```
┌──────────────────────────────────────────────────────┐
│  📅 Maintenance Schedules                            │
│                                                       │
│  Choose setup type:                                  │
│                                                       │
│  ┌──────────────────┐  ┌─────────────────────────┐ │
│  │ 🏠 Simple Setup   │  │ 📄 Contract-based      │ │
│  │                   │  │                         │ │
│  │ Quick maintenance │  │ Formal contract with   │ │
│  │ schedule setup    │  │ quotation & approval   │ │
│  │ per property      │  │                         │ │
│  │                   │  │ Required for:          │ │
│  │ ✅ No approval    │  │ • Multi-location       │ │
│  │ ✅ Fast setup     │  │ • Complex pricing      │ │
│  │                   │  │ • Marketing fee        │ │
│  │ [Setup Now]       │  │                         │ │
│  │                   │  │ [Request Contract]     │ │
│  └──────────────────┘  └─────────────────────────┘ │
│                                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                       │
│  Active Schedules (2)                                │
│                                                       │
│  🏢 Bank Permata Purbalingga (Simple)               │
│     Frequency: Monthly | Next: Jan 15, 2026         │
│     Units: All (10 AC)                               │
│     [Edit] [Pause] [View History]                   │
│                                                       │
│  🏢 Bank Permata Purwokerto (Contract #CTR-001)     │
│     Frequency: Mixed (ATM: Monthly, Office: Qtr)    │
│     Units: 15 AC across 3 floors                    │
│     [View Contract] [Edit Units] [View History]     │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 🚀 IMPLEMENTATION PLAN

### Phase 1: Simple Maintenance (Priority High)
**Timeline:** 1-2 hours

1. ✅ Create table `property_maintenance_schedules`
2. ✅ Create RLS policies
3. ✅ Create generation function `generate_maintenance_order_from_simple_schedule()`
4. ✅ Update UI component `MaintenanceSchedule.tsx`:
   - Add "Choose Setup Type" section
   - Add "Setup from Property" workflow
5. ✅ Update `PropertyManagement.tsx`:
   - Add "Setup Schedule" button per property
   - Show schedule status badge

**Test Case:**
- Client: Toko Elektronik (1 property, 3 AC)
- Setup: Quarterly maintenance
- Start: Jan 1, 2026
- Expected: Order auto-created every 3 months

---

### Phase 2: Contract Enhancement (Priority Medium)
**Timeline:** 2-3 hours

1. ✅ Run `CREATE_MAINTENANCE_CONTRACT_TABLES.sql`
2. ✅ Create UI for contract creation wizard
3. ✅ Integrate contract request approval flow
4. ✅ Create generation function `generate_maintenance_order_from_contract()`
5. ✅ Add unit-level frequency management

**Test Case:**
- Client: Bank Permata
- Locations: Purbalingga (5 ATM, 5 office), Purwokerto (3 ATM, 7 office)
- Setup: ATM monthly, Office quarterly
- Expected: ATM orders every month, Office every 3 months

---

### Phase 3: Unified Cron Job (Priority High)
**Timeline:** 30 minutes

1. ✅ Create unified function `generate_maintenance_orders()`
2. ✅ Setup cron job (daily 6 AM)
3. ✅ Add manual trigger for testing
4. ✅ Add logging to track generation

---

## 📝 DATABASE MIGRATION SEQUENCE

**Execute in this order:**

### 1. Simple Maintenance System
```sql
-- File: supabase/CREATE_SIMPLE_MAINTENANCE_SCHEDULE.sql
-- Run this first
```

### 2. Contract-based System
```sql
-- File: supabase/CREATE_MAINTENANCE_CONTRACT_TABLES.sql
-- Already exists, run after simple system
```

### 3. Unified Generation
```sql
-- File: supabase/CREATE_UNIFIED_MAINTENANCE_GENERATION.sql
-- Run last to combine both systems
```

---

## 🎯 DECISION POINTS

### Question 1: Kontrak atau Tidak?

**Flowchart:**
```
Client has < 10 AC units?
    ├─ YES → Use Simple Maintenance
    │        ✅ Quick setup per property
    │        ✅ No approval needed
    │
    └─ NO  → Is multi-location?
             ├─ YES → Use Contract (complex)
             │        ✅ Multiple locations
             │        ✅ Different frequencies per room
             │
             └─ NO  → Client's choice
                      Either simple or contract
```

**Recommendation:**
- **< 5 units:** Always simple
- **5-10 units:** Simple (optional contract if client wants formal quotation)
- **> 10 units OR multi-location:** Always contract

---

### Question 2: Frekuensi Per Unit

**Simple Maintenance:**
- Property-level frequency (semua unit sama)
- ATAU select specific units (subset dengan frekuensi sama)
- Example: 10 AC, pilih 3 AC ATM untuk monthly, sisanya quarterly

**Contract Maintenance:**
- Unit-level frequency (setiap unit bisa beda)
- Group by room_type untuk kemudahan
- Example: room_type='atm' → all monthly, room_type='office' → all quarterly

---

## ✅ SUMMARY

### Simple Path (Recommended for Most Clients)
1. Go to Client Detail → Properties
2. Click property → "Setup Schedule"
3. Choose frequency → Save
4. Done! Auto-generates orders

### Enterprise Path (Bank Permata Case)
1. Customer submits contract request
2. Owner sends quotation
3. Customer approves
4. Owner creates contract with locations
5. Add units with room types + frequencies
6. System auto-generates per frequency

### Both Systems:
- ✅ Auto-generation via cron (daily 6 AM)
- ✅ Manual trigger available for testing
- ✅ Per-property support
- ✅ Flexible frequency options

---

## 🔗 NEXT STEPS

**Immediate Action:**
1. Review this design with user
2. Confirm business logic
3. Get approval for 2-level approach
4. Start Phase 1 implementation (Simple Maintenance)

**User Questions to Confirm:**
1. ✅ Agree with 2-level system (simple vs contract)?
2. ✅ Simple maintenance: property-level frequency OK?
3. ✅ Contract maintenance: need multi-location + per-unit frequency?
4. ✅ Start with simple system first, then enhance with contract?

---

**Ready to implement once confirmed! 🚀**
