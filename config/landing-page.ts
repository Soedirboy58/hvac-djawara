// ============================================
// Landing Page Configuration
// Edit file ini untuk mengubah semua konten landing page
// ============================================

import { Users, Award, Clock, CheckCircle, Wrench, Snowflake, Shield } from 'lucide-react';

// Company Information
export const companyInfo = {
  name: 'HVAC Djawara',
  tagline: 'Professional HVAC Solutions',
  phone: '081234567890',
  email: 'pt.djawara3g@gmail.com',
  workingHours: {
    weekday: 'Senin - Jumat: 09:00 - 17:00',
    saturday: 'Sabtu: 09:00 - 15:00',
    sunday: 'Minggu: Emergency Only',
    emergency: '24/7 Emergency Service',
  },
};

// Hero Carousel Slides
export const heroSlides = [
  {
    id: 1,
    title: 'Layanan HVAC Profesional',
    subtitle: 'Dipercaya oleh Ratusan Pelanggan di Jakarta',
    description: 'Teknisi bersertifikat dengan pengalaman 10+ tahun di industri HVAC',
    stats: [
      { icon: Users, label: '500+ Pelanggan', value: 'Puas' },
      { icon: Award, label: '10+ Tahun', value: 'Pengalaman' },
      { icon: Clock, label: '24/7', value: 'Available' },
    ],
    bgGradient: 'from-blue-600 to-indigo-700',
  },
  {
    id: 2,
    title: 'Instalasi AC Berkualitas',
    subtitle: 'Garansi Terjamin & Harga Transparan',
    description: 'Proses instalasi cepat, bersih, dan rapi dengan jaminan kepuasan 100%',
    features: [
      'Survey & konsultasi gratis',
      'Pemasangan oleh teknisi bersertifikat',
      'Garansi instalasi 1 tahun',
      'After-sales support 24/7',
    ],
    bgGradient: 'from-indigo-600 to-purple-700',
  },
  {
    id: 3,
    title: 'Maintenance & Service Rutin',
    subtitle: 'Jaga AC Tetap Dingin & Hemat Energi',
    description: 'Paket maintenance berkala untuk performa optimal dan umur AC lebih panjang',
    benefits: [
      '✓ Pengecekan menyeluruh',
      '✓ Cleaning & disinfeksi',
      '✓ Penambahan freon jika perlu',
      '✓ Laporan kondisi AC lengkap',
    ],
    bgGradient: 'from-purple-600 to-pink-700',
  },
  {
    id: 4,
    title: 'Perbaikan Cepat & Tepat',
    subtitle: 'Tim Siaga Emergency 24 Jam',
    description: 'AC mati mendadak? Kami siap membantu kapan saja dengan respons cepat',
    highlights: [
      { label: 'Respons', value: '< 1 Jam' },
      { label: 'Diagnosa', value: 'Akurat' },
      { label: 'Spare Part', value: 'Original' },
      { label: 'Garansi', value: '3-6 Bulan' },
    ],
    bgGradient: 'from-pink-600 to-rose-700',
  },
];

// Why Choose Us Section
export const whyChooseUs = [
  {
    icon: Users,
    title: 'Teknisi Bersertifikat',
    description: '10+ teknisi profesional dan berpengalaman',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    icon: Clock,
    title: 'Layanan 24/7',
    description: 'Siap membantu Anda kapan saja dibutuhkan',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    icon: Shield,
    title: 'Garansi Terjamin',
    description: 'Garansi service dan spare part',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    icon: CheckCircle,
    title: 'Harga Transparan',
    description: 'Tidak ada biaya tersembunyi',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
];

// Services Section
export const services = [
  {
    icon: Wrench,
    title: 'Instalasi',
    description: 'Instalasi AC baru untuk rumah dan kantor dengan perencanaan yang tepat',
    features: [
      'Survey lokasi gratis',
      'Konsultasi teknis',
      'Garansi instalasi 1 tahun',
    ],
    iconColor: 'text-blue-600',
  },
  {
    icon: Snowflake,
    title: 'Maintenance',
    description: 'Perawatan rutin untuk menjaga performa optimal AC Anda',
    features: [
      'Cleaning & disinfeksi',
      'Pengecekan freon',
      'Perbaikan minor',
    ],
    iconColor: 'text-blue-600',
  },
  {
    icon: Shield,
    title: 'Perbaikan',
    description: 'Service dan perbaikan untuk semua jenis kerusakan AC',
    features: [
      'Diagnosa akurat',
      'Spare part original',
      'Respons cepat',
    ],
    iconColor: 'text-blue-600',
  },
];

// Service Types for Form
export const serviceTypes = [
  { value: 'instalasi', label: 'Instalasi AC Baru' },
  { value: 'maintenance', label: 'Maintenance/Service Rutin' },
  { value: 'perbaikan', label: 'Perbaikan/Service AC Rusak' },
  { value: 'konsultasi', label: 'Konsultasi' },
];

// Time Slots for Form
export const timeSlots = [
  { value: 'pagi', label: 'Pagi (09:00 - 12:00)' },
  { value: 'siang', label: 'Siang (12:00 - 15:00)' },
  { value: 'sore', label: 'Sore (15:00 - 17:00)' },
];

// Trusted Companies (Partner Logos)
export const trustedCompanies = [
  { name: 'PT. ABC', logo: null }, // Ganti null dengan path image: '/logos/abc.png'
  { name: 'Hotel XYZ', logo: null },
  { name: 'Mall DEF', logo: null },
  { name: 'RS. GHI', logo: null },
  { name: 'Gedung JKL', logo: null },
  { name: 'Plaza MNO', logo: null },
];

// CTA Section
export const ctaSection = {
  title: 'Siap Untuk Memulai?',
  description: 'Dapatkan konsultasi gratis dan penawaran terbaik untuk kebutuhan HVAC Anda',
  buttonText: 'Request Service Sekarang',
};

// Footer Links
export const footerLinks = {
  services: ['Instalasi AC', 'Maintenance AC', 'Perbaikan AC', 'Konsultasi'],
  company: ['Tentang Kami', 'Tim Teknisi', 'Karir', 'Blog'],
  support: ['FAQ', 'Garansi', 'Testimoni', 'Hubungi Kami'],
};
