'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Scissors,
  FileText,
  FileOutput,
  Image,
  ImageDown,
  Minimize2,
  LayoutGrid,
  Shield,
  Droplets,
  FileArchive,
  ArrowRight,
  Lock,
  Unlock,
  Eraser,
  Zap,
  ShieldCheck,
  Search,
  X,
} from 'lucide-react';
import { tools, categoryLabels, type ToolData } from '@/lib/tools-data';

const iconMap: Record<string, React.ElementType> = {
  Layers,
  Scissors,
  FileText,
  FileOutput,
  Image,
  ImageDown,
  Minimize2,
  LayoutGrid,
  Shield,
  Droplets,
  FileArchive,
  Lock,
  Unlock,
  Eraser,
};

const categoryColors: Record<ToolData['category'], string> = {
  convert: 'from-blue-500/15 to-cyan-500/10 border-blue-500/20 hover:border-blue-500/40 hover:shadow-blue-500/10',
  organize: 'from-violet-500/15 to-purple-500/10 border-violet-500/20 hover:border-violet-500/40 hover:shadow-violet-500/10',
  security: 'from-emerald-500/15 to-teal-500/10 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-500/10',
  optimize: 'from-amber-500/15 to-orange-500/10 border-amber-500/20 hover:border-amber-500/40 hover:shadow-amber-500/10',
};

const categoryIconColors: Record<ToolData['category'], string> = {
  convert: 'text-blue-400 bg-blue-500/10',
  organize: 'text-violet-400 bg-violet-500/10',
  security: 'text-emerald-400 bg-emerald-500/10',
  optimize: 'text-amber-400 bg-amber-500/10',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
  },
} as const;

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | ToolData['category']>('all');

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesSearch =
        searchQuery === '' ||
        tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.seoKeywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = activeCategory === 'all' || tool.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, activeCategory]);

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ChangesPDF',
    url: 'https://changespdf.com',
    description:
      'Free online PDF tools to change PDF to Word, merge, split, compress, protect, and convert PDF files directly in your browser.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://changespdf.com/{search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="relative min-h-screen">
      {/* Search Engine Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      {/* Hero Section */}
      <section className="relative pt-16 pb-10 sm:pt-24 sm:pb-14 text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-4xl mx-auto"
          >
            {/* Brand Logo Emblem */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.02, duration: 0.3 }}
              className="flex justify-center mb-5"
            >
              <div className="relative p-2.5 rounded-2xl bg-white dark:bg-[#1e2022] shadow-sm border border-gray-200/90 dark:border-[#2c2e35] hover:scale-105 transition-transform duration-200">
                <NextImage
                  src="/logo.png"
                  alt="ChangesPDF"
                  width={56}
                  height={56}
                  className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
                  priority
                />
              </div>
            </motion.div>

            {/* Top Security Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              className="inline-flex items-center rounded-full bg-red-500/10 border border-red-500/20 px-4 py-1.5 mb-6"
            >
              <span className="text-xs font-semibold text-[#e5322d]">
                100% Gratis &amp; Langsung di Browser, File Anda Tidak Pernah Keluar dari Perangkat
              </span>
            </motion.div>

            {/* Main Headline (iLovePDF Style) */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-[#1e2022] dark:text-white">
              Setiap Alat PDF yang Anda Butuhkan, <br className="hidden sm:inline" />
              <span className="text-[#e5322d]">Dalam Satu Tempat</span>
            </h1>

            {/* Subheadline */}
            <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Ubah, gabung, pisah, kompres, lindungi, dan konversi dokumen PDF Anda
              dengan cepat dan aman 100% di memori browser. Tanpa antrean server.
            </p>

            {/* Trust Badges */}
            <div className="mt-6 flex flex-wrap justify-center gap-5 text-xs font-medium text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#e5322d]" />
                <span>Privasi 100% Terjaga</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-[#e5322d]" />
                <span>Proses Instan di Memori</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#e5322d]" />
                <span>Tanpa Watermark Tambahan</span>
              </div>
            </div>

            {/* Interactive Live Search Bar */}
            <div className="mt-8 max-w-xl mx-auto relative">
              <div className="relative flex items-center">
                <Search className="absolute left-4 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari alat (misal: word, merge, split, compress, protect, watermark)..."
                  className="w-full rounded-2xl bg-white dark:bg-[#1a1b1f] border border-gray-200 dark:border-[#2c2e35] pl-12 pr-10 py-3.5 text-sm text-[#1e2022] dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[#e5322d] focus:outline-none transition-all shadow-sm focus:shadow-md"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setActiveCategory('all')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  activeCategory === 'all'
                    ? 'bg-[#e5322d] text-white shadow-sm shadow-[#e5322d]/30'
                    : 'bg-white dark:bg-[#1a1b1f] border border-gray-200 dark:border-[#2c2e35] text-gray-600 dark:text-gray-300 hover:border-[#e5322d] hover:text-[#e5322d]'
                }`}
              >
                Semua Alat ({tools.length})
              </button>
              {(Object.keys(categoryLabels) as ToolData['category'][]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    activeCategory === cat
                      ? 'bg-[#e5322d] text-white shadow-sm shadow-[#e5322d]/30'
                      : 'bg-white dark:bg-[#1a1b1f] border border-gray-200 dark:border-[#2c2e35] text-gray-600 dark:text-gray-300 hover:border-[#e5322d] hover:text-[#e5322d]'
                  }`}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tools Grid Section (iLovePDF Style Cards) */}
      <section className="relative py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {filteredTools.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#1a1b1f] rounded-2xl border border-gray-200 dark:border-[#2c2e35] p-8 max-w-md mx-auto">
              <p className="text-base text-gray-600 dark:text-gray-300">Tidak ada alat yang cocok dengan &quot;{searchQuery}&quot;</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-4 text-sm font-semibold text-[#e5322d] hover:underline"
              >
                Hapus filter pencarian
              </button>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filteredTools.map((tool) => {
                const Icon = iconMap[tool.iconName] || FileText;
                return (
                  <motion.div key={tool.id} variants={itemVariants}>
                    <Link href={`/${tool.slug}`} className="block group h-full">
                      <div className="tool-card relative h-full flex flex-col justify-between p-6">
                        <div>
                          {/* Icon & Category Tag */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-[#e5322d] transition-transform duration-200 group-hover:scale-110">
                              <Icon className="h-5 w-5" />
                            </div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                              {categoryLabels[tool.category]}
                            </span>
                          </div>

                          {/* Title & Description */}
                          <h2 className="text-lg font-bold text-[#1e2022] dark:text-white mb-2 group-hover:text-[#e5322d] transition-colors">
                            {tool.title}
                          </h2>
                          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                            {tool.description}
                          </p>
                        </div>

                        {/* CTA Link */}
                        <div className="mt-5 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-[#e5322d] transition-colors pt-3 border-t border-gray-100 dark:border-[#2c2e35]">
                          <span>Buka {tool.title}</span>
                          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform text-[#e5322d]" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* SEO & Feature Highlights Section */}
      <section className="relative py-14 sm:py-20 border-t border-gray-200/80 dark:border-[#2c2e35]/80 mt-12 bg-white dark:bg-[#16171b]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1e2022] dark:text-white mb-3">
                Solusi Cerdas Pengelolaan Dokumen PDF
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
                ChangesPDF menyediakan semua kemampuan alat PDF lengkap tanpa instalasi software, tanpa langganan, dan dengan keamanan privasi tertinggi.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-5">
              {[
                {
                  title: 'Ubah PDF ke Word',
                  description:
                    'Konversi PDF ke Word (.docx) dengan layout rapi, penomoran presisi, dan fitur AI OCR untuk scan dokumen.',
                },
                {
                  title: 'Gabung & Pisah PDF',
                  description:
                    'Kombinasikan beberapa file atau ambil rentang halaman terpilih dengan preview thumbnail visual yang interaktif.',
                },
                {
                  title: 'Kompres & Lindungi',
                  description:
                    'Kecilkan ukuran file untuk kirim email atau enkripsi dengan kata sandi langsung di memori perangkat Anda.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-200 dark:border-[#2c2e35] bg-gray-50/50 dark:bg-[#1a1b1f] p-6 hover:border-[#e5322d]/50 transition-colors shadow-sm"
                >
                  <h3 className="text-base font-bold text-[#1e2022] dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-[#2c2e35] bg-gray-50/50 dark:bg-[#1a1b1f] p-8 space-y-3">
              <h3 className="text-lg font-bold text-[#1e2022] dark:text-white">
                Mengapa Memilih ChangesPDF?
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Kebanyakan converter online mengharuskan pengunggahan dokumen ke server luar. ChangesPDF memberikan kemudahan dengan memproses langsung di perangkat Anda tanpa risiko kebocoran data.
              </p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Baik Anda membutuhkan <strong className="text-[#1e2022] dark:text-gray-200">PDF ke Word</strong>, penggabungan berkas, hapus watermark, atau buka kunci PDF, semua dapat diselesaikan dalam hitungan detik.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
