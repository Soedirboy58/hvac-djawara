// ============================================
// Home Page - Customer Landing Page
// ============================================

import Link from 'next/link'
import Image from 'next/image'
import { Phone, Mail, Clock, CheckCircle, Wrench, Snowflake, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HeroCarousel } from '@/components/HeroCarousel'
import { RequestServiceModal } from '@/components/RequestServiceModal'

export default function HomePage() {
  const trustedCompanies = [
    {
      name: 'Aron Hotel',
      logo: 'https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/Mitra/Aron.jpg',
    },
    {
      name: 'Buntos Chicken',
      logo: 'https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/Mitra/buntos%20chiken.png',
    },
    {
      name: 'Universitas Peradaban',
      logo: 'https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/Mitra/Logo-Universitas-Peradaban.png',
    },
    {
      name: 'Mixue',
      logo: 'https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/Mitra/Mixue.png',
    },
    {
      name: 'Momoyo',
      logo: 'https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/Mitra/momoyo.jpeg',
    },
    {
      name: 'Pumas',
      logo: 'https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/Mitra/pumas%20basata.png',
    },
    {
      name: 'Rammona',
      logo: 'https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/Mitra/rammona-bakery.jpeg',
    },
    {
      name: 'RS JIH',
      logo: 'https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/Mitra/RS%20JIH%20Purwokerto.png',
    },
    {
      name: 'SBS Frozen',
      logo: 'https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/Mitra/sbs%20frozen%20food.jpg',
    },
    {
      name: 'Triliun',
      logo: 'https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/Mitra/Triliun%20logo.jpg',
    },
    {
      name: 'UMP',
      logo: 'https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/Mitra/UMP.png',
    },
    {
      name: 'Unsoed',
      logo: 'https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/Mitra/Unsoed.png',
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/Assets/Logo%201.png"
              alt="HVAC Djawara logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">HVAC Djawara</h1>
              <p className="text-xs text-gray-500">Professional HVAC Solutions</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <RequestServiceModal triggerSize="sm" />
            <Link href="/login">
              <Button variant="default" size="sm">Login</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Add padding for fixed header */}
      <div className="h-20"></div>

      {/* Hero Carousel Section */}
      <HeroCarousel />

      {/* Why Choose Us */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Mengapa Pilih Kami?</h2>
            <p className="text-lg text-gray-600">Pengalaman dan profesionalisme untuk kenyamanan Anda</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Teknisi Bersertifikat</h3>
              <p className="text-gray-600">10+ teknisi profesional dan berpengalaman</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Layanan 24/7</h3>
              <p className="text-gray-600">Siap membantu Anda kapan saja dibutuhkan</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Garansi Terjamin</h3>
              <p className="text-gray-600">Garansi service dan spare part</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Harga Transparan</h3>
              <p className="text-gray-600">Tidak ada biaya tersembunyi</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Layanan Kami</h2>
            <p className="text-lg text-gray-600">Solusi lengkap untuk semua kebutuhan HVAC Anda</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
              <Wrench className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Instalasi</h3>
              <p className="text-gray-600 mb-4">Instalasi AC baru untuk rumah dan kantor dengan perencanaan yang tepat</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Survey lokasi gratis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Konsultasi teknis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Garansi instalasi 1 tahun
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
              <Snowflake className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Maintenance</h3>
              <p className="text-gray-600 mb-4">Perawatan rutin untuk menjaga performa optimal AC Anda</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Cleaning & disinfeksi
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Pengecekan Refrigerant/ Freon
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Perbaikan minor
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
              <Shield className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Perbaikan</h3>
              <p className="text-gray-600 mb-4">Service dan perbaikan untuk semua jenis kerusakan AC</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Diagnosa akurat
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Spare part original
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Respons cepat
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted Companies Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Dipercaya Oleh Perusahaan Ternama</h2>
            <p className="text-gray-600">Lebih dari 100+ perusahaan mempercayai layanan kami</p>
          </div>
          
          {/* Animated scrolling logos */}
          <div className="relative overflow-hidden">
            <div className="flex animate-scroll-left">
              {/* First set of logos */}
              <div className="flex items-center gap-12 px-6">
                {trustedCompanies.map((company) => (
                  <div
                    key={company.name}
                    className="flex items-center justify-center h-16 w-32 sm:h-20 sm:w-40 bg-white rounded-lg shadow-sm px-4"
                    title={company.name}
                  >
                    <Image
                      src={company.logo}
                      alt={`${company.name} logo`}
                      width={160}
                      height={80}
                      className="h-10 sm:h-12 w-full object-contain"
                      sizes="160px"
                    />
                  </div>
                ))}
              </div>
              {/* Duplicate for seamless loop */}
              <div className="flex items-center gap-12 px-6">
                {trustedCompanies.map((company) => (
                  <div
                    key={`${company.name}-dup`}
                    className="flex items-center justify-center h-16 w-32 sm:h-20 sm:w-40 bg-white rounded-lg shadow-sm px-4"
                    title={company.name}
                  >
                    <Image
                      src={company.logo}
                      alt={`${company.name} logo`}
                      width={160}
                      height={80}
                      className="h-10 sm:h-12 w-full object-contain"
                      sizes="160px"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Siap Untuk Memulai?</h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Dapatkan konsultasi gratis dan penawaran terbaik untuk kebutuhan HVAC Anda
          </p>
          <RequestServiceModal triggerVariant="large" />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Snowflake className="h-6 w-6" />
                <span className="font-bold text-lg">HVAC Djawara</span>
              </div>
              <p className="text-gray-400">
                Layanan HVAC profesional untuk rumah dan bisnis Anda di Jakarta.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Layanan</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Instalasi AC</li>
                <li>Maintenance AC</li>
                <li>Perbaikan AC</li>
                <li>Konsultasi</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Kontak</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  081234567890
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  pt.djawara3g@gmail.com
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  24/7 Available
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Jam Operasional</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Senin - Jumat: 09:00 - 17:00</li>
                <li>Sabtu: 09:00 - 15:00</li>
                <li>Minggu: Emergency Only</li>
                <li className="text-blue-400 font-semibold">24/7 Emergency Service</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} HVAC Djawara. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
