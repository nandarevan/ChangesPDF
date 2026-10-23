export type Language = 'id' | 'en';

export interface Translations {
  nav: {
    convert: string;
    compress: string;
    allTools: string;
    privacyBadge: string;
    themeLight: string;
    themeDark: string;
    langTitle: string;
  };
  home: {
    topBadge: string;
    heroTitle1: string;
    heroTitle2: string;
    heroSubtitle: string;
    trustPrivacy: string;
    trustSpeed: string;
    trustWatermark: string;
    searchPlaceholder: string;
    allFilter: string;
    openTool: string;
    noResults: string;
    clearFilter: string;
    solutionTitle: string;
    solutionDesc: string;
    card1Title: string;
    card1Desc: string;
    card2Title: string;
    card2Desc: string;
    card3Title: string;
    card3Desc: string;
    whyTitle: string;
    whyP1: string;
    whyP2: string;
  };
  toolPage: {
    breadcrumbHome: string;
    badgePrivacy: string;
    badgeInstant: string;
    howToPrefix: string;
    howToSuffix: string;
    step1Title: string;
    step1DescPrefix: string;
    step1DescSuffix: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    faqTitle: string;
    faqSubtitlePrefix: string;
    faqSubtitleSuffix: string;
    relatedTitle: string;
    relatedSubtitle: string;
    allToolsLink: string;
  };
  footer: {
    badge1Title: string;
    badge1Desc: string;
    badge2Title: string;
    badge2Desc: string;
    badge3Title: string;
    badge3Desc: string;
    col1: string;
    col2: string;
    col3: string;
    col4: string;
    brandCardTitle: string;
    brandCardDesc: string;
    pillPrivat: string;
    pillNoUpload: string;
    pillFree: string;
    copyright: string;
    rights: string;
    privacyPolicy: string;
    terms: string;
    backToTop: string;
  };
  dropzone: {
    selectFile: string;
    dropPrompt: string;
    dropActive: string;
    formatLabel: string;
    maxLabel: string;
  };
  categories: {
    convert: string;
    organize: string;
    security: string;
    optimize: string;
  };
}

export const translations: Record<Language, Translations> = {
  id: {
    nav: {
      convert: 'Konversi',
      compress: 'Kompres',
      allTools: 'Semua Alat',
      privacyBadge: '100% Client-Side',
      themeLight: 'Mode Terang (Light)',
      themeDark: 'Mode Gelap (Dark)',
      langTitle: 'Ganti Bahasa (Language)',
    },
    home: {
      topBadge: '100% Gratis & Langsung di Browser, File Anda Tidak Pernah Keluar dari Perangkat',
      heroTitle1: 'Setiap Alat PDF yang Anda Butuhkan,',
      heroTitle2: 'Dalam Satu Tempat',
      heroSubtitle:
        'Ubah, gabung, pisah, kompres, lindungi, dan konversi dokumen PDF Anda dengan cepat dan aman 100% di memori browser. Tanpa antrean server.',
      trustPrivacy: 'Privasi 100% Terjaga',
      trustSpeed: 'Proses Instan di Memori',
      trustWatermark: 'Tanpa Watermark Tambahan',
      searchPlaceholder: 'Cari alat (misal: word, merge, split, compress, protect, watermark)...',
      allFilter: 'Semua Alat',
      openTool: 'Buka',
      noResults: 'Tidak ada alat yang cocok dengan',
      clearFilter: 'Hapus filter pencarian',
      solutionTitle: 'Solusi Cerdas Pengelolaan Dokumen PDF',
      solutionDesc:
        'ChangesPDF menyediakan semua kemampuan alat PDF lengkap tanpa instalasi software, tanpa langganan, dan dengan keamanan privasi tertinggi.',
      card1Title: 'Ubah PDF ke Word',
      card1Desc:
        'Konversi PDF ke Word (.docx) dengan layout rapi, penomoran presisi, dan fitur AI OCR untuk scan dokumen.',
      card2Title: 'Gabung & Pisah PDF',
      card2Desc:
        'Kombinasikan beberapa file atau ambil rentang halaman terpilih dengan preview thumbnail visual yang interaktif.',
      card3Title: 'Kompres & Lindungi',
      card3Desc:
        'Kecilkan ukuran file untuk kirim email atau enkripsi dengan kata sandi langsung di memori perangkat Anda.',
      whyTitle: 'Mengapa Memilih ChangesPDF?',
      whyP1:
        'Kebanyakan converter online mengharuskan pengunggahan dokumen ke server luar. ChangesPDF memberikan kemudahan dengan memproses langsung di perangkat Anda tanpa risiko kebocoran data.',
      whyP2:
        'Baik Anda membutuhkan PDF ke Word, penggabungan berkas, hapus watermark, atau buka kunci PDF, semua dapat diselesaikan dalam hitungan detik.',
    },
    toolPage: {
      breadcrumbHome: 'Beranda',
      badgePrivacy: '100% Client-Side Privacy',
      badgeInstant: 'Instan di Memori',
      howToPrefix: 'Cara Menggunakan',
      howToSuffix: 'dalam 3 Langkah Mudah',
      step1Title: 'Pilih Dokumen',
      step1DescPrefix: 'Pilih atau tarik file Anda ke area',
      step1DescSuffix: '. File tidak pernah diunggah ke server mana pun.',
      step2Title: 'Atur Preferensi',
      step2Desc: 'Sesuaikan opsi yang Anda inginkan dengan tampilan instan langsung di layar.',
      step3Title: 'Simpan Hasil',
      step3Desc: 'Unduh file yang telah selesai diproses langsung ke komputer atau ponsel Anda.',
      faqTitle: 'Pertanyaan yang Sering Diajukan',
      faqSubtitlePrefix: 'Semua yang perlu Anda ketahui mengenai penggunaan',
      faqSubtitleSuffix: 'di ChangesPDF.',
      relatedTitle: 'Alat PDF Terkait Lainnya',
      relatedSubtitle: 'Jelajahi utilitas PDF gratis lainnya untuk mempermudah pekerjaan Anda',
      allToolsLink: 'Semua Alat',
    },
    footer: {
      badge1Title: '100% Privasi Terjamin',
      badge1Desc: 'Dokumen diproses di browser Anda tanpa risiko kebocoran data.',
      badge2Title: 'Cepat & Efisien',
      badge2Desc: 'Pemrosesan dokumen instan dengan akselerasi memori modern.',
      badge3Title: 'Bebas Biaya',
      badge3Desc: 'Akses ke seluruh fitur PDF, Word, PowerPoint, dan gambar tanpa batas.',
      col1: 'Organisasi & Keamanan',
      col2: 'Konversi PDF',
      col3: 'Gambar & Dokumen',
      col4: 'Kompresi & Optimasi',
      brandCardTitle: 'ChangesPDF: Platform Dokumen PDF & Format Kantor Lengkap',
      brandCardDesc:
        'Toolkit online gratis untuk mengelola file PDF, Word, PowerPoint, dan gambar langsung di browser. Menggabungkan berkas, pisahkan halaman, kompresi ukuran, dan konversi multi-format dengan privasi penuh.',
      pillPrivat: '100% Privat',
      pillNoUpload: 'Tanpa Server Upload',
      pillFree: 'Bebas Biaya',
      copyright: 'Dibuat oleh',
      rights: 'Hak cipta dilindungi.',
      privacyPolicy: 'Kebijakan Privasi',
      terms: 'Syarat & Ketentuan',
      backToTop: 'Ke Atas',
    },
    dropzone: {
      selectFile: 'Pilih File',
      dropPrompt: 'atau letakkan dan tarik file ke sini',
      dropActive: 'Lepaskan file di sini',
      formatLabel: 'Format:',
      maxLabel: 'Maksimal',
    },
    categories: {
      convert: 'Konversi',
      organize: 'Organisir',
      security: 'Keamanan',
      optimize: 'Optimasi',
    },
  },
  en: {
    nav: {
      convert: 'Convert',
      compress: 'Compress',
      allTools: 'All Tools',
      privacyBadge: '100% Client-Side',
      themeLight: 'Light Mode',
      themeDark: 'Dark Mode',
      langTitle: 'Change Language',
    },
    home: {
      topBadge: '100% Free & Browser-Native, Your Files Never Leave Your Device',
      heroTitle1: 'Every PDF Tool You Need,',
      heroTitle2: 'In One Place',
      heroSubtitle:
        'Change, merge, split, compress, protect, and convert your PDF documents quickly and securely 100% in browser memory. No server queues.',
      trustPrivacy: '100% Privacy Preserved',
      trustSpeed: 'Instant In-Memory Speed',
      trustWatermark: 'No Added Watermarks',
      searchPlaceholder: 'Search tools (e.g., word, merge, split, compress, protect, watermark)...',
      allFilter: 'All Tools',
      openTool: 'Open',
      noResults: 'No tools matching',
      clearFilter: 'Clear search filter',
      solutionTitle: 'Smart Solutions for PDF Document Management',
      solutionDesc:
        'ChangesPDF delivers comprehensive PDF capabilities without software installation, recurring subscriptions, and with maximum privacy security.',
      card1Title: 'PDF to Word Conversion',
      card1Desc:
        'Convert PDF to editable Word (.docx) with structured layouts, accurate pagination, and AI OCR for scanned documents.',
      card2Title: 'Merge & Split PDF',
      card2Desc:
        'Combine multiple documents or extract custom page ranges using an intuitive visual thumbnail organizer.',
      card3Title: 'Compress & Protect',
      card3Desc:
        'Reduce file sizes for quick email sharing or encrypt documents with strong password protection directly in device memory.',
      whyTitle: 'Why Choose ChangesPDF?',
      whyP1:
        'Most online converters require uploading your sensitive documents to external servers. ChangesPDF processes everything directly on your machine without data leakage risks.',
      whyP2:
        'Whether you need PDF to Word, file merging, watermark removal, or PDF unlocking, every task completes in seconds with zero fees.',
    },
    toolPage: {
      breadcrumbHome: 'Home',
      badgePrivacy: '100% Client-Side Privacy',
      badgeInstant: 'Instant In-Memory',
      howToPrefix: 'How to Use',
      howToSuffix: 'in 3 Easy Steps',
      step1Title: 'Select Document',
      step1DescPrefix: 'Select or drop your file into the',
      step1DescSuffix: ' area. Files are never uploaded to any remote server.',
      step2Title: 'Configure Options',
      step2Desc: 'Adjust your preferences with instant live preview directly on your screen.',
      step3Title: 'Download Result',
      step3Desc: 'Download your processed document directly to your computer or mobile phone.',
      faqTitle: 'Frequently Asked Questions',
      faqSubtitlePrefix: 'Everything you need to know about using',
      faqSubtitleSuffix: 'on ChangesPDF.',
      relatedTitle: 'Other Related PDF Tools',
      relatedSubtitle: 'Explore additional free PDF utilities to streamline your daily workflow',
      allToolsLink: 'All Tools',
    },
    footer: {
      badge1Title: '100% Guaranteed Privacy',
      badge1Desc: 'Documents are processed inside your browser without data leak risks.',
      badge2Title: 'Fast & Efficient',
      badge2Desc: 'Instant document processing powered by modern in-memory acceleration.',
      badge3Title: 'Free of Charge',
      badge3Desc: 'Unlimited access to all PDF, Word, PowerPoint, and image tools.',
      col1: 'Organization & Security',
      col2: 'PDF Conversion',
      col3: 'Images & Documents',
      col4: 'Compression & Optimization',
      brandCardTitle: 'ChangesPDF: Complete PDF & Office Document Platform',
      brandCardDesc:
        'Free online toolkit to manage PDF, Word, PowerPoint, and image files directly in your browser. Merge files, split pages, compress size, and convert multi-formats with full privacy.',
      pillPrivat: '100% Private',
      pillNoUpload: 'No Server Upload',
      pillFree: 'Free of Charge',
      copyright: 'Created by',
      rights: 'All rights reserved.',
      privacyPolicy: 'Privacy Policy',
      terms: 'Terms & Conditions',
      backToTop: 'Back to Top',
    },
    dropzone: {
      selectFile: 'Select File',
      dropPrompt: 'or drag and drop your file here',
      dropActive: 'Drop your file here',
      formatLabel: 'Formats:',
      maxLabel: 'Max',
    },
    categories: {
      convert: 'Convert',
      organize: 'Organize',
      security: 'Security',
      optimize: 'Optimize',
    },
  },
};

export const toolDescriptionsId: Record<string, string> = {
  'merge-pdf':
    'Gabungkan beberapa file PDF menjadi satu dokumen. Tarik dan lepas untuk mengatur urutan halaman sebelum digabung.',
  'split-pdf':
    'Ekstrak halaman tertentu atau pisahkan PDF menjadi beberapa file dokumen terpisah.',
  'pdf-to-word':
    'Konversi dokumen PDF ke format Word (.docx) yang dapat diedit. Dilengkapi AI OCR untuk scan dan foto dokumen.',
  'word-to-pdf':
    'Konversi dokumen Word (.doc, .docx) ke format PDF dengan tata letak, font, dan format dokumen tetap utuh.',
  'image-to-pdf':
    'Konversi foto JPG dan JPEG menjadi satu dokumen PDF rapi dengan orientasi portrait atau landscape.',
  'pdf-to-image':
    'Ubah halaman PDF menjadi gambar JPG beresolusi tinggi (300 DPI) per halaman.',
  'pdf-to-png':
    'Konversi halaman PDF menjadi gambar PNG tanpa penurunan kualitas (lossless) dengan transparansi.',
  'png-to-pdf':
    'Ubah gambar PNG menjadi dokumen PDF dengan hasil cetak bersih dan rapi.',
  'jpg-to-png':
    'Konversi gambar JPG ke format PNG tanpa kompresi dengan dimensi asli 100% terjaga.',
  'png-to-jpg':
    'Konversi gambar PNG ke format JPG dengan ukuran file ringan dan latar belakang putih bersih.',
  'word-to-jpg':
    'Ubah halaman dokumen Word (.docx, .doc) menjadi gambar JPG beresolusi tinggi per halaman.',
  'jpg-to-word':
    'Ubah foto dan gambar JPG menjadi dokumen Microsoft Word (.docx) yang siap diedit.',
  'word-to-png':
    'Konversi dokumen Word ke gambar PNG tajam dan jernih tanpa artefak blur.',
  'png-to-word':
    'Ubah gambar PNG menjadi dokumen Word (.docx) dengan skala gambar proporsional.',
  'compress-pdf':
    'Kecilkan ukuran file PDF tanpa mengurangi keterbacaan teks dan ketajaman gambar.',
  'compress-word':
    'Kecilkan ukuran dokumen Word (.docx, .doc) hingga 70% dengan format dan font tetap utuh.',
  'organize-pdf':
    'Atur ulang urutan halaman, putar orientasi 90 derajat, atau hapus halaman PDF dengan preview thumbnail visual.',
  'protect-pdf':
    'Kunci file PDF dengan kata sandi dan enkripsi kuat langsung di memori browser Anda.',
  'watermark-pdf':
    'Tambahkan teks atau stempel watermark kustom pada setiap halaman PDF dengan pengaturan transparansi.',
  'unlock-pdf':
    'Buka dan hapus proteksi kata sandi pada file PDF terenkripsi dengan aman dan cepat.',
  'remove-watermark':
    'Hapus teks watermark, stempel draf, atau tanda konfidensial dari dokumen PDF Anda.',
  'pdf-to-ppt':
    'Konversi dokumen PDF menjadi slide presentasi PowerPoint (.pptx) yang dapat diedit.',
  'ppt-to-pdf':
    'Konversi presentasi PowerPoint (.pptx, .ppt) menjadi dokumen PDF dengan layout slide presisi.',
  'compress-jpg':
    'Kecilkan ukuran foto JPG dan JPEG hingga 80% untuk email dan upload web tanpa pecah.',
  'compress-png':
    'Kecilkan ukuran gambar PNG dengan latar belakang transparan tetap terjaga 100% tanpa kotak hitam.',
  'compress-ppt':
    'Kecilkan ukuran file presentasi PowerPoint (.pptx, .ppt) hingga 85% untuk kemudahan berbagi berkas.',
};
