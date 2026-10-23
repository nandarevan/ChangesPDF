'use client';

import { useCallback, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Upload,
  FileWarning,
  CheckCircle2,
  X,
  AlertTriangle,
  ArrowRight,
  FileText,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatFileSize } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

export interface SmartSuggestion {
  fileName: string;
  detectedType: 'word' | 'pdf' | 'image' | 'other';
  title: string;
  message: string;
  primaryAction: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
}

interface DropzoneProps {
  acceptedFormats: string[];
  maxFileSize?: number; // in bytes, default 50MB
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  label?: string;
  toolTitle?: string;
  toolSlug?: string;
}

export default function Dropzone({
  acceptedFormats,
  maxFileSize = 50 * 1024 * 1024,
  multiple = true,
  onFilesSelected,
  label,
  toolTitle,
  toolSlug,
}: DropzoneProps) {
  const { t } = useLanguage();
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback(
    (fileList: FileList | File[]): { valid: File[]; errors: string[]; suggestions: SmartSuggestion[] } => {
      const valid: File[] = [];
      const errs: string[] = [];
      const suggestions: SmartSuggestion[] = [];
      const files = Array.from(fileList);

      const expectsPdf = acceptedFormats.includes('.pdf');
      const expectsWord = acceptedFormats.includes('.docx') || acceptedFormats.includes('.doc');
      const expectsImage = acceptedFormats.some((f) => ['.jpg', '.jpeg', '.png', '.webp'].includes(f));

      for (const file of files) {
        const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
        const isWordFile = ['.doc', '.docx'].includes(ext);
        const isPdfFile = ext === '.pdf';
        const isImageFile = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'].includes(ext);

        if (!acceptedFormats.includes(ext)) {
          // 1. User is on a PDF tool (e.g. PDF to JPG, PDF to PNG, Merge PDF, Split PDF, Compress PDF) but uploads Word
          if (expectsPdf && isWordFile) {
            const isPdfToJpg = toolSlug === 'pdf-to-image' || toolSlug === 'pdf-to-jpg' || toolTitle?.toLowerCase().includes('pdf to jpg');
            const isPdfToPng = toolSlug === 'pdf-to-png' || toolTitle?.toLowerCase().includes('pdf to png');
            const isMergePdf = toolSlug === 'merge-pdf' || toolTitle?.toLowerCase().includes('merge');
            const isSplitPdf = toolSlug === 'split-pdf' || toolTitle?.toLowerCase().includes('split');
            const isOrganizePdf = toolSlug === 'organize-pdf' || toolTitle?.toLowerCase().includes('organize');
            const isProtectPdf = toolSlug === 'protect-pdf' || toolTitle?.toLowerCase().includes('protect');
            const isUnlockPdf = toolSlug === 'unlock-pdf' || toolTitle?.toLowerCase().includes('unlock');
            const isWatermarkPdf = toolSlug === 'watermark-pdf' || toolTitle?.toLowerCase().includes('watermark');
            const isRemoveWatermark = toolSlug === 'remove-watermark' || toolTitle?.toLowerCase().includes('remove watermark') || toolTitle?.toLowerCase().includes('hapus watermark');
            const toolName = isPdfToPng
              ? 'PDF to PNG'
              : isPdfToJpg
              ? 'PDF to JPG'
              : isMergePdf
              ? 'Merge PDF'
              : isSplitPdf
              ? 'Split PDF'
              : isOrganizePdf
              ? 'Organize PDF'
              : isProtectPdf
              ? 'Protect PDF'
              : isUnlockPdf
              ? 'Unlock PDF'
              : isWatermarkPdf
              ? 'Watermark PDF'
              : isRemoveWatermark
              ? 'Remove Watermark'
              : 'PDF';

            suggestions.push({
              fileName: file.name,
              detectedType: 'word',
              title: `Peringatan: Dokumen Word (${ext.toUpperCase()}) Tidak Bisa Langsung di ${toolName}`,
              message: `Anda saat ini berada di menu ${toolName} yang membutuhkan file PDF. File "${file.name}" yang Anda unggah adalah dokumen Microsoft Word. Silakan ubah file Word ini menjadi PDF terlebih dahulu dengan membuka menu Word to PDF di bawah:`,
              primaryAction: {
                label: 'Buka Menu Word to PDF',
                href: '/word-to-pdf',
              },
              secondaryAction: {
                label: 'Kompres Dokumen Word',
                href: '/compress-word',
              },
            });
            continue;
          }

          // 2. User is on JPG to PDF or JPG to Word but uploads PNG
          const isJpgToPdf = toolSlug === 'image-to-pdf' || toolSlug === 'jpg-to-pdf' || toolTitle?.toLowerCase().includes('jpg to pdf');
          const isJpgToWord = toolSlug === 'jpg-to-word' || toolTitle?.toLowerCase().includes('jpg to word');
          if ((isJpgToPdf || isJpgToWord) && (ext === '.png' || file.type === 'image/png')) {
            const toolName = isJpgToWord ? 'JPG to Word' : 'JPG to PDF';
            const targetHref = isJpgToWord ? '/png-to-word' : '/png-to-pdf';
            const targetLabel = isJpgToWord ? 'Buka Menu PNG to Word' : 'Buka Menu PNG to PDF';
            suggestions.push({
              fileName: file.name,
              detectedType: 'image',
              title: `Format Ditolak: Menu ${toolName} Khusus File JPG / JPEG`,
              message: `Menu ${toolName} hanya menerima file gambar berformat .jpg atau .jpeg. File "${file.name}" yang Anda pilih berformat PNG. Silakan gunakan menu khusus PNG di bawah:`,
              primaryAction: {
                label: targetLabel,
                href: targetHref,
              },
              secondaryAction: {
                label: 'Ubah PNG ke JPG Terlebih Dahulu',
                href: '/png-to-jpg',
              },
            });
            continue;
          }

          // 2b. User is on PNG to PDF or PNG to Word but uploads JPG
          const isPngToPdf = toolSlug === 'png-to-pdf' || toolTitle?.toLowerCase().includes('png to pdf');
          const isPngToWord = toolSlug === 'png-to-word' || toolTitle?.toLowerCase().includes('png to word');
          if ((isPngToPdf || isPngToWord) && (ext === '.jpg' || ext === '.jpeg' || file.type === 'image/jpeg')) {
            const toolName = isPngToWord ? 'PNG to Word' : 'PNG to PDF';
            const targetHref = isPngToWord ? '/jpg-to-word' : '/jpg-to-pdf';
            const targetLabel = isPngToWord ? 'Buka Menu JPG to Word' : 'Buka Menu JPG to PDF';
            suggestions.push({
              fileName: file.name,
              detectedType: 'image',
              title: `Format Ditolak: Menu ${toolName} Khusus File PNG`,
              message: `Menu ${toolName} hanya menerima file gambar berformat .png. File "${file.name}" yang Anda pilih berformat JPG/JPEG. Silakan gunakan menu khusus JPG di bawah:`,
              primaryAction: {
                label: targetLabel,
                href: targetHref,
              },
              secondaryAction: {
                label: 'Ubah JPG ke PNG Terlebih Dahulu',
                href: '/jpg-to-png',
              },
            });
            continue;
          }

          // 3. User is on a PDF tool (e.g. Merge, Split, PDF to Image, Organize, Protect, Watermark) but uploads an Image
          if (expectsPdf && isImageFile) {
            const isPdfToPng = toolSlug === 'pdf-to-png' || toolTitle?.toLowerCase().includes('pdf to png');
            const isMergePdf = toolSlug === 'merge-pdf' || toolTitle?.toLowerCase().includes('merge');
            const isSplitPdf = toolSlug === 'split-pdf' || toolTitle?.toLowerCase().includes('split');
            const isOrganizePdf = toolSlug === 'organize-pdf' || toolTitle?.toLowerCase().includes('organize');
            const isProtectPdf = toolSlug === 'protect-pdf' || toolTitle?.toLowerCase().includes('protect');
            const isUnlockPdf = toolSlug === 'unlock-pdf' || toolTitle?.toLowerCase().includes('unlock');
            const isWatermarkPdf = toolSlug === 'watermark-pdf' || toolTitle?.toLowerCase().includes('watermark');
            const isRemoveWatermark = toolSlug === 'remove-watermark' || toolTitle?.toLowerCase().includes('remove watermark');
            const targetTool = ext === '.png' ? 'PNG to PDF' : 'JPG to PDF';
            const targetHref = ext === '.png' ? '/png-to-pdf' : '/jpg-to-pdf';
            const currentToolName = isMergePdf
              ? 'Merge PDF'
              : isSplitPdf
              ? 'Split PDF'
              : isOrganizePdf
              ? 'Organize PDF'
              : isProtectPdf
              ? 'Protect PDF'
              : isUnlockPdf
              ? 'Unlock PDF'
              : isWatermarkPdf
              ? 'Watermark PDF'
              : isRemoveWatermark
              ? 'Remove Watermark'
              : isPdfToPng
              ? 'PDF to PNG'
              : 'PDF to JPG';

            suggestions.push({
              fileName: file.name,
              detectedType: 'image',
              title: `Format File Tidak Sesuai: File Ini Berupa Gambar (${ext.toUpperCase()})`,
              message: `Menu ${currentToolName} memerlukan dokumen PDF. Jika Anda ingin mengubah atau menyusun gambar "${file.name}" menjadi dokumen PDF, gunakan menu ${targetTool} di bawah:`,
              primaryAction: {
                label: `Buka Menu ${targetTool}`,
                href: targetHref,
              },
            });
            continue;
          }

          // 4. User is on a Word tool (Word to PDF, Word to JPG, Word to PNG, Compress Word) but uploads PDF
          if (expectsWord && isPdfFile) {
            const isWordToJpg = toolSlug === 'word-to-jpg' || toolTitle?.toLowerCase().includes('word to jpg');
            const isWordToPng = toolSlug === 'word-to-png' || toolTitle?.toLowerCase().includes('word to png');
            const primaryHref = isWordToJpg ? '/pdf-to-jpg' : isWordToPng ? '/pdf-to-png' : '/pdf-to-word';
            const primaryLabel = isWordToJpg ? 'Buka PDF to JPG' : isWordToPng ? 'Buka PDF to PNG' : 'Buka PDF to Word';

            suggestions.push({
              fileName: file.name,
              detectedType: 'pdf',
              title: 'Format File Tidak Sesuai: Ini adalah File PDF (.pdf)',
              message: `Halaman ini khusus untuk dokumen Word (.docx / .doc). Untuk memproses file PDF "${file.name}", silakan pilih tool di bawah:`,
              primaryAction: {
                label: primaryLabel,
                href: primaryHref,
              },
              secondaryAction: {
                label: 'Buka Compress PDF',
                href: '/compress-pdf',
              },
            });
            continue;
          }

          // 5. User is on a Word tool but uploads an Image
          if (expectsWord && isImageFile) {
            const isPng = ext === '.png';
            const isWordToJpg = toolSlug === 'word-to-jpg' || toolTitle?.toLowerCase().includes('word to jpg');
            const isWordToPng = toolSlug === 'word-to-png' || toolTitle?.toLowerCase().includes('word to png');

            let targetHref = isPng ? '/png-to-pdf' : '/jpg-to-pdf';
            let targetLabel = isPng ? 'Buka PNG to PDF' : 'Buka JPG to PDF';
            if (isWordToJpg || isWordToPng) {
              targetHref = isPng ? '/png-to-word' : '/jpg-to-word';
              targetLabel = isPng ? 'Buka PNG to Word' : 'Buka JPG to Word';
            }

            suggestions.push({
              fileName: file.name,
              detectedType: 'image',
              title: `Format File Tidak Sesuai: Ini adalah File Gambar (${ext.toUpperCase()})`,
              message: `Halaman ini khusus untuk dokumen Word. Jika Anda ingin mengonversi gambar "${file.name}" menjadi dokumen, silakan gunakan tool di bawah:`,
              primaryAction: {
                label: targetLabel,
                href: targetHref,
              },
            });
            continue;
          }

          // 6. User is on JPG to PNG but uploads PNG
          if ((toolSlug === 'jpg-to-png' || toolTitle?.toLowerCase().includes('jpg to png')) && (ext === '.png' || file.type === 'image/png')) {
            suggestions.push({
              fileName: file.name,
              detectedType: 'image',
              title: 'Format File Tidak Sesuai: File Ini Sudah Berupa PNG (.PNG)',
              message: `Halaman ini untuk mengubah gambar JPG ke format PNG. File "${file.name}" Anda sudah berformat PNG. Ingin mengubah gambar PNG ke JPG?`,
              primaryAction: {
                label: 'Buka PNG to JPG',
                href: '/png-to-jpg',
              },
            });
            continue;
          }

          // 7. User is on PNG to JPG but uploads JPG
          if ((toolSlug === 'png-to-jpg' || toolTitle?.toLowerCase().includes('png to jpg')) && (ext === '.jpg' || ext === '.jpeg' || file.type === 'image/jpeg')) {
            suggestions.push({
              fileName: file.name,
              detectedType: 'image',
              title: 'Format File Tidak Sesuai: File Ini Sudah Berupa JPG (.JPG)',
              message: `Halaman ini untuk mengubah gambar PNG ke format JPG. File "${file.name}" Anda sudah berformat JPG. Ingin mengubah gambar JPG ke PNG?`,
              primaryAction: {
                label: 'Buka JPG to PNG',
                href: '/jpg-to-png',
              },
            });
            continue;
          }

          // 8. User is on an Image tool (JPG to PDF or PNG to PDF) but uploads PDF
          if (expectsImage && isPdfFile) {
            const isPngTool = toolSlug === 'png-to-pdf' || toolTitle?.toLowerCase().includes('png to pdf');
            const targetLabel = isPngTool ? 'Buka PDF to PNG' : 'Buka PDF to JPG';
            const targetHref = isPngTool ? '/pdf-to-png' : '/pdf-to-image';
            const currentName = isPngTool ? 'PNG to PDF' : 'JPG to PDF';

            suggestions.push({
              fileName: file.name,
              detectedType: 'pdf',
              title: 'Format File Tidak Sesuai: Ini adalah File PDF (.pdf)',
              message: `Halaman ini untuk mengubah gambar menjadi PDF. Jika Anda ingin mengubah halaman PDF "${file.name}" menjadi file gambar, gunakan tool ${isPngTool ? 'PDF to PNG' : 'PDF to JPG'}.`,
              primaryAction: {
                label: targetLabel,
                href: targetHref,
              },
            });
            continue;
          }

          // 9. User is on an Image tool (JPG to PDF or PNG to PDF) but uploads Word
          if (expectsImage && isWordFile) {
            const isPngTool = toolSlug === 'png-to-pdf' || toolTitle?.toLowerCase().includes('png to pdf');
            const currentName = isPngTool ? 'PNG to PDF' : 'JPG to PDF';

            suggestions.push({
              fileName: file.name,
              detectedType: 'word',
              title: `Peringatan: Dokumen Word (${ext.toUpperCase()}) di Menu ${currentName}`,
              message: `Halaman ini khusus untuk gambar. Anda mengunggah dokumen Word "${file.name}". Ingin mengubah dokumen Word ini menjadi PDF?`,
              primaryAction: {
                label: 'Buka Menu Word to PDF',
                href: '/word-to-pdf',
              },
              secondaryAction: {
                label: 'Kompres Dokumen Word',
                href: '/compress-word',
              },
            });
            continue;
          }

          // Default generic error
          errs.push(
            `"${file.name}" bukan format yang didukung. Format yang diterima: ${acceptedFormats.join(', ')}`
          );
          continue;
        }

        if (file.size > maxFileSize) {
          errs.push(
            `"${file.name}" melebihi batas ukuran maksimal ${formatFileSize(maxFileSize)}.`
          );
          continue;
        }

        valid.push(file);
      }

      return { valid, errors: errs, suggestions };
    },
    [acceptedFormats, maxFileSize]
  );

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const { valid, errors: errs, suggestions } = validateFiles(fileList);
      setErrors(errs);
      setSmartSuggestions(suggestions);

      if (valid.length > 0) {
        const newFiles = multiple
          ? [...selectedFiles, ...valid]
          : [valid[0]];
        setSelectedFiles(newFiles);
        onFilesSelected(newFiles);
      }
    },
    [validateFiles, multiple, selectedFiles, onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(newFiles);
      onFilesSelected(newFiles);
    },
    [selectedFiles, onFilesSelected]
  );

  const clearAll = useCallback(() => {
    setSelectedFiles([]);
    setErrors([]);
    setSmartSuggestions([]);
    onFilesSelected([]);
    if (inputRef.current) inputRef.current.value = '';
  }, [onFilesSelected]);

  const strictAccept = acceptedFormats
    .flatMap((fmt) => {
      if (fmt === '.jpg' || fmt === '.jpeg') return [fmt, 'image/jpeg'];
      if (fmt === '.png') return [fmt, 'image/png'];
      if (fmt === '.pdf') return [fmt, 'application/pdf'];
      if (fmt === '.docx' || fmt === '.doc')
        return [
          fmt,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ];
      return [fmt];
    })
    .join(',');

  return (
    <div className="w-full space-y-4">
      {/* Drop Area */}
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 sm:p-14 cursor-pointer transition-all duration-200',
          isDragOver
            ? 'border-[#e5322d] bg-red-500/[0.06] scale-[1.01]'
            : 'border-gray-300 dark:border-[#2c2e35] bg-white dark:bg-[#1a1b1f] hover:border-[#e5322d] hover:bg-red-500/[0.02] dark:hover:bg-red-500/[0.03] shadow-sm'
        )}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={strictAccept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <motion.div
          animate={isDragOver ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-[#e5322d] mb-1"
        >
          <Upload className="h-8 w-8 text-[#e5322d]" />
        </motion.div>

        {/* Large iLovePDF Signature Red Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="btn-brand-red px-8 py-3.5 text-base sm:text-lg font-bold flex items-center gap-2.5 my-1"
        >
          <span>{t.dropzone.selectFile} {acceptedFormats.includes('.pdf') ? 'PDF' : ''}</span>
        </button>

        <div className="text-center mt-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isDragOver
              ? t.dropzone.dropActive
              : label || t.dropzone.dropPrompt}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {t.dropzone.formatLabel} <span className="font-semibold text-gray-600 dark:text-gray-400">{acceptedFormats.map((f) => f.toUpperCase()).join(', ')}</span> • {t.dropzone.maxLabel} {formatFileSize(maxFileSize)}
          </p>
        </div>
      </motion.div>

      {/* Smart Suggestions & Redirection Guidance */}
      <AnimatePresence>
        {smartSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {smartSuggestions.map((suggestion, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/5 dark:bg-red-500/10 p-5 backdrop-blur-md shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-[#e5322d]">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#1e2022] dark:text-white">
                        {suggestion.title}
                      </h4>
                      <button
                        onClick={() =>
                          setSmartSuggestions((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-[#1a1b1f] border border-gray-200 dark:border-[#2c2e35] text-xs font-mono text-[#1e2022] dark:text-white">
                      <FileText className="h-3.5 w-3.5 text-[#e5322d]" />
                      {suggestion.fileName}
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {suggestion.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <Link
                        href={suggestion.primaryAction.href}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#e5322d] hover:bg-[#d32722] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all"
                      >
                        <Sparkles className="h-4 w-4" />
                        {suggestion.primaryAction.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>

                      {suggestion.secondaryAction && (
                        <Link
                          href={suggestion.secondaryAction.href}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#2c2e35] bg-white dark:bg-[#1a1b1f] hover:bg-gray-50 dark:hover:bg-white/[0.04] px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 transition-all"
                        >
                          {suggestion.secondaryAction.label}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Standard Error Messages */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {errors.map((error, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-[#e5322d]"
              >
                <FileWarning className="h-4 w-4 shrink-0" />
                {error}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Files List */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">
                {selectedFiles.length} file dipilih
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
                className="text-xs text-gray-400 hover:text-[#e5322d] transition-colors"
              >
                Hapus semua
              </button>
            </div>

            <div className="space-y-1.5">
              {selectedFiles.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ delay: index * 0.04 }}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-[#1a1b1f] border border-gray-200 dark:border-[#2c2e35] px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-[#e5322d] shrink-0" />
                    <span className="truncate text-sm font-medium text-[#1e2022] dark:text-white">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="text-gray-400 hover:text-[#e5322d] transition-colors shrink-0 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
