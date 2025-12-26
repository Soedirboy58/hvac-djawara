# 2025-12-26 — Sales Partner Dashboard + Client Referral Fixes (Handoff)

## TL;DR
Rilis hari ini fokus ke pengalaman **role `sales_partner`**:
- Sidebar & landing `/dashboard` kini role-aware (sales partner hanya lihat menu yang relevan).
- Route yang tidak relevan (Attendance/People/Inventory/Analytics) **di-guard server-side** untuk mencegah akses via URL.
- CRM Clients:
  - Dropdown **Referred By** saat create/edit client kini hanya menampilkan **sales partner**.
  - List client untuk sales partner kini **hanya menampilkan client yang direferensikan oleh user tersebut**.
  - Detail client menampilkan field **Referred By**.

## Perubahan Utama

### A) Role-aware sidebar + dashboard landing
- Sidebar sekarang memilih menu berdasarkan role tenant (`user_tenant_roles` + `profiles.active_tenant_id`).
  - Sales Partner menu: Dashboard, Clients, Service Orders, Contract Management, Schedule, Finance, Settings.
  - Admin/staff lainnya tetap full menu.

### B) Guard akses halaman yang tidak untuk sales partner
Sales partner tidak boleh mengakses halaman berikut (meskipun mengetik URL langsung):
- `/dashboard/attendance`
- `/dashboard/people`
- `/dashboard/inventory`
- `/dashboard/analytics`

Halaman-halaman ini sekarang melakukan check:
- user login
- resolve tenant dari `profiles.active_tenant_id`
- resolve `user_tenant_roles.role` (aktif)
- redirect ke `/dashboard` bila role tidak sesuai

### C) CRM Clients — Referral fixes

#### 1) Dropdown referral terlalu banyak orang
Sebelumnya dropdown mengambil semua role dari view `partnership_network`.
Sekarang dropdown hanya mengambil `role = 'sales_partner'`.

#### 2) Sales partner masih melihat semua client perusahaan
`/dashboard/clients` kini mengirim `viewerRole` + `viewerUserId` ke komponen list.
Jika role adalah `sales_partner`, query client di-filter:
- `clients.referred_by_id = viewerUserId`

> Catatan: ini filter di UI/query. Jika RLS masih mengizinkan SELECT semua client, user bisa saja mengakses data via cara lain. Idealnya tambahkan / pastikan **RLS policy** juga membatasi.

#### 3) Detail client tidak menampilkan referensi
`/dashboard/clients/[id]` kini menampilkan field **Referred By**:
- Jika `clients.referred_by_name` ada → tampilkan itu
- Else jika `clients.referred_by_id` ada → lookup `profiles.full_name`

## File yang Disentuh

### Sales Partner dashboard + guards
- `app/dashboard/layout.tsx` — resolve role tenant & pass ke Sidebar
- `components/layout/sidebar.tsx` — role-based navigation
- `app/dashboard/page.tsx` — landing KPI placeholder untuk sales partner
- `app/dashboard/attendance/page.tsx` — guard role
- `app/dashboard/people/page.tsx` — guard role
- `app/dashboard/inventory/page.tsx` — guard role
- `app/dashboard/analytics/page.tsx` — guard role
- `app/dashboard/finance/page.tsx` — allow `sales_partner`

### Clients referral
- `app/dashboard/clients/client-form.tsx` — referral dropdown hanya sales_partner
- `app/dashboard/clients/page.tsx` — pass viewer role/userId ke list
- `app/dashboard/clients/clients-list.tsx` — filter list untuk sales_partner
- `app/dashboard/clients/[id]/page.tsx` — tampilkan Referred By

## Deployment Notes
- Build akan memodifikasi `public/sw.js` (next-pwa). Jangan commit file itu (revert sebelum commit).
- Commits hari ini:
  - `5a00623` — Role-based sales partner dashboard + guards
  - `1996861` — Fix sales partner referral filtering

Remotes:
- `origin` → `Soedirboy58/hvac-djawara`
- `putra22` → `putra22-debug/hvac-djawara`

## Known Gaps / Next Steps (High Value)
- **RLS policy** untuk tabel `clients`: pastikan sales partner hanya bisa SELECT client yang `referred_by_id = auth.uid()`.
- Client detail page (`/dashboard/clients/[id]`) masih client-component; akses kontrol terbaik sebaiknya via RLS atau server-side guard yang memverifikasi ownership/tenant.
- KPI sales partner di `/dashboard` masih placeholder; bisa dihitung dari clients referred + orders/invoices terkait.
