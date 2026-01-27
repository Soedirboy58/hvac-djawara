# 2026-01-27 — Maintenance Schedule: Sync to Actual Completion

## Ringkas
Masalah: setelah maintenance selesai, user harus manual update `start_date` agar jadwal berikutnya maju (tidak efektif).

Solusi: tambahkan trigger di `service_orders` agar ketika status menjadi `completed`, sistem otomatis menyamakan `property_maintenance_schedules.last_generated_date` dengan tanggal aktual selesai. Dengan trigger `update_next_scheduled_date` yang sudah ada, `next_scheduled_date` akan ikut bergeser otomatis.

## Perubahan Utama
- Trigger baru: update `last_generated_date` saat order maintenance selesai.
- Sumber tanggal aktual (fallback berurutan):
  1) `service_orders.completed_at`
  2) `service_orders.actual_end_time`
  3) `service_orders.scheduled_date`
  4) `CURRENT_DATE`

## File Terkait
- Migration: supabase/migrations/20260127_001_sync_maintenance_actual_completion.sql

## Dampak
- Tidak perlu edit `start_date` manual setelah maintenance selesai.
- Jadwal berikutnya otomatis maju mengikuti tanggal actual completion.

## Cara Apply
Jalankan migration di atas ke database Supabase.

## Validasi (cek cepat)
1) Selesaikan order maintenance yang terhubung `maintenance_schedule_id`.
2) Pastikan `property_maintenance_schedules.last_generated_date` berubah ke tanggal selesai.
3) Pastikan `next_scheduled_date` otomatis berubah sesuai interval.

## Catatan
- Trigger hanya berjalan jika status order berubah menjadi `completed`.
- Jika status selesai tapi `completed_at` tidak terisi, sistem tetap menggunakan `actual_end_time` atau `scheduled_date`.
