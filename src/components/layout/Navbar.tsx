'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  Menu,
  X,
  Shield,
  Layers,
  Scissors,
  FileText,
  FileOutput,
  Image,
  ImageDown,
  Minimize2,
  LayoutGrid,
  Droplets,
  FileArchive,
  Unlock,
  Eraser,
  Lock,
  Presentation,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tools } from '@/lib/tools-data';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

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
  Unlock,
  Eraser,
  Lock,
  Presentation,
};

export default function Navbar() {
  const { lang, toggleLang, t, getToolDesc } = useLanguage();
  const [activeDropdown, setActiveDropdown] = useState<'convert' | 'compress' | 'all' | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);

  // Sync initial theme state on mount
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('changespdf_theme', 'light');
      } catch (e) {}
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('changespdf_theme', 'dark');
      } catch (e) {}
      setIsDark(true);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        navRef.current &&
        !navRef.current.contains(e.target as Node)
      ) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu and dropdowns on route change
  useEffect(() => {
    setIsMobileOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  const toggleDropdown = (menu: 'convert' | 'compress' | 'all') => {
    setActiveDropdown((prev) => (prev === menu ? null : menu));
  };

  const convertTools = tools.filter((t) => t.category === 'convert');
  const optimizeTools = tools.filter((t) => t.category === 'optimize');
  const otherTools = tools.filter((t) => t.category !== 'convert' && t.category !== 'optimize');

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200/80 dark:border-[#2c2e35]/80 bg-white/95 dark:bg-[#121316]/95 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group shrink-0"
        >
          <div className="relative flex h-9 w-9 items-center justify-center transition-transform group-hover:scale-105">
            <NextImage
              src="/logo.png"
              alt="ChangesPDF Logo"
              width={36}
              height={36}
              className="h-9 w-9 object-contain drop-shadow-sm"
              priority
            />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1e2022] dark:text-white">
            Changes
            <span className="text-[#e5322d]">
              PDF
            </span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div ref={navRef} className="hidden md:flex items-center gap-2 lg:gap-3">
          {/* 1. Convert Menu */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('convert')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                activeDropdown === 'convert'
                  ? 'bg-red-500/10 text-[#e5322d]'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-[#e5322d]'
              )}
            >
              {t.nav.convert}
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform text-gray-500 dark:text-gray-400',
                  activeDropdown === 'convert' && 'rotate-180 text-[#e5322d]'
                )}
              />
            </button>

            <AnimatePresence>
              {activeDropdown === 'convert' && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-[540px] max-h-[500px] overflow-y-auto rounded-2xl border border-gray-200 dark:border-[#2c2e35] bg-white dark:bg-[#1a1b1f] p-3 shadow-2xl shadow-black/10 dark:shadow-black/50"
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    {convertTools.map((tool) => {
                      const Icon = iconMap[tool.iconName] || FileText;
                      return (
                        <Link
                          key={tool.id}
                          href={`/${tool.slug}`}
                          className={cn(
                            'flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors',
                            pathname === `/${tool.slug}`
                              ? 'bg-red-500/10 text-[#e5322d] font-semibold'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-red-500/5 dark:hover:bg-red-500/10 hover:text-[#e5322d] dark:hover:text-[#f2443f]'
                          )}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-[#e5322d]">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold truncate">{tool.title}</p>
                              {tool.badge && (
                                <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-[#e5322d] border border-red-500/20">
                                  {tool.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{getToolDesc(tool.id, tool.description)}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. Compress Menu */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('compress')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                activeDropdown === 'compress'
                  ? 'bg-red-500/10 text-[#e5322d]'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-[#e5322d]'
              )}
            >
              {t.nav.compress}
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform text-gray-500 dark:text-gray-400',
                  activeDropdown === 'compress' && 'rotate-180 text-[#e5322d]'
                )}
              />
            </button>

            <AnimatePresence>
              {activeDropdown === 'compress' && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-[320px] rounded-2xl border border-gray-200 dark:border-[#2c2e35] bg-white dark:bg-[#1a1b1f] p-3 shadow-2xl shadow-black/10 dark:shadow-black/50"
                >
                  <div className="space-y-1">
                    {optimizeTools.map((tool) => {
                      const Icon = iconMap[tool.iconName] || Minimize2;
                      return (
                        <Link
                          key={tool.id}
                          href={`/${tool.slug}`}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                            pathname === `/${tool.slug}`
                              ? 'bg-red-500/10 text-[#e5322d] font-semibold'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-red-500/5 dark:hover:bg-red-500/10 hover:text-[#e5322d] dark:hover:text-[#f2443f]'
                          )}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-[#e5322d]">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold truncate">{tool.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{getToolDesc(tool.id, tool.description)}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. All Tools Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('all')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                activeDropdown === 'all'
                  ? 'bg-red-500/10 text-[#e5322d]'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-[#e5322d]'
              )}
            >
              {t.nav.allTools}
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform text-gray-500 dark:text-gray-400',
                  activeDropdown === 'all' && 'rotate-180 text-[#e5322d]'
                )}
              />
            </button>

            <AnimatePresence>
              {activeDropdown === 'all' && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[520px] rounded-2xl border border-gray-200 dark:border-[#2c2e35] bg-white dark:bg-[#1a1b1f] p-4 shadow-2xl shadow-black/10 dark:shadow-black/50"
                >
                  <div className="grid grid-cols-2 gap-1.5 max-h-[420px] overflow-y-auto">
                    {tools.map((tool) => {
                      const Icon = iconMap[tool.iconName] || FileText;
                      return (
                        <Link
                          key={tool.id}
                          href={`/${tool.slug}`}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                            pathname === `/${tool.slug}`
                              ? 'bg-red-500/10 text-[#e5322d] font-semibold'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-red-500/5 dark:hover:bg-red-500/10 hover:text-[#e5322d] dark:hover:text-[#f2443f]'
                          )}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-[#e5322d]">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate">{tool.title}</p>
                              {tool.badge && (
                                <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-[#e5322d] border border-red-500/20">
                                  {tool.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                              {getToolDesc(tool.id, tool.description)}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Privacy Badge */}
          <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1.5 ml-1">
            <Shield className="h-3.5 w-3.5 text-[#e5322d]" />
            <span className="text-xs font-semibold text-[#e5322d]">
              {t.nav.privacyBadge}
            </span>
          </div>

          {/* Theme Toggle Button (Light / Dark) */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 dark:border-[#2c2e35] bg-gray-50 dark:bg-[#1a1b1f] text-gray-700 dark:text-gray-200 hover:border-[#e5322d] hover:text-[#e5322d] transition-all ml-1 shadow-sm"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? t.nav.themeLight : t.nav.themeDark}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 text-gray-700 transition-transform hover:-rotate-12" />
            )}
          </button>

          {/* Language Switcher Button (EN / ID) */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-gray-200 dark:border-[#2c2e35] bg-gray-50 dark:bg-[#1a1b1f] text-gray-700 dark:text-gray-200 hover:border-[#e5322d] hover:text-[#e5322d] transition-all ml-1 shadow-sm text-xs font-bold"
            aria-label={t.nav.langTitle}
            title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
          >
            <Globe className="h-4 w-4 text-[#e5322d]" />
            <span>{lang.toUpperCase()}</span>
          </button>
        </div>

        {/* Mobile Right Bar */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 dark:border-[#2c2e35] bg-gray-50 dark:bg-[#1a1b1f] text-gray-700 dark:text-gray-200"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-gray-700" />
            )}
          </button>

          {/* Mobile Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 h-9 px-2 rounded-xl border border-gray-200 dark:border-[#2c2e35] bg-gray-50 dark:bg-[#1a1b1f] text-gray-700 dark:text-gray-200 text-xs font-bold"
            aria-label={t.nav.langTitle}
            title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
          >
            <Globe className="h-3.5 w-3.5 text-[#e5322d]" />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="text-gray-700 dark:text-gray-200 hover:text-[#e5322d] transition-colors p-2"
            aria-label="Toggle navigation menu"
          >
            {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200 dark:border-[#2c2e35] bg-white/95 dark:bg-[#121316]/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Convert Section */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#e5322d] px-3 mb-2">
                  {t.nav.convert}
                </p>
                <div className="space-y-1">
                  {convertTools.map((tool) => {
                    const Icon = iconMap[tool.iconName] || FileText;
                    return (
                      <Link
                        key={tool.id}
                        href={`/${tool.slug}`}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                          pathname === `/${tool.slug}`
                            ? 'bg-red-500/10 text-[#e5322d] font-semibold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05]'
                        )}
                      >
                        <Icon className="h-4 w-4 text-[#e5322d]" />
                        <span className="text-sm font-medium">{tool.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Compress Section */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#e5322d] px-3 mb-2">
                  {t.nav.compress}
                </p>
                <div className="space-y-1">
                  {optimizeTools.map((tool) => {
                    const Icon = iconMap[tool.iconName] || Minimize2;
                    return (
                      <Link
                        key={tool.id}
                        href={`/${tool.slug}`}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                          pathname === `/${tool.slug}`
                            ? 'bg-red-500/10 text-[#e5322d] font-semibold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05]'
                        )}
                      >
                        <Icon className="h-4 w-4 text-[#e5322d]" />
                        <span className="text-sm font-medium">{tool.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Other Tools Section */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-3 mb-2">
                  {t.footer.col1}
                </p>
                <div className="space-y-1">
                  {otherTools.map((tool) => {
                    const Icon = iconMap[tool.iconName] || FileText;
                    return (
                      <Link
                        key={tool.id}
                        href={`/${tool.slug}`}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                          pathname === `/${tool.slug}`
                            ? 'bg-red-500/10 text-[#e5322d] font-semibold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05]'
                        )}
                      >
                        <Icon className="h-4 w-4 text-[#e5322d]" />
                        <span className="text-sm font-medium">{tool.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-4 py-2 mt-3 w-fit">
                <Shield className="h-3.5 w-3.5 text-[#e5322d]" />
                <span className="text-xs font-semibold text-[#e5322d]">
                  {t.nav.privacyBadge}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
