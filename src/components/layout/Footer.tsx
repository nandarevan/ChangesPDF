'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Zap, CheckCircle2, ArrowUp } from 'lucide-react';
import { tools } from '@/lib/tools-data';
import { useLanguage } from '@/lib/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  const getTool = (id: string) => tools.find((t) => t.id === id);

  const columns = [
    {
      title: t.footer.col1,
      toolIds: [
        'merge-pdf',
        'split-pdf',
        'organize-pdf',
        'protect-pdf',
        'unlock-pdf',
        'watermark-pdf',
        'remove-watermark',
      ],
    },
    {
      title: t.footer.col2,
      toolIds: [
        'pdf-to-word',
        'word-to-pdf',
        'pdf-to-ppt',
        'ppt-to-pdf',
        'pdf-to-jpg',
        'jpg-to-pdf',
        'pdf-to-png',
        'png-to-pdf',
      ],
    },
    {
      title: t.footer.col3,
      toolIds: [
        'jpg-to-png',
        'png-to-jpg',
        'word-to-jpg',
        'word-to-png',
        'jpg-to-word',
        'png-to-word',
      ],
    },
    {
      title: t.footer.col4,
      toolIds: [
        'compress-pdf',
        'compress-word',
        'compress-ppt',
        'compress-jpg',
        'compress-png',
      ],
    },
  ];

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="border-t border-gray-200/80 dark:border-[#22252c] bg-[#fafafc] dark:bg-[#0e0f13] transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Value Proposition Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="flex items-center gap-3.5 p-4 rounded-2xl border border-gray-200/80 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-[#e5322d]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t.footer.badge1Title}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t.footer.badge1Desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl border border-gray-200/80 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-[#e5322d]">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t.footer.badge2Title}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t.footer.badge2Desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl border border-gray-200/80 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-[#e5322d]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t.footer.badge3Title}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t.footer.badge3Desc}
              </p>
            </div>
          </div>
        </div>

        {/* Balanced Tool Columns */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-12">
          {columns.map((col, idx) => (
            <div key={idx} className="flex flex-col">
              <div className="inline-block w-fit mb-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  {col.title}
                </h3>
                <div className="h-0.5 w-full bg-[#e5322d] rounded-full mt-2" />
              </div>
              <ul className="space-y-2.5">
                {col.toolIds.map((id) => {
                  const tool = getTool(id);
                  if (!tool) return null;
                  return (
                    <li key={tool.id}>
                      <Link
                        href={`/${tool.slug}`}
                        className="group flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-[#e5322d] dark:hover:text-[#f2443f] transition-colors"
                      >
                        <span className="opacity-0 -translate-x-1.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#e5322d] mr-1 text-xs font-bold">
                          ›
                        </span>
                        <span className="transition-transform group-hover:translate-x-0.5">
                          {tool.title}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Brand & SEO Context Card */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 mb-8 shadow-sm dark:shadow-none">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 max-w-3xl">
              <Link href="/" className="shrink-0 mt-0.5">
                <Image
                  src="/logo.png"
                  alt="ChangesPDF Logo"
                  width={38}
                  height={38}
                  className="h-9 w-9 object-contain"
                />
              </Link>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {t.footer.brandCardTitle}
                </h4>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t.footer.brandCardDesc}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] text-gray-600 dark:text-gray-300">
                {t.footer.pillPrivat}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] text-gray-600 dark:text-gray-300">
                {t.footer.pillNoUpload}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium border border-red-500/20 bg-red-500/10 text-[#e5322d]">
                {t.footer.pillFree}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200/70 dark:border-white/[0.06]">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
            © 2026 ChangesPDF. {t.footer.copyright}{' '}
            <span className="text-gray-900 dark:text-white font-semibold">
              Nanda Revan Saputro
            </span>
            . {t.footer.rights}
          </p>
          <div className="flex items-center gap-5 sm:gap-6">
            <Link
              href="/"
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#e5322d] dark:hover:text-[#f2443f] transition-colors"
            >
              {t.footer.privacyPolicy}
            </Link>
            <Link
              href="/"
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#e5322d] dark:hover:text-[#f2443f] transition-colors"
            >
              {t.footer.terms}
            </Link>
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-[#e5322d] dark:hover:text-[#f2443f] transition-colors"
              aria-label="Kembali ke atas"
            >
              <span>{t.footer.backToTop}</span>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
