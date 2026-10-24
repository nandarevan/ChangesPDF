import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { LanguageProvider } from '@/lib/LanguageContext';
import { Analytics } from '@vercel/analytics/next';
import { SITE_URL } from '@/lib/seo-config';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'ChangesPDF - Change, Convert & Edit PDF Files Online Free',
    template: '%s | ChangesPDF',
  },
  description:
    'Free online PDF tools to change PDF to Word, convert PDF, merge, split, compress, protect, and edit PDF documents. 100% private client-side processing directly in your browser.',
  keywords: [
    'changes pdf',
    'change pdf',
    'convert pdf',
    'pdf converter',
    'pdf to word',
    'word to pdf',
    'change pdf to word',
    'convert pdf to word',
    'compress pdf',
    'merge pdf',
    'split pdf',
    'protect pdf',
    'unlock pdf',
    'pdf to ppt',
    'ppt to pdf',
    'ilovepdf alternative',
    'smallpdf alternative',
    'ubah pdf',
    'konversi pdf',
    'kompres pdf',
    'gabung pdf',
    'free pdf tools',
    'online pdf editor',
  ],
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'ChangesPDF - Change, Convert & Edit PDF Files Online Free',
    description:
      'Free online PDF tools to change PDF to Word, convert PDF, merge, split, compress, and protect documents. 100% private in-browser processing.',
    url: SITE_URL,
    siteName: 'ChangesPDF',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'ChangesPDF - Free Online PDF Tools',
      },
    ],
    locale: 'id_ID',
    alternateLocale: ['en_US'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChangesPDF - Free Online PDF Converter & Tools',
    description:
      'Free online PDF tools to change PDF to Word, merge, split, compress, protect, and convert PDF files.',
    images: ['/opengraph-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#f5f6fa',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('changespdf_theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }

                var savedLang = localStorage.getItem('changespdf_lang');
                if (!savedLang) {
                  var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
                  var navLang = (navigator.language || '').toLowerCase();
                  if (navLang.startsWith('id') || tz.indexOf('Jakarta') !== -1 || tz.indexOf('Makassar') !== -1 || tz.indexOf('Jayapura') !== -1 || tz.indexOf('Pontianak') !== -1) {
                    savedLang = 'id';
                  } else {
                    savedLang = 'en';
                  }
                }
                document.documentElement.lang = savedLang;
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-dvh flex flex-col antialiased bg-[var(--color-bg)] text-[var(--color-text-main)] transition-colors duration-200">
        <LanguageProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <Analytics />
        </LanguageProvider>
      </body>
    </html>
  );
}
