'use client';

import Link from 'next/link';
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
  ChevronRight,
  Zap,
  Lock,
  Unlock,
  Eraser,
  Presentation,
  ArrowRight,
} from 'lucide-react';
import ToolPageClient from '@/components/pdf/ToolPageClient';
import { useLanguage } from '@/lib/LanguageContext';
import type { ToolData } from '@/lib/tools-data';

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
  Presentation,
};

interface ToolPageContentProps {
  tool: ToolData;
  relatedTools: ToolData[];
}

export default function ToolPageContent({ tool, relatedTools }: ToolPageContentProps) {
  const { t, getToolDesc, getCategoryLabel } = useLanguage();
  const Icon = iconMap[tool.iconName] || FileText;

  return (
    <div className="relative min-h-screen">
      {/* Breadcrumb Navigation */}
      <div className="relative border-b border-gray-200/80 dark:border-[#2c2e35]">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Link href="/" className="hover:text-[#e5322d] transition-colors">
              {t.toolPage.breadcrumbHome}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="capitalize">{getCategoryLabel(tool.category)}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#e5322d] font-semibold">{tool.title}</span>
          </nav>
        </div>
      </div>

      {/* Tool Header */}
      <section className="relative pt-10 pb-8 sm:pt-14 sm:pb-10 text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Tool Icon */}
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-[#e5322d] shadow-sm">
            <Icon className="h-7 w-7 text-[#e5322d]" />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1e2022] dark:text-white mb-3 tracking-tight">
            {tool.title}
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {getToolDesc(tool.id, tool.description)}
          </p>

          {/* Privacy and Speed Badges */}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-3.5 py-1">
              <Shield className="h-3.5 w-3.5 text-[#e5322d]" />
              <span className="text-xs font-semibold text-[#e5322d]">
                {t.toolPage.badgePrivacy}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-[#1a1b1f] border border-gray-200 dark:border-[#2c2e35] px-3.5 py-1">
              <Zap className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {t.toolPage.badgeInstant}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Tool Interactive Interface */}
      <section className="relative pb-16 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl border border-gray-200 dark:border-[#2c2e35] bg-white dark:bg-[#1a1b1f] p-6 sm:p-10 shadow-sm">
              <ToolPageClient tool={tool} />
            </div>
          </div>
        </div>
      </section>

      {/* How To Use Guide */}
      <section className="relative py-14 sm:py-16 border-t border-gray-200 dark:border-[#2c2e35] bg-white dark:bg-[#16171b]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1e2022] dark:text-white text-center mb-10">
            {t.toolPage.howToPrefix} {tool.title} {t.toolPage.howToSuffix}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: t.toolPage.step1Title,
                desc: `${t.toolPage.step1DescPrefix} ${tool.title}${t.toolPage.step1DescSuffix}`,
              },
              {
                step: '02',
                title: t.toolPage.step2Title,
                desc: t.toolPage.step2Desc,
              },
              {
                step: '03',
                title: t.toolPage.step3Title,
                desc: t.toolPage.step3Desc,
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-gray-200 dark:border-[#2c2e35] bg-gray-50/50 dark:bg-[#1a1b1f] p-6 hover:border-[#e5322d] transition-colors shadow-sm"
              >
                <span className="text-2xl font-black text-[#e5322d]">
                  {item.step}
                </span>
                <h3 className="text-base font-bold text-[#1e2022] dark:text-white mt-2 mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section with Schema */}
      {tool.faqs.length > 0 && (
        <section className="relative py-14 sm:py-16 border-t border-gray-200 dark:border-[#2c2e35]">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-[#1e2022] dark:text-white text-center mb-2">
              {t.toolPage.faqTitle}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">
              {t.toolPage.faqSubtitlePrefix} {tool.title} {t.toolPage.faqSubtitleSuffix}
            </p>
            <div className="space-y-3">
              {tool.faqs.map((faq, index) => (
                <details
                  key={index}
                  className="group rounded-xl border border-gray-200 dark:border-[#2c2e35] bg-white dark:bg-[#1a1b1f] overflow-hidden transition-colors hover:border-[#e5322d]/40 shadow-sm"
                >
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-[#1e2022] dark:text-gray-200 font-semibold hover:text-[#e5322d] transition-colors">
                    <span>{faq.question}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-6 pb-5 pt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-[#2c2e35]">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Tools Section */}
      <section className="relative py-14 border-t border-gray-200 dark:border-[#2c2e35] bg-white dark:bg-[#121316]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-[#1e2022] dark:text-white">
                {t.toolPage.relatedTitle}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t.toolPage.relatedSubtitle}
              </p>
            </div>
            <Link
              href="/"
              className="text-xs font-semibold text-[#e5322d] hover:underline flex items-center gap-1"
            >
              {t.toolPage.allToolsLink} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedTools.map((rel) => {
              const RelIcon = iconMap[rel.iconName] || FileText;
              return (
                <Link
                  key={rel.id}
                  href={`/${rel.slug}`}
                  className="group rounded-xl border border-gray-200 dark:border-[#2c2e35] bg-gray-50/50 dark:bg-[#1a1b1f] p-5 hover:border-[#e5322d] transition-all shadow-sm"
                >
                  <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center text-[#e5322d] mb-3 group-hover:scale-105 transition-transform">
                    <RelIcon className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-sm text-[#1e2022] dark:text-white group-hover:text-[#e5322d] transition-colors">
                    {rel.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                    {getToolDesc(rel.id, rel.description)}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
