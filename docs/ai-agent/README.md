# 🤖 AI Agent — Start Here

**Purpose:** Handoff notes for the next AI agent session.  
**Last Updated:** January 01, 2026

## Entry Point (Recommended)

1. **[CURRENT_STATE.md](CURRENT_STATE.md)** ← fastest way to orient (system map + runbook)
2. Then read the latest dated handoff below for detailed changes

## Reading Order

1. **[2026-01-01-MAINTENANCE-SCHEDULE-DASHBOARD-URGENCY-HANDOFF.md](2026-01-01-MAINTENANCE-SCHEDULE-DASHBOARD-URGENCY-HANDOFF.md)** ← latest session (Jan 01)
2. **[2025-12-26-ORDERS-ASSIGNMENT-HELPER-READONLY-HANDOFF.md](2025-12-26-ORDERS-ASSIGNMENT-HELPER-READONLY-HANDOFF.md)** (Dec 26)
3. **[2025-12-26-SALES-PARTNER-DASHBOARD-CLIENT-REFERRAL-HANDOFF.md](2025-12-26-SALES-PARTNER-DASHBOARD-CLIENT-REFERRAL-HANDOFF.md)** (Dec 26)
4. **[2025-12-25-ATTENDANCE-ADMIN-ROSTER-AVATAR-HANDOFF.md](2025-12-25-ATTENDANCE-ADMIN-ROSTER-AVATAR-HANDOFF.md)** (Dec 25)
5. **[2025-12-25-TEAM-INVITE-HELPER-MAGANG-HANDOFF.md](2025-12-25-TEAM-INVITE-HELPER-MAGANG-HANDOFF.md)**
6. **[2025-12-22-REIMBURSE-PEOPLE-TECHNICIAN-HANDOFF.md](2025-12-22-REIMBURSE-PEOPLE-TECHNICIAN-HANDOFF.md)**
7. (Legacy archive) See [../ai-handoff/README.md](../ai-handoff/README.md) and the dated docs inside `docs/ai-handoff/`

## What to do first

- Confirm Supabase SQL has been executed:
  - `supabase/CREATE_REIMBURSE_MODULE.sql`
  - `supabase/CREATE_REIMBURSE_STORAGE.sql`
- If you see CORS errors to `supabase.co/rest/v1`, add your app’s origin in Supabase → Project Settings → API → CORS Allowed Origins.
