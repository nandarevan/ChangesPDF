import Link from 'next/link';
import Image from 'next/image';
import { tools, categoryLabels, type ToolData } from '@/lib/tools-data';

export default function Footer() {
  const grouped = tools.reduce(
    (acc, tool) => {
      if (!acc[tool.category]) acc[tool.category] = [];
      acc[tool.category].push(tool);
      return acc;
    },
    {} as Record<string, ToolData[]>
  );

  return (
    <footer className="border-t border-gray-200/90 dark:border-[#2c2e35] bg-white dark:bg-[#121316] transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {/* Tool Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {(Object.keys(grouped) as ToolData['category'][]).map((category) => (
            <div key={category}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                {categoryLabels[category]}
              </h3>
              <ul className="space-y-2">
                {grouped[category].map((tool) => (
                  <li key={tool.id}>
                    <Link
                      href={`/${tool.slug}`}
                      className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-[#e5322d] dark:hover:text-[#f2443f] transition-colors"
                    >
                      {tool.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* SEO Content & Logo */}
        <div className="border-t border-gray-100 dark:border-[#2c2e35] pt-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo.png"
              alt="ChangePDF Logo"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
          </Link>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-3xl">
            <strong className="text-gray-800 dark:text-gray-200">ChangePDF</strong> adalah toolkit PDF online gratis yang memungkinkan Anda mengelola file PDF langsung di browser. Ubah PDF ke Word, gabungkan berkas, pisahkan dokumen, kompres file, hapus watermark, dan lainnya — tanpa perlu mengunggah ke server mana pun. File Anda tetap berada di perangkat Anda untuk privasi dan keamanan total.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 dark:border-[#2c2e35] pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © 2026 ChangePDF • Created by <span className="text-[#1e2022] dark:text-white font-semibold">Nanda Revan Saputro</span>. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-[#e5322d] transition-colors"
            >
              Kebijakan Privasi
            </Link>
            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-[#e5322d] transition-colors"
            >
              Syarat &amp; Ketentuan
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
