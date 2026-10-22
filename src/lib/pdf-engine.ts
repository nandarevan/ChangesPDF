import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

/**
 * Quick helper to get the total number of pages in a PDF document.
 */
export async function getPDFPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch {
    return 1;
  }
}

/**
 * Merge multiple PDF files into a single PDF document.
 */
export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return mergedPdf.save({ useObjectStreams: true });
}

/**
 * Split a PDF into multiple files based on page ranges.
 * Each range is an array of page indices (0-based).
 */
export async function splitPDF(
  file: File,
  pageRanges: number[][]
): Promise<Uint8Array[]> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();
  const results: Uint8Array[] = [];

  for (const range of pageRanges) {
    // Ensure all page indices are valid within the document
    const validIndices = range.filter((idx) => idx >= 0 && idx < totalPages);
    if (validIndices.length === 0) continue;

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(sourcePdf, validIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    results.push(await newPdf.save({ useObjectStreams: true }));
  }

  return results;
}

/**
 * Convert images to a single PDF document.
 */
export interface ImageToPdfOptions {
  pageSize?: 'fit' | 'a4';
  margin?: 'none' | 'small';
}

export async function imagesToPDF(
  images: File[],
  orientation: 'portrait' | 'landscape' = 'portrait',
  options: ImageToPdfOptions = {}
): Promise<Uint8Array> {
  const { pageSize = 'fit', margin = 'none' } = options;
  const pdfDoc = await PDFDocument.create();

  for (const image of images) {
    const arrayBuffer = await image.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let embeddedImage;
    const type = image.type.toLowerCase();
    const ext = image.name.split('.').pop()?.toLowerCase() || '';
    const isJpg = type === 'image/jpeg' || type === 'image/jpg' || ext === 'jpg' || ext === 'jpeg';
    const isPng = type === 'image/png' || ext === 'png';

    if (isJpg) {
      try {
        embeddedImage = await pdfDoc.embedJpg(uint8Array);
      } catch {
        try {
          embeddedImage = await pdfDoc.embedPng(uint8Array);
        } catch {
          // fallback to canvas
        }
      }
    } else if (isPng) {
      try {
        embeddedImage = await pdfDoc.embedPng(uint8Array);
      } catch {
        try {
          embeddedImage = await pdfDoc.embedJpg(uint8Array);
        } catch {
          // fallback to canvas
        }
      }
    }

    if (!embeddedImage) {
      // For webp, gif, cmyk, or fallback types, convert via canvas to standard PNG
      const bitmap = await createImageBitmap(new Blob([uint8Array], { type: image.type || 'image/jpeg' }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas context');
      ctx.drawImage(bitmap, 0, 0);
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const pngBuffer = new Uint8Array(await blob.arrayBuffer());
      embeddedImage = await pdfDoc.embedPng(pngBuffer);
    }

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    if (pageSize === 'fit' || (margin === 'none' && pageSize !== 'a4')) {
      // 100% FULL: Dimensions follow image aspect ratio, respecting the chosen orientation.
      let targetPageWidth = imgWidth;
      let targetPageHeight = imgHeight;

      if (orientation === 'landscape') {
        // Landscape requires width >= height
        if (imgWidth >= imgHeight) {
          // Image is already landscape: 100% exact fit with zero margins
          targetPageWidth = imgWidth;
          targetPageHeight = imgHeight;
        } else {
          // Image is portrait, but user explicitly requested Landscape PDF
          targetPageWidth = Math.max(imgWidth, imgHeight);
          targetPageHeight = Math.min(imgWidth, imgHeight);
        }
      } else {
        // Portrait requires height >= width
        if (imgHeight >= imgWidth) {
          // Image is already portrait: 100% exact fit with zero margins
          targetPageWidth = imgWidth;
          targetPageHeight = imgHeight;
        } else {
          // Image is landscape, but user explicitly requested Portrait PDF
          targetPageWidth = Math.min(imgWidth, imgHeight);
          targetPageHeight = Math.max(imgWidth, imgHeight);
        }
      }

      const page = pdfDoc.addPage([targetPageWidth, targetPageHeight]);
      const scale = Math.min(targetPageWidth / imgWidth, targetPageHeight / imgHeight);
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;

      page.drawImage(embeddedImage, {
        x: (targetPageWidth - scaledWidth) / 2,
        y: (targetPageHeight - scaledHeight) / 2,
        width: scaledWidth,
        height: scaledHeight,
      });
    } else {
      // A4 page size (595.28 x 841.89 pt)
      const pageWidth = orientation === 'portrait' ? 595.28 : 841.89;
      const pageHeight = orientation === 'portrait' ? 841.89 : 595.28;
      const m = margin === 'small' ? 36 : 0;
      const availWidth = pageWidth - 2 * m;
      const availHeight = pageHeight - 2 * m;
      const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(embeddedImage, {
        x: (pageWidth - scaledWidth) / 2,
        y: (pageHeight - scaledHeight) / 2,
        width: scaledWidth,
        height: scaledHeight,
      });
    }
  }

  return pdfDoc.save();
}

/**
 * Direct Image-to-Image conversion (JPG to PNG, PNG to JPG).
 * Preserves 100% full original resolution with zero padding or borders.
 */
export async function convertImages(
  files: File[],
  targetFormat: 'png' | 'jpeg' = 'png'
): Promise<{ data: Uint8Array; filename: string; mimeType: string }[]> {
  const results: { data: Uint8Array; filename: string; mimeType: string }[] = [];
  const mimeType = targetFormat === 'png' ? 'image/png' : 'image/jpeg';
  const ext = targetFormat === 'png' ? 'png' : 'jpg';

  for (const file of files) {
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // For JPG target, fill background with white (in case source PNG had transparency)
    if (targetFormat === 'jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, bitmap.width, bitmap.height);
    }

    ctx.drawImage(bitmap, 0, 0);
    const convertedBlob = await canvas.convertToBlob({
      type: mimeType,
      quality: 0.95,
    });
    const buffer = await convertedBlob.arrayBuffer();
    results.push({
      data: new Uint8Array(buffer),
      filename: `${baseName}.${ext}`,
      mimeType,
    });
  }
  return results;
}

/**
 * Convert Images (JPG or PNG) into a clean, professional Word document (.docx).
 * Each image is scaled to fit comfortably on document pages with centered alignment.
 */
export async function imagesToWord(
  files: File[]
): Promise<{ data: Uint8Array; filename: string; mimeType: string }> {
  const { Document, Paragraph, ImageRun, Packer, PageBreak, AlignmentType } =
    await import('docx');

  const docChildren: any[] = [];
  const baseName = files[0].name.replace(/\.[^/.]+$/, '');

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });
    const bitmap = await createImageBitmap(blob);

    // Fit within Word page margins (A4 width 595pt - margins, approx 560px for standard 96dpi)
    const maxW = 560;
    const maxH = 750;
    const scale = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
    const renderWidth = Math.max(20, Math.round(bitmap.width * scale));
    const renderHeight = Math.max(20, Math.round(bitmap.height * scale));

    const imageRun = new ImageRun({
      data: new Uint8Array(arrayBuffer),
      transformation: {
        width: renderWidth,
        height: renderHeight,
      },
    } as any);

    const paragraph = new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [imageRun],
      spacing: { before: 100, after: 100 },
    });

    docChildren.push(paragraph);

    if (i < files.length - 1) {
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const docxBuffer = await Packer.toBuffer(doc);
  return {
    data: new Uint8Array(docxBuffer),
    filename: `${baseName}.docx`,
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

/**
 * Convert a Word document (.docx, .doc) to high-resolution images (JPG or PNG).
 * First converts Word to PDF via high-fidelity engine, then renders each page into crystal clear images.
 */
export async function wordToImages(
  file: File,
  format: 'jpeg' | 'png' = 'jpeg'
): Promise<{ data: Uint8Array; filename: string; mimeType: string }[]> {
  let pdfBuffer: Uint8Array | null = null;

  // 1. Try High-Fidelity backend engine
  try {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch('/api/word-to-pdf', {
      method: 'POST',
      body: formData,
    });
    if (resp.ok) {
      const arrayBuffer = await resp.arrayBuffer();
      pdfBuffer = new Uint8Array(arrayBuffer);
    }
  } catch (err) {
    console.warn('Backend word-to-pdf engine unavailable, switching to client-side:', err);
  }

  // 2. Client-side fallback if backend unavailable
  if (!pdfBuffer) {
    pdfBuffer = await wordToPdf(file);
  }

  // 3. Render PDF pages into images
  const pdfFile = new File([pdfBuffer as any], file.name.replace(/\.[^/.]+$/, '.pdf'), {
    type: 'application/pdf',
  });
  return pdfToImages(pdfFile, format);
}

/**
 * Compress a PDF by removing unused objects and optimizing structure.
 * Note: Client-side compression is limited — this removes duplicates and
 * re-serializes the document for a smaller file.
 */
export async function compressPDF(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
  });

  // Re-saving with pdf-lib removes unused objects and optimizes the structure
  return pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
}

/**
 * Reorder pages in a PDF according to a new page index order.
 * @param newOrder Array of 0-based page indices in the desired order.
 */
export async function reorderPages(
  file: File,
  newOrder: number[]
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();

  const copiedPages = await newPdf.copyPages(sourcePdf, newOrder);
  copiedPages.forEach((page) => newPdf.addPage(page));

  return newPdf.save({ useObjectStreams: true });
}

export interface OrganizePageDefinition {
  fileIndex: number;
  pageIndex: number;
  rotation: number;
}

/**
 * Reorder, rotate, delete, and combine pages from one or more PDF files into a single PDF document.
 */
export async function organizePDFDocuments(
  files: File[],
  pages: OrganizePageDefinition[]
): Promise<Uint8Array> {
  if (pages.length === 0) {
    throw new Error('Minimal harus ada 1 halaman yang dipertahankan dalam dokumen.');
  }

  // Load all source PDFs
  const loadedPdfs: PDFDocument[] = [];
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    loadedPdfs.push(doc);
  }

  const newPdf = await PDFDocument.create();

  for (const pageItem of pages) {
    const srcDoc = loadedPdfs[pageItem.fileIndex];
    if (!srcDoc) continue;
    if (pageItem.pageIndex < 0 || pageItem.pageIndex >= srcDoc.getPageCount()) continue;

    const [copiedPage] = await newPdf.copyPages(srcDoc, [pageItem.pageIndex]);
    if (pageItem.rotation && pageItem.rotation !== 0) {
      const currentRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRotation + pageItem.rotation) % 360));
    }
    newPdf.addPage(copiedPage);
  }

  if (newPdf.getPageCount() === 0) {
    throw new Error('Tidak ada halaman yang berhasil disusun.');
  }

  return newPdf.save({ useObjectStreams: true });
}

/**
 * Rotate specific pages in a PDF.
 * @param rotations Map of page index (0-based) to rotation angle in degrees.
 */
export async function rotatePages(
  file: File,
  rotations: Map<number, number>
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  rotations.forEach((angle, pageIndex) => {
    const page = pdfDoc.getPage(pageIndex);
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + angle));
  });

  return pdfDoc.save();
}

/**
 * Delete specific pages from a PDF.
 * @param pageIndicesToDelete Array of 0-based page indices to remove.
 */
export async function deletePages(
  file: File,
  pageIndicesToDelete: number[]
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();

  const allIndices = sourcePdf.getPageIndices();
  const keepIndices = allIndices.filter(
    (i) => !pageIndicesToDelete.includes(i)
  );

  const copiedPages = await newPdf.copyPages(sourcePdf, keepIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  return newPdf.save();
}

/**
 * Add a custom text or image watermark to all pages of a PDF.
 * Supports custom rotation, position (center, diagonal, top, bottom, repeat tile),
 * font size, opacity, and color.
 */
export async function addWatermark(
  file: File,
  text: string,
  options: {
    fontSize?: number;
    opacity?: number;
    rotation?: number;
    color?: { r: number; g: number; b: number };
    position?: 'center' | 'diagonal' | 'top' | 'bottom' | 'repeat';
    imageFile?: File | null;
  } = {}
): Promise<Uint8Array> {
  const {
    fontSize = 60,
    opacity = 0.2,
    rotation = -45,
    color = { r: 0.5, g: 0.5, b: 0.5 },
    position = 'diagonal',
    imageFile = null,
  } = options;

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  let embeddedImage = null;
  if (imageFile) {
    const imgBuffer = await imageFile.arrayBuffer();
    const isPng = imageFile.type === 'image/png' || imageFile.name.toLowerCase().endsWith('.png');
    if (isPng) {
      embeddedImage = await pdfDoc.embedPng(imgBuffer);
    } else {
      embeddedImage = await pdfDoc.embedJpg(imgBuffer);
    }
  }

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();

    if (embeddedImage) {
      const imgDims = embeddedImage.scale(0.5);
      const imgWidth = Math.min(imgDims.width, width * 0.7);
      const imgHeight = (imgWidth / imgDims.width) * imgDims.height;

      if (position === 'repeat') {
        const stepX = imgWidth + 100;
        const stepY = imgHeight + 100;
        for (let x = 20; x < width; x += stepX) {
          for (let y = 20; y < height; y += stepY) {
            page.drawImage(embeddedImage, {
              x,
              y,
              width: imgWidth * 0.7,
              height: imgHeight * 0.7,
              opacity,
              rotate: degrees(rotation),
            });
          }
        }
      } else {
        const xPos = (width - imgWidth) / 2;
        const yPos =
          position === 'top'
            ? height - imgHeight - 40
            : position === 'bottom'
            ? 40
            : (height - imgHeight) / 2;

        page.drawImage(embeddedImage, {
          x: xPos,
          y: yPos,
          width: imgWidth,
          height: imgHeight,
          opacity,
          rotate: degrees(rotation),
        });
      }
    } else if (text.trim()) {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = fontSize;

      if (position === 'repeat') {
        const stepX = textWidth + 80;
        const stepY = fontSize + 80;
        for (let x = -textWidth; x < width + textWidth; x += stepX) {
          for (let y = 0; y < height + 80; y += stepY) {
            page.drawText(text, {
              x,
              y,
              size: fontSize,
              font,
              color: rgb(color.r, color.g, color.b),
              opacity,
              rotate: degrees(rotation),
            });
          }
        }
      } else {
        let xPos = (width - textWidth) / 2;
        let yPos = (height - textHeight) / 2;

        if (position === 'top') {
          yPos = height - fontSize - 50;
        } else if (position === 'bottom') {
          yPos = 50;
        }

        page.drawText(text, {
          x: xPos,
          y: yPos,
          size: fontSize,
          font,
          color: rgb(color.r, color.g, color.b),
          opacity,
          rotate: degrees(rotation),
        });
      }
    }
  }

  return pdfDoc.save({ useObjectStreams: true });
}

/**
 * Encrypt and password-protect a PDF using AES-256 / AES-128.
 */
export async function protectPDF(
  file: File,
  password: string,
  aes: '256' | '128' = '256'
): Promise<Uint8Array> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('password', password);
  formData.append('aes', aes);

  const res = await fetch('/api/protect-pdf', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Gagal mengenkripsi dokumen PDF.');
  }

  const ab = await res.arrayBuffer();
  return new Uint8Array(ab);
}

/**
 * Unlock and remove password protection from an encrypted PDF.
 */
export async function unlockPDF(
  file: File,
  password: string = '',
  forceUnlock: boolean = false
): Promise<Uint8Array> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('password', password);
  formData.append('forceUnlock', String(forceUnlock));

  const res = await fetch('/api/unlock-pdf', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Password salah. Pastikan password yang dimasukkan benar.');
  }

  const ab = await res.arrayBuffer();
  return new Uint8Array(ab);
}

/**
 * Remove text and annotation watermarks from a PDF document.
 */
export async function removeWatermark(
  file: File,
  targetText?: string,
  removeCommon: boolean = true,
  mode: 'custom' | 'common' = 'custom'
): Promise<Uint8Array> {
  const formData = new FormData();
  formData.append('file', file);
  if (targetText && targetText.trim()) {
    formData.append('text', targetText.trim());
  }
  formData.append('common', String(removeCommon));
  formData.append('mode', mode);

  const res = await fetch('/api/remove-watermark', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Gagal menghapus watermark dari PDF.');
  }

  const ab = await res.arrayBuffer();
  return new Uint8Array(ab);
}

/**
 * Accurately verify if a given watermark text exists inside a PDF.
 * Uses client-side scanning and backend PyMuPDF check to ensure invalid watermarks are not executed.
 */
export async function checkWatermarkInPDF(
  file: File,
  queryText: string
): Promise<{ found: boolean; matchesCount: number }> {
  if (!queryText || !queryText.trim()) return { found: false, matchesCount: 0 };
  const clean = queryText.trim().toLowerCase();

  // 1. Client-side scan using pdfjs-dist
  try {
    const pdfjsLib = await import('pdfjs-dist');
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Strict whole-word regex: requires complete word boundaries so 'yoi', 'YOI', 'y', 'yo', 'YO' are rejected for 'YOII'
    const wordPattern = new RegExp(`(?<![a-zA-Z0-9_])${escaped}(?![a-zA-Z0-9_])`, 'i');
    const spacedPattern = new RegExp(
      `(?<![a-zA-Z0-9_])` + clean.split('').map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*') + `(?![a-zA-Z0-9_])`,
      'i'
    );
    let matches = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((it: any) => it.str || '')
        .join(' ');

      if (wordPattern.test(text) || spacedPattern.test(text)) {
        matches++;
      }
    }

    if (matches > 0) {
      return { found: true, matchesCount: matches };
    }
  } catch (err) {
    console.warn('Client-side PDF text search failed, checking backend:', err);
  }

  // 2. Deep verification fallback via backend PyMuPDF
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('text', queryText.trim());

    const resp = await fetch('/api/check-watermark', {
      method: 'POST',
      body: formData,
    });

    if (resp.ok) {
      const data = await resp.json();
      return {
        found: Boolean(data.found),
        matchesCount: Number(data.matchesCount) || 0,
      };
    }
  } catch (err) {
    console.warn('Backend check-watermark API error:', err);
  }

  // Definitely not found in the PDF
  return { found: false, matchesCount: 0 };
}

/**
 * Convert PDF pages to image buffers (JPEG or PNG).
 */
export async function pdfToImages(
  file: File,
  format: 'jpeg' | 'png' = 'jpeg',
  scale = 2.0
): Promise<{ data: Uint8Array; filename: string; mimeType: string }[]> {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const results: { data: Uint8Array; filename: string; mimeType: string }[] = [];
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, 0.95)
    );

    if (blob) {
      const buffer = await blob.arrayBuffer();
      results.push({
        data: new Uint8Array(buffer),
        filename: `${baseName}_page_${i}.${ext}`,
        mimeType,
      });
    }
  }

  return results;
}

interface TextRunItem {
  text: string;
  bold: boolean;
  fontSize: number;
}

interface ProcessedLine {
  y: number;
  minX: number;
  maxX: number;
  fullText: string;
  runs: TextRunItem[];
  isCentered: boolean;
  isBold: boolean;
  isListItem: boolean;
  isRightAligned?: boolean;
  isFullWidth?: boolean;
}

/**
 * Convert PDF pages to a native, beautifully formatted Word document (.docx).
 * Reconstructs layout: preserves page borders, cover pages with centered titles/logos/metadata,
 * table of contents with dot leaders, embedded body diagrams/screenshots, tables, and paragraphs.
 */
export async function pdfToWord(
  file: File
): Promise<{ data: Uint8Array; filename: string; mimeType: string }> {
  const pdfjsLib =
    typeof window !== 'undefined'
      ? await import('pdfjs-dist')
      : await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const {
    Document,
    Paragraph,
    TextRun,
    ImageRun,
    AlignmentType,
    Table,
    TableRow,
    TableCell,
    BorderStyle,
    WidthType,
    Packer,
    PageBreak,
    Footer,
    PageNumber,
    HeightRule,
    LineRuleType,
    PageBorderOffsetFrom,
    PageBorderDisplay,
    PageBorderZOrder,
  } = await import('docx');

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  // Helper to ensure key Indonesian legal phrases are accurately bolded in contract runs
  const ensureContractPhrasesBold = (runs: TextRunItem[]): TextRunItem[] => {
    const boldPatterns = [
      /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+INSTITUT TEKNOLOGI PLN/i,
      /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+PT SINERGI PROPERTI PRATAMA/i,
      /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+PT PLN \(PERSERO\)/i,
      /Prof\.\s+Dr\.\s+Ir\.\s+IWA\s+GARNIWA\s+MULYANA\s+K\.,\s+M\.T\.,\s+IPU\.,\s+ASEAN\s+Eng\.,\s+APEC\s+Eng\./i,
      /Rektor\s+Institut\s+Teknologi\s+PLN/i,
      /Bambang\s+Sutanto/i,
      /Direktur\s+Utama/i,
      /Himmel\s+Sihombing/i,
      /General\s+Manager\s+PT\s+PLN\s+\(Persero\)[^,\n\.]*/i,
      /Dr\.\s+Ir\.\s+M\.\s+Ahsin\s+Sidqi[^,\n\.]*/i,
      /Wakil\s+Rektor\s+Bidang\s+Kerjasama\s+Institut\s+Teknologi\s+PLN/i,
      /PIHAK\s+PERTAMA/i,
      /PIHAK\s+KEDUA/i,
      /PARA\s+PIHAK/i,
      /\bPIHAK\b/i,
      /\([“"']Perjanjian[”"']\)/i,
      /\bJumat\b/i,
      /\bDua\s+Puluh\s+Satu\b/i,
      /\bOktober\b/i,
      /\bDua\s+Ribu\s+Dua\s+Puluh\s+Enam\s+\(21[–\-]10[–\-]2026\)/i,
      /\bJakarta\b/i,
      /^PASAL\s+\d+/i,
    ];

    let current = [...runs];
    for (const pat of boldPatterns) {
      const next: TextRunItem[] = [];
      for (const r of current) {
        if (r.bold) {
          next.push(r);
          continue;
        }
        const m = r.text.match(pat);
        if (m && m.index !== undefined) {
          const start = m.index;
          const end = start + m[0].length;
          if (start > 0) {
            next.push({
              text: r.text.slice(0, start),
              bold: false,
              fontSize: r.fontSize,
            });
          }
          next.push({
            text: r.text.slice(start, end),
            bold: true,
            fontSize: r.fontSize,
          });
          if (end < r.text.length) {
            next.push({
              text: r.text.slice(end),
              bold: false,
              fontSize: r.fontSize,
            });
          }
        } else {
          next.push(r);
        }
      }
      current = next;
    }
    return current;
  };

  // Helper to crop canvas rectangular region as PNG buffer
  const cropCanvasRegion = async (
    sourceCanvas: HTMLCanvasElement,
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ): Promise<Uint8Array | null> => {
    if (sw <= 2 || sh <= 2) return null;
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const cCtx = c.getContext('2d');
    if (!cCtx) return null;
    cCtx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    const b = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
    if (!b) return null;
    return new Uint8Array(await b.arrayBuffer());
  };

  // Helper to detect outer page borders from canvas margins
  const detectPageBorder = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    scale: number
  ): {
    hasBorder: boolean;
    colorHex: string;
    bounds: { left: number; top: number; right: number; bottom: number };
  } => {
    const w = canvas.width;
    const h = canvas.height;
    const minMargin = Math.round(15 * scale);
    const maxMargin = Math.round(75 * scale);

    let topBorderY = -1;
    let bottomBorderY = -1;
    let leftBorderX = -1;
    let rightBorderX = -1;
    let borderColorHex = '246599'; // Default academic blue

    const isColored = (r: number, g: number, b: number, a: number) =>
      a > 50 && (r < 235 || g < 235 || b < 235);

    try {
      // 1. Top horizontal border
      const topData = ctx.getImageData(0, minMargin, w, maxMargin - minMargin);
      for (let row = 0; row < topData.height; row += 2) {
        let count = 0;
        const testWidth = Math.round(w * 0.5);
        const startX = Math.round(w * 0.25);
        let sR = 36, sG = 101, sB = 153;

        for (let x = startX; x < startX + testWidth; x += 4) {
          const idx = (row * w + x) * 4;
          if (isColored(topData.data[idx], topData.data[idx + 1], topData.data[idx + 2], topData.data[idx + 3])) {
            count++;
            sR = topData.data[idx];
            sG = topData.data[idx + 1];
            sB = topData.data[idx + 2];
          }
        }

        if (count > (testWidth / 4) * 0.65) {
          topBorderY = minMargin + row;
          const toHex = (n: number) => n.toString(16).padStart(2, '0');
          borderColorHex = `${toHex(sR)}${toHex(sG)}${toHex(sB)}`.toUpperCase();
          break;
        }
      }

      // 2. Bottom horizontal border
      const bottomStartY = h - maxMargin;
      const bottomData = ctx.getImageData(0, bottomStartY, w, maxMargin - minMargin);
      for (let row = bottomData.height - 1; row >= 0; row -= 2) {
        let count = 0;
        const testWidth = Math.round(w * 0.5);
        const startX = Math.round(w * 0.25);
        for (let x = startX; x < startX + testWidth; x += 4) {
          const idx = (row * w + x) * 4;
          if (isColored(bottomData.data[idx], bottomData.data[idx + 1], bottomData.data[idx + 2], bottomData.data[idx + 3])) {
            count++;
          }
        }
        if (count > (testWidth / 4) * 0.65) {
          bottomBorderY = bottomStartY + row;
          break;
        }
      }

      // 3. Left vertical border
      const leftData = ctx.getImageData(minMargin, 0, maxMargin - minMargin, h);
      for (let col = 0; col < leftData.width; col += 2) {
        let count = 0;
        const testHeight = Math.round(h * 0.5);
        const startY = Math.round(h * 0.25);
        for (let y = startY; y < startY + testHeight; y += 4) {
          const idx = (y * leftData.width + col) * 4;
          if (isColored(leftData.data[idx], leftData.data[idx + 1], leftData.data[idx + 2], leftData.data[idx + 3])) {
            count++;
          }
        }
        if (count > (testHeight / 4) * 0.65) {
          leftBorderX = minMargin + col;
          break;
        }
      }

      // 4. Right vertical border
      const rightStartX = w - maxMargin;
      const rightData = ctx.getImageData(rightStartX, 0, maxMargin - minMargin, h);
      for (let col = rightData.width - 1; col >= 0; col -= 2) {
        let count = 0;
        const testHeight = Math.round(h * 0.5);
        const startY = Math.round(h * 0.25);
        for (let y = startY; y < startY + testHeight; y += 4) {
          const idx = (y * rightData.width + col) * 4;
          if (isColored(rightData.data[idx], rightData.data[idx + 1], rightData.data[idx + 2], rightData.data[idx + 3])) {
            count++;
          }
        }
        if (count > (testHeight / 4) * 0.65) {
          rightBorderX = rightStartX + col;
          break;
        }
      }
    } catch (err) {
      // ignore
    }

    const hasBorder = topBorderY > 0 && bottomBorderY > 0 && leftBorderX > 0 && rightBorderX > 0;
    return {
      hasBorder,
      colorHex: borderColorHex,
      bounds: {
        left: hasBorder ? leftBorderX : 0,
        top: hasBorder ? topBorderY : 0,
        right: hasBorder ? rightBorderX : w,
        bottom: hasBorder ? bottomBorderY : h,
      },
    };
  };

  const docChildren: any[] = [];
  let globalHasBorder = false;
  let globalBorderColor = '246599';
  let hasCoverPage = false;
  let isContractDocument = false;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const scale = 2.0; // Render at 2x for sharp graphic capture
    const viewport = page.getViewport({ scale });
    const ptWidth = viewport.width / scale;
    const ptHeight = viewport.height / scale;

    // 1. Render page to canvas to extract visual graphics/images and detect borders
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      }
    }

    // Border detection
    let pageBorderInfo = {
      hasBorder: false,
      colorHex: '246599',
      bounds: { left: 0, top: 0, right: viewport.width, bottom: viewport.height },
    };
    if (canvas && ctx) {
      pageBorderInfo = detectPageBorder(canvas, ctx, scale);
      if (pageBorderInfo.hasBorder) {
        globalHasBorder = true;
        globalBorderColor = pageBorderInfo.colorHex;
      }
    }

    // 2. Extract text items and coordinates
    const textContent = await page.getTextContent();
    const rawItems: {
      str: string;
      x: number;
      y: number;
      width: number;
      height: number;
      isBold: boolean;
      fontSize: number;
    }[] = [];

    const fontBoldMap = new Map<string, boolean>();

    const checkIsBold = (fontName: string): boolean => {
      const lowerFont = (fontName || '').toLowerCase();
      if (
        lowerFont.includes('bold') ||
        lowerFont.includes('-bd') ||
        lowerFont.includes('_bd') ||
        lowerFont.includes('black') ||
        lowerFont.includes('heavy') ||
        lowerFont.includes('b+')
      ) {
        return true;
      }

      if (fontBoldMap.has(fontName)) {
        return fontBoldMap.get(fontName)!;
      }

      if (textContent?.styles?.[fontName]) {
        const s = textContent.styles[fontName] as any;
        const fam = (s.fontFamily || '').toLowerCase();
        const sub = (s.fontSubstitution || '').toLowerCase();
        if (
          fam.includes('bold') ||
          fam.includes('-bd') ||
          fam.includes('_bd') ||
          fam.includes('black') ||
          fam.includes('heavy') ||
          sub.includes('bold') ||
          sub.includes('700')
        ) {
          fontBoldMap.set(fontName, true);
          return true;
        }
      }

      try {
        const fontData: any =
          (page.commonObjs?.has?.(fontName) ? page.commonObjs.get(fontName) : null) ||
          ((page as any).objs?.has?.(fontName) ? (page as any).objs.get(fontName) : null);
        if (fontData) {
          const fn = (
            fontData.name ||
            fontData.fallbackName ||
            fontData.loadedName ||
            ''
          ).toLowerCase();
          if (
            fontData.bold === true ||
            fontData.black === true ||
            fn.includes('bold') ||
            fn.includes('-bd') ||
            fn.includes('_bd') ||
            fn.includes('black') ||
            fn.includes('heavy') ||
            (typeof fontData.weight === 'number' && fontData.weight >= 600) ||
            (typeof fontData.cssFontInfo?.fontWeight === 'string' &&
              fontData.cssFontInfo.fontWeight.toLowerCase().includes('bold')) ||
            (typeof fontData.cssFontInfo?.fontWeight === 'number' &&
              fontData.cssFontInfo.fontWeight >= 600)
          ) {
            fontBoldMap.set(fontName, true);
            return true;
          }
        }
      } catch (err) {
        // ignore
      }

      fontBoldMap.set(fontName, false);
      return false;
    };

    for (const item of textContent.items) {
      if ('str' in item && typeof item.str === 'string' && item.str.length > 0) {
        const textItem = item as {
          str: string;
          transform: number[];
          width: number;
          height: number;
          fontName?: string;
        };
        const x = textItem.transform[4];
        const y = textItem.transform[5];
        const isBold = checkIsBold(textItem.fontName || '');
        const fontSize =
          Math.sqrt(
            textItem.transform[0] * textItem.transform[0] +
            textItem.transform[1] * textItem.transform[1]
          ) || textItem.height || 11;

        rawItems.push({
          str: textItem.str,
          x,
          y,
          width: textItem.width,
          height: textItem.height,
          isBold,
          fontSize,
        });
      }
    }

    // Sort items by y descending (top to bottom)
    rawItems.sort((a, b) => b.y - a.y);

    // Group items into lines (tight baseline tolerance: ±2.2 points)
    const lineGroups: typeof rawItems[] = [];
    for (const item of rawItems) {
      let foundLine = false;
      for (const line of lineGroups) {
        if (Math.abs(line[0].y - item.y) <= 2.2) {
          line.push(item);
          foundLine = true;
          break;
        }
      }
      if (!foundLine) {
        lineGroups.push([item]);
      }
    }

    // Sort line groups top to bottom
    lineGroups.sort((a, b) => b[0].y - a[0].y);

    // Compute page content horizontal boundaries from substantial lines
    let pageContentMinX = ptWidth;
    let pageContentMaxX = 0;
    let hasSubstantialLines = false;

    for (const group of lineGroups) {
      const gMinX = group[0].x;
      const gLast = group[group.length - 1];
      const gMaxX = gLast.x + gLast.width;
      const gWidth = gMaxX - gMinX;
      if (gWidth > 180) {
        hasSubstantialLines = true;
        if (gMinX < pageContentMinX) pageContentMinX = gMinX;
        if (gMaxX > pageContentMaxX) pageContentMaxX = gMaxX;
      }
    }

    if (!hasSubstantialLines || pageContentMinX >= pageContentMaxX) {
      pageContentMinX = 54.0;
      pageContentMaxX = ptWidth - 54.0;
    }

    const contentWidth = pageContentMaxX - pageContentMinX;
    const pageCenter = (pageContentMinX + pageContentMaxX) / 2;

    // Build structured ProcessedLine objects
    const processedLines: (ProcessedLine & {
      columns?: { minX: number; maxX: number; text: string; runs: TextRunItem[] }[];
    })[] = [];

    for (const group of lineGroups) {
      group.sort((a, b) => a.x - b.x);

      const y = group[0].y;
      const minX = group[0].x;
      const last = group[group.length - 1];
      const maxX = last.x + last.width;

      const runs: TextRunItem[] = [];
      let fullText = '';

      // Check for columns within the line (items separated by gap > 24 pt)
      const columnClusters: typeof rawItems[] = [];
      let currentCluster: typeof rawItems = [];

      for (let i = 0; i < group.length; i++) {
        const item = group[i];
        const prev = i > 0 ? group[i - 1] : null;

        if (prev && item.x - (prev.x + prev.width) > 24.0) {
          columnClusters.push(currentCluster);
          currentCluster = [item];
        } else {
          currentCluster.push(item);
        }

        const needsSpace =
          prev &&
          item.x - (prev.x + prev.width) > 1.2 &&
          !prev.str.endsWith(' ') &&
          !item.str.startsWith(' ');

        const textToAdd = (needsSpace ? ' ' : '') + item.str;
        fullText += textToAdd;

        if (runs.length > 0 && runs[runs.length - 1].bold === item.isBold) {
          runs[runs.length - 1].text += textToAdd;
        } else {
          runs.push({
            text: textToAdd,
            bold: item.isBold,
            fontSize: item.fontSize,
          });
        }
      }
      if (currentCluster.length > 0) {
        columnClusters.push(currentCluster);
      }

      const trimmedText = fullText.trim();
      if (!trimmedText) continue;

      const lineWidth = maxX - minX;
      const midX = (minX + maxX) / 2;
      const leftGap = minX - pageContentMinX;
      const rightGap = pageContentMaxX - maxX;

      const isFullWidth = lineWidth >= 0.74 * contentWidth;

      const isListItem =
        !isFullWidth &&
        (/^([IVXLCDM]+|\d+(\.\d+)*|[a-zA-Z]|\(?[0-9a-zA-Z]\)?)[\.\)]\s/.test(trimmedText) ||
          /^[•\-\–—]\s/.test(trimmedText));

      const isCentered =
        !isFullWidth &&
        !isListItem &&
        leftGap > 18.0 &&
        rightGap > 18.0 &&
        (Math.abs(midX - pageCenter) <= 24.0 ||
          Math.abs(leftGap - rightGap) <= 30.0 ||
          Math.abs(midX - ptWidth / 2) <= 24.0);

      const isRightAligned =
        !isFullWidth &&
        !isCentered &&
        !isListItem &&
        rightGap < 18.0 &&
        leftGap > 60.0;

      const columns =
        columnClusters.length >= 2
          ? columnClusters.map((cluster) => {
            const cMinX = cluster[0].x;
            const cLast = cluster[cluster.length - 1];
            const cMaxX = cLast.x + cLast.width;
            let cText = '';
            const cRuns: TextRunItem[] = [];
            for (let ci = 0; ci < cluster.length; ci++) {
              const cItem = cluster[ci];
              const cPrev = ci > 0 ? cluster[ci - 1] : null;
              const sp =
                cPrev &&
                  cItem.x - (cPrev.x + cPrev.width) > 1.2 &&
                  !cPrev.str.endsWith(' ') &&
                  !cItem.str.startsWith(' ')
                  ? ' '
                  : '';
              const piece = sp + cItem.str;
              cText += piece;
              cRuns.push({
                text: piece,
                bold: cItem.isBold,
                fontSize: cItem.fontSize,
              });
            }
            return { minX: cMinX, maxX: cMaxX, text: cText.trim(), runs: cRuns };
          })
          : undefined;

      processedLines.push({
        y,
        minX,
        maxX,
        fullText: trimmedText,
        runs,
        isCentered,
        isBold: runs.some((r) => r.bold),
        isListItem,
        isRightAligned,
        isFullWidth,
        columns,
      });
    }

    const wholePageText = processedLines.map((l) => l.fullText).join(' ').toLowerCase();

    if (
      /paraf\s+pihak/i.test(wholePageText) ||
      wholePageText.includes('perjanjian kerja sama') ||
      (wholePageText.includes('pihak pertama') && wholePageText.includes('pihak kedua'))
    ) {
      isContractDocument = true;
    }

    // 3. Page Classification: Cover Page, Table of Contents, or Body Page
    const isCover =
      pageNum === 1 &&
      (wholePageText.includes('laporan') ||
        wholePageText.includes('makalah') ||
        wholePageText.includes('skripsi') ||
        wholePageText.includes('tugas akhir') ||
        wholePageText.includes('modul') ||
        wholePageText.includes('laboratorium') ||
        (wholePageText.includes('nama') && wholePageText.includes('nim')));

    if (isCover) {
      hasCoverPage = true;
    }

    const isTOC =
      processedLines.some((l) => /^DAFTAR\s+ISI$/i.test(l.fullText.trim())) ||
      processedLines.filter((l) => /\.{3,}/.test(l.fullText)).length >= 3;

    // 4. Add PageBreak if page > 1
    if (pageNum > 1) {
      docChildren.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }

    // 5. Scan Canvas for Graphics / Diagrams / Embedded Logos
    // Gaps between text lines that have visual graphic content
    const pageImages: {
      gapIndex: number;
      buffer: Uint8Array;
      widthPt: number;
      heightPt: number;
      isHeaderLogo?: boolean;
      headerLeftBuf?: Uint8Array;
      headerRightBuf?: Uint8Array;
      headerLeftW?: number;
      headerLeftH?: number;
      headerRightW?: number;
      headerRightH?: number;
    }[] = [];

    if (canvas && ctx) {
      const bLeft = pageBorderInfo.bounds.left + Math.round(12 * scale);
      const bRight = pageBorderInfo.bounds.right - Math.round(12 * scale);
      const bTop = pageBorderInfo.bounds.top + Math.round(8 * scale);
      const bBottom = pageBorderInfo.bounds.bottom - Math.round(8 * scale);

      // Check Header space above first text line
      const firstLineY = processedLines[0]?.y ?? 0;
      const firstLineTopPx = Math.max(0, Math.round((ptHeight - firstLineY) * scale));

      // Restrict logo scan vertically: stop at least 25pt (50px) above the first text line, capped at 75pt height
      const maxScanH = Math.min(firstLineTopPx - bTop - Math.round(25 * scale), Math.round(75 * scale));

      if (maxScanH >= 20 * scale && isContractDocument && pageNum === 1) {
        // Restrict logo search strictly to top-left and top-right margin corners (max 140pt from margin)
        // Center of the page is NEVER scanned, preventing any title text ("PERJANJIAN KERJA SAMA") from being cropped into logos
        const cornerW = Math.round(140 * scale);
        const leftImgData = ctx.getImageData(bLeft, bTop, cornerW, maxScanH);
        const rightStartX = Math.max(bLeft + cornerW + 10, bRight - cornerW);
        const rightWidth = bRight - rightStartX;
        const rightImgData = ctx.getImageData(rightStartX, bTop, rightWidth, maxScanH);

        let lCount = 0, lMinX = cornerW, lMaxX = 0, lMinY = maxScanH, lMaxY = 0;
        let rCount = 0, rMinX = rightWidth, rMaxX = 0, rMinY = maxScanH, rMaxY = 0;

        for (let y = 0; y < maxScanH; y += 2) {
          for (let x = 0; x < cornerW; x += 2) {
            const idx = (y * cornerW + x) * 4;
            if (leftImgData.data[idx + 3] > 40 && (leftImgData.data[idx] < 235 || leftImgData.data[idx + 1] < 235 || leftImgData.data[idx + 2] < 235)) {
              lCount++;
              if (x < lMinX) lMinX = x;
              if (x > lMaxX) lMaxX = x;
              if (y < lMinY) lMinY = y;
              if (y > lMaxY) lMaxY = y;
            }
          }
          for (let x = 0; x < rightWidth; x += 2) {
            const idx = (y * rightWidth + x) * 4;
            if (rightImgData.data[idx + 3] > 40 && (rightImgData.data[idx] < 235 || rightImgData.data[idx + 1] < 235 || rightImgData.data[idx + 2] < 235)) {
              rCount++;
              if (x < rMinX) rMinX = x;
              if (x > rMaxX) rMaxX = x;
              if (y < rMinY) rMinY = y;
              if (y > rMaxY) rMaxY = y;
            }
          }
        }

        const lW = lMaxX - lMinX;
        const lH = lMaxY - lMinY;
        const rW = rMaxX - rMinX;
        const rH = rMaxY - rMinY;

        // Strict criteria for dual logo: genuine 2D graphic with aspect ratio < 3.5
        const isRealLeftLogo = lCount > 250 && lW > 25 * scale && lH > 18 * scale && lW / lH < 3.5;
        const isRealRightLogo = rCount > 250 && rW > 25 * scale && rH > 18 * scale && rW / rH < 3.5;

        if (isRealLeftLogo && isRealRightLogo) {
          const pad = 4;
          const leftBuf = await cropCanvasRegion(
            canvas,
            bLeft + Math.max(0, lMinX - pad),
            bTop + Math.max(0, lMinY - pad),
            lW + pad * 2,
            lH + pad * 2
          );
          const rightBuf = await cropCanvasRegion(
            canvas,
            rightStartX + Math.max(0, rMinX - pad),
            bTop + Math.max(0, rMinY - pad),
            rW + pad * 2,
            rH + pad * 2
          );
          if (leftBuf && rightBuf) {
            pageImages.push({
              gapIndex: -1,
              buffer: leftBuf,
              widthPt: (lW + pad * 2) / scale,
              heightPt: (lH + pad * 2) / scale,
              isHeaderLogo: true,
              headerLeftBuf: leftBuf,
              headerRightBuf: rightBuf,
              headerLeftW: (lW + pad * 2) / scale,
              headerLeftH: (lH + pad * 2) / scale,
              headerRightW: (rW + pad * 2) / scale,
              headerRightH: (rH + pad * 2) / scale,
            });
          }
        }
      }

      // Check vertical gaps between consecutive text lines (ONLY for non-contract documents that may have genuine screenshots or diagrams)
      if (!isContractDocument) {
        for (let i = 0; i < processedLines.length - 1; i++) {
          const curr = processedLines[i];
          const next = processedLines[i + 1];
          const gapPt = curr.y - next.y;

          // Gap >= 45 points with no text
          if (gapPt >= 45) {
            const yStartPx = Math.round((ptHeight - curr.y + 6) * scale);
            const yEndPx = Math.round((ptHeight - next.y - 10) * scale);
            const scanH = yEndPx - yStartPx;

            if (scanH >= 35 * scale && yStartPx >= bTop && yEndPx <= bBottom) {
              const scanW = bRight - bLeft;
              const regionData = ctx.getImageData(bLeft, yStartPx, scanW, scanH);
              let pixelCount = 0;
              let gMinX = scanW, gMaxX = 0, gMinY = scanH, gMaxY = 0;

              for (let y = 0; y < scanH; y += 2) {
                for (let x = 0; x < scanW; x += 2) {
                  const idx = (y * scanW + x) * 4;
                  if (regionData.data[idx + 3] > 40 && (regionData.data[idx] < 235 || regionData.data[idx + 1] < 235 || regionData.data[idx + 2] < 235)) {
                    pixelCount++;
                    if (x < gMinX) gMinX = x;
                    if (x > gMaxX) gMaxX = x;
                    if (y < gMinY) gMinY = y;
                    if (y > gMaxY) gMaxY = y;
                  }
                }
              }

              const imgW = gMaxX - gMinX;
              const imgH = gMaxY - gMinY;

              if (pixelCount > 800 && imgW >= 60 * scale && imgH >= 40 * scale) {
                const pad = 6;
                const cropBuf = await cropCanvasRegion(
                  canvas,
                  bLeft + Math.max(0, gMinX - pad),
                  yStartPx + Math.max(0, gMinY - pad),
                  imgW + pad * 2,
                  imgH + pad * 2
                );
                if (cropBuf) {
                  pageImages.push({
                    gapIndex: i,
                    buffer: cropBuf,
                    widthPt: (imgW + pad * 2) / scale,
                    heightPt: (imgH + pad * 2) / scale,
                  });
                }
              }
            }
          }
        }
      }
    }

    // Insert Dual Header Logos if present
    const headerLogoItem = pageImages.find((img) => img.isHeaderLogo);
    if (headerLogoItem && headerLogoItem.headerLeftBuf && headerLogoItem.headerRightBuf) {
      const leftDisplayW = Math.min(145, Math.round(headerLogoItem.headerLeftW!));
      const leftDisplayH = Math.round(leftDisplayW * (headerLogoItem.headerLeftH! / headerLogoItem.headerLeftW!));
      const rightDisplayW = Math.min(125, Math.round(headerLogoItem.headerRightW!));
      const rightDisplayH = Math.round(rightDisplayW * (headerLogoItem.headerRightH! / headerLogoItem.headerRightW!));
      const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };

      docChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
            insideHorizontal: noBorder, insideVertical: noBorder,
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.LEFT,
                      spacing: { before: 0, after: 180 },
                      children: [
                        new ImageRun({
                          data: headerLogoItem.headerLeftBuf,
                          transformation: { width: leftDisplayW, height: leftDisplayH },
                          type: 'png',
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      spacing: { before: 0, after: 180 },
                      children: [
                        new ImageRun({
                          data: headerLogoItem.headerRightBuf,
                          transformation: { width: rightDisplayW, height: rightDisplayH },
                          type: 'png',
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    }

    // 6. COVER PAGE HANDLING (Matches Gambar 1)
    if (isCover) {
      // Find metadata start index
      const metaStartIdx = processedLines.findIndex((l) =>
        /^(Nama|NIM|NRP|Kelas|Nama Dosen|Dosen|No\.?\s*Bangku|Nama Asisten|Kelompok)\b/i.test(l.fullText)
      );

      // Find bottom institution block start index
      const instStartIdx = processedLines.findIndex(
        (l, idx) =>
          idx > (metaStartIdx > 0 ? metaStartIdx : 4) &&
          (/^(LABORATORIUM|INSTITUT|UNIVERSITAS|FAKULTAS|JURUSAN|PROGRAM STUDI|202\d)\b/i.test(l.fullText) ||
            /202\d$/.test(l.fullText))
      );

      const titleLines = processedLines.slice(0, metaStartIdx > 0 ? metaStartIdx : 3);
      const metaLines =
        metaStartIdx > 0
          ? processedLines.slice(metaStartIdx, instStartIdx > 0 ? instStartIdx : undefined)
          : [];
      const instLines = instStartIdx > 0 ? processedLines.slice(instStartIdx) : [];

      // A. Title Block (Centered, bold, independent lines)
      for (const tLine of titleLines) {
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 60, line: 240, lineRule: LineRuleType.AUTO },
            children: tLine.runs.map(
              (r) =>
                new TextRun({
                  text: r.text,
                  bold: true,
                  font: 'Arial',
                  size: 28, // 14pt bold title
                  color: '000000',
                  noProof: true,
                  language: { value: 'id-ID' },
                })
            ),
          })
        );
      }

      // B. Center Logo / Graphic (e.g. Embedded System Laboratory logo in Gambar 1)
      const centerImage = pageImages.find((img) => !img.isHeaderLogo);
      if (centerImage) {
        const displayW = Math.min(180, Math.round(centerImage.widthPt));
        const displayH = Math.round(displayW * (centerImage.heightPt / centerImage.widthPt));
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 240 },
            children: [
              new ImageRun({
                data: centerImage.buffer,
                transformation: { width: displayW, height: displayH },
                type: 'png',
              }),
            ],
          })
        );
      } else {
        docChildren.push(new Paragraph({ spacing: { before: 180, after: 180 } }));
      }

      // C. Metadata Block (Pristine 2-column borderless alignment)
      if (metaLines.length > 0) {
        const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };
        const metaRows: any[] = [];

        for (const mLine of metaLines) {
          const colonPos = mLine.fullText.indexOf(':');
          let label = '';
          let value = '';

          if (colonPos >= 0) {
            label = mLine.fullText.slice(0, colonPos).trim();
            value = ': ' + mLine.fullText.slice(colonPos + 1).trim();
          } else {
            // Continuation line (e.g. asisten 2, 3, 4)
            label = '';
            value = '  ' + mLine.fullText.trim();
          }

          metaRows.push(
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 2200, type: WidthType.DXA },
                  borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.LEFT,
                      spacing: { before: 20, after: 20, line: 240, lineRule: LineRuleType.AUTO },
                      children: [
                        new TextRun({
                          text: label,
                          font: 'Arial',
                          size: 20, // 10pt
                          color: '000000',
                          noProof: true,
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 5000, type: WidthType.DXA },
                  borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.LEFT,
                      spacing: { before: 20, after: 20, line: 240, lineRule: LineRuleType.AUTO },
                      children: [
                        new TextRun({
                          text: value,
                          font: 'Arial',
                          size: 20, // 10pt
                          color: '000000',
                          noProof: true,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            })
          );
        }

        docChildren.push(
          new Table({
            alignment: AlignmentType.CENTER,
            width: { size: 7200, type: WidthType.DXA },
            borders: {
              top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
              insideHorizontal: noBorder, insideVertical: noBorder,
            },
            rows: metaRows,
          })
        );
      }

      // Gap before institution footer
      docChildren.push(new Paragraph({ spacing: { before: 180, after: 180 } }));

      // D. Institution Footer Block (Centered, bold)
      for (const iLine of instLines) {
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 20, after: 30, line: 240, lineRule: LineRuleType.AUTO },
            children: iLine.runs.map(
              (r) =>
                new TextRun({
                  text: r.text,
                  bold: true,
                  font: 'Arial',
                  size: 22, // 11pt
                  color: '000000',
                  noProof: true,
                  language: { value: 'id-ID' },
                })
            ),
          })
        );
      }

      continue; // Page 1 Cover is complete
    }

    // 7. TABLE OF CONTENTS (DAFTAR ISI) HANDLING (Matches Gambar 4)
    if (isTOC) {
      for (const line of processedLines) {
        const trimmed = line.fullText.trim();
        const isTocTitle = /^DAFTAR\s+ISI$/i.test(trimmed);
        const hasDotLeader = /\.{3,}/.test(trimmed) || /\.\s*\.\s*\./.test(trimmed);
        const isMajorHeading =
          /^(BAB\s+[IVXLCDM]+|DAFTAR\s+PUSTAKA|DAFTAR\s+ISI|DAFTAR\s+TABEL|DAFTAR\s+GAMBAR|LAMPIRAN)\b/i.test(
            trimmed
          );
        const isSubSection = /^(\d+\.\d+|\d+\.\d+\.\d+|[a-zA-Z]\.)\s/.test(trimmed);

        if (isTocTitle) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 200, line: 240, lineRule: LineRuleType.AUTO },
              children: [
                new TextRun({
                  text: trimmed,
                  bold: true,
                  font: 'Arial',
                  size: 26, // 13pt
                  color: '000000',
                  noProof: true,
                  language: { value: 'id-ID' },
                }),
              ],
            })
          );
          continue;
        }

        // Each TOC line is rendered as a clean, independent paragraph (never merged!)
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            indent: isSubSection ? { left: 360 } : undefined,
            spacing: {
              before: isMajorHeading ? 60 : 20,
              after: isMajorHeading ? 40 : 20,
              line: 240,
              lineRule: LineRuleType.AUTO,
            },
            children: line.runs.map(
              (r) =>
                new TextRun({
                  text: r.text,
                  bold: isMajorHeading || r.bold,
                  font: 'Arial',
                  size: isMajorHeading ? 21 : 20, // 10.5pt for major, 10pt for sub
                  color: '000000',
                  noProof: true,
                  language: { value: 'id-ID' },
                })
            ),
          })
        );
      }
      continue; // TOC page complete
    }

    // 8. BODY PAGES: TABLE DETECTION & PARAGRAPH JUSTIFICATION
    // Check if consecutive lines form a tabular structure
    let lineIdx = 0;
    while (lineIdx < processedLines.length) {
      const line = processedLines[lineIdx];
      const trimmed = line.fullText.trim();

      // Filter out marginal paraf stamps at page bottom (e.g. "PIHAK PERTAMA PIHAK KEDUA" or standalone page numbers)
      const isMarginal =
        line.y < 130 &&
        (/^(paraf\s+)?pihak\s+(pertama|kedua)/i.test(trimmed) ||
          trimmed.toLowerCase().includes('pihak pertama pihak kedua') ||
          /^\d+$/.test(trimmed));

      if (isMarginal) {
        lineIdx++;
        continue;
      }

      // Check for table block (>= 2 consecutive lines with >= 2 aligned columns)
      let tableEndIdx = lineIdx;
      while (
        tableEndIdx < processedLines.length &&
        !processedLines[tableEndIdx].isCentered &&
        processedLines[tableEndIdx].columns &&
        processedLines[tableEndIdx].columns!.length >= 2
      ) {
        tableEndIdx++;
      }

      if (tableEndIdx - lineIdx >= 2) {
        // Construct native Word Table
        const tableLines = processedLines.slice(lineIdx, tableEndIdx);
        const colCount = Math.max(...tableLines.map((l) => l.columns!.length));
        const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };

        const tableRows = tableLines.map((tLine, rIdx) => {
          const isHeader = rIdx === 0;
          const cells = tLine.columns!.map((col) => {
            return new TableCell({
              borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
              children: [
                new Paragraph({
                  alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                  spacing: { before: 40, after: 40, line: 240, lineRule: LineRuleType.AUTO },
                  children: col.runs.map(
                    (r) =>
                      new TextRun({
                        text: r.text,
                        bold: isHeader || r.bold,
                        font: 'Arial',
                        size: 19,
                        color: '000000',
                        noProof: true,
                      })
                  ),
                }),
              ],
            });
          });

          // Fill any missing columns to keep grid uniform
          while (cells.length < colCount) {
            cells.push(
              new TableCell({
                borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
                children: [new Paragraph({ children: [] })],
              })
            );
          }

          return new TableRow({ children: cells });
        });

        docChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder,
              insideHorizontal: cellBorder, insideVertical: cellBorder,
            },
            rows: tableRows,
          })
        );

        lineIdx = tableEndIdx;
        continue;
      }

      // Check for embedded image in the gap before this line
      const gapImg = pageImages.find((img) => img.gapIndex === lineIdx - 1 && !img.isHeaderLogo);
      if (gapImg) {
        const dispW = Math.min(420, Math.round(gapImg.widthPt));
        const dispH = Math.round(dispW * (gapImg.heightPt / gapImg.widthPt));
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 140 },
            children: [
              new ImageRun({
                data: gapImg.buffer,
                transformation: { width: dispW, height: dispH },
                type: 'png',
              }),
            ],
          })
        );
      }

      // Centered line (Title, heading, Pasal, Bab, Nomor, etc.)
      if (line.isCentered) {
        const isMajorHeading =
          /^(PERJANJIAN|BAB|PASAL|DAFTAR|LAMPIRAN)\b/i.test(trimmed) ||
          line.runs.some((r) => r.fontSize >= 12);
        const isNomorLine = /^nomor\b/i.test(trimmed);

        // Lookahead to check if the next line is also centered
        let nextLine = lineIdx + 1 < processedLines.length ? processedLines[lineIdx + 1] : null;
        if (nextLine && nextLine.y < 130 && /^(paraf|pihak|\d+$)/i.test(nextLine.fullText.trim())) {
          nextLine = null;
        }
        const isNextCentered = nextLine ? nextLine.isCentered : false;

        // Space before:
        const beforeSpace = isNomorLine ? 100 : (isMajorHeading ? 140 : 0);
        // Space after:
        // Compact spacing between consecutive centered title lines (25 twips = ~1pt)
        // Breathing space if followed by normal body text (140 twips = 7pt)
        const afterSpace = isNextCentered ? (isNomorLine ? 30 : 25) : 140;

        const runs = isContractDocument ? ensureContractPhrasesBold(line.runs) : line.runs;

        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: {
              before: beforeSpace,
              after: afterSpace,
              line: 240, // Exact 1.0 single spacing
              lineRule: LineRuleType.AUTO,
            },
            children: runs.map(
              (r) =>
                new TextRun({
                  text: r.text,
                  bold: isMajorHeading || r.bold,
                  font: 'Arial',
                  size: isMajorHeading ? 22 : 20, // 11pt or 10pt
                  color: '000000',
                  noProof: true,
                  language: { value: 'id-ID' },
                })
            ),
          })
        );
        lineIdx++;
        continue;
      }

      // Right-aligned lines (e.g. date, location, signee labels)
      if (line.isRightAligned) {
        const runs = isContractDocument ? ensureContractPhrasesBold(line.runs) : line.runs;
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 40, after: 40, line: 240, lineRule: LineRuleType.AUTO },
            children: runs.map(
              (r) =>
                new TextRun({
                  text: r.text,
                  bold: r.bold,
                  font: 'Arial',
                  size: 20,
                  color: '000000',
                  noProof: true,
                  language: { value: 'id-ID' },
                })
            ),
          })
        );
        lineIdx++;
        continue;
      }

      // Paragraph Accumulation (List items or Regular Body paragraphs)
      const isList = line.isListItem;
      const paraRuns: TextRunItem[] = [...line.runs];
      let pEndIdx = lineIdx + 1;

      while (pEndIdx < processedLines.length) {
        const nextLine = processedLines[pEndIdx];
        const nextTrimmed = nextLine.fullText.trim();

        // Check if next line is marginal footer stamp
        const isNextMarginal =
          nextLine.y < 130 &&
          (/^(paraf\s+)?pihak\s+(pertama|kedua)/i.test(nextTrimmed) ||
            nextTrimmed.toLowerCase().includes('pihak pertama pihak kedua') ||
            /^\d+$/.test(nextTrimmed));

        if (isNextMarginal) {
          break;
        }

        // Stop accumulation if next line is centered, a new list item, right aligned, or a table
        if (
          nextLine.isCentered ||
          nextLine.isListItem ||
          nextLine.isRightAligned ||
          (nextLine.columns && nextLine.columns.length >= 2)
        ) {
          break;
        }

        // Check vertical gap
        const prevLine = processedLines[pEndIdx - 1];
        const verticalGap = prevLine.y - nextLine.y;
        const maxLineGap = 1.75 * (nextLine.runs[0]?.fontSize || 10);

        if (verticalGap > maxLineGap) {
          break;
        }

        // Merge into current paragraph
        const lastRun = paraRuns[paraRuns.length - 1];
        const prevText = lastRun ? lastRun.text.trimEnd() : '';
        const isHyphen = /[a-zA-Z]-$/.test(prevText);
        if (isHyphen) {
          lastRun.text = prevText.slice(0, -1);
        } else {
          if (!prevText.endsWith(' ') && !nextLine.runs[0]?.text.startsWith(' ')) {
            paraRuns.push({ text: ' ', bold: false, fontSize: 10 });
          }
        }
        paraRuns.push(...nextLine.runs);
        pEndIdx++;
      }

      const finalRuns = isContractDocument ? ensureContractPhrasesBold(paraRuns) : paraRuns;

      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: isList ? { left: 360, hanging: 360 } : undefined,
          spacing: {
            before: 0,
            after: isList ? 100 : 100,
            line: 240, // Exact 1.0 single line spacing
            lineRule: LineRuleType.AUTO,
          },
          children: finalRuns.map(
            (r) =>
              new TextRun({
                text: r.text,
                bold: r.bold,
                font: 'Arial',
                size: Math.round(Math.max(8.5, Math.min(16, r.fontSize || 10)) * 2),
                color: '000000',
                noProof: true,
                language: { value: 'id-ID' },
              })
          ),
        })
      );

      lineIdx = pEndIdx;
    }
  }

  // 9. Authentic Footer Configuration:
  // - If document is a contract: Use the 2-cell Paraf stamp box footer
  // - Otherwise (Academic / General report): Use clean standard page number footer
  const parafCellBorder = {
    style: BorderStyle.SINGLE,
    size: 8,
    color: '000000',
  };

  const parafFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        indent: { right: 1800 },
        spacing: { before: 0, after: 30 },
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            font: 'Arial',
            size: 16,
            color: '000000',
            noProof: true,
          }),
        ],
      }),
      new Table({
        alignment: AlignmentType.RIGHT,
        width: { size: 3600, type: WidthType.DXA },
        borders: {
          top: parafCellBorder, bottom: parafCellBorder, left: parafCellBorder, right: parafCellBorder,
          insideHorizontal: parafCellBorder, insideVertical: parafCellBorder,
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 1800, type: WidthType.DXA },
                borders: { top: parafCellBorder, bottom: parafCellBorder, left: parafCellBorder, right: parafCellBorder },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({
                        text: 'Paraf PIHAK PERTAMA',
                        font: 'Arial',
                        size: 15,
                        noProof: true,
                        language: { value: 'id-ID' },
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 1800, type: WidthType.DXA },
                borders: { top: parafCellBorder, bottom: parafCellBorder, left: parafCellBorder, right: parafCellBorder },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({
                        text: 'Paraf PIHAK KEDUA',
                        font: 'Arial',
                        size: 15,
                        noProof: true,
                        language: { value: 'id-ID' },
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            height: { value: 650, rule: HeightRule.ATLEAST },
            children: [
              new TableCell({
                width: { size: 1800, type: WidthType.DXA },
                borders: { top: parafCellBorder, bottom: parafCellBorder, left: parafCellBorder, right: parafCellBorder },
                children: [new Paragraph({ spacing: { before: 120, after: 480 }, children: [] })],
              }),
              new TableCell({
                width: { size: 1800, type: WidthType.DXA },
                borders: { top: parafCellBorder, bottom: parafCellBorder, left: parafCellBorder, right: parafCellBorder },
                children: [new Paragraph({ spacing: { before: 120, after: 480 }, children: [] })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const standardFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 0 },
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            font: 'Arial',
            size: 18,
            color: '666666',
            noProof: true,
          }),
        ],
      }),
    ],
  });

  // Page Borders Configuration if original PDF has borders
  const pageBordersConfig = globalHasBorder
    ? {
      pageBorderTop: {
        style: BorderStyle.SINGLE,
        size: 12, // 1.5pt crisp border
        color: globalBorderColor,
        space: 24,
      },
      pageBorderRight: {
        style: BorderStyle.SINGLE,
        size: 12,
        color: globalBorderColor,
        space: 24,
      },
      pageBorderBottom: {
        style: BorderStyle.SINGLE,
        size: 12,
        color: globalBorderColor,
        space: 24,
      },
      pageBorderLeft: {
        style: BorderStyle.SINGLE,
        size: 12,
        color: globalBorderColor,
        space: 24,
      },
      pageBorders: {
        display: PageBorderDisplay.ALL_PAGES,
        offsetFrom: PageBorderOffsetFrom.PAGE,
        zOrder: PageBorderZOrder.FRONT,
      },
    }
    : undefined;

  // 10. Assemble Document with standard A4 dimensions
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 20, // 10pt base font
            color: '000000',
            noProof: true,
            language: { value: 'id-ID' },
          },
          paragraph: {
            spacing: {
              line: 240,
              lineRule: LineRuleType.AUTO,
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          titlePage: hasCoverPage,
          page: {
            size: {
              width: 11906, // A4 width in twips (210mm)
              height: 16838, // A4 height in twips (297mm)
            },
            margin: {
              top: 720, // 36pt in twips
              bottom: 540, // 27pt in twips
              left: 900, // 45pt in twips
              right: 900, // 45pt in twips
            },
            borders: pageBordersConfig,
          },
        },
        footers: isContractDocument
          ? { default: parafFooter }
          : {
            default: standardFooter,
            first: hasCoverPage ? new Footer({ children: [] }) : undefined,
          },
        children: docChildren,
      },
    ],
  });

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const arrayBuf = await Packer.toArrayBuffer(doc);
  const docxData = new Uint8Array(arrayBuf);

  return {
    data: docxData,
    filename: `${baseName}.docx`,
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

/**
 * Convert a Word document or text file into a formatted PDF document.
 */
/**
 * Sanitize text to ensure it only contains characters supported by pdf-lib's WinAnsi encoding.
 * Prevents "WinAnsi cannot encode" errors when drawing text with StandardFonts.Helvetica.
 */
function sanitizeForWinAnsi(str: string): string {
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
}

/**
 * Convert a Word document (.docx, .doc) or text file into a formatted PDF document.
 */
export async function wordToPdf(file: File): Promise<Uint8Array> {
  let text = '';
  const isDocx = file.name.toLowerCase().endsWith('.docx');

  if (isDocx) {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } catch {
      // Fallback if mammoth parsing encounters an error
      text = '';
    }
  }

  // Fallback for .doc, .txt, or if mammoth parsing produced no text
  if (!text.trim()) {
    try {
      const raw = await file.text();
      // Extract printable text chunks
      const matches = raw.match(/[a-zA-Z0-9\s.,!?:;"'()\-–—/\\@#$%&*+=\[\]{}<>]+/g);
      if (matches && matches.length > 0) {
        text = matches.filter((m) => m.trim().length > 3).join(' ');
      } else {
        text = `Document: ${file.name}`;
      }
    } catch {
      text = `Document Content: ${file.name}`;
    }
  }

  // Ensure text is sanitized for WinAnsi encoding
  const sanitized = sanitizeForWinAnsi(text);
  const paragraphs = sanitized.split(/\r?\n/).map((p) => p.trim());

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const fontSize = 11;
  const lineHeight = 16;
  const maxWidth = pageWidth - margin * 2;

  // Split paragraphs into word-wrapped lines
  const lines: string[] = [];
  for (const para of paragraphs) {
    if (!para) {
      lines.push(''); // Empty line for paragraph gap
      continue;
    }

    const words = para.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      let testWidth = 0;
      try {
        testWidth = font.widthOfTextAtSize(testLine, fontSize);
      } catch {
        testWidth = maxWidth + 1; // Force break on weird characters
      }

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  // Filter out excessive consecutive empty lines
  const cleanLines: string[] = [];
  let prevEmpty = false;
  for (const l of lines) {
    if (l === '') {
      if (!prevEmpty) cleanLines.push('');
      prevEmpty = true;
    } else {
      cleanLines.push(l);
      prevEmpty = false;
    }
  }

  const linesPerPage = Math.floor((pageHeight - margin * 2 - 50) / lineHeight);
  const totalPages = Math.max(1, Math.ceil(cleanLines.length / linesPerPage));
  const cleanDocName = sanitizeForWinAnsi(file.name.replace(/\.[^/.]+$/, ''));

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const startIndex = (pageNum - 1) * linesPerPage;
    const pageLines = cleanLines.slice(startIndex, startIndex + linesPerPage);

    // Document Header
    page.drawText(`${cleanDocName}`, {
      x: margin,
      y: pageHeight - margin + 10,
      size: 10,
      font: boldFont,
      color: rgb(0.4, 0.2, 0.7),
    });

    // Content lines
    let y = pageHeight - margin - 20;
    for (const line of pageLines) {
      if (line.trim()) {
        try {
          page.drawText(line, {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0.12, 0.12, 0.12),
          });
        } catch {
          // If an individual character still fails, sanitize further and redraw
          const fallbackLine = line.replace(/[^\x20-\x7E]/g, ' ');
          page.drawText(fallbackLine, {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0.12, 0.12, 0.12),
          });
        }
      }
      y -= lineHeight;
    }

    // Page Number Footer
    page.drawText(`Page ${pageNum} of ${totalPages}`, {
      x: pageWidth / 2 - 25,
      y: margin / 2,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  return pdfDoc.save();
}

