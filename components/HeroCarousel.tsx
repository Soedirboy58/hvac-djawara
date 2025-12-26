'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Users, Award, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequestServiceModal } from '@/components/RequestServiceModal';

const slides = [
  {
    id: 1,
    title: 'Layanan HVAC Profesional',
    subtitle: 'Dipercaya oleh Ratusan Pelanggan di Banyumas',
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
      '✓ Penambahan Refrigerant/ Freon jika perlu',
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

export function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
  };

  const slide = slides[currentSlide];

  return (
    <section className="relative h-[560px] sm:h-[600px] overflow-hidden">
      {/* Background with gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-r ${slide.bgGradient} transition-all duration-700`}
      >
        <div className="absolute inset-0 bg-black/20"></div>
        {/* Animated pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 2%, transparent 2%), radial-gradient(circle at 80% 80%, white 2%, transparent 2%)',
            backgroundSize: '50px 50px',
          }}></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative h-full container mx-auto px-4 flex items-center">
        <div className="max-w-3xl text-white">
          {/* Slide content with fade animation */}
          <div
            key={slide.id}
            className="animate-fadeIn"
          >
            <div className="mb-4 inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
              Slide {currentSlide + 1} dari {slides.length}
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 leading-tight">
              {slide.title}
            </h1>
            
            <p className="text-xl sm:text-2xl md:text-3xl font-semibold mb-4 text-blue-100">
              {slide.subtitle}
            </p>
            
            <p className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl">
              {slide.description}
            </p>

            {/* Stats for slide 1 */}
            {slide.stats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {slide.stats.map((stat, index) => (
                  <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <stat.icon className="h-8 w-8 mb-2" />
                    <div className="font-bold text-xl">{stat.value}</div>
                    <div className="text-sm text-white/80">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Features for slide 2 */}
            {slide.features && (
              <ul className="space-y-3 mb-8">
                {slide.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-lg">
                    <CheckCircle className="h-6 w-6 text-green-300 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            )}

            {/* Benefits for slide 3 */}
            {slide.benefits && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-lg">
                {slide.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Highlights for slide 4 */}
            {slide.highlights && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {slide.highlights.map((highlight, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold mb-1">{highlight.value}</div>
                    <div className="text-sm text-white/80">{highlight.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <div className="w-full sm:w-auto">
                <RequestServiceModal triggerClassName="w-full sm:w-auto" />
              </div>
              <a href="#services" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20">
                  Lihat Layanan
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prevSlide}
        className="hidden sm:block absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6 text-white" />
      </button>
      <button
        onClick={nextSlide}
        className="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6 text-white" />
      </button>

      {/* Dots indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-3 rounded-full transition-all ${
              index === currentSlide
                ? 'w-8 bg-white'
                : 'w-3 bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
