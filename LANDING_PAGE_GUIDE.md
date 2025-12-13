# 📝 Panduan Edit Konten Landing Page

Semua konten landing page terpusat di **1 file**: `config/landing-page.ts`

## 🚀 Quick Start

### 1. Edit Informasi Perusahaan
```typescript
// File: config/landing-page.ts (Line 12-23)
export const companyInfo = {
  name: 'HVAC Djawara',           // Nama perusahaan
  tagline: 'Professional HVAC Solutions',  // Tagline
  phone: '081234567890',          // Nomor telepon (ganti!)
  email: 'pt.djawara3g@gmail.com', // Email (ganti!)
  workingHours: {
    weekday: 'Senin - Jumat: 09:00 - 17:00',
    saturday: 'Sabtu: 09:00 - 15:00',
    sunday: 'Minggu: Emergency Only',
    emergency: '24/7 Emergency Service',
  },
};
```

### 2. Edit Hero Carousel (4 Slides)
```typescript
// File: config/landing-page.ts (Line 26-80)
export const heroSlides = [
  {
    id: 1,
    title: 'Layanan HVAC Profesional',      // Ganti judul
    subtitle: 'Dipercaya oleh...',           // Ganti subjudul
    description: 'Teknisi bersertifikat...', // Ganti deskripsi
    stats: [...],                             // Edit statistik
    bgGradient: 'from-blue-600 to-indigo-700', // Ganti warna
  },
  // ... 3 slide lainnya
];
```

**Warna Gradient yang Tersedia:**
- `from-blue-600 to-indigo-700` (Biru → Indigo)
- `from-indigo-600 to-purple-700` (Indigo → Ungu)
- `from-purple-600 to-pink-700` (Ungu → Pink)
- `from-pink-600 to-rose-700` (Pink → Rose)
- `from-green-600 to-teal-700` (Hijau → Teal)

### 3. Edit "Mengapa Pilih Kami" (4 Poin)
```typescript
// File: config/landing-page.ts (Line 83-109)
export const whyChooseUs = [
  {
    icon: Users,                          // Icon (dari lucide-react)
    title: 'Teknisi Bersertifikat',      // Judul
    description: '10+ teknisi...',        // Deskripsi
    bgColor: 'bg-blue-100',               // Warna background
    iconColor: 'text-blue-600',           // Warna icon
  },
  // ... 3 item lainnya
];
```

### 4. Edit Layanan (3 Services)
```typescript
// File: config/landing-page.ts (Line 112-140)
export const services = [
  {
    icon: Wrench,                         // Icon
    title: 'Instalasi',                   // Judul
    description: 'Instalasi AC baru...',  // Deskripsi
    features: [                            // List fitur
      'Survey lokasi gratis',
      'Konsultasi teknis',
      'Garansi instalasi 1 tahun',
    ],
    iconColor: 'text-blue-600',
  },
  // ... 2 service lainnya
];
```

### 5. Edit Pilihan Layanan di Form
```typescript
// File: config/landing-page.ts (Line 143-148)
export const serviceTypes = [
  { value: 'instalasi', label: 'Instalasi AC Baru' },
  { value: 'maintenance', label: 'Maintenance/Service Rutin' },
  { value: 'perbaikan', label: 'Perbaikan/Service AC Rusak' },
  { value: 'konsultasi', label: 'Konsultasi' },
];
```

### 6. Edit Waktu Kunjungan di Form
```typescript
// File: config/landing-page.ts (Line 151-155)
export const timeSlots = [
  { value: 'pagi', label: 'Pagi (09:00 - 12:00)' },
  { value: 'siang', label: 'Siang (12:00 - 15:00)' },
  { value: 'sore', label: 'Sore (15:00 - 17:00)' },
];
```

### 7. Edit Company Logos (Partner)
```typescript
// File: config/landing-page.ts (Line 158-165)
export const trustedCompanies = [
  { name: 'PT. ABC', logo: null },        // Ganti null dengan '/logos/abc.png'
  { name: 'Hotel XYZ', logo: null },      // Upload logo ke public/logos/
  // ...
];
```

**Cara ganti dengan logo real:**
1. Upload logo image ke folder `public/logos/`
2. Ganti `logo: null` dengan `logo: '/logos/nama-file.png'`

### 8. Edit CTA Section
```typescript
// File: config/landing-page.ts (Line 168-172)
export const ctaSection = {
  title: 'Siap Untuk Memulai?',
  description: 'Dapatkan konsultasi gratis...',
  buttonText: 'Request Service Sekarang',
};
```

---

## 🎨 Kustomisasi Icon

Icons menggunakan **Lucide React**: https://lucide.dev/icons

**Import icon baru:**
```typescript
import { Users, Award, Clock, YourNewIcon } from 'lucide-react';
```

**Icon yang tersedia:**
- `Users` - Icon orang/team
- `Award` - Icon penghargaan
- `Clock` - Icon jam/waktu
- `Wrench` - Icon kunci pas/tools
- `Snowflake` - Icon AC/dingin
- `Shield` - Icon garansi/perlindungan
- `CheckCircle` - Icon checklist
- `Phone` - Icon telepon
- `Mail` - Icon email

Browse semua icons: https://lucide.dev/icons

---

## 📂 File Structure

```
config/
  landing-page.ts       ← EDIT FILE INI untuk semua konten

components/
  HeroCarousel.tsx      ← Menggunakan config (jangan edit)
  RequestServiceForm.tsx ← Menggunakan config (jangan edit)

app/
  page.tsx              ← Menggunakan config (jangan edit)
```

---

## ✅ Checklist Sebelum Launch

**Wajib diganti:**
- [ ] `companyInfo.phone` → Nomor telepon real
- [ ] `companyInfo.email` → Email real
- [ ] `companyInfo.workingHours` → Jam kerja sesuai operasional

**Optional:**
- [ ] Upload logo perusahaan partner ke `public/logos/`
- [ ] Update `trustedCompanies` dengan logo real
- [ ] Sesuaikan warna gradient di `heroSlides`
- [ ] Edit konten sesuai kebutuhan

**Testing:**
- [ ] Test form submission
- [ ] Test responsive di mobile
- [ ] Test semua link berfungsi

---

## 🔄 Cara Apply Changes

1. Edit file `config/landing-page.ts`
2. Save file (Ctrl+S)
3. Refresh browser (jika dev server sudah running)
4. Changes akan otomatis muncul

**Dev server:**
```bash
npm run dev
```

**Build production:**
```bash
npm run build
npm start
```

---

## 💡 Tips

1. **Copy paste value** yang sudah ada sebagai template
2. **Jangan hapus** struktur object (property names)
3. **Hanya edit** nilai/value di dalam string `'...'`
4. **Test di localhost** dulu sebelum deploy

---

## 🆘 Need Help?

Jika ada error setelah edit:
1. Cek syntax (tutup kurung, koma, quotes)
2. Pastikan semua property required ada
3. Lihat console browser untuk error message
4. Rollback changes terakhir jika error persist

---

**File ini auto-update website tanpa perlu edit code di components!**
