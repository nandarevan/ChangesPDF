import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'ChangesPDF – Change, Convert & Edit PDF Files Online for Free',
    template: '%s | ChangesPDF',
  },
  description:
    'Free online PDF tools to change PDF to Word, merge, split, compress, protect, and convert PDF files. 100% client-side processing – your files never leave your device.',
  keywords: [
    'changes pdf',
    'pdf tools',
    'merge pdf',
    'split pdf',
    'compress pdf',
    'pdf to word',
    'word to pdf',
    'image to pdf',
    'free pdf editor',
    'ilovepdf alternative',
  ],
  metadataBase: new URL('https://changespdf.vercel.app'),
  openGraph: {
    title: 'ChangesPDF – Change, Convert & Edit PDF Files Online for Free',
    description:
      'Free online PDF tools to change PDF to Word, merge, split, compress, protect, and convert PDF files. 100% client-side processing – your files never leave your device.',
    url: 'https://changespdf.vercel.app',
    siteName: 'ChangesPDF',
    images: [
      {
        url: '/og-image.png',
        width: 800,
        height: 800,
        alt: 'ChangesPDF - Free Online PDF Tools',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChangesPDF – Change, Convert & Edit PDF Files Online for Free',
    description:
      'Free online PDF tools to change PDF to Word, merge, split, compress, protect, and convert PDF files.',
    images: ['/og-image.png'],
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
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
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-dvh flex flex-col antialiased bg-[var(--color-bg)] text-[var(--color-text-main)] transition-colors duration-200">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
