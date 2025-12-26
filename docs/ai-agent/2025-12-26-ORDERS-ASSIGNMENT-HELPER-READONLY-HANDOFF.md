# Handoff — Orders UX + Assignment Roles + Helper Read-only (2025-12-26)

**Date:** 2025-12-26  
**Scope:** Improve order creation/edit UX, technician/helper assignment model, enforce read-only behavior for helper accounts, and fix a runtime crash.

---

## What Changed

### 1) `/dashboard/orders/new` UX improvements
- **Time inputs** now use selectable **time slots** (no manual typing).
- **Service details** now include:
  - `Jumlah Unit` (unit_count)
  - `Kategori Unit` (unit_category)
- **Assignment UI** is split into two checklists:
  - **Technicians** (required: at least 1)
  - **Helpers** (optional)
- On create, assignments write to `work_order_assignments` with:
  - technicians → `role_in_order = 'primary'`
  - helpers → `role_in_order = 'assistant'`

### 2) `/dashboard/orders/[id]` now read-only for assignment
- Removed the inline “Assign Technician” card.
- Assignment display shows:
  - Technicians
  - Helpers
- Users must use **Edit Order** for changes.

### 3) `/dashboard/orders/[id]/edit` supports assignment + unit fields
- Added the same unit fields.
- Added the same time slot selects.
- Added assignment checklists (technicians/helpers) and syncs assignments by replacing existing rows.

### 4) Helper/magang restriction (technician portal)
- `helper/magang` accounts can **see** orders but are **read-only**:
  - no check-in/out actions
  - no technical data form submission
- Technician dashboard cards are **not clickable** for helpers (no navigation).

### 5) Bug fix
- Fixed crash: `ReferenceError: AlertCircle is not defined` by importing the icon.

---

## Database / SQL

### New SQL script
- `supabase/ADD_UNIT_COUNT_TO_SERVICE_ORDERS.sql`
  - Adds `service_orders.unit_count INT`.

### Important compatibility note
Some environments may not have `unit_count` / `unit_category` columns yet.
- The UI **probes** whether those columns exist.
- If not available, the app stores unit info into **Notes** as a fallback (so order create/update doesn’t break).

---

## Key Files Changed

- `app/dashboard/orders/new/page.tsx`
  - Time slot select, unit fields, technician/helper assignment UI + validation.
- `app/dashboard/orders/[id]/page.tsx`
  - Remove inline assign UI; read-only display of technicians & helpers.
- `app/dashboard/orders/[id]/edit/page.tsx`
  - Add assignment editing + unit fields + time slot selects.
- `hooks/use-orders.ts`
  - Aggregate and expose helper vs technician assignment names/counts.
- `app/technician/dashboard/page.tsx`
  - Detect helper role; disable click-through; hide action buttons.
- `app/technician/orders/[id]/page.tsx`
  - Helper read-only gating; hide technical form; disable check-in/out.

---

## Commits / Deploy

- `ac8297e` — Improve order scheduling and assignments
- `1a71c47` — Make helper technician dashboard read-only

Both commits were pushed to:
- `origin/main`
- `putra22/main`

Vercel deploy should auto-trigger from the connected repo/branch.

---

## Next Suggestions

1) If you want helper **blocked** even from direct URL access to `/technician/orders/[id]`, add a server-side guard (or route-level redirect) in that route.
2) Consider adding a proper DB migration to include both:
   - `service_orders.unit_count`
   - `service_orders.unit_category` (already defined by `ADD_SERVICE_DETAIL_FIELDS.sql`, but may not be deployed everywhere)
