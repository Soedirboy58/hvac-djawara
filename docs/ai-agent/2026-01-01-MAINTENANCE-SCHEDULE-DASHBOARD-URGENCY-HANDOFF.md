# AI Agent Handoff — 2026-01-01
## Maintenance Schedule (Client + Admin) + Admin Dashboard KPIs + Urgency Buckets Sync

**Session Date:** 2026-01-01  
**Scope:** Fix tenant resolution for maintenance schedule saves, improve first maintenance date flow, add admin dashboard KPI widgets + operational notifications, and standardize maintenance urgency definitions across screens.

---

## 1) What’s Live Now (High-Level)

### A) Maintenance Schedule (Client Portal)
- Maintenance schedule save is resilient against missing `profiles.active_tenant_id`.
- “First maintenance date” flow now supports:
  - If there is service history: suggest first date based on the last completed service for that property.
  - If client is new (no history): user can set the date manually.

### B) Admin Dashboard (/dashboard)
- Server-rendered admin dashboard now shows KPI cards + operational sections.
- Includes maintenance notifications that cover **Overdue + due within 7 days** (no order generated yet).

### C) Maintenance Urgency Buckets (Sync)
Standardized definition (used by schedule maintenance view + dashboard notifications):
- **Overdue**: `days_until < 0`
- **Due Soon (≤7 days)**: `0..7`
- **Next 30 Days**: `8..30`
- **Needs Action**: `order_exists = false` AND (`days_until <= 7`) → includes overdue + due soon

---

## 2) Key Decisions / Architecture

### A) Tenant resolution helper
A new helper resolves tenant reliably for authenticated users:
- Prefer `profiles.active_tenant_id`
- Fallback to `user_tenant_roles` active role
- “Heal” the profile by writing back `active_tenant_id` when possible

This prevents common Supabase 406 / “No active tenant found” failures in user flows.

### B) Maintenance schedule data source
Maintenance urgency and listing uses view `v_upcoming_maintenance` (not raw schedules), with key fields:
- `days_until` (negative for overdue)
- `next_scheduled_date`
- `order_exists`

---

## 3) Files / Entry Points

### Tenant resolution
- `lib/supabase/active-tenant.ts`

### Client portal maintenance schedule
- `components/client-portal/MaintenanceSchedule.tsx`
- `components/client-portal/PropertyManagement.tsx`

### Schedule management maintenance view
- `components/maintenance/UpcomingMaintenanceWidget.tsx`
- `app/dashboard/schedule/schedule-page-new.tsx` (tabs wrapper)

### Admin dashboard
- `app/dashboard/admin-dashboard.tsx`
- `app/dashboard/page.tsx`

---

## 4) Deploy Notes

- Vercel deploy is triggered by pushing to the connected repo/branch.
- Common deployment remote in this workspace:
  - `putra22` → `main` branch
- Reminder: local Next.js build with next-pwa may change `public/sw.js`; avoid committing that file unless intentionally updating the PWA artifact.

---

## 5) Quick Verification Checklist

1) Client portal: create/update maintenance schedule should save without tenant errors.
2) Client portal: first maintenance date suggestion appears if there’s last completed order.
3) Schedule Management → Maintenance tab: summary cards reflect the standardized buckets.
4) Admin dashboard: “Notif Maintenance (Overdue + ≤7 Hari)” includes overdue items.
5) Finance/Technician reimburse flows unchanged; dashboard notifications read from `reimburse_requests`.
