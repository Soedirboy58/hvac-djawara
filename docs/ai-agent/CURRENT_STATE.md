# Current State — Djawara HVAC Platform (Rolling)

**Last updated:** 2025-12-25

Dokumen ini adalah ringkasan *rolling* untuk AI agent berikutnya: peta sistem, fitur yang sudah live, flow penting, pola otorisasi (tenant + role), serta runbook deploy/debug. Untuk detail sesi per tanggal, lihat dokumen handoff di folder yang sama.

---

## 1) TL;DR (Apa yang sudah bisa dipakai)

### Portals
- **Admin/Staff dashboard**: `/dashboard/*`
- **Technician portal**: `/technician/*`
- **Client portal**: `/client/*`

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

### Roles (ringkas)
- Authorization admin actions umumnya dibatasi: `owner`, `admin_finance`, `admin_logistic`, `tech_head`.

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

## 9) Known Gaps / Next High-Value Work

1) **Skema lembur bertingkat**
   - Target: beda per-role + time-band (mis. 17–21, 21–24, 00–04) + multiplier.
   - Rekomendasi: tambah tabel rules per-tenant dan update kalkulasi overtime summary.
2) **Konsolidasi “People performance vs attendance monitoring”**
   - Sekarang:
     - Absensi page = monitoring harian + konfigurasi
     - People Management = roster + performa 30 hari
   - Bisa ditambah deep-link dari People ke detail absensi per orang.

