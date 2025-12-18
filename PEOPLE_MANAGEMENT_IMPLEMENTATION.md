# People Management & Sales Referral Implementation Guide

**Date:** December 18, 2025  
**Features:** Sales Referral Tracking + People Management System  
**Status:** ✅ Code Complete, ⏳ SQL Migrations Pending

---

## 🎯 What Was Implemented

### 1. Sales Referral Tracking for Clients
Added ability to track which sales/marketing person referred each client.

**Features:**
- Dropdown field in Add/Edit Client form
- Automatically fetches active sales/marketing/business_dev team members
- Stores `referred_by_id` in clients table
- Performance tracking view for client acquisition

**Files Modified:**
- `app/dashboard/clients/client-form.tsx` - Added sales referral dropdown
- SQL: `supabase/ADD_CLIENT_REFERRAL_TRACKING.sql` - Database schema

### 2. People Management System
Complete organizational structure management to replace simple "Team" page.

**Features:**
- View all team members grouped by position category
- Categories: Executive, Management, Administrative, Sales & Marketing, Technical, Support
- Search and filter by name, email, role, or category
- Activate/deactivate team members
- Stats dashboard (total, active, inactive, by category)
- Expanded role hierarchy

**Files Created:**
- `app/dashboard/people/page.tsx` - Server component (data fetching)
- `app/dashboard/people/people-client.tsx` - Client component (interactive UI)
- `components/layout/sidebar.tsx` - Updated navigation
- SQL: `supabase/EXPAND_USER_ROLES.sql` - New role types

**New Roles Added:**
- `direktur` - Direktur/Director
- `manager` - Manager
- `supervisor` - Supervisor
- `admin` - Admin (general)
- `marketing` - Marketing
- `business_dev` - Business Development
- `senior_teknisi` - Senior Technician
- `teknisi` - Technician (Indonesian)
- `helper` - Helper
- `magang` - Intern/Trainee

---

## 📋 SQL Migrations Required

### Priority 1: Expand User Roles (Run First)
**File:** `supabase/EXPAND_USER_ROLES.sql`

**What it does:**
1. Adds 10 new role types to `user_role` enum
2. Creates `role_hierarchy` view for organized display
3. Maps roles to categories (Executive, Management, etc.)
4. Provides Indonesian display names

**Run this before anything else** - required for both features.

```bash
# In Supabase SQL Editor
# Copy and paste entire file, then click RUN
```

### Priority 2: Add Client Referral Tracking
**File:** `supabase/ADD_CLIENT_REFERRAL_TRACKING.sql`

**What it does:**
1. Adds `referred_by_id` column to clients table
2. Creates index for performance
3. Creates `sales_client_acquisition` view for reporting

```bash
# Run after EXPAND_USER_ROLES.sql
```

---

## 🧪 Testing Instructions

### Test 1: Sales Referral Field
1. Go to: https://hvac-djawara.vercel.app/dashboard/clients/new
2. Fill in client details
3. **Verify:** "Referred By" dropdown appears in "Referral Information" section
4. Select a sales/marketing person (if any exist)
5. Submit form
6. **Expected:** Client saved with `referred_by_id` populated

**Check in Database:**
```sql
SELECT 
  c.name,
  c.email,
  p.full_name as referred_by,
  utr.role
FROM clients c
LEFT JOIN profiles p ON c.referred_by_id = p.id
LEFT JOIN user_tenant_roles utr ON p.id = utr.user_id
WHERE c.referred_by_id IS NOT NULL;
```

### Test 2: People Management Page
1. Go to: https://hvac-djawara.vercel.app/dashboard/people
2. **Verify Stats Cards:**
   - Total Team count
   - Active members count
   - Inactive members count
   - Number of categories
3. **Verify Grouping:**
   - Members grouped by category (Executive, Management, etc.)
   - Badge colors different per category
4. **Test Search:**
   - Type name in search box
   - Results filter in real-time
5. **Test Category Filter:**
   - Select category from dropdown
   - Only that category shows
6. **Test Activate/Deactivate:**
   - Click deactivate button on active member
   - Status changes, member grayed out
   - Click activate - status restores

### Test 3: Role Hierarchy View
```sql
-- View all roles organized by category
SELECT * FROM role_hierarchy;

-- Count members by category
SELECT 
  rh.category,
  COUNT(utr.id) as member_count
FROM role_hierarchy rh
LEFT JOIN user_tenant_roles utr ON utr.role::text = rh.role_name
WHERE utr.is_active = TRUE
GROUP BY rh.category
ORDER BY member_count DESC;
```

### Test 4: Sales Performance View
```sql
-- View client acquisition by sales person
SELECT * FROM sales_client_acquisition;

-- Top performers (last 30 days)
SELECT 
  sales_person_name,
  sales_role,
  clients_last_30_days,
  total_clients_referred
FROM sales_client_acquisition
WHERE clients_last_30_days > 0
ORDER BY clients_last_30_days DESC;
```

---

## 🗂️ Role Category Mapping

### Executive
- `owner` - Pemilik Perusahaan
- `direktur` - Direktur

### Management
- `manager` - Manager
- `supervisor` - Supervisor
- `admin_finance` - Admin Finance
- `admin_logistic` - Admin Logistik

### Administrative
- `admin` - Admin

### Sales & Marketing
- `sales_partner` - Sales Partner
- `marketing` - Marketing
- `business_dev` - Business Development

### Senior Technical
- `tech_head` - Kepala Teknisi
- `senior_teknisi` - Teknisi Senior

### Technical
- `technician` - Technician (English)
- `teknisi` - Teknisi (Indonesian)

### Support
- `helper` - Helper
- `magang` - Magang/Trainee

### External
- `client` - Client

---

## 📊 Database Schema Changes

### clients table
```sql
-- New column
ALTER TABLE clients
ADD COLUMN referred_by_id UUID REFERENCES profiles(id);

-- Index
CREATE INDEX idx_clients_referred_by ON clients(referred_by_id);
```

### user_role enum
```sql
-- New values added (10 total)
ALTER TYPE user_role ADD VALUE 'direktur';
ALTER TYPE user_role ADD VALUE 'manager';
ALTER TYPE user_role ADD VALUE 'supervisor';
ALTER TYPE user_role ADD VALUE 'admin';
ALTER TYPE user_role ADD VALUE 'marketing';
ALTER TYPE user_role ADD VALUE 'business_dev';
ALTER TYPE user_role ADD VALUE 'senior_teknisi';
ALTER TYPE user_role ADD VALUE 'teknisi';
ALTER TYPE user_role ADD VALUE 'helper';
ALTER TYPE user_role ADD VALUE 'magang';
```

### Views Created
1. **role_hierarchy** - Organized role display with categories
2. **sales_client_acquisition** - Client referral tracking by sales person

---

## 🎨 UI Components

### People Management Page Features

**Stats Dashboard:**
- Total team members
- Active vs inactive count
- Category breakdown
- Visual icons for each stat

**Search & Filter:**
- Real-time search (name, email, role)
- Category filter dropdown
- "Add Member" button (UI only, backend pending)

**Team Member Cards:**
- Avatar with initials
- Full name and role badge
- Contact info (email, phone)
- Join date
- Active/inactive status
- Activate/Deactivate button
- Edit button (UI only)

**Visual Design:**
- Category badges with color coding
- Grouped display by category
- Responsive layout
- Empty state for no results

---

## 🔧 Integration Points

### Sales Referral in Client Form
```typescript
// Fetch sales people
const { data } = await supabase
  .from('user_tenant_roles')
  .select(`
    user_id,
    role,
    profiles:user_id (id, full_name)
  `)
  .eq('tenant_id', tenantId)
  .eq('is_active', true)
  .in('role', ['sales_partner', 'marketing', 'business_dev'])
```

### People Management Data
```typescript
// Fetch team members
const { data } = await supabase
  .from('user_tenant_roles')
  .select(`
    id,
    user_id,
    role,
    is_active,
    created_at,
    profiles:user_id (
      id,
      full_name,
      email,
      phone,
      avatar_url
    )
  `)
  .eq('tenant_id', tenantId)
  .order('is_active', { ascending: false })
  .order('role')
```

---

## 🚨 Known Limitations

### Current Implementation
1. **Add Member Feature:** UI button exists but form not implemented yet
2. **Edit Member Feature:** UI button exists but edit modal not implemented
3. **Delete Member:** Not implemented (use deactivate instead)
4. **Role Assignment:** Can only be done via SQL currently
5. **Sales Dropdown:** Only shows if members have sales roles assigned

### Future Enhancements
1. Add member form with email invitation
2. Edit member details (name, email, phone, role)
3. Bulk operations (activate multiple, assign roles)
4. Role change history/audit log
5. Permission-based access control
6. Advanced filters (join date range, multiple roles)

---

## 📝 Usage Examples

### Assign Sales Role to User
```sql
-- Make user a marketing person
INSERT INTO user_tenant_roles (user_id, tenant_id, role, is_active)
VALUES (
  'user-uuid-here',
  'tenant-uuid-here',
  'marketing',
  TRUE
);
```

### Track Client Referrals
```sql
-- When creating client via form, referred_by_id is saved automatically
-- Query to see who's bringing in clients:
SELECT 
  p.full_name as sales_person,
  COUNT(c.id) as clients_referred,
  string_agg(c.name, ', ') as client_names
FROM profiles p
INNER JOIN clients c ON p.id = c.referred_by_id
GROUP BY p.id, p.full_name
ORDER BY clients_referred DESC;
```

### Change User Role
```sql
-- Update role for existing user
UPDATE user_tenant_roles
SET role = 'supervisor'
WHERE user_id = 'user-uuid'
  AND tenant_id = 'tenant-uuid';
```

---

## 🔗 Related Features

### Existing Systems
- **Service Orders:** Already has `sales_referral_id` field (see `02_ADD_SALES_REFERRAL_TRACKING.sql`)
- **Technician Assignment:** Multi-technician system (see `AI_SESSION_HANDOFF_DEC16_2025.md`)
- **Client Portal:** Premium authentication (see `AI_SESSION_HANDOFF.md`)

### Potential Integrations
1. **Commission Tracking:** Calculate commissions based on referred clients
2. **Performance Dashboard:** Sales KPIs, leaderboards
3. **Referral Workflow:** Automated email when client referred
4. **Org Chart:** Visual organizational hierarchy
5. **Team Analytics:** Productivity, workload distribution

---

## ✅ Deployment Checklist

- [x] Client form updated with sales referral dropdown
- [x] People Management page created
- [x] Sidebar navigation updated
- [x] SQL migration files created
- [x] Documentation written
- [ ] SQL migrations executed in Supabase ⚠️
- [ ] Test sales referral dropdown (after SQL)
- [ ] Test People Management page (after SQL)
- [ ] Assign test users to new roles
- [ ] Verify role hierarchy view working

---

## 🎯 Next Steps

### Immediate (After SQL Execution)
1. Run `EXPAND_USER_ROLES.sql` in Supabase
2. Run `ADD_CLIENT_REFERRAL_TRACKING.sql` in Supabase
3. Test client form sales referral field
4. Test People Management page display
5. Assign roles to existing users for testing

### Short Term
1. Implement "Add Member" form
2. Implement "Edit Member" modal
3. Add bulk operations
4. Create sales performance dashboard
5. Add commission tracking

### Long Term
1. Advanced org chart visualization
2. Role-based permissions system
3. Automated onboarding workflow
4. Performance review system
5. Team analytics dashboard

---

## 📞 Support Queries

### Check if Sales Roles Exist
```sql
SELECT 
  p.full_name,
  utr.role,
  utr.is_active
FROM user_tenant_roles utr
INNER JOIN profiles p ON utr.user_id = p.id
WHERE utr.role IN ('sales_partner', 'marketing', 'business_dev')
ORDER BY p.full_name;
```

### View Role Distribution
```sql
SELECT 
  role,
  COUNT(*) as count,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count
FROM user_tenant_roles
GROUP BY role
ORDER BY count DESC;
```

### Find Unassigned Roles
```sql
-- Roles in hierarchy but no users assigned
SELECT rh.role_name, rh.display_name, rh.category
FROM role_hierarchy rh
WHERE rh.role_name NOT IN (
  SELECT DISTINCT role::text FROM user_tenant_roles
);
```

---

**Status:** Ready for SQL execution and testing  
**Priority:** Medium (non-blocking, enhancement feature)  
**Dependencies:** None (standalone feature)

---

*End of Implementation Guide*
