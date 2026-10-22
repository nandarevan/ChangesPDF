export interface FAQ {
  question: string;
  answer: string;
}

export interface ToolData {
  id: string;
  slug: string;
  title: string;
  description: string;
  iconName: string;
  category: 'convert' | 'organize' | 'security' | 'optimize';
  acceptedFormats: string[];
  badge?: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  faqs: FAQ[];
}

export const tools: ToolData[] = [
  {
    id: 'merge-pdf',
    slug: 'merge-pdf',
    title: 'Merge PDF',
    description:
      'Combine multiple PDF files into a single document. Drag and drop to reorder pages before merging.',
    iconName: 'Layers',
    category: 'organize',
    acceptedFormats: ['.pdf'],
    seoTitle: 'Merge PDF Files Online – Combine PDFs for Free | ChangesPDF',
    seoDescription:
      'Merge and combine multiple PDF files into one document online for free. No upload needed – 100% client-side processing. Fast, secure, and private.',
    seoKeywords: [
      'merge pdf',
      'combine pdf',
      'join pdf',
      'merge pdf online free',
      'changes pdf merge',
    ],
    faqs: [
      {
        question: 'How do I merge PDF files?',
        answer:
          'Simply drag and drop your PDF files into the upload area, reorder them as needed, then click "Merge". The combined PDF will be downloaded directly to your device.',
      },
      {
        question: 'Is there a file size limit for merging PDFs?',
        answer:
          'Since all processing happens in your browser, the limit depends on your device memory. Most devices can handle files up to 100MB combined without issues.',
      },
      {
        question: 'Are my files uploaded to a server?',
        answer:
          'No. ChangesPDF processes everything locally in your browser. Your files never leave your device, ensuring complete privacy and security.',
      },
    ],
  },
  {
    id: 'split-pdf',
    slug: 'split-pdf',
    title: 'Split PDF',
    description:
      'Extract specific pages or split a PDF into multiple files. Select page ranges or individual pages to separate.',
    iconName: 'Scissors',
    category: 'organize',
    acceptedFormats: ['.pdf'],
    seoTitle: 'Split PDF Online – Extract Pages from PDF for Free | ChangesPDF',
    seoDescription:
      'Split PDF files and extract specific pages online for free. Select page ranges, remove pages, or split into individual files. 100% private and secure.',
    seoKeywords: [
      'split pdf',
      'extract pages from pdf',
      'separate pdf pages',
      'split pdf online free',
      'changes pdf split',
    ],
    faqs: [
      {
        question: 'How do I split a PDF into separate pages?',
        answer:
          'Upload your PDF, then select the pages or page ranges you want to extract. Click "Split" and download the resulting files.',
      },
      {
        question: 'Can I extract specific pages from a PDF?',
        answer:
          'Yes! You can select individual pages, specify page ranges (e.g., 1-3, 5, 8-10), or split every page into its own file.',
      },
      {
        question: 'Will splitting a PDF reduce its quality?',
        answer:
          'No. Splitting preserves the original quality of each page. No re-encoding or compression is applied during the split process.',
      },
    ],
  },
  {
    id: 'pdf-to-word',
    slug: 'pdf-to-word',
    title: 'PDF to Word',
    description:
      'Convert PDF documents to editable Word (.docx). Includes AI-Powered OCR for scanned PDFs, photos, and digital documents.',
    badge: 'AI OCR',
    iconName: 'FileText',
    category: 'convert',
    acceptedFormats: ['.pdf'],
    seoTitle:
      'Changes PDF to Word Online with OCR – Convert Scanned PDF to DOCX Free | ChangesPDF',
    seoDescription:
      'Convert PDF and scanned documents to editable Word DOCX online for free. AI-Powered OCR accurately extracts text from scanned pages and images.',
    seoKeywords: [
      'pdf to word',
      'changes pdf to word',
      'convert pdf to docx',
      'ocr pdf to word',
      'scanned pdf to word',
      'pdf to word converter',
      'pdf to word online free',
    ],
    faqs: [
      {
        question: 'Can I convert scanned PDFs or photo documents to Word?',
        answer:
          'Yes! ChangesPDF includes high-accuracy AI OCR (Optical Character Recognition) powered by RapidOCR to extract text directly from scanned documents, photocopies, and images so you can edit and type freely in Microsoft Word.',
      },
      {
        question: 'How do I change PDF to Word?',
        answer:
          'Upload your PDF file, choose your preferred OCR mode (Auto-Detect, Force Full OCR, or Digital Only), and ChangesPDF will convert it to an editable Word document (.docx).',
      },
      {
        question: 'Will the text and formatting be preserved?',
        answer:
          'Yes, ChangesPDF detects headings, paragraphs, lists, and alignments, producing clean, structured Word documents ready for editing.',
      },
      {
        question: 'Is this free to use?',
        answer:
          'Yes, ChangesPDF is completely free. There are no hidden charges, no sign-up required, and no watermarks added to your converted documents.',
      },
    ],
  },
  {
    id: 'word-to-pdf',
    slug: 'word-to-pdf',
    title: 'Word to PDF',
    description:
      'Convert Word documents (.doc, .docx) to PDF format. Maintains formatting, fonts, and document structure.',
    iconName: 'FileOutput',
    category: 'convert',
    acceptedFormats: ['.doc', '.docx'],
    seoTitle:
      'Word to PDF Converter – Convert DOCX to PDF Online Free | ChangesPDF',
    seoDescription:
      'Convert Word documents to PDF online for free. Change DOCX to PDF while preserving formatting and layout. Fast, secure, and no installation needed.',
    seoKeywords: [
      'word to pdf',
      'convert word to pdf',
      'docx to pdf',
      'word to pdf converter',
      'change word to pdf',
    ],
    faqs: [
      {
        question: 'How do I convert Word to PDF?',
        answer:
          'Simply upload your Word document (.doc or .docx), and ChangesPDF will convert it to a PDF file that you can download instantly.',
      },
      {
        question: 'Will the document formatting be preserved?',
        answer:
          'Yes, the conversion preserves your document formatting including fonts, images, tables, and page layout as closely as possible.',
      },
      {
        question: 'Can I convert multiple Word files at once?',
        answer:
          'Currently, you can convert one file at a time. For batch conversion, simply repeat the process for each file.',
      },
    ],
  },
  {
    id: 'image-to-pdf',
    slug: 'jpg-to-pdf',
    title: 'JPG to PDF',
    description:
      'Convert JPG and JPEG images to PDF. Combine multiple JPG images into a single PDF document with portrait or landscape orientation.',
    iconName: 'Image',
    category: 'convert',
    acceptedFormats: ['.jpg', '.jpeg'],
    seoTitle: 'JPG to PDF Converter – Convert JPG Images to PDF Online Free | ChangesPDF',
    seoDescription:
      'Convert JPG and JPEG images to PDF online for free. Combine multiple JPG photos into one clean PDF document with landscape and portrait options.',
    seoKeywords: [
      'jpg to pdf',
      'convert jpg to pdf',
      'jpeg to pdf',
      'image to pdf',
      'change jpg to pdf',
    ],
    faqs: [
      {
        question: 'How do I convert JPG images to PDF?',
        answer:
          'Upload your JPG/JPEG images, choose portrait or landscape orientation, adjust page fit, and click "Convert" to create your PDF instantly.',
      },
      {
        question: 'Can I combine multiple JPG images into one PDF?',
        answer:
          'Yes! You can upload multiple JPG images and combine them into a single PDF document. Drag and drop or use the arrow buttons to reorder the pages before converting.',
      },
      {
        question: 'What image formats are supported in this tool?',
        answer:
          'This tool specifically accepts JPG and JPEG formats. If you have PNG images, please use our dedicated PNG to PDF tool.',
      },
    ],
  },
  {
    id: 'pdf-to-image',
    slug: 'pdf-to-jpg',
    title: 'PDF to JPG',
    description:
      'Convert PDF pages to high-quality JPG images. Export all pages or select specific ones.',
    iconName: 'ImageDown',
    category: 'convert',
    acceptedFormats: ['.pdf'],
    seoTitle: 'PDF to JPG Converter – Convert PDF to Images Online Free | ChangesPDF',
    seoDescription:
      'Convert PDF pages to high-quality JPG or PNG images online for free. Export all pages or individual image files.',
    seoKeywords: [
      'pdf to jpg',
      'pdf to image',
      'pdf to png',
      'convert pdf to jpg',
      'changes pdf to jpg',
    ],
    faqs: [
      {
        question: 'How do I convert PDF to images?',
        answer:
          'Upload your PDF file, select the output format (JPG or PNG), choose which pages to convert, and click "Convert". Each page will be saved as a separate image.',
      },
      {
        question: 'What is the image quality?',
        answer:
          'ChangesPDF renders PDF pages at high resolution (300 DPI equivalent) to ensure crisp, clear images suitable for presentations, documents, or web use.',
      },
      {
        question: 'Can I convert specific pages only?',
        answer:
          'Yes, you can select individual pages or page ranges to convert, rather than converting the entire document.',
      },
    ],
  },
  {
    id: 'pdf-to-png',
    slug: 'pdf-to-png',
    title: 'PDF to PNG',
    description:
      'Convert PDF pages to lossless, high-definition PNG images. Crystal clear graphics with transparent background support.',
    iconName: 'ImageDown',
    category: 'convert',
    acceptedFormats: ['.pdf'],
    seoTitle: 'PDF to PNG Converter – Convert PDF to PNG Online Free | ChangesPDF',
    seoDescription:
      'Convert PDF pages to lossless high-resolution PNG images online for free. Export all pages or individual PNG files.',
    seoKeywords: [
      'pdf to png',
      'convert pdf to png',
      'pdf to png converter',
      'export pdf to png',
      'changes pdf to png',
    ],
    faqs: [
      {
        question: 'How do I convert PDF to PNG?',
        answer:
          'Upload your PDF file, choose the pages you want to convert, and click "Convert". Your PDF pages will be converted into crisp, lossless PNG images ready to download.',
      },
      {
        question: 'Why choose PNG instead of JPG?',
        answer:
          'PNG uses lossless compression, making it ideal for diagrams, text documents, charts, and graphics where sharpness and fine details are essential.',
      },
      {
        question: 'Are my files kept private?',
        answer:
          'Yes! Conversion takes place directly in your browser. No files are uploaded to any server.',
      },
    ],
  },
  {
    id: 'png-to-pdf',
    slug: 'png-to-pdf',
    title: 'PNG to PDF',
    description:
      'Convert PNG images to PDF documents. Combine multiple PNG images into a clean, professional PDF file.',
    iconName: 'Image',
    category: 'convert',
    acceptedFormats: ['.png'],
    seoTitle: 'PNG to PDF Converter – Convert PNG Images to PDF Online Free | ChangesPDF',
    seoDescription:
      'Convert PNG images to PDF online for free. Combine multiple PNG files into one clean PDF document.',
    seoKeywords: [
      'png to pdf',
      'convert png to pdf',
      'png to pdf converter',
      'combine png to pdf',
      'change png to pdf',
    ],
    faqs: [
      {
        question: 'How do I convert PNG to PDF?',
        answer:
          'Upload your PNG images, arrange them in your preferred order, select portrait or landscape orientation, and click "Convert".',
      },
      {
        question: 'Can I combine multiple PNG images into a single PDF?',
        answer:
          'Yes! You can upload multiple PNG images and combine them into a single PDF document in seconds.',
      },
      {
        question: 'Will transparency in PNG images be preserved?',
        answer:
          'Transparent PNG images are rendered onto clean white pages suitable for standard PDF printing and reading.',
      },
    ],
  },
  {
    id: 'jpg-to-png',
    slug: 'jpg-to-png',
    title: 'JPG to PNG',
    description:
      'Convert JPG images to lossless PNG format. 100% full original resolution with zero borders or compression artifacts.',
    iconName: 'Image',
    category: 'convert',
    acceptedFormats: ['.jpg', '.jpeg'],
    seoTitle: 'JPG to PNG Converter – Convert JPG to PNG Online Free | ChangesPDF',
    seoDescription:
      'Convert JPG images to PNG online for free. 100% full resolution with zero borders or quality loss.',
    seoKeywords: [
      'jpg to png',
      'convert jpg to png',
      'jpg to png converter',
      'jpeg to png',
    ],
    faqs: [
      {
        question: 'How do I convert JPG to PNG?',
        answer:
          'Upload your JPG images, and click "Convert". Your images will be converted to lossless PNG format with 100% full original dimensions.',
      },
      {
        question: 'Will there be any border or margin added?',
        answer:
          'No! The output PNG matches your exact original image dimensions without any padding, border, or margin.',
      },
    ],
  },
  {
    id: 'png-to-jpg',
    slug: 'png-to-jpg',
    title: 'PNG to JPG',
    description:
      'Convert PNG images to JPG format. Full resolution output with optimized file size and clean white background.',
    iconName: 'ImageDown',
    category: 'convert',
    acceptedFormats: ['.png'],
    seoTitle: 'PNG to JPG Converter – Convert PNG to JPG Online Free | ChangesPDF',
    seoDescription:
      'Convert PNG images to JPG online for free. Fast, high-quality, 100% full original resolution.',
    seoKeywords: [
      'png to jpg',
      'convert png to jpg',
      'png to jpg converter',
      'png to jpeg',
    ],
    faqs: [
      {
        question: 'How do I convert PNG to JPG?',
        answer:
          'Upload your PNG images, and click "Convert". Transparent areas will be rendered on a clean white background with high-quality JPG compression.',
      },
    ],
  },
  {
    id: 'word-to-jpg',
    slug: 'word-to-jpg',
    title: 'Word to JPG',
    description:
      'Convert Word documents (.docx, .doc) to high-quality JPG images. Export each page as a crisp, clear image.',
    iconName: 'ImageDown',
    category: 'convert',
    acceptedFormats: ['.doc', '.docx'],
    seoTitle: 'Word to JPG Converter – Convert DOCX to JPG Online Free | ChangesPDF',
    seoDescription:
      'Convert Word documents (.docx, .doc) to JPG images online for free. High resolution 300 DPI output with preserved formatting.',
    seoKeywords: [
      'word to jpg',
      'convert word to jpg',
      'docx to jpg',
      'word to jpg converter',
    ],
    faqs: [
      {
        question: 'How do I convert Word to JPG?',
        answer:
          'Upload your Word document (.docx or .doc), and click "Convert". Each page of your document will be rendered into a high-quality JPG image.',
      },
      {
        question: 'Will document layout be preserved?',
        answer:
          'Yes! All text formatting, fonts, images, and tables are preserved identically to print layout.',
      },
    ],
  },
  {
    id: 'jpg-to-word',
    slug: 'jpg-to-word',
    title: 'JPG to Word',
    description:
      'Convert JPG images into editable Word documents (.docx). Combine multiple JPG photos into clean document pages.',
    iconName: 'FileOutput',
    category: 'convert',
    acceptedFormats: ['.jpg', '.jpeg'],
    seoTitle: 'JPG to Word Converter – Convert JPG to DOCX Online Free | ChangesPDF',
    seoDescription:
      'Convert JPG images into Microsoft Word documents (.docx) online for free. Fast, private, and preserves full image quality.',
    seoKeywords: [
      'jpg to word',
      'convert jpg to word',
      'jpg to docx',
      'image to word',
    ],
    faqs: [
      {
        question: 'How do I convert JPG images to Word?',
        answer:
          'Upload your JPG images, arrange their order if needed, and click "Convert to Word". A professional .docx document will be created instantly.',
      },
      {
        question: 'Can I combine multiple JPG photos into one Word document?',
        answer:
          'Yes! You can upload multiple JPG photos and combine them across multiple pages in a single Word file.',
      },
    ],
  },
  {
    id: 'word-to-png',
    slug: 'word-to-png',
    title: 'Word to PNG',
    description:
      'Convert Word documents (.docx, .doc) to lossless, high-definition PNG images. Crystal clear graphics and text.',
    iconName: 'ImageDown',
    category: 'convert',
    acceptedFormats: ['.doc', '.docx'],
    seoTitle: 'Word to PNG Converter – Convert DOCX to PNG Online Free | ChangesPDF',
    seoDescription:
      'Convert Word documents to lossless PNG images online for free. Pixel-perfect rendering for presentations, web, and printing.',
    seoKeywords: [
      'word to png',
      'convert word to png',
      'docx to png',
      'word to png converter',
    ],
    faqs: [
      {
        question: 'Why convert Word to PNG?',
        answer:
          'PNG provides lossless compression, meaning fine text, diagrams, and formulas remain sharp and crisp without compression blur.',
      },
    ],
  },
  {
    id: 'png-to-word',
    slug: 'png-to-word',
    title: 'PNG to Word',
    description:
      'Convert PNG images into clean Word documents (.docx). Retain full graphic fidelity and dimensions across pages.',
    iconName: 'FileOutput',
    category: 'convert',
    acceptedFormats: ['.png'],
    seoTitle: 'PNG to Word Converter – Convert PNG to DOCX Online Free | ChangesPDF',
    seoDescription:
      'Convert PNG images into Microsoft Word documents (.docx) online for free. High resolution and perfectly scaled document pages.',
    seoKeywords: [
      'png to word',
      'convert png to word',
      'png to docx',
      'image to word',
    ],
    faqs: [
      {
        question: 'How do I convert PNG to Word?',
        answer:
          'Upload your PNG images, arrange their order, and click "Convert to Word" to download your .docx document.',
      },
    ],
  },
  {
    id: 'compress-pdf',
    slug: 'compress-pdf',
    title: 'Compress PDF',
    description:
      'Reduce PDF file size while maintaining quality. Optimize documents for email, web upload, or storage.',
    iconName: 'Minimize2',
    category: 'optimize',
    acceptedFormats: ['.pdf'],
    seoTitle: 'Compress PDF – Reduce PDF File Size Online Free | ChangesPDF',
    seoDescription:
      'Compress PDF files and reduce file size online for free. Optimize PDFs for email, web upload, or storage. No quality loss, 100% secure and private.',
    seoKeywords: [
      'compress pdf',
      'reduce pdf size',
      'pdf compressor',
      'compress pdf online free',
      'changes pdf size',
    ],
    faqs: [
      {
        question: 'How much can I reduce PDF file size?',
        answer:
          'Compression results vary depending on the PDF content. Documents with many images typically see 40-70% size reduction, while text-heavy documents may see 10-30% reduction.',
      },
      {
        question: 'Will compression affect quality?',
        answer:
          'ChangesPDF optimizes the PDF structure and compresses embedded resources intelligently. Text quality remains unchanged; images are compressed with minimal visible quality loss.',
      },
      {
        question: 'Is there a file size limit?',
        answer:
          'Since processing happens on your machine, most devices can handle PDFs up to 100MB without issues.',
      },
    ],
  },
  {
    id: 'compress-word',
    slug: 'compress-word',
    title: 'Compress Word',
    description:
      'Reduce Word document (.docx, .doc) file size while preserving layout, fonts, and formatting.',
    iconName: 'FileArchive',
    category: 'optimize',
    acceptedFormats: ['.doc', '.docx'],
    seoTitle: 'Compress Word – Reduce DOCX File Size Online Free | ChangesPDF',
    seoDescription:
      'Compress Word documents (.docx, .doc) online for free. Reduce file size for email or storage while preserving formatting, images, and layout.',
    seoKeywords: [
      'compress word',
      'reduce docx size',
      'word compressor',
      'compress docx online free',
      'small word',
      'reduce word file size',
    ],
    faqs: [
      {
        question: 'How do I compress a Word document?',
        answer:
          'Simply upload your Word file (.docx or .doc), select your preferred compression level (Extreme, Recommended, or Low), and click "Compress Word". Your optimized document will download instantly.',
      },
      {
        question: 'Will compression change the formatting or text?',
        answer:
          'No! All text, fonts, tables, margins, and document formatting are preserved 100% intact. ChangesPDF optimizes embedded images and stream packaging without damaging document fidelity.',
      },
      {
        question: 'Are both .docx and .doc files supported?',
        answer:
          'Yes, ChangesPDF supports both modern .docx documents and legacy .doc Word formats.',
      },
    ],
  },
  {
    id: 'organize-pdf',
    slug: 'organize-pdf',
    title: 'Organize PDF',
    description:
      'Rearrange, rotate, and delete PDF pages. Visual drag-and-drop page organizer with thumbnail previews.',
    iconName: 'LayoutGrid',
    category: 'organize',
    acceptedFormats: ['.pdf'],
    seoTitle:
      'Organize PDF Pages – Reorder, Rotate & Delete Pages Free | ChangesPDF',
    seoDescription:
      'Organize PDF pages online for free. Rearrange, rotate, and delete pages with a visual drag-and-drop editor. Thumbnail previews for easy page management.',
    seoKeywords: [
      'organize pdf',
      'rearrange pdf pages',
      'rotate pdf pages',
      'delete pdf pages',
      'reorder pdf',
    ],
    faqs: [
      {
        question: 'How do I rearrange PDF pages?',
        answer:
          'Upload your PDF and use the visual page editor to drag and drop pages into your desired order. You can also rotate or delete individual pages.',
      },
      {
        question: 'Can I rotate individual pages?',
        answer:
          'Yes, hover over any page thumbnail and click the rotate button to rotate it 90 degrees clockwise. Click multiple times to rotate further.',
      },
      {
        question: 'Can I preview pages before saving?',
        answer:
          'Yes, the organizer shows thumbnail previews of all pages. Click on any thumbnail to see a larger preview before making changes.',
      },
    ],
  },
  {
    id: 'protect-pdf',
    slug: 'protect-pdf',
    title: 'Protect PDF',
    description:
      'Add password protection and encryption to PDF files. Secure your documents with owner and user passwords.',
    iconName: 'Shield',
    category: 'security',
    acceptedFormats: ['.pdf'],
    seoTitle:
      'Protect PDF with Password – Encrypt PDF Online Free | ChangesPDF',
    seoDescription:
      'Add password protection to your PDF files online for free. Encrypt PDFs with secure passwords. 100% client-side – your files never leave your device.',
    seoKeywords: [
      'protect pdf',
      'password protect pdf',
      'encrypt pdf',
      'secure pdf',
      'lock pdf',
    ],
    faqs: [
      {
        question: 'How do I password protect a PDF?',
        answer:
          'Upload your PDF, enter your desired password, and click "Protect". The encrypted PDF will be downloaded directly to your device.',
      },
      {
        question: 'How secure is the encryption?',
        answer:
          'ChangesPDF uses industry-standard encryption. Since processing happens entirely in your browser, your file and password never leave your device.',
      },
      {
        question: 'Can I remove password protection?',
        answer:
          'Currently, ChangesPDF supports adding password protection. To remove a password, you would need to open the PDF with the correct password in a PDF reader and save it without protection.',
      },
    ],
  },
  {
    id: 'watermark-pdf',
    slug: 'watermark-pdf',
    title: 'Watermark PDF',
    description:
      'Add text or image watermarks to PDF documents. Customize position, opacity, rotation, and font size.',
    iconName: 'Droplets',
    category: 'security',
    acceptedFormats: ['.pdf'],
    seoTitle: 'Add Watermark to PDF Online Free | ChangesPDF',
    seoDescription:
      'Add custom text or image watermarks to PDF documents online for free. Customize position, opacity, rotation, and more. 100% secure and private.',
    seoKeywords: [
      'watermark pdf',
      'add watermark to pdf',
      'pdf watermark',
      'stamp pdf',
      'changes pdf watermark',
    ],
    faqs: [
      {
        question: 'How do I add a watermark to a PDF?',
        answer:
          'Upload your PDF, enter your watermark text (e.g., "CONFIDENTIAL", "DRAFT"), customize the appearance (font size, color, opacity, rotation), and click "Apply".',
      },
      {
        question: 'Can I customize the watermark appearance?',
        answer:
          'Yes, you can adjust the watermark text, font size, color, opacity (transparency), rotation angle, and position on each page.',
      },
      {
        question: 'Will the watermark appear on all pages?',
        answer:
          'By default, the watermark is applied to all pages. Future updates will allow selecting specific pages for watermarking.',
      },
    ],
  },
  {
    id: 'unlock-pdf',
    slug: 'unlock-pdf',
    title: 'Unlock PDF',
    description:
      'Remove password protection and restrictions from PDF files. Decrypt and save PDF without security password.',
    iconName: 'Unlock',
    category: 'security',
    acceptedFormats: ['.pdf'],
    seoTitle: 'Unlock PDF Online – Remove PDF Password Free | ChangesPDF',
    seoDescription:
      'Unlock password-protected PDF files online for free. Remove owner and user passwords instantly. Fast, secure, and private.',
    seoKeywords: [
      'unlock pdf',
      'remove pdf password',
      'decrypt pdf',
      'hapus protect pdf',
      'buka password pdf',
    ],
    faqs: [
      {
        question: 'How do I unlock a PDF file?',
        answer:
          'Upload your password-protected PDF, enter your current password, and click "Unlock PDF". Your document will be decrypted and available for download without any password restrictions.',
      },
      {
        question: "What if I don't know the password?",
        answer:
          'To unlock an encrypted PDF, you must know the password. If the PDF only has permission restrictions without a user password, it will be unlocked automatically.',
      },
    ],
  },
  {
    id: 'remove-watermark',
    slug: 'remove-watermark',
    title: 'Remove Watermark PDF',
    description:
      'Delete and remove text watermarks, draft stamps, and overlay annotations from PDF documents.',
    iconName: 'Eraser',
    category: 'security',
    acceptedFormats: ['.pdf'],
    seoTitle: 'Remove Watermark from PDF Online Free | ChangesPDF',
    seoDescription:
      'Remove text watermarks, confidential stamps, and unwanted overlays from PDF files online. Clean, fast, and free.',
    seoKeywords: [
      'remove watermark pdf',
      'hapus watermark pdf',
      'delete pdf watermark',
      'clean pdf watermark',
    ],
    faqs: [
      {
        question: 'How do I remove a watermark from a PDF?',
        answer:
          'Upload your watermarked PDF, specify the watermark text (or select common watermarks like CONFIDENTIAL, DRAFT, SAMPLE), and click "Remove Watermark". The clean document will be downloaded.',
      },
      {
        question: 'Does this remove text or image watermarks?',
        answer:
          'Yes, it can remove text watermarks, stamp annotations, and common watermark overlays without altering the main content.',
      },
    ],
  },
];

export function getToolBySlug(slug: string): ToolData | undefined {
  if (slug === 'pdf-to-jpg' || slug === 'pdf-to-jpeg' || slug === 'pdf-to-image') {
    return tools.find((t) => t.id === 'pdf-to-image');
  }
  if (slug === 'jpg-to-pdf' || slug === 'jpeg-to-pdf' || slug === 'image-to-pdf') {
    return tools.find((t) => t.id === 'image-to-pdf');
  }
  if (slug === 'small-pdf') {
    return tools.find((t) => t.id === 'compress-pdf');
  }
  if (slug === 'small-word') {
    return tools.find((t) => t.id === 'compress-word');
  }
  if (slug === 'word-to-jpg' || slug === 'docx-to-jpg' || slug === 'doc-to-jpg') {
    return tools.find((t) => t.id === 'word-to-jpg');
  }
  if (slug === 'jpg-to-word' || slug === 'jpg-to-docx' || slug === 'jpeg-to-word') {
    return tools.find((t) => t.id === 'jpg-to-word');
  }
  if (slug === 'word-to-png' || slug === 'docx-to-png' || slug === 'doc-to-png') {
    return tools.find((t) => t.id === 'word-to-png');
  }
  if (slug === 'png-to-word' || slug === 'png-to-docx') {
    return tools.find((t) => t.id === 'png-to-word');
  }
  if (slug === 'hapus-protect' || slug === 'remove-password' || slug === 'decrypt-pdf') {
    return tools.find((t) => t.id === 'unlock-pdf');
  }
  if (slug === 'hapus-watermark' || slug === 'delete-watermark' || slug === 'clear-watermark') {
    return tools.find((t) => t.id === 'remove-watermark');
  }
  return tools.find((tool) => tool.slug === slug || tool.id === slug);
}

export function getToolsByCategory(
  category: ToolData['category']
): ToolData[] {
  return tools.filter((tool) => tool.category === category);
}

export const categoryLabels: Record<ToolData['category'], string> = {
  convert: 'Convert',
  organize: 'Organize',
  security: 'Security',
  optimize: 'Optimize',
};
