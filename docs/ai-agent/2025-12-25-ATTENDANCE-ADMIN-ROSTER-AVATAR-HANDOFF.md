# AI Agent Handoff — 2025-12-25
## Admin Attendance Control + Roster Monitoring + Avatar Upload Parity

**Session date:** 2025-12-25  
**Scope:** Melengkapi modul absensi (admin control + monitoring roster), parity upload avatar untuk helper/support, dan memastikan build+deploy.

---

## 1) What’s Live Now (Ringkas)

### Admin — Absensi
- Halaman `/dashboard/attendance` sekarang berisi:
  - **Kontrol Kehadiran (Jam Kerja)**: set `work_start_time`, `work_end_time`, `overtime_rate_per_hour`, `max_overtime_hours_per_day`
  - **Monitoring Absensi Hari Ini**: daftar semua teknisi/helper pada tenant, menampilkan clock-in/out + jam kerja + status

### People Management — Avatar
- Upload avatar tidak lagi dibatasi hanya teknisi; role helper/support bisa memakai flow upload yang sama.

---

## 2) Root Cause / Kenapa perlu perubahan

1) **Admin tidak bisa memonitor roster absensi**
   - Sebelumnya Absensi hanya konfigurasi jam kerja.
   - Kebutuhan operasional: admin perlu melihat siapa yang sudah hadir hari ini.

2) **Upload foto profil hanya untuk teknisi**
   - Ada guard di UI yang memblok upload untuk non-teknisi.
   - Kebutuhan: helper/support juga butuh avatar (parity).

---

## 3) Implementasi (Backend)

### A) API roster hari ini
- Endpoint: `GET /api/admin/attendance-today`
- Guard:
  - user harus login
  - resolve `active_tenant_id` dari `profiles`
  - cek role aktif pada tenant (`owner | admin_finance | admin_logistic | tech_head`)
- Data:
  - ambil `technicians` berdasarkan `tenant_id`
  - ambil `daily_attendance` untuk tanggal hari ini (Asia/Jakarta) berdasarkan `technician_id = user_id`
  - ambil `user_tenant_roles` untuk label role staff
  - return roster dengan status ter-derive: `Belum aktivasi`, `Tidak hadir`, `Terlambat`, `Pulang cepat`, `Terlambat & pulang cepat`, `Auto checkout`, `Tepat waktu`

### Catatan timezone
- Tanggal “hari ini” dihitung dengan `Intl.DateTimeFormat(... timeZone: 'Asia/Jakarta')` → `YYYY-MM-DD`.

---

## 4) Implementasi (Frontend)

### A) Card monitoring roster
- Komponen: `app/dashboard/attendance/attendance-roster-card.tsx`
- Memanggil `/api/admin/attendance-today`.
- Tabel menampilkan: Nama, Role, Clock In, Clock Out, Jam, Status.

### B) Integrasi halaman
- `app/dashboard/attendance/page.tsx` menampilkan:
  - `AttendanceConfigCard`
  - `AttendanceRosterCard`

### C) Avatar upload parity
- `app/dashboard/people/people-client.tsx`:
  - Menghapus guard “upload avatar khusus teknisi”.

---

## 5) Files Changed

### New
- `app/api/admin/attendance-today/route.ts`
- `app/dashboard/attendance/attendance-roster-card.tsx`

### Updated
- `app/dashboard/attendance/page.tsx`
- `app/dashboard/people/people-client.tsx`

---

## 6) Build & Deploy

- Build lokal: `npm run build` ✅ sukses
- Commit: `33945e7` (judul: “Add admin attendance roster monitoring”)
- Push: ✅ `origin/main` dan `putra22/main`

**PWA note:** `public/sw.js` berubah saat build (next-pwa) dan sengaja tidak di-commit untuk menghindari churn.

---

## 7) Next Steps (Recommended)

1) Tambahkan ringkasan jumlah hadir/terlambat/tidak hadir di atas tabel roster (opsional).
2) Rancang skema lembur bertingkat (per role + time band) sebagai tabel rules per tenant.
3) Pertimbangkan deep-link dari People Management (per user) → detail absensi 30 hari.

