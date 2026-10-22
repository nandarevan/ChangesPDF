'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Loader2,
  ArrowLeft,
  RotateCcw,
  Settings2,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  FileText,
  FileImage,
  Layers,
  Lock,
  Unlock,
  Eraser,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Upload,
  ScanText,
  Zap,
  ShieldOff,
  AlertCircle,
} from 'lucide-react';
import Dropzone from '@/components/pdf/Dropzone';
import PageGrid from '@/components/pdf/PageGrid';
import SplitVisualGrid from '@/components/pdf/SplitVisualGrid';
import type { ToolData } from '@/lib/tools-data';
import {
  mergePDFs,
  splitPDF,
  getPDFPageCount,
  imagesToPDF,
  compressPDF,
  reorderPages,
  organizePDFDocuments,
  type OrganizePageDefinition,
  addWatermark,
  protectPDF,
  unlockPDF,
  removeWatermark,
  checkWatermarkInPDF,
  pdfToImages,
  pdfToWord,
  wordToPdf,
  convertImages,
  imagesToWord,
  wordToImages,
} from '@/lib/pdf-engine';
import { downloadBlob, downloadFileList, formatFileSize } from '@/lib/utils';

type Stage = 'upload' | 'configure' | 'processing' | 'done';

interface ToolPageClientProps {
  tool: ToolData;
}

type ProcessResult =
  | { type: 'single'; data: Uint8Array; filename: string; mimeType: string }
  | {
      type: 'multiple';
      files: { data: Uint8Array; filename: string; mimeType: string }[];
    };

export default function ToolPageClient({ tool }: ToolPageClientProps) {
  const [stage, setStage] = useState<Stage>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [resultSize, setResultSize] = useState<number>(0);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tool-specific options
  const [splitMode, setSplitMode] = useState<'all' | 'range' | 'visual'>('range');
  const [splitRanges, setSplitRanges] = useState('');
  const [detectedPageCount, setDetectedPageCount] = useState<number>(0);
  const [selectedSplitPages, setSelectedSplitPages] = useState<number[]>([]);
  const [filePageCounts, setFilePageCounts] = useState<Record<number, number>>({});
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pageSize, setPageSize] = useState<'fit' | 'a4'>('fit');
  const [marginMode, setMarginMode] = useState<'none' | 'small'>('none');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(20);
  const [watermarkRotation, setWatermarkRotation] = useState(-45);
  const [watermarkFontSize, setWatermarkFontSize] = useState(50);
  const [imageFormat, setImageFormat] = useState<'jpeg' | 'png'>(
    tool.id === 'pdf-to-png' || tool.slug === 'pdf-to-png' ? 'png' : 'jpeg'
  );
  const [compressionLevel, setCompressionLevel] = useState<'recommended' | 'extreme' | 'low'>('recommended');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [aesKeyLength, setAesKeyLength] = useState<'256' | '128'>('256');

  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockMode, setUnlockMode] = useState<'force' | 'password'>('force');

  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
  const [watermarkImagePreview, setWatermarkImagePreview] = useState<string | null>(null);
  const [watermarkColorHex, setWatermarkColorHex] = useState('#ffffff');
  const [watermarkPosition, setWatermarkPosition] = useState<'diagonal' | 'center' | 'top' | 'bottom' | 'repeat'>('diagonal');

  const [removeWatermarkText, setRemoveWatermarkText] = useState('');
  const [removeCommonWatermarks, setRemoveCommonWatermarks] = useState(false);
  const [removeWatermarkMode, setRemoveWatermarkMode] = useState<'custom' | 'common'>('custom');
  const [watermarkFoundStatus, setWatermarkFoundStatus] = useState<'idle' | 'checking' | 'found' | 'not_found'>('idle');
  const [watermarkMatchesCount, setWatermarkMatchesCount] = useState<number>(0);

  // Live validation: checks if typed watermark exists in the uploaded PDF to prevent running with wrong watermark
  useEffect(() => {
    if (tool.id !== 'remove-watermark' || removeWatermarkMode !== 'custom' || files.length === 0) {
      setWatermarkFoundStatus('idle');
      return;
    }

    const query = removeWatermarkText.trim();
    if (!query) {
      setWatermarkFoundStatus('idle');
      return;
    }

    setWatermarkFoundStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await checkWatermarkInPDF(files[0], query);
        if (res.found) {
          setWatermarkFoundStatus('found');
          setWatermarkMatchesCount(res.matchesCount);
        } else {
          setWatermarkFoundStatus('not_found');
          setWatermarkMatchesCount(0);
        }
      } catch {
        setWatermarkFoundStatus('not_found');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [tool.id, removeWatermarkMode, removeWatermarkText, files]);

  // PDF to Word OCR mode: auto (default), force, off
  const [ocrMode, setOcrMode] = useState<'auto' | 'force' | 'off'>('auto');

  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [organizedPages, setOrganizedPages] = useState<OrganizePageDefinition[]>([]);
  const organizedPagesRef = useRef<OrganizePageDefinition[]>([]);

  const handleOrganizedPagesChanged = useCallback((pages: OrganizePageDefinition[]) => {
    organizedPagesRef.current = pages;
    setOrganizedPages(pages);
  }, []);

  const handleFilesSelected = useCallback(
    (selected: File[]) => {
      setFiles(selected);
      setError(null);
      if (selected.length > 0) {
        if (tool.id === 'split-pdf') {
          getPDFPageCount(selected[0]).then((count) => {
            setDetectedPageCount(count);
            setSplitRanges(`1-${count}`);
            setSelectedSplitPages(Array.from({ length: count }, (_, i) => i));
          });
        }

        if (tool.id === 'merge-pdf') {
          selected.forEach((f, idx) => {
            getPDFPageCount(f).then((count) => {
              setFilePageCounts((prev) => ({ ...prev, [idx]: count }));
            });
          });
        }

        if (tool.id === 'image-to-pdf' || tool.id === 'png-to-pdf') {
          // Auto-detect image aspect ratio to set initial best orientation
          const firstFile = selected[0];
          const img = new Image();
          const objectUrl = URL.createObjectURL(firstFile);
          img.onload = () => {
            if (img.naturalWidth > img.naturalHeight) {
              setOrientation('landscape');
            } else {
              setOrientation('portrait');
            }
            URL.revokeObjectURL(objectUrl);
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
          };
          img.src = objectUrl;
        }
        setStage('configure');
      }
    },
    [tool.id]
  );

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFiles.length) return;
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIndex];
    newFiles[targetIndex] = temp;
    setFiles(newFiles);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (newFiles.length === 0) {
      setStage('upload');
    }
  };

  const handleProcess = useCallback(async () => {
    if (files.length === 0) return;
    setStage('processing');
    setProgress(15);
    setError(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + Math.random() * 20, 92));
      }, 200);

      const baseName = files[0].name.replace(/\.[^/.]+$/, '');
      let outputResult: ProcessResult;

      switch (tool.id) {
        case 'merge-pdf': {
          const merged = await mergePDFs(files);
          outputResult = {
            type: 'single',
            data: merged,
            filename: `${baseName}_merged.pdf`,
            mimeType: 'application/pdf',
          };
          break;
        }

        case 'split-pdf': {
          let ranges: number[][];
          const totalPages =
            detectedPageCount > 0
              ? detectedPageCount
              : await getPDFPageCount(files[0]);

          if (splitMode === 'all') {
            // Split every page into its own file
            ranges = Array.from({ length: totalPages }, (_, i) => [i]);
          } else if (splitMode === 'visual') {
            if (selectedSplitPages.length === 0) {
              throw new Error('Pilih minimal satu halaman untuk diekstrak.');
            }
            ranges = selectedSplitPages.sort((a, b) => a - b).map((p) => [p]);
          } else {
            if (!splitRanges.trim()) {
              throw new Error('Masukkan rentang halaman yang valid (contoh: 1-3, 5, 8-10).');
            }
            ranges = splitRanges
              .split(',')
              .map((r) => {
                const trimmed = r.trim();
                if (trimmed.includes('-')) {
                  const [start, end] = trimmed.split('-').map(Number);
                  if (isNaN(start) || isNaN(end) || start < 1 || end < start) return [];
                  const s = Math.max(1, start);
                  const e = Math.min(totalPages, end);
                  if (s > e) return [];
                  return Array.from({ length: e - s + 1 }, (_, i) => s - 1 + i);
                }
                const pageNum = Number(trimmed);
                if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) return [];
                return [pageNum - 1];
              })
              .filter((r) => r.length > 0);
          }

          if (ranges.length === 0) {
            throw new Error(`Rentang halaman tidak valid. Dokumen ini memiliki ${totalPages} halaman.`);
          }

          const parts = await splitPDF(files[0], ranges);
          if (parts.length === 1) {
            outputResult = {
              type: 'single',
              data: parts[0],
              filename: `${baseName}_extracted.pdf`,
              mimeType: 'application/pdf',
            };
          } else {
            outputResult = {
              type: 'multiple',
              files: parts.map((part, idx) => ({
                data: part,
                filename: `${baseName}_part${idx + 1}.pdf`,
                mimeType: 'application/pdf',
              })),
            };
          }
          break;
        }

        case 'png-to-pdf':
        case 'image-to-pdf': {
          const pdfData = await imagesToPDF(files, orientation, {
            pageSize,
            margin: marginMode,
          });
          outputResult = {
            type: 'single',
            data: pdfData,
            filename: `${baseName}_converted.pdf`,
            mimeType: 'application/pdf',
          };
          break;
        }

        case 'jpg-to-png': {
          const converted = await convertImages(files, 'png');
          if (converted.length === 1) {
            outputResult = {
              type: 'single',
              data: converted[0].data,
              filename: converted[0].filename,
              mimeType: converted[0].mimeType,
            };
          } else {
            outputResult = {
              type: 'multiple',
              files: converted,
            };
          }
          break;
        }

        case 'png-to-jpg': {
          const converted = await convertImages(files, 'jpeg');
          if (converted.length === 1) {
            outputResult = {
              type: 'single',
              data: converted[0].data,
              filename: converted[0].filename,
              mimeType: converted[0].mimeType,
            };
          } else {
            outputResult = {
              type: 'multiple',
              files: converted,
            };
          }
          break;
        }

        case 'word-to-jpg': {
          const images = await wordToImages(files[0], 'jpeg');
          if (images.length === 1) {
            outputResult = {
              type: 'single',
              data: images[0].data,
              filename: images[0].filename,
              mimeType: images[0].mimeType,
            };
          } else {
            outputResult = {
              type: 'multiple',
              files: images,
            };
          }
          break;
        }

        case 'word-to-png': {
          const images = await wordToImages(files[0], 'png');
          if (images.length === 1) {
            outputResult = {
              type: 'single',
              data: images[0].data,
              filename: images[0].filename,
              mimeType: images[0].mimeType,
            };
          } else {
            outputResult = {
              type: 'multiple',
              files: images,
            };
          }
          break;
        }

        case 'jpg-to-word':
        case 'png-to-word': {
          const docx = await imagesToWord(files);
          outputResult = {
            type: 'single',
            data: docx.data,
            filename: docx.filename,
            mimeType: docx.mimeType,
          };
          break;
        }

        case 'pdf-to-png':
        case 'pdf-to-image': {
          const effectiveFormat = tool.id === 'pdf-to-png' ? 'png' : imageFormat;
          const images = await pdfToImages(files[0], effectiveFormat);
          outputResult = {
            type: 'multiple',
            files: images,
          };
          break;
        }

        case 'pdf-to-word': {
          let convertedData: Uint8Array | null = null;
          let convertedFilename = `${baseName}.docx`;
          let convertedMime =
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

          // 1. Try Python High-Fidelity + RapidOCR Engine (Render Backend or local API)
          try {
            const formData = new FormData();
            formData.append('file', files[0]);
            formData.append('ocrMode', ocrMode);

            const backendUrl =
              process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL ||
              'https://changespdf-backend.onrender.com';

            const resp = await fetch(`${backendUrl}/api/pdf-to-word`, {
              method: 'POST',
              body: formData,
            });

            if (resp.ok) {
              const arrayBuffer = await resp.arrayBuffer();
              convertedData = new Uint8Array(arrayBuffer);
            }
          } catch (err) {
            console.warn('Python engine unavailable, switching to client-side engine:', err);
          }

          // 2. Client-side fallback if Python was unavailable or failed
          if (!convertedData) {
            const wordDoc = await pdfToWord(files[0]);
            convertedData = wordDoc.data;
            convertedFilename = wordDoc.filename;
            convertedMime = wordDoc.mimeType;
          }

          outputResult = {
            type: 'single',
            data: convertedData,
            filename: convertedFilename,
            mimeType: convertedMime,
          };
          break;
        }

        case 'word-to-pdf': {
          let convertedData: Uint8Array | null = null;
          let convertedFilename = `${baseName}.pdf`;
          let convertedMime = 'application/pdf';

          // 1. Try High-Fidelity Engine via /api/word-to-pdf
          try {
            const formData = new FormData();
            formData.append('file', files[0]);

            const resp = await fetch('/api/word-to-pdf', {
              method: 'POST',
              body: formData,
            });

            if (resp.ok) {
              const arrayBuffer = await resp.arrayBuffer();
              convertedData = new Uint8Array(arrayBuffer);
            }
          } catch (err) {
            console.warn('Backend Word-to-PDF engine unavailable, switching to client-side engine:', err);
          }

          // 2. Client-side fallback if backend was unavailable or failed
          if (!convertedData) {
            convertedData = await wordToPdf(files[0]);
          }

          outputResult = {
            type: 'single',
            data: convertedData,
            filename: convertedFilename,
            mimeType: convertedMime,
          };
          break;
        }

        case 'compress-pdf': {
          let compressed: Uint8Array | null = null;
          try {
            const formData = new FormData();
            formData.append('file', files[0]);
            formData.append('level', compressionLevel);

            const resp = await fetch('/api/compress-pdf', {
              method: 'POST',
              body: formData,
            });

            if (resp.ok) {
              const arrayBuffer = await resp.arrayBuffer();
              compressed = new Uint8Array(arrayBuffer);
            }
          } catch (err) {
            console.warn('Backend compress-pdf unavailable, falling back to client-side:', err);
          }

          if (!compressed) {
            compressed = await compressPDF(files[0]);
          }

          outputResult = {
            type: 'single',
            data: compressed,
            filename: `${baseName}_compressed.pdf`,
            mimeType: 'application/pdf',
          };
          break;
        }

        case 'compress-word': {
          let compressed: Uint8Array | null = null;
          try {
            const formData = new FormData();
            formData.append('file', files[0]);
            formData.append('level', compressionLevel);

            const resp = await fetch('/api/compress-word', {
              method: 'POST',
              body: formData,
            });

            if (resp.ok) {
              const arrayBuffer = await resp.arrayBuffer();
              compressed = new Uint8Array(arrayBuffer);
            } else {
              const errJson = await resp.json().catch(() => ({}));
              throw new Error(errJson.error || 'Word compression failed');
            }
          } catch (err: any) {
            console.error('Word compression error:', err);
            throw new Error(err.message || 'Failed to compress Word document');
          }

          outputResult = {
            type: 'single',
            data: compressed,
            filename: `${baseName}_compressed.docx`,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          };
          break;
        }

        case 'organize-pdf': {
          const currentPages =
            organizedPagesRef.current && organizedPagesRef.current.length > 0
              ? organizedPagesRef.current
              : organizedPages;

          let finalPages = currentPages;
          if (finalPages.length === 0) {
            // Intelligent fallback: if ref is empty, generate pages from files
            const fallback: OrganizePageDefinition[] = [];
            for (let fIdx = 0; fIdx < files.length; fIdx++) {
              const pCount = await getPDFPageCount(files[fIdx]);
              for (let pIdx = 0; pIdx < pCount; pIdx++) {
                fallback.push({ fileIndex: fIdx, pageIndex: pIdx, rotation: 0 });
              }
            }
            finalPages = fallback;
          }

          if (finalPages.length === 0) {
            throw new Error('Minimal harus ada 1 halaman yang dipertahankan dalam dokumen PDF.');
          }

          const organized = await organizePDFDocuments(files, finalPages);
          outputResult = {
            type: 'single',
            data: organized,
            filename: `${baseName}_organized.pdf`,
            mimeType: 'application/pdf',
          };
          break;
        }

        case 'watermark-pdf': {
          const hexToRgb = (hex: string) => {
            const clean = hex.replace('#', '');
            const r = parseInt(clean.substring(0, 2), 16) / 255 || 0.8;
            const g = parseInt(clean.substring(2, 4), 16) / 255 || 0.8;
            const b = parseInt(clean.substring(4, 6), 16) / 255 || 0.8;
            return { r, g, b };
          };
          const watermarked = await addWatermark(files[0], watermarkText, {
            fontSize: watermarkFontSize,
            opacity: watermarkOpacity / 100,
            rotation: watermarkRotation,
            color: hexToRgb(watermarkColorHex),
            position: watermarkPosition,
            imageFile: watermarkType === 'image' ? watermarkImage : null,
          });
          outputResult = {
            type: 'single',
            data: watermarked,
            filename: `${baseName}_watermarked.pdf`,
            mimeType: 'application/pdf',
          };
          break;
        }

        case 'protect-pdf': {
          if (!password.trim()) {
            throw new Error('Masukkan password untuk melindungi dokumen PDF.');
          }
          if (confirmPassword && password !== confirmPassword) {
            throw new Error('Konfirmasi password tidak cocok dengan password yang dimasukkan.');
          }
          const protectedPdf = await protectPDF(files[0], password, aesKeyLength);
          outputResult = {
            type: 'single',
            data: protectedPdf,
            filename: `${baseName}_protected.pdf`,
            mimeType: 'application/pdf',
          };
          break;
        }

        case 'unlock-pdf': {
          const isForce = unlockMode === 'force';
          const pwToSend = isForce ? '' : unlockPassword.trim();
          const unlockedPdf = await unlockPDF(files[0], pwToSend, isForce);
          outputResult = {
            type: 'single',
            data: unlockedPdf,
            filename: `${baseName}_unlocked.pdf`,
            mimeType: 'application/pdf',
          };
          break;
        }

        case 'remove-watermark': {
          const isCustom = removeWatermarkMode === 'custom';
          if (isCustom && !removeWatermarkText.trim()) {
            throw new Error('Silakan ketik teks watermark yang ingin Anda hapus terlebih dahulu.');
          }
          if (isCustom && (watermarkFoundStatus === 'not_found' || watermarkFoundStatus === 'checking')) {
            throw new Error(`Teks watermark "${removeWatermarkText}" tidak ditemukan di dalam dokumen PDF ini. Pastikan teks yang diketik sama persis dengan yang tertera di dokumen.`);
          }
          const cleanPdf = await removeWatermark(
            files[0],
            isCustom ? removeWatermarkText.trim() : '',
            !isCustom, // Jika custom, JANGAN hapus common watermark
            removeWatermarkMode
          );
          outputResult = {
            type: 'single',
            data: cleanPdf,
            filename: `${baseName}_no_watermark.pdf`,
            mimeType: 'application/pdf',
          };
          break;
        }

        default: {
          const raw = new Uint8Array(await files[0].arrayBuffer());
          outputResult = {
            type: 'single',
            data: raw,
            filename: `${baseName}_processed.pdf`,
            mimeType: 'application/pdf',
          };
        }
      }

      clearInterval(progressInterval);
      setProgress(100);
      setResult(outputResult);

      if (outputResult.type === 'single') {
        setResultSize(outputResult.data.length);
      } else {
        setResultSize(outputResult.files.reduce((sum, f) => sum + f.data.length, 0));
      }

      setTimeout(() => setStage('done'), 400);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred during processing.'
      );
      setStage('configure');
    }
  }, [
    tool.id,
    files,
    splitMode,
    splitRanges,
    selectedSplitPages,
    detectedPageCount,
    orientation,
    imageFormat,
    watermarkText,
    watermarkType,
    watermarkImage,
    watermarkFontSize,
    watermarkOpacity,
    watermarkRotation,
    watermarkColorHex,
    watermarkPosition,
    removeWatermarkText,
    removeCommonWatermarks,
    password,
    confirmPassword,
    aesKeyLength,
    unlockPassword,
    unlockMode,
    removeWatermarkMode,
    watermarkFoundStatus,
    pageOrder,
    organizedPages,
    pageSize,
    marginMode,
    ocrMode,
  ]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    if (result.type === 'single') {
      downloadBlob(result.data, result.filename, result.mimeType);
    } else {
      downloadFileList(result.files);
    }
  }, [result]);

  const handleReset = useCallback(() => {
    setStage('upload');
    setFiles([]);
    setProgress(0);
    setResult(null);
    setResultSize(0);
    setError(null);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {/* ================= STAGE 1: UPLOAD ================= */}
        {stage === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <Dropzone
              acceptedFormats={tool.acceptedFormats}
              multiple={[
                'merge-pdf',
                'image-to-pdf',
                'png-to-pdf',
                'jpg-to-png',
                'png-to-jpg',
                'jpg-to-word',
                'png-to-word',
              ].includes(tool.id)}
              onFilesSelected={handleFilesSelected}
              label={`Drop your ${tool.acceptedFormats.join(', ')} files here`}
              toolTitle={tool.title}
              toolSlug={tool.slug}
            />
          </motion.div>
        )}

        {/* ================= STAGE 2: CONFIGURE ================= */}
        {stage === 'configure' && (
          <motion.div
            key="configure"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/50 hover:text-[#1e2022] dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Upload different file(s)
              </button>
              <span className="text-xs font-medium text-gray-400 dark:text-white/40">
                {files.length} file{files.length > 1 ? 's' : ''} selected
              </span>
            </div>

            {/* Merge PDF: Reorder files with page counts and add button */}
            {tool.id === 'merge-pdf' && (
              <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-white/[0.06] pb-3.5">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white/90">
                      Urutan File PDF yang Akan Digabungkan
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">
                      {files.length} Dokumen •{' '}
                      {Object.values(filePageCounts).length === files.length
                        ? `${Object.values(filePageCounts).reduce((a, b) => a + b, 0)} Total Halaman Gabungan`
                        : 'Menghitung halaman...'}
                    </p>
                  </div>
                  <div>
                    <input
                      type="file"
                      id="merge-add-pdf-input"
                      accept=".pdf,application/pdf"
                      multiple
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const added = Array.from(e.target.files).filter((f) =>
                            f.name.toLowerCase().endsWith('.pdf')
                          );
                          if (added.length === 0) return;
                          const startIdx = files.length;
                          const newFiles = [...files, ...added];
                          setFiles(newFiles);
                          added.forEach((f, i) => {
                            getPDFPageCount(f).then((count) => {
                              setFilePageCounts((prev) => ({
                                ...prev,
                                [startIdx + i]: count,
                              }));
                            });
                          });
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById('merge-add-pdf-input')?.click();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 px-3.5 py-1.5 text-xs font-semibold text-[#e5322d] transition-colors"
                    >
                      + Tambah PDF Lain
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {files.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] p-3 text-sm"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-xs font-semibold text-[#e5322d]">
                          {idx + 1}
                        </span>
                        <span className="truncate text-gray-800 dark:text-white/80">{file.name}</span>
                        <span className="text-xs text-gray-400 dark:text-white/40 shrink-0">
                          ({filePageCounts[idx] ? `${filePageCounts[idx]} Halaman • ` : ''}
                          {formatFileSize(file.size)})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveFile(idx, 'up')}
                          className="rounded p-1.5 text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-[#1e2022] dark:hover:text-white disabled:opacity-20"
                          title="Pindah ke atas"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === files.length - 1}
                          onClick={() => moveFile(idx, 'down')}
                          className="rounded p-1.5 text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-[#1e2022] dark:hover:text-white disabled:opacity-20"
                          title="Pindah ke bawah"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="rounded p-1.5 text-gray-400 dark:text-white/40 hover:bg-red-500/20 hover:text-red-400"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organize PDF: Interactive PageGrid */}
            {tool.id === 'organize-pdf' && files.length > 0 && (
              <div className="space-y-4">
                <PageGrid
                  files={files}
                  onFilesChanged={(newFiles) => setFiles(newFiles)}
                  onPagesChanged={handleOrganizedPagesChanged}
                />
              </div>
            )}

            {/* Split PDF: Mode selector & Visual Page Picker */}
            {tool.id === 'split-pdf' && files[0] && (
              <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] p-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Metode Pemisahan PDF</h4>
                      <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">
                        Dokumen memiliki{' '}
                        <span className="font-semibold text-[#e5322d]">
                          {detectedPageCount || '...'} Halaman
                        </span>
                        . Pilih bagaimana halaman ingin dipisahkan.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSplitMode('range')}
                      className={`rounded-xl border p-3.5 text-left transition-all ${
                        splitMode === 'range'
                          ? 'border-[#e5322d] bg-red-500/10 text-[#e5322d] shadow-md shadow-red-500/10'
                          : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] text-gray-600 dark:text-white/60 hover:border-gray-300 dark:border-white/20'
                      }`}
                    >
                      <p className="font-bold text-sm">Rentang Halaman</p>
                      <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
                        Tentukan rentang kustom (misal: 1-3, 5)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSplitMode('all')}
                      className={`rounded-xl border p-3.5 text-left transition-all ${
                        splitMode === 'all'
                          ? 'border-[#e5322d] bg-red-500/10 text-[#e5322d] shadow-md shadow-red-500/10'
                          : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] text-gray-600 dark:text-white/60 hover:border-gray-300 dark:border-white/20'
                      }`}
                    >
                      <p className="font-bold text-sm">Ekstrak Semua Halaman</p>
                      <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
                        Pisahkan setiap halaman menjadi 1 file
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSplitMode('visual')}
                      className={`rounded-xl border p-3.5 text-left transition-all ${
                        splitMode === 'visual'
                          ? 'border-[#e5322d] bg-red-500/10 text-[#e5322d] shadow-md shadow-red-500/10'
                          : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] text-gray-600 dark:text-white/60 hover:border-gray-300 dark:border-white/20'
                      }`}
                    >
                      <p className="font-bold text-sm">Pilih Halaman Visual</p>
                      <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
                        Klik langsung thumbnail halaman
                      </p>
                    </button>
                  </div>
                </div>

                {splitMode === 'range' && (
                  <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-800 dark:text-white/80">
                        Masukkan Rentang Halaman (Contoh: 1-3, 5, 8-10)
                      </label>
                      <span className="text-xs text-gray-400 dark:text-white/40 font-mono">
                        Max: Hal 1 - {detectedPageCount || '?'}
                      </span>
                    </div>

                    <input
                      type="text"
                      value={splitRanges}
                      onChange={(e) => setSplitRanges(e.target.value)}
                      placeholder={`Contoh: 1-2, 3-${detectedPageCount || 5}`}
                      className="w-full rounded-xl bg-gray-100/70 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-gray-300 dark:text-white/20 focus:border-[#e5322d] focus:outline-none"
                    />

                    {/* Quick Range Presets */}
                    {detectedPageCount > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs text-gray-400 dark:text-white/40">Shortcut:</span>
                        <button
                          type="button"
                          onClick={() => setSplitRanges(`1-${detectedPageCount}`)}
                          className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs text-gray-700 dark:text-white/70 transition-colors"
                        >
                          Semua (1-{detectedPageCount})
                        </button>
                        {detectedPageCount > 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              setSplitRanges(
                                `1-${Math.ceil(detectedPageCount / 2)}`
                              )
                            }
                            className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs text-gray-700 dark:text-white/70 transition-colors"
                          >
                            Separuh Awal (1-{Math.ceil(detectedPageCount / 2)})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const odd = Array.from(
                              { length: detectedPageCount },
                              (_, i) => i + 1
                            )
                              .filter((n) => n % 2 !== 0)
                              .join(', ');
                            setSplitRanges(odd);
                          }}
                          className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs text-gray-700 dark:text-white/70 transition-colors"
                        >
                          Halaman Ganjil
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const even = Array.from(
                              { length: detectedPageCount },
                              (_, i) => i + 1
                            )
                              .filter((n) => n % 2 === 0)
                              .join(', ');
                            setSplitRanges(even);
                          }}
                          className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs text-gray-700 dark:text-white/70 transition-colors"
                        >
                          Halaman Genap
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {splitMode === 'all' && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-[#e5322d] leading-relaxed">
                    Setiap halaman dari halaman 1 hingga {detectedPageCount || 'akhir'} akan diekstrak menjadi file PDF mandiri beresolusi penuh.
                  </div>
                )}

                {splitMode === 'visual' && (
                  <div className="pt-3 border-t border-gray-200 dark:border-white/[0.06]">
                    <SplitVisualGrid
                      file={files[0]}
                      selectedPages={selectedSplitPages}
                      onTogglePage={(pageIdx) => {
                        setSelectedSplitPages((prev) =>
                          prev.includes(pageIdx)
                            ? prev.filter((p) => p !== pageIdx)
                            : [...prev, pageIdx]
                        );
                      }}
                      onSelectAll={() => {
                        setSelectedSplitPages(
                          Array.from(
                            { length: detectedPageCount || 1 },
                            (_, i) => i
                          )
                        );
                      }}
                      onClearAll={() => setSelectedSplitPages([])}
                      onSelectOdd={() => {
                        setSelectedSplitPages(
                          Array.from(
                            { length: detectedPageCount || 1 },
                            (_, i) => i
                          ).filter((i) => (i + 1) % 2 !== 0)
                        );
                      }}
                      onSelectEven={() => {
                        setSelectedSplitPages(
                          Array.from(
                            { length: detectedPageCount || 1 },
                            (_, i) => i
                          ).filter((i) => (i + 1) % 2 === 0)
                        );
                      }}
                      onPageCountDetected={(count) => setDetectedPageCount(count)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Image to PDF / PNG to PDF: Layout Options & Orientation */}
            {(tool.id === 'image-to-pdf' || tool.id === 'png-to-pdf') && (
              <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] p-6 space-y-6">
                {/* 1. Orientasi Dokumen PDF (Selalu Aktif) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Orientasi Halaman PDF</h4>
                      <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">
                        Tentukan arah orientasi dokumen PDF yang akan dihasilkan.
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-[#e5322d]">
                      {orientation === 'landscape' ? '📜 Landscape Aktif' : '📄 Portrait Aktif'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setOrientation('portrait')}
                      className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all ${
                        orientation === 'portrait'
                          ? 'border-[#e5322d] bg-red-500/10 text-[#e5322d] shadow-md shadow-red-500/10'
                          : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] text-gray-600 dark:text-white/60 hover:border-gray-300 dark:border-white/20'
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                        orientation === 'portrait' ? 'bg-red-500/15 text-[#e5322d]' : 'bg-white/5 text-gray-400 dark:text-white/40'
                      }`}>
                        📄
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">Portrait (Tegak)</span>
                          {orientation === 'portrait' && (
                            <span className="h-2 w-2 rounded-full bg-violet-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">
                          Format vertikal (tinggi &gt; lebar)
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrientation('landscape')}
                      className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all ${
                        orientation === 'landscape'
                          ? 'border-[#e5322d] bg-red-500/10 text-[#e5322d] shadow-md shadow-red-500/10'
                          : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] text-gray-600 dark:text-white/60 hover:border-gray-300 dark:border-white/20'
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                        orientation === 'landscape' ? 'bg-red-500/15 text-[#e5322d]' : 'bg-white/5 text-gray-400 dark:text-white/40'
                      }`}>
                        📜
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">Landscape (Mendatar)</span>
                          {orientation === 'landscape' && (
                            <span className="h-2 w-2 rounded-full bg-violet-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">
                          Format horizontal (lebar &gt; tinggi)
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Ukuran Halaman & Margin PDF */}
                <div className="pt-4 border-t border-gray-200 dark:border-white/[0.06]">
                  <h4 className="text-sm font-semibold text-white mb-1">Ukuran Halaman & Margin PDF</h4>
                  <p className="text-xs text-gray-500 dark:text-white/50 mb-3.5">
                    Pilih bagaimana gambar ditempatkan pada dokumen PDF hasil konversi.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPageSize('fit');
                        setMarginMode('none');
                      }}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        pageSize === 'fit'
                          ? 'border-[#e5322d] bg-red-500/10 text-[#e5322d] shadow-md shadow-red-500/10'
                          : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] text-gray-600 dark:text-white/60 hover:border-gray-300 dark:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">Full Sesuai Gambar</span>
                        {pageSize === 'fit' && <span className="text-xs text-[#e5322d] font-semibold">Aktif</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-white/50 mt-1.5 leading-relaxed">
                        100% Full Edge-to-Edge. Ukuran PDF mengikuti gambar asli tanpa sisa jarak/margin putih.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPageSize('a4');
                        setMarginMode('none');
                      }}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        pageSize === 'a4' && marginMode === 'none'
                          ? 'border-[#e5322d] bg-red-500/10 text-[#e5322d] shadow-md shadow-red-500/10'
                          : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] text-gray-600 dark:text-white/60 hover:border-gray-300 dark:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">A4 Lebar Penuh</span>
                        {pageSize === 'a4' && marginMode === 'none' && (
                          <span className="text-xs text-[#e5322d] font-semibold">Aktif</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-white/50 mt-1.5 leading-relaxed">
                        Kertas A4 standar ({orientation === 'landscape' ? 'Landscape' : 'Portrait'}) dengan gambar menyentuh tepi secara penuh.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPageSize('a4');
                        setMarginMode('small');
                      }}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        pageSize === 'a4' && marginMode === 'small'
                          ? 'border-[#e5322d] bg-red-500/10 text-[#e5322d] shadow-md shadow-red-500/10'
                          : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] text-gray-600 dark:text-white/60 hover:border-gray-300 dark:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">A4 Dengan Margin</span>
                        {pageSize === 'a4' && marginMode === 'small' && (
                          <span className="text-xs text-[#e5322d] font-semibold">Aktif</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-white/50 mt-1.5 leading-relaxed">
                        Kertas A4 standar dengan jarak tepi rapi (cocok untuk cetak/print dokumen).
                      </p>
                    </button>
                  </div>
                </div>

                {/* 3. Reorder Images if multiple images selected */}
                {files.length > 1 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-white/[0.06] space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white/90">
                      Urutan Halaman PDF ({files.length} Gambar)
                    </h4>
                    <p className="text-xs text-gray-400 dark:text-white/40">
                      Urutkan urutan gambar yang akan disusun ke dalam dokumen PDF.
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {files.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] p-3 text-sm"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-xs font-semibold text-[#e5322d]">
                              {idx + 1}
                            </span>
                            <span className="truncate text-gray-800 dark:text-white/80">{file.name}</span>
                            <span className="text-xs text-gray-400 dark:text-white/30 shrink-0">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveFile(idx, 'up')}
                              className="rounded p-1.5 text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-[#1e2022] dark:hover:text-white disabled:opacity-20"
                              title="Pindah ke atas"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === files.length - 1}
                              onClick={() => moveFile(idx, 'down')}
                              className="rounded p-1.5 text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-[#1e2022] dark:hover:text-white disabled:opacity-20"
                              title="Pindah ke bawah"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="rounded p-1.5 text-gray-400 dark:text-white/40 hover:bg-red-500/20 hover:text-red-400"
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* JPG to PNG & PNG to JPG Notice */}
            {(tool.id === 'jpg-to-png' || tool.id === 'png-to-jpg') && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-[#e5322d]">
                  <FileImage className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Konversi Gambar 100% Full Resolution
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-white/60 mt-0.5 leading-relaxed">
                    Gambar akan dikonversi ke format {tool.id === 'jpg-to-png' ? 'PNG (Lossless)' : 'JPG'} tanpa perubahan dimensi, tanpa batas tepi, dan tanpa jarak putih.
                  </p>
                </div>
              </div>
            )}

            {/* Word to JPG & Word to PNG Notice */}
            {(tool.id === 'word-to-jpg' || tool.id === 'word-to-png') && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-[#e5322d]">
                  <FileImage className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Format Output: {tool.id === 'word-to-jpg' ? 'JPG Beresolusi Tinggi (300 DPI)' : 'PNG Berkualitas Tajam (Lossless)'}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-white/60 mt-0.5 leading-relaxed">
                    Setiap halaman dokumen Word Anda akan dirender secara presisi menjadi gambar beresolusi tinggi dengan mempertahankan tata letak dokumen, tabel, font, dan elemen visual.
                  </p>
                </div>
              </div>
            )}

            {/* JPG to Word & PNG to Word: Info & Page Ordering */}
            {(tool.id === 'jpg-to-word' || tool.id === 'png-to-word') && (
              <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] p-6 space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-[#e5322d]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Konversi Gambar ke Dokumen Word (.docx)
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-white/60 mt-0.5 leading-relaxed">
                      Gambar {tool.id === 'jpg-to-word' ? 'JPG' : 'PNG'} akan disusun secara proporsional dan terpusat ke dalam halaman Microsoft Word (.docx).
                    </p>
                  </div>
                </div>

                {files.length > 1 && (
                  <div className="pt-3 border-t border-gray-200 dark:border-white/[0.06] space-y-3">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-white/70">
                      Urutan Halaman Dokumen ({files.length} Gambar)
                    </h5>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {files.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] p-3 text-sm"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-xs font-semibold text-[#e5322d]">
                              {idx + 1}
                            </span>
                            <span className="truncate text-gray-800 dark:text-white/80">{file.name}</span>
                            <span className="text-xs text-gray-400 dark:text-white/30 shrink-0">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveFile(idx, 'up')}
                              className="rounded p-1.5 text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-[#1e2022] dark:hover:text-white disabled:opacity-20"
                              title="Pindah ke atas"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === files.length - 1}
                              onClick={() => moveFile(idx, 'down')}
                              className="rounded p-1.5 text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-[#1e2022] dark:hover:text-white disabled:opacity-20"
                              title="Pindah ke bawah"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="rounded p-1.5 text-gray-400 dark:text-white/40 hover:bg-red-500/20 hover:text-red-400"
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PDF to Image: Format Selector */}
            {tool.id === 'pdf-to-image' && (
              <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] p-6 space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70">
                  Select Output Image Format
                </label>
                <div className="flex gap-3">
                  {(['jpeg', 'png'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setImageFormat(fmt)}
                      className={`flex-1 rounded-xl border p-3.5 text-sm font-medium transition-all ${
                        imageFormat === fmt
                          ? 'border-[#e5322d] bg-red-500/10 text-[#e5322d]'
                          : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] text-gray-600 dark:text-white/60 hover:border-gray-300 dark:border-white/20'
                      }`}
                    >
                      {fmt.toUpperCase()} {fmt === 'jpeg' ? '(Smaller Size)' : '(Lossless Quality)'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PDF to PNG Notice */}
            {tool.id === 'pdf-to-png' && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-[#e5322d]">
                  <FileImage className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Format Output: PNG Berkualitas Tinggi (Lossless)</h4>
                  <p className="text-xs text-gray-600 dark:text-white/60 mt-0.5 leading-relaxed">
                    Setiap halaman PDF akan dikonversi menjadi gambar PNG beresolusi tinggi (200 DPI) dengan mempertahankan kejernihan grafik dan detail teks.
                  </p>
                </div>
              </div>
            )}

            {/* Compress PDF & Word: Level Selector */}
            {(tool.id === 'compress-pdf' || tool.id === 'compress-word') && (
              <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] p-6 space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70">
                  Compression Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'extreme', title: 'Extreme', desc: 'Maximum compression' },
                    { id: 'recommended', title: 'Recommended', desc: 'Good quality & ratio' },
                    { id: 'low', title: 'Low', desc: 'Highest quality' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setCompressionLevel(lvl.id as any)}
                      className={`rounded-xl border p-3.5 text-left transition-all ${
                        compressionLevel === lvl.id
                          ? 'border-[#e5322d] bg-red-500/10 text-[#e5322d]'
                          : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] text-gray-600 dark:text-white/60 hover:border-gray-300 dark:border-white/20'
                      }`}
                    >
                      <p className="font-semibold text-sm">{lvl.title}</p>
                      <p className="text-xs text-gray-400 dark:text-white/40 mt-1">{lvl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Watermark PDF: Settings & Live Preview */}
            {tool.id === 'watermark-pdf' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] p-6 space-y-5">
                  {/* Watermark Type Tabs */}
                  <div className="flex gap-2 p-1 rounded-xl bg-gray-100/70 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setWatermarkType('text')}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                        watermarkType === 'text'
                          ? 'bg-[#e5322d] text-white shadow-md'
                          : 'text-gray-600 dark:text-white/60 hover:text-[#1e2022] dark:hover:text-white'
                      }`}
                    >
                      Teks Watermark
                    </button>
                    <button
                      type="button"
                      onClick={() => setWatermarkType('image')}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                        watermarkType === 'image'
                          ? 'bg-[#e5322d] text-white shadow-md'
                          : 'text-gray-600 dark:text-white/60 hover:text-[#1e2022] dark:hover:text-white'
                      }`}
                    >
                      Logo / Gambar Watermark
                    </button>
                  </div>

                  {watermarkType === 'text' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-800 dark:text-white/80 mb-1.5">
                          Teks Watermark
                        </label>
                        <input
                          type="text"
                          value={watermarkText}
                          onChange={(e) => setWatermarkText(e.target.value)}
                          placeholder="Contoh: CONFIDENTIAL, DRAFT, RAHASIA"
                          className="w-full rounded-xl bg-gray-100/70 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-gray-400 dark:text-white/30 focus:border-[#e5322d] focus:outline-none"
                        />
                        {/* Preset quick pills */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[11px] text-gray-400 dark:text-white/40">Preset:</span>
                          {['CONFIDENTIAL', 'DRAFT', 'RAHASIA', 'COPY', 'ORIGINAL', 'CONTOH'].map((txt) => (
                            <button
                              key={txt}
                              type="button"
                              onClick={() => setWatermarkText(txt)}
                              className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/5 hover:bg-white/10 px-2 py-0.5 text-[11px] text-gray-700 dark:text-white/70 transition-colors"
                            >
                              {txt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Palette */}
                      <div>
                        <label className="block text-sm font-medium text-gray-800 dark:text-white/80 mb-1.5">
                          Warna Teks
                        </label>
                        <div className="flex items-center gap-2">
                          {[
                            { label: 'Putih', hex: '#ffffff' },
                            { label: 'Abu-abu', hex: '#9ca3af' },
                            { label: 'Merah', hex: '#ef4444' },
                            { label: 'Biru', hex: '#3b82f6' },
                            { label: 'Ungu', hex: '#a855f7' },
                            { label: 'Emas', hex: '#f59e0b' },
                            { label: 'Hijau', hex: '#10b981' },
                          ].map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setWatermarkColorHex(c.hex)}
                              title={c.label}
                              className={`h-7 w-7 rounded-full border-2 transition-all ${
                                watermarkColorHex === c.hex
                                  ? 'border-white scale-110 shadow-lg ring-2 ring-red-500/50'
                                  : 'border-transparent opacity-70 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: c.hex }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Font size */}
                      <div>
                        <div className="flex justify-between text-sm text-gray-800 dark:text-white/80 mb-1">
                          <span>Ukuran Font</span>
                          <span className="font-mono text-[#e5322d]">{watermarkFontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          value={watermarkFontSize}
                          onChange={(e) => setWatermarkFontSize(Number(e.target.value))}
                          className="w-full accent-[#e5322d]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-800 dark:text-white/80 mb-1.5">
                        Pilih File Gambar / Logo Watermark (.PNG, .JPG)
                      </label>
                      <input
                        type="file"
                        id="watermark-image-input"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const imgFile = e.target.files[0];
                            setWatermarkImage(imgFile);
                            setWatermarkImagePreview(URL.createObjectURL(imgFile));
                          }
                        }}
                      />
                      <div
                        onClick={() => document.getElementById('watermark-image-input')?.click()}
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-white/15 hover:border-[#e5322d] rounded-2xl cursor-pointer bg-gray-50/40 dark:bg-white/[0.01] hover:bg-gray-50/70 dark:bg-white/[0.03] transition-colors"
                      >
                        {watermarkImagePreview ? (
                          <div className="flex flex-col items-center gap-2">
                            <img
                              src={watermarkImagePreview}
                              alt="Logo Preview"
                              className="max-h-24 max-w-[160px] object-contain rounded-lg"
                            />
                            <span className="text-xs text-[#e5322d] font-medium">
                              {watermarkImage?.name} (Klik untuk ganti)
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-white/50">
                            <Upload className="h-7 w-7 text-[#e5322d]" />
                            <span className="text-xs font-medium text-gray-800 dark:text-white/80">
                              Klik untuk memilih Logo / Cap Transparan (PNG disarankan)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Shared Controls: Opacity, Position, Rotation */}
                  <div className="pt-4 border-t border-gray-200 dark:border-white/[0.06] space-y-4">
                    {/* Position */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-white/70 mb-2">
                        Posisi Penempatan
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {[
                          { id: 'diagonal', label: 'Diagonal' },
                          { id: 'center', label: 'Tengah' },
                          { id: 'top', label: 'Atas' },
                          { id: 'bottom', label: 'Bawah' },
                          { id: 'repeat', label: 'Pola Ulang' },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => setWatermarkPosition(pos.id as any)}
                            className={`rounded-xl border py-2 px-1 text-center text-xs font-medium transition-all ${
                              watermarkPosition === pos.id
                                ? 'border-[#e5322d] bg-red-500/15 text-[#e5322d] shadow-sm'
                                : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] text-gray-600 dark:text-white/60 hover:text-[#1e2022] dark:hover:text-white'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Opacity */}
                    <div>
                      <div className="flex justify-between text-sm text-gray-800 dark:text-white/80 mb-1">
                        <span>Transparansi (Opacity)</span>
                        <span className="font-mono text-[#e5322d]">{watermarkOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="85"
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                        className="w-full accent-[#e5322d]"
                      />
                    </div>

                    {/* Rotation */}
                    <div>
                      <div className="flex justify-between text-sm text-gray-800 dark:text-white/80 mb-1">
                        <span>Sudut Rotasi</span>
                        <span className="font-mono text-[#e5322d]">{watermarkRotation}°</span>
                      </div>
                      <div className="flex gap-2">
                        {[-45, 0, 45, 90].map((deg) => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => setWatermarkRotation(deg)}
                            className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold transition-all ${
                              watermarkRotation === deg
                                ? 'border-[#e5322d] bg-red-500/15 text-[#e5322d] shadow-sm'
                                : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] text-gray-500 dark:text-white/50 hover:text-[#1e2022] dark:hover:text-white'
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="lg:col-span-5 rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] p-6 flex flex-col justify-between min-h-[360px] relative overflow-hidden">
                  <span className="text-xs text-gray-400 dark:text-white/40 uppercase font-semibold tracking-wider">
                    Live Watermark Preview
                  </span>

                  <div className="relative flex-1 my-4 rounded-xl border border-gray-200 dark:border-white/10 bg-zinc-950 flex items-center justify-center overflow-hidden p-4 shadow-inner">
                    {/* Dummy document lines behind watermark */}
                    <div className="absolute inset-4 flex flex-col justify-between opacity-15 pointer-events-none">
                      <div className="h-4 bg-white/40 rounded w-1/3 mb-2" />
                      <div className="h-2 bg-white/30 rounded w-full mb-1.5" />
                      <div className="h-2 bg-white/30 rounded w-5/6 mb-1.5" />
                      <div className="h-2 bg-white/30 rounded w-4/6 mb-1.5" />
                      <div className="h-2 bg-white/30 rounded w-full mb-1.5" />
                      <div className="h-2 bg-white/30 rounded w-3/4 mb-1.5" />
                      <div className="h-2 bg-white/30 rounded w-5/6" />
                    </div>

                    {watermarkType === 'image' && watermarkImagePreview ? (
                      <img
                        src={watermarkImagePreview}
                        alt="Watermark Preview"
                        className="max-h-36 max-w-[200px] object-contain transition-transform"
                        style={{
                          opacity: watermarkOpacity / 100,
                          transform: `rotate(${watermarkRotation}deg)`,
                        }}
                      />
                    ) : (
                      <div
                        className="font-black text-center select-none tracking-widest transition-all z-10"
                        style={{
                          opacity: watermarkOpacity / 100,
                          transform: `rotate(${watermarkRotation}deg)`,
                          fontSize: `${Math.max(16, watermarkFontSize * 0.5)}px`,
                          color: watermarkColorHex,
                        }}
                      >
                        {watermarkText || 'CONFIDENTIAL'}
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 dark:text-white/40 text-center">
                    Watermark akan diterapkan pada seluruh halaman PDF dengan kualitas tajam.
                  </p>
                </div>
              </div>
            )}

            {/* Protect PDF: Security Settings */}
            {tool.id === 'protect-pdf' && (
              <div className="max-w-xl mx-auto rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] p-6 space-y-5">
                <div className="flex items-center gap-3 border-b border-gray-200 dark:border-white/[0.06] pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-[#e5322d]">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Enkripsi & Proteksi Dokumen</h4>
                    <p className="text-xs text-gray-500 dark:text-white/50">Dokumen akan dikunci menggunakan enkripsi standar bank.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Password Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-800 dark:text-white/80 mb-1.5">
                      Password Dokumen <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan password yang kuat"
                        className="w-full rounded-xl bg-gray-100/70 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] px-4 py-3 pr-11 text-sm text-white placeholder:text-gray-300 dark:text-white/20 focus:border-[#e5322d] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40 hover:text-[#1e2022] dark:hover:text-white p-1"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-medium text-gray-800 dark:text-white/80 mb-1.5">
                      Ulangi Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang password di atas"
                      className="w-full rounded-xl bg-gray-100/70 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-gray-300 dark:text-white/20 focus:border-[#e5322d] focus:outline-none"
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-400 mt-1">Konfirmasi password belum cocok.</p>
                    )}
                  </div>

                  {/* AES Key Strength */}
                  <div>
                    <label className="block text-xs font-medium text-gray-800 dark:text-white/80 mb-1.5">
                      Standar Enkripsi
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAesKeyLength('256')}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          aesKeyLength === '256'
                            ? 'border-[#e5322d] bg-red-500/10 text-[#e5322d]'
                            : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] text-gray-600 dark:text-white/60 hover:text-[#1e2022] dark:hover:text-white'
                        }`}
                      >
                        <p className="text-xs font-bold">AES-256 (Direkomendasikan)</p>
                        <p className="text-[11px] text-gray-400 dark:text-white/40 mt-0.5">Enkripsi militer & perbankan</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAesKeyLength('128')}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          aesKeyLength === '128'
                            ? 'border-[#e5322d] bg-red-500/10 text-[#e5322d]'
                            : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] text-gray-600 dark:text-white/60 hover:text-[#1e2022] dark:hover:text-white'
                        }`}
                      >
                        <p className="text-xs font-bold">AES-128</p>
                        <p className="text-[11px] text-gray-400 dark:text-white/40 mt-0.5">Kompatibel semua pembaca PDF</p>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-[#e5322d]">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#e5322d]" />
                  <span>Siapapun yang ingin membaca dokumen harus memasukkan password yang Anda buat.</span>
                </div>
              </div>
            )}

            {/* Unlock PDF: 2 Opsi (Buka Paksa vs Ketik Password) */}
            {tool.id === 'unlock-pdf' && (
              <div className="max-w-xl mx-auto rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] p-6 space-y-5">
                <div className="flex items-center gap-3 border-b border-gray-200 dark:border-white/[0.06] pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-[#e5322d]">
                    <Unlock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Buka Proteksi Dokumen PDF</h4>
                    <p className="text-xs text-gray-500 dark:text-white/50">Hapus kata sandi, enkripsi, dan pembatasan izin dokumen secara permanen.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 dark:text-white/80 mb-2">
                      Pilih Metode Pembukaan Dokumen:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Opsi 1: Buka Paksa (Tanpa Password) */}
                      <button
                        type="button"
                        onClick={() => setUnlockMode('force')}
                        className={`relative rounded-xl border p-4 text-left transition-all ${
                          unlockMode === 'force'
                            ? 'border-[#e5322d] bg-red-500/10 shadow-lg shadow-red-500/10'
                            : 'border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] hover:bg-white/[0.05] hover:border-gray-300 dark:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Zap className={`h-4 w-4 ${unlockMode === 'force' ? 'text-amber-400' : 'text-gray-400 dark:text-white/40'}`} />
                            <span className={`text-xs font-bold ${unlockMode === 'force' ? 'text-white' : 'text-gray-700 dark:text-white/70'}`}>
                              Buka Paksa (Tanpa Password)
                            </span>
                          </div>
                          {unlockMode === 'force' && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#e5322d] text-white">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-white/50 leading-relaxed">
                          Bobol restriksi izin (print, copy teks, edit form) dan bypass proteksi tanpa perlu mengetahui password.
                        </p>
                      </button>

                      {/* Opsi 2: Masukkan Password */}
                      <button
                        type="button"
                        onClick={() => setUnlockMode('password')}
                        className={`relative rounded-xl border p-4 text-left transition-all ${
                          unlockMode === 'password'
                            ? 'border-[#e5322d] bg-red-500/10 shadow-lg shadow-red-500/10'
                            : 'border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] hover:bg-white/[0.05] hover:border-gray-300 dark:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Lock className={`h-4 w-4 ${unlockMode === 'password' ? 'text-[#e5322d]' : 'text-gray-400 dark:text-white/40'}`} />
                            <span className={`text-xs font-bold ${unlockMode === 'password' ? 'text-white' : 'text-gray-700 dark:text-white/70'}`}>
                              Ketik Password Dokumen
                            </span>
                          </div>
                          {unlockMode === 'password' && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#e5322d] text-white">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-white/50 leading-relaxed">
                          Gunakan jika dokumen memiliki Open Password khusus yang Anda ketahui untuk didekripsi permanen.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Mode Buka Paksa Banner */}
                  {unlockMode === 'force' && (
                    <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-amber-500/20 p-4 text-xs text-amber-200/90 leading-relaxed flex items-start gap-3">
                      <Zap className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block mb-0.5">Mode Buka Paksa Siap Dijalankan</strong>
                        <span>
                          Sistem akan membobol proteksi izin (print, copy teks, edit form) dan menghapus enkripsi dokumen PDF tanpa meminta password.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Mode Masukkan Password Input */}
                  {unlockMode === 'password' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-800 dark:text-white/80">
                        Password Dokumen PDF Saat Ini <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showUnlockPassword ? 'text' : 'password'}
                          value={unlockPassword}
                          onChange={(e) => setUnlockPassword(e.target.value)}
                          placeholder="Ketik password dokumen yang benar..."
                          className="w-full rounded-xl bg-gray-100/70 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] px-4 py-3 pr-11 text-sm text-white placeholder:text-gray-300 dark:text-white/20 focus:border-[#e5322d] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40 hover:text-[#1e2022] dark:hover:text-white p-1"
                        >
                          {showUnlockPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      {!unlockPassword.trim() ? (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 mt-1.5 text-xs text-amber-300">
                          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                          <span>Harap ketik password dokumen di atas terlebih dahulu untuk membuka proteksi.</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-emerald-400/80 pt-1 flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5" />
                          <span>Password siap diverifikasi dan dihapus secara bersih dari dokumen.</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Remove Watermark PDF: 2 Mode Pilihan (Ketik Teks vs Bersihkan Otomatis) */}
            {tool.id === 'remove-watermark' && (
              <div className="max-w-xl mx-auto rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] p-6 space-y-5">
                <div className="flex items-center gap-3 border-b border-gray-200 dark:border-white/[0.06] pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-[#e5322d]">
                    <Eraser className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Hapus Watermark dari PDF</h4>
                    <p className="text-xs text-gray-500 dark:text-white/50">Hapus watermark teks miring/lurus, stempel, dan cap draf tanpa merusak teks utama dokumen.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 dark:text-white/80 mb-2">
                      Pilih Mode Penghapusan:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Opsi 1: Ketik Teks Watermark */}
                      <button
                        type="button"
                        onClick={() => setRemoveWatermarkMode('custom')}
                        className={`relative rounded-xl border p-4 text-left transition-all ${
                          removeWatermarkMode === 'custom'
                            ? 'border-[#e5322d] bg-red-500/10 shadow-lg shadow-red-500/10'
                            : 'border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] hover:bg-white/[0.05] hover:border-gray-300 dark:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-bold ${removeWatermarkMode === 'custom' ? 'text-white' : 'text-gray-700 dark:text-white/70'}`}>
                            Ketik Teks Watermark
                          </span>
                          {removeWatermarkMode === 'custom' && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#e5322d] text-white">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-white/50 leading-relaxed">
                          Ketik kata atau teks watermark tertentu yang tercetak pada halaman PDF Anda.
                        </p>
                      </button>

                      {/* Opsi 2: Bersihkan Stempel Otomatis */}
                      <button
                        type="button"
                        onClick={() => setRemoveWatermarkMode('common')}
                        className={`relative rounded-xl border p-4 text-left transition-all ${
                          removeWatermarkMode === 'common'
                            ? 'border-[#e5322d] bg-red-500/10 shadow-lg shadow-red-500/10'
                            : 'border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] hover:bg-white/[0.05] hover:border-gray-300 dark:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-bold ${removeWatermarkMode === 'common' ? 'text-white' : 'text-gray-700 dark:text-white/70'}`}>
                            Bersihkan Watermark Umum
                          </span>
                          {removeWatermarkMode === 'common' && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#e5322d] text-white">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-white/50 leading-relaxed">
                          Deteksi otomatis stempel standar seperti DRAFT, CONFIDENTIAL, SAMPLE, COPY, dan cap tanda air.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Mode Custom: Input Teks + Validasi Notifikasi */}
                  {removeWatermarkMode === 'custom' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-800 dark:text-white/80 mb-1.5">
                          Teks Watermark yang Ingin Dihapus <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={removeWatermarkText}
                          onChange={(e) => setRemoveWatermarkText(e.target.value)}
                          placeholder="Ketik kata watermark di sini (contoh: DRAFT, RAHASIA, NAMA PERUSAHAAN)..."
                          className="w-full rounded-xl bg-gray-100/70 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-gray-300 dark:text-white/20 focus:border-[#e5322d] focus:outline-none"
                        />

                        {/* Validasi / Notifikasi Real-Time Keberadaan Watermark */}
                        {!removeWatermarkText.trim() ? (
                          <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 mt-2 text-xs text-amber-300">
                            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                            <span>
                              <strong>Perhatian:</strong> Silakan ketik kata watermark yang ingin Anda hapus pada kolom di atas terlebih dahulu.
                            </span>
                          </div>
                        ) : watermarkFoundStatus === 'checking' ? (
                          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 mt-2 text-xs text-[#e5322d]">
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#e5322d]" />
                            <span>
                              Memeriksa keberadaan watermark &quot;<strong>{removeWatermarkText}</strong>&quot; di dalam dokumen PDF...
                            </span>
                          </div>
                        ) : watermarkFoundStatus === 'not_found' ? (
                          <div className="flex items-start gap-2.5 rounded-xl bg-red-500/15 border border-red-500/30 p-3.5 mt-2 text-xs text-red-200">
                            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                            <div className="space-y-1">
                              <div className="font-bold text-red-400 flex items-center gap-1.5">
                                <span>❌ Watermark Salah / Tidak Ditemukan</span>
                              </div>
                              <p className="text-white/85 leading-relaxed">
                                Teks &quot;<span className="text-white font-semibold underline decoration-red-400">{removeWatermarkText}</span>&quot; tidak ada di dalam dokumen PDF ini. Tombol proses dinonaktifkan agar tidak merusak dokumen.
                              </p>
                              <p className="text-[11px] text-gray-500 dark:text-white/50">
                                Pastikan ejaan dan huruf sama persis dengan cap watermark di dokumen, atau klik tombol contoh di bawah.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 mt-2 text-xs text-emerald-300">
                            <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                            <span>
                              ✓ Watermark &quot;<strong>{removeWatermarkText}</strong>&quot; ditemukan pada dokumen ({watermarkMatchesCount} lokasi/halaman). Siap dihapus!
                            </span>
                          </div>
                        )}

                        {/* Quick presets */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                          <span className="text-[11px] text-gray-400 dark:text-white/40">Contoh Cepat:</span>
                          {['CONFIDENTIAL', 'DRAFT', 'SAMPLE', 'RAHASIA', 'WATERMARK', 'CONTOH', 'COPY', 'VOID'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setRemoveWatermarkText(t)}
                              className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/5 hover:bg-red-500/15 hover:border-red-500/30 px-2.5 py-1 text-[11px] text-gray-700 dark:text-white/70 hover:text-[#1e2022] dark:hover:text-white transition-colors"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-[#e5322d] leading-relaxed flex items-start gap-3">
                      <Sparkles className="h-4 w-4 text-[#e5322d] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block mb-0.5">Pembersihan Otomatis Aktif</strong>
                        <span>
                          Sistem akan memindai seluruh halaman dokumen untuk mencari stempel umum (DRAFT, SAMPLE, COPY, CONFIDENTIAL, RAHASIA) serta anotasi cap tanda air dan membersihkannya tanpa perlu mengetik teks manual.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PDF to Word: AI OCR & Layout Engine Configuration */}
            {tool.id === 'pdf-to-word' && (
              <div className="rounded-2xl border border-gray-200 dark:border-[#2c2e35] bg-white dark:bg-[#1a1b1f] p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-[#2c2e35] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-[#e5322d]">
                      <ScanText className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-[#1e2022] dark:text-white">
                          Pengenalan Karakter Optik (AI OCR)
                        </h4>
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#e5322d] border border-red-500/20">
                          <Sparkles className="h-3 w-3" />
                          Scan &amp; Foto Didukung
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Mengekstrak tulisan dari PDF hasil scan, foto kamera, maupun dokumen digital ke Word (.docx) agar bisa diketik dan disunting.
                      </p>
                    </div>
                  </div>
                </div>

                {/* OCR Mode Selector Cards */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Pilih Mode Pemindaian
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setOcrMode('auto')}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        ocrMode === 'auto'
                          ? 'border-[#e5322d] bg-red-500/5 dark:bg-red-500/10 text-[#e5322d] shadow-sm'
                          : 'border-gray-200 dark:border-[#2c2e35] bg-gray-50/50 dark:bg-[#1a1b1f] text-gray-600 dark:text-gray-400 hover:border-[#e5322d]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-bold text-sm text-[#1e2022] dark:text-white">Deteksi Otomatis</p>
                        {ocrMode === 'auto' && <Check className="h-4 w-4 text-[#e5322d]" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Cerdas menganalisis: Jika PDF berupa scan/gambar, AI OCR aktif otomatis. Jika teks digital, format dokumen asli dipertahankan.
                      </p>
                      <span className="mt-2.5 inline-block text-[11px] font-semibold text-[#e5322d] bg-red-500/10 px-2 py-0.5 rounded-md">
                        Paling Direkomendasikan
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOcrMode('force')}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        ocrMode === 'force'
                          ? 'border-[#e5322d] bg-red-500/5 dark:bg-red-500/10 text-[#e5322d] shadow-sm'
                          : 'border-gray-200 dark:border-[#2c2e35] bg-gray-50/50 dark:bg-[#1a1b1f] text-gray-600 dark:text-gray-400 hover:border-[#e5322d]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-bold text-sm text-[#1e2022] dark:text-white">Paksa AI OCR Penuh</p>
                        {ocrMode === 'force' && <Check className="h-4 w-4 text-[#e5322d]" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Memindai setiap halaman dengan mesin AI OCR (RapidOCR). Cocok untuk hasil fotokopi, scanner kantor, atau foto berkas cetak.
                      </p>
                      <span className="mt-2.5 inline-block text-[11px] font-semibold text-[#e5322d] bg-red-500/10 px-2 py-0.5 rounded-md">
                        Untuk PDF Scan Penuh
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOcrMode('off')}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        ocrMode === 'off'
                          ? 'border-[#e5322d] bg-red-500/5 dark:bg-red-500/10 text-[#e5322d] shadow-sm'
                          : 'border-gray-200 dark:border-[#2c2e35] bg-gray-50/50 dark:bg-[#1a1b1f] text-gray-600 dark:text-gray-400 hover:border-[#e5322d]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-bold text-sm text-[#1e2022] dark:text-white">Teks Digital Standar</p>
                        {ocrMode === 'off' && <Check className="h-4 w-4 text-[#e5322d]" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Hanya mengekstrak teks digital tanpa pemindaian gambar. Sangat cepat untuk file PDF asli buatan Word/Docs/Canva.
                      </p>
                      <span className="mt-2.5 inline-block text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                        Konversi Cepat
                      </span>
                    </button>
                  </div>
                </div>

                {/* OCR Details & Output Guarantees */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200 dark:border-[#2c2e35] p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <span className="h-2 w-2 rounded-full bg-[#e5322d] animate-pulse" />
                    <span>Dukungan Bahasa OCR:</span>
                    <span className="font-semibold text-[#1e2022] dark:text-white">Bahasa Indonesia, English &amp; Alfabet Latin</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                    <span>Format Hasil: <strong className="text-[#1e2022] dark:text-white">.DOCX</strong> (Word 2016-365)</span>
                    <span>•</span>
                    <span className="text-[#e5322d] font-semibold">Teks Bisa Diketik &amp; Diedit 100%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-[#e5322d]">
                {error}
              </div>
            )}

            {/* Process Action Button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleProcess}
                disabled={
                  (tool.id === 'organize-pdf' && files.length === 0) ||
                  (tool.id === 'split-pdf' && splitMode === 'range' && !splitRanges.trim()) ||
                  (tool.id === 'protect-pdf' && !password.trim()) ||
                  (tool.id === 'watermark-pdf' && watermarkType === 'text' && !watermarkText.trim()) ||
                  (tool.id === 'watermark-pdf' && watermarkType === 'image' && !watermarkImage) ||
                  (tool.id === 'unlock-pdf' && unlockMode === 'password' && !unlockPassword.trim()) ||
                  (tool.id === 'remove-watermark' &&
                    removeWatermarkMode === 'custom' &&
                    (!removeWatermarkText.trim() ||
                      watermarkFoundStatus === 'not_found' ||
                      watermarkFoundStatus === 'checking'))
                }
                className="btn-brand-red flex items-center gap-2.5 px-10 py-3.5 font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Settings2 className="h-5 w-5" />
                {tool.id === 'organize-pdf'
                  ? 'Simpan PDF yang Dirapikan'
                  : tool.id === 'protect-pdf'
                  ? 'Kunci & Proteksi PDF'
                  : tool.id === 'unlock-pdf'
                  ? unlockMode === 'force'
                    ? '⚡ Buka Paksa PDF Ini (Tanpa Password)'
                    : !unlockPassword.trim()
                    ? 'Ketik Password Dokumen Dulu'
                    : 'Buka & Hapus Password PDF'
                  : tool.id === 'watermark-pdf'
                  ? 'Terapkan Watermark'
                  : tool.id === 'remove-watermark'
                  ? removeWatermarkMode === 'custom'
                    ? !removeWatermarkText.trim()
                      ? 'Ketik Teks Watermark Dulu'
                      : watermarkFoundStatus === 'checking'
                      ? 'Memeriksa Watermark di Dokumen...'
                      : watermarkFoundStatus === 'not_found'
                      ? '❌ Watermark Salah / Tidak Ditemukan'
                      : 'Hapus Teks Watermark Terpilih'
                    : 'Bersihkan Watermark Otomatis'
                  : tool.title}
              </button>
            </div>
          </motion.div>
        )}

        {/* ================= STAGE 3: PROCESSING ================= */}
        {stage === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex flex-col items-center justify-center py-20 gap-8"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="h-12 w-12 text-[#e5322d]" />
            </motion.div>

            <div className="w-full max-w-md space-y-3">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Memproses di memori...</span>
                <span className="font-semibold text-[#e5322d]">{Math.round(progress)}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#e5322d]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">
              100% Client-Side • Dokumen Anda aman dan tidak pernah diunggah
            </p>
          </motion.div>
        )}

        {/* ================= STAGE 4: DONE ================= */}
        {stage === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col items-center justify-center py-16 gap-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-[#e5322d]"
            >
              <Check className="h-10 w-10" />
            </motion.div>

            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-[#1e2022] dark:text-white">File Anda Sudah Siap!</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ukuran Hasil: {formatFileSize(resultSize)}
                {files[0] && (
                  <>
                    {' '}
                    • Asli: {formatFileSize(files[0].size)}
                    {(tool.id === 'compress-pdf' || tool.id === 'compress-word') && resultSize < files[0].size && (
                      <span className="text-[#e5322d] font-semibold ml-1">
                        (Hemat {Math.round((1 - resultSize / files[0].size) * 100)}%)
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={handleDownload}
                className="btn-brand-red flex items-center gap-2.5 px-8 py-3.5 font-bold text-base"
              >
                <Download className="h-5 w-5" />
                {result?.type === 'multiple'
                  ? `Unduh ${result.files.length} File`
                  : 'Unduh File'}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#2c2e35] bg-white dark:bg-[#1a1b1f] px-6 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-[#e5322d] hover:text-[#e5322d] transition-all shadow-sm"
              >
                <RotateCcw className="h-4 w-4" />
                Proses File Lain
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
