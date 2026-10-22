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
