# Current State — Djawara HVAC Platform (Rolling)

**Last updated:** 2026-01-01

Dokumen ini adalah ringkasan *rolling* untuk AI agent berikutnya: peta sistem, fitur yang sudah live, flow penting, pola otorisasi (tenant + role), serta runbook deploy/debug. Untuk detail sesi per tanggal, lihat dokumen handoff di folder yang sama.

---

## 1) TL;DR (Apa yang sudah bisa dipakai)

### Portals
- **Admin/Staff dashboard**: `/dashboard/*`
- **Technician portal**: `/technician/*`
- **Client portal**: `/client/*`

### Sales Partner (role `sales_partner`)
- Sidebar & landing `/dashboard` sudah role-aware.
- Akses via URL ke halaman non-sales-partner (attendance/people/inventory/analytics) sudah_toggle.
- CRM clients bisa memakai referral: `clients.referred_by_id` / `clients.referred_by_name`.

### Workforce (Attendance, Overtime, Leave)
- **Technician attendance** (clock-in/out + status harian): `/technician/attendance`
- **Admin attendance control** (konfigurasi jam kerja + monitoring roster hari ini): `/dashboard/attendance`
- **Overtime requests** (technician): `/technician/overtime` (backend & tabel sudah ada; skema kompensasi bertingkat per-role/time-band masih *pending* untuk dirapikan)
- **Leave** (technician): `/technician/leave`

### People Management
- **Kelola anggota tenant**: `/dashboard/people`
  - Buat undangan staff (team invite) via `/team/invite/[token]`
  - Buat undangan teknisi (technician invite) via `/technician/invite` / `/technician/verify`
  - **Resend activation** untuk teknisi
  - **Hapus undangan** & **hapus member dari tenant**
  - **Hapus teknisi** (termasuk best-effort delete auth user)
  - **Upload avatar** sekarang berlaku untuk role non-teknisi juga (helper/support) via flow yang sama

### Finance
- **Reimburse** end-to-end (admin/finance + technician) sudah live.

### Maintenance Schedule
- **Client portal**: konfigurasi maintenance schedule per properti.
- **Schedule Management**: tab “Maintenance Schedule” untuk monitoring + generate order.
- Definisi urgency distandarisasi berbasis `v_upcoming_maintenance.days_until`:
  - **Overdue**: `< 0`
  - **Due Soon (≤7 hari)**: `0..7`
  - **Next 30 Days**: `8..30`
  - **Needs Action**: `order_exists = false` dan `days_until <= 7`

### Admin Dashboard (KPI)
- `/dashboard` memiliki ringkasan KPI + tabel rute kerja hari ini + notifikasi reimburse + notifikasi maintenance.

---

## 2) Arsitektur Singkat

### Stack
- Next.js 14 App Router + TypeScript
- Supabase (Postgres, Auth, Storage, RLS)
- Tailwind + komponen UI (shadcn-like)

### Dua pola Supabase client (penting)
1) **User-scoped Supabase** (RLS berlaku)
   - Dipakai untuk halaman client-side dan beberapa route yang aman.
2) **Service-role Supabase (admin client)**
   - Dipakai di server route untuk operasi privileged yang tidak mungkin lewat RLS standar.
   - Semua route service-role **wajib** melakukan guard:
     - pastikan user login
     - resolve `tenant_id`
     - cek `user_tenant_roles.role` termasuk: `owner | admin_finance | admin_logistic | tech_head`

> Catatan: jangan pernah expose `SUPABASE_SERVICE_ROLE_KEY` ke client.

---

## 3) Tenant & Authorization Model

### Sumber tenant context
- **Admin dashboard**: `profiles.active_tenant_id`
- **Technician portal**: `technicians.tenant_id` berdasarkan `technicians.user_id = auth.user.id`

### Tenant resolver (baru)
- Untuk mengurangi error “No active tenant found” di flow tertentu, ada helper tenant resolver yang:
  - prefer `profiles.active_tenant_id`
  - fallback ke `user_tenant_roles` active
  - best-effort update `profiles.active_tenant_id` (healing)

### Roles (ringkas)
- Authorization admin actions umumnya dibatasi: `owner`, `admin_finance`, `admin_logistic`, `tech_head`.

### Catatan khusus `sales_partner`
- Sidebar dashboard membatasi menu (Dashboard, Clients, Orders, Contracts, Schedule, Finance, Settings).
- Halaman Attendance/People/Inventory/Analytics melakukan server-side guard dan akan redirect ke `/dashboard`.
- List clients untuk sales partner (UI/query) di-filter dengan `referred_by_id = auth.uid()`.

### Data “helper/magang” di technician portal
- Agar helper/magang bisa login ke portal teknisi (untuk attendance dll), saat aktivasi team invite sistem membuat row di `technicians` (role dimapping ke role yang valid di tabel `technicians`).

---

## 4) Database Entities (yang sering disentuh)

### Identity / tenancy
- `profiles`: menyimpan profil user + `active_tenant_id`.
- `user_tenant_roles`: membership user pada tenant + role + `is_active`.
- `technicians`: roster teknisi untuk tenant (juga dipakai untuk helper/magang agar bisa masuk portal teknisi).
- `team_invitations`: undangan staff/team (berbeda dari undangan client portal).

### Workforce
- `working_hours_config`: per-tenant jam kerja + rate lembur dasar.
- `daily_attendance`: absensi harian (clock in/out, total hours, flags).
- `overtime_requests`: pengajuan lembur (komputasi lebih kompleks masih *pending* untuk model bertingkat).

### Finance
- `reimburse_categories`, `reimburse_requests` (+ storage bucket untuk receipt).

---

## 5) Flows Penting (End-to-End)

### A) Team invite (staff) → aktivasi via `/team/invite/[token]`
1. Admin create invitation dari People Management.
2. Sistem insert `team_invitations` dan membuat link: `/team/invite/[token]`.
3. Invitee buka link, set password.
4. Server route `complete-team-invite`:
   - create/update Supabase Auth user (service role)
   - upsert `profiles`
   - upsert `user_tenant_roles`
   - mark invitation accepted
   - **(untuk helper/magang)** buat/provision row `technicians` agar bisa login portal teknisi.

### B) Technician invite → aktivasi & resend
- Undangan teknisi menggunakan flow berbeda (invite/recovery/generateLink) dan fallback token manual.
- Endpoint resend menyediakan `verifyUrl` agar admin bisa share lewat WhatsApp jika email lambat.

### C) Attendance (technician)
- Clock-in: hitung `is_late` berbasis jam kerja `working_hours_config` dan waktu Asia/Jakarta.
- Clock-out: hitung `total_work_hours`, `is_early_leave` juga berbasis Asia/Jakarta.
- Today API melakukan normalisasi dan **auto-heal** (best effort) untuk record hari ini agar tidak lagi menggunakan perbandingan UTC time-of-day yang sebelumnya menyebabkan flag/hours salah.

### D) Admin attendance control + monitoring
- Admin set jam kerja + rate lembur dasar dari `/dashboard/attendance`.
- Admin monitor roster absensi hari ini (list teknisi/helper) di halaman yang sama.

### E) People Management cleanup
- Undangan di list difilter (pending-only) untuk mencegah “double data”.
- Ada tindakan:
  - hapus undangan
  - hapus member dari tenant (hapus `user_tenant_roles`, best-effort hapus `technicians`)
  - hapus teknisi (hapus row `technicians` dan best-effort hapus auth user)

---

## 6) Endpoint Map (yang paling sering dicari)

### Admin
- `GET/PUT /api/admin/working-hours-config` — baca/simpan `working_hours_config` (tenant active).
- `GET /api/admin/attendance-today` — roster absensi hari ini untuk tenant active.

### People Management
- `/api/people/add-member` — undangan team (staff).
- `/api/people/team-invite-meta` — meta invite via server (hindari RLS client read).
- `/api/people/complete-team-invite` — set password + aktivasi team invite.
- `/api/people/resend-team-invite` — regenerate link team invite.
- `/api/people/add-technician` — add technician roster.
- `/api/people/resend-technician-activation` — resend invite/recovery atau fallback token.
- `/api/people/update-profile-avatar` — upload avatar (service role) untuk bypass RLS.
- `/api/people/remove-member` — remove membership `user_tenant_roles` (+ best-effort delete `technicians`).

### Technician portal
- `/api/technician/attendance/clock-in`
- `/api/technician/attendance/clock-out`
- `/api/technician/attendance/today`
- `/api/technician/delete` — delete technician record (admin only).
- Reimburse: `/api/technician/reimburse/*`
- Overtime: `/api/technician/overtime/*`
- Leave: `/api/technician/leave/*`

---

## 7) Frontend Entry Points

### Admin dashboard
- People Management: `app/dashboard/people/*`
- Attendance (admin): `app/dashboard/attendance/*`
- Sidebar nav: `components/layout/sidebar.tsx`

### Maintenance schedule
- Client portal schedule: `components/client-portal/MaintenanceSchedule.tsx`
- Schedule management widget: `components/maintenance/UpcomingMaintenanceWidget.tsx`

### Sales Partner dashboard
- Dashboard landing: `app/dashboard/page.tsx`
- Clients list + referral: `app/dashboard/clients/*`

### Technician portal
- Attendance page: `app/technician/attendance/page.tsx`

---

## 8) Deploy & Git Runbook

### Remotes
- `origin` → `Soedirboy58/hvac-djawara`
- `putra22` → `putra22-debug/hvac-djawara`

### Build locally
- `npm run build`

### Deploy (Vercel)
- Vercel biasanya deploy dari repo/branch yang dikoneksikan (sering `origin/main`).
- Jika commit sudah masuk GitHub tapi Vercel belum muncul:
  - cek Vercel Project → Git settings (repo + branch)
  - trigger redeploy manual, atau push empty commit

### PWA note (penting untuk menghindari noise)
- Build akan mengubah `public/sw.js` (next-pwa). File ini sering tidak stabil untuk di-commit.

---

## 10) Recent Changes (2025-12-26)

### Sales Partner UI + guards
- Role-aware sidebar + `/dashboard` landing untuk `sales_partner`.
- Server-side guard untuk: `/dashboard/attendance`, `/dashboard/people`, `/dashboard/inventory`, `/dashboard/analytics`.
- Finance page mengizinkan `sales_partner` agar menu tidak dead-end.

### CRM Client Referral
- Dropdown referral saat create/edit client hanya menampilkan role `sales_partner`.
- List clients untuk sales partner hanya menampilkan client dengan `referred_by_id = user.id`.
- Detail client menampilkan field **Referred By** (mendukung `referred_by_name` & lookup `referred_by_id`).

### Orders UX + Assignment Roles
- `/dashboard/orders/new`: input waktu diganti ke time slot select (lebih cepat & minim typo).
- Tambah detail layanan: `jumlah_unit (unit_count)` dan `kategori_unit (unit_category)`.
- Assignment dipisah jelas: **Technicians** (minimal 1) vs **Helpers** (opsional).
- Persistence assignment memakai `work_order_assignments.role_in_order`:
  - technician → `primary`
  - helper → `assistant`
- `/dashboard/orders/[id]` assignment dibuat read-only (ubah lewat Edit).
- `/dashboard/orders/[id]/edit` mendukung edit time slot, unit fields, dan assignment (technician/helper).

### Helper/Magang Restrictions (Technician Portal)
- Helper/magang bisa melihat orders namun **read-only**:
  - tidak bisa check-in/out
  - tidak bisa isi/submit technical data form
- Dashboard `/technician` untuk helper: card order tidak bisa diklik (no navigation).

### Database note
- Ada script tambahan: `supabase/ADD_UNIT_COUNT_TO_SERVICE_ORDERS.sql` untuk menambah kolom `service_orders.unit_count`.
- UI memiliki fallback bila kolom unit belum ada (menyimpan ke Notes agar create/update order tidak gagal).

---

## 9) Known Gaps / Next High-Value Work

1) **Skema lembur bertingkat**
   - Target: beda per-role + time-band (mis. 17–21, 21–24, 00–04) + multiplier.
   - Rekomendasi: tambah tabel rules per-tenant dan update kalkulasi overtime summary.
2) **Konsolidasi “People performance vs attendance monitoring”**
   - Sekarang:
     - Absensi page = monitoring harian + konfigurasi
     - People Management = roster + performa 30 hari
   - Bisa ditambah deep-link dari People ke detail absensi per orang.

---

## 11) Recent Changes (2026-01-01)

### Maintenance schedule: tenant fix + first maintenance date suggestion
- Save maintenance schedule dibuat lebih robust terhadap tenant context yang kosong.
- “First maintenance date” akan menyarankan tanggal berdasarkan last completed service order (jika ada), jika tidak ada maka manual.

### Admin dashboard: KPI + notifikasi
- Tambah dashboard KPI admin di `/dashboard` (server component) + notifikasi reimburse + notifikasi maintenance.

### Maintenance urgency buckets (sync)
- Standardisasi bucket urgency untuk maintenance:
  - Overdue: `days_until < 0`
  - Due Soon (≤7 hari): `0..7`
  - Next 30 Days: `8..30`
  - Needs Action: `order_exists=false` dan `days_until <= 7`

