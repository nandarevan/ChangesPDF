import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function downloadBlob(
  data: Uint8Array,
  filename: string,
  mimeType = 'application/pdf'
) {
  const blob = new Blob([data as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadMultipleBlobs(
  dataArr: Uint8Array[],
  baseName: string
) {
  dataArr.forEach((data, index) => {
    const filename = `${baseName}_part${index + 1}.pdf`;
    setTimeout(() => downloadBlob(data, filename), index * 200);
  });
}

export function downloadFileList(
  files: { data: Uint8Array; filename: string; mimeType: string }[]
) {
  files.forEach((file, index) => {
    setTimeout(
      () => downloadBlob(file.data, file.filename, file.mimeType),
      index * 250
    );
  });
}

/**
 * Format system/script error messages into clean, user-friendly Indonesian messages.
 * Strips raw internal file paths (e.g. scripts/..., C:\..., /tmp/..., line 123) and stack traces.
 */
export function formatUserErrorMessage(rawError: any): string {
  if (!rawError) return 'Maaf, terjadi kendala saat memproses dokumen Anda.';

  const str = String(rawError?.message || rawError || '').trim();

  // 1. Password errors
  if (/password salah/i.test(str)) {
    return 'Password yang Anda masukkan salah. Mohon periksa kembali huruf besar/kecil dan angka password Anda.';
  }
  if (/harap masukkan password/i.test(str)) {
    return 'Harap masukkan password dokumen PDF Anda.';
  }
  if (/buka paksa|aes-256|password pembuka khusus/i.test(str)) {
    return 'Dokumen ini memiliki proteksi enkripsi tingkat tinggi (Open Password khusus). Silakan gunakan opsi "Ketik Password Dokumen" dan masukkan password dokumen Anda.';
  }

  // 2. Watermark errors
  if (/watermark.*tidak ditemukan|tidak ada teks.*pada dokumen/i.test(str)) {
    return 'Teks watermark tidak ditemukan pada dokumen ini. Pastikan kata yang diketik sesuai dengan tanda air di PDF.';
  }

  // 3. File size / corrupted errors
  if (/file size exceeds|terlalu besar|413/i.test(str)) {
    return 'Ukuran berkas melebihi batas maksimal (50MB). Silakan gunakan berkas yang lebih kecil.';
  }
  if (/damaged|corrupt|cannot open|format tidak valid/i.test(str)) {
    return 'Dokumen rusak atau formatnya tidak didukung. Mohon pastikan file dapat dibuka dengan baik.';
  }

  // 4. Strip technical prefixes (Traceback, Python file path, subprocess errors)
  let cleaned = str
    .replace(/^Error:\s*/i, '')
    .replace(/^HTTPException:\s*/i, '')
    .replace(/^Conversion error:\s*/i, '')
    .replace(/Traceback[\s\S]*?(ValueError|RuntimeError|Exception):\s*/i, '')
    .replace(/(?:[a-zA-Z]:|\/)[^:\n]+(?:scripts|\.py|\.ts|\.js|\.tmp|\/tmp)[^:\n]*:?\s*/gi, '')
    .replace(/line \d+.*$/im, '')
    .trim();

  // If after cleaning it's still containing raw python exception traces, fall back to a polite message
  if (!cleaned || cleaned.includes('subprocess') || cleaned.includes('sys.exit') || cleaned.includes('python')) {
    return 'Maaf, dokumen belum dapat diproses. Mohon pastikan file Anda valid dan coba kembali.';
  }

  return cleaned;
}
