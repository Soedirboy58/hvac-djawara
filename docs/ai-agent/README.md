# 🤖 AI Agent — Start Here

**Purpose:** Handoff notes for the next AI agent session.  
**Last Updated:** December 25, 2025

## Entry Point (Recommended)

1. **[CURRENT_STATE.md](CURRENT_STATE.md)** ← fastest way to orient (system map + runbook)
2. Then read the latest dated handoff below for detailed changes

## Reading Order

1. **[2025-12-25-ATTENDANCE-ADMIN-ROSTER-AVATAR-HANDOFF.md](2025-12-25-ATTENDANCE-ADMIN-ROSTER-AVATAR-HANDOFF.md)** ← latest session (Dec 25)
2. **[2025-12-25-TEAM-INVITE-HELPER-MAGANG-HANDOFF.md](2025-12-25-TEAM-INVITE-HELPER-MAGANG-HANDOFF.md)**
3. **[2025-12-22-REIMBURSE-PEOPLE-TECHNICIAN-HANDOFF.md](2025-12-22-REIMBURSE-PEOPLE-TECHNICIAN-HANDOFF.md)**
4. (Legacy archive) See [../ai-handoff/README.md](../ai-handoff/README.md) and the dated docs inside `docs/ai-handoff/`

## What to do first

- Confirm Supabase SQL has been executed:
  - `supabase/CREATE_REIMBURSE_MODULE.sql`
  - `supabase/CREATE_REIMBURSE_STORAGE.sql`
- If you see CORS errors to `supabase.co/rest/v1`, add your app’s origin in Supabase → Project Settings → API → CORS Allowed Origins.
