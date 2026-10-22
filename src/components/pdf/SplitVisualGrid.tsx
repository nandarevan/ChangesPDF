'use client';

import { useEffect, useState, useRef } from 'react';
import { Check, CheckCircle2, FileText, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SplitVisualGridProps {
  file: File;
  selectedPages: number[]; // 0-based page indices
  onTogglePage: (pageIndex: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectOdd: () => void;
  onSelectEven: () => void;
  onPageCountDetected?: (count: number) => void;
}

export default function SplitVisualGrid({
  file,
  selectedPages,
  onTogglePage,
  onSelectAll,
  onClearAll,
  onSelectOdd,
  onSelectEven,
  onPageCountDetected,
}: SplitVisualGridProps) {
  const [totalPages, setTotalPages] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const isRenderingRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadThumbnails() {
      if (isRenderingRef.current) return;
      isRenderingRef.current = true;
      setLoading(true);

      try {
        const pdfjsLib = await import('pdfjs-dist');
        if (typeof window !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const count = pdf.numPages;

        if (active) {
          setTotalPages(count);
          if (onPageCountDetected) onPageCountDetected(count);
        }

        // Render thumbnails with 1.0 scale for crisp, fast display
        for (let i = 1; i <= count; i++) {
          if (!active) break;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.8 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport, canvas }).promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            if (active) {
              setThumbnails((prev) => ({ ...prev, [i - 1]: dataUrl }));
            }
          }
        }
      } catch (err) {
        console.error('Failed to render split visual thumbnails:', err);
      } finally {
        if (active) setLoading(false);
        isRenderingRef.current = false;
      }
    }

    loadThumbnails();

    return () => {
      active = false;
    };
  }, [file, onPageCountDetected]);

  return (
    <div className="space-y-4">
      {/* Quick Selection Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="flex items-center gap-2 text-xs text-white/70">
          <Layers className="h-4 w-4 text-[#e5322d]" />
          <span>
            {selectedPages.length} dari {totalPages || '...'} halaman dipilih
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs text-white/80 transition-colors"
          >
            Pilih Semua
          </button>
          <button
            type="button"
            onClick={onSelectOdd}
            className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs text-white/80 transition-colors"
          >
            Ganjil (1, 3, 5...)
          </button>
          <button
            type="button"
            onClick={onSelectEven}
            className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs text-white/80 transition-colors"
          >
            Genap (2, 4, 6...)
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="rounded-lg border border-white/10 bg-white/5 hover:bg-red-500/20 hover:text-red-300 px-2.5 py-1 text-xs text-white/60 transition-colors"
          >
            Hapus Pilihan
          </button>
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[460px] overflow-y-auto pr-1">
        {Array.from({ length: totalPages || 1 }, (_, i) => {
          const isSelected = selectedPages.includes(i);
          const thumb = thumbnails[i];

          return (
            <motion.div
              key={i}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTogglePage(i)}
              className={cn(
                'group relative aspect-[3/4] rounded-xl border p-2 cursor-pointer transition-all flex flex-col justify-between overflow-hidden',
                isSelected
                  ? 'border-[#e5322d] bg-[#e5322d]/15 shadow-lg shadow-violet-500/15 ring-2 ring-violet-500/30'
                  : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:border-white/20'
              )}
            >
              {/* Thumbnail Display */}
              <div className="absolute inset-2 flex items-center justify-center overflow-hidden rounded-lg bg-black/20">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={`Halaman ${i + 1}`}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/30 text-xs">
                    <FileText className="h-6 w-6 mb-1 opacity-40 animate-pulse" />
                    <span>Hal {i + 1}</span>
                  </div>
                )}
              </div>

              {/* Selection Checkmark Indicator */}
              <div className="relative z-10 flex items-center justify-between">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    isSelected
                      ? 'bg-[#e5322d] text-white shadow-md shadow-violet-500/40'
                      : 'bg-black/50 text-white/60 border border-white/10'
                  )}
                >
                  {i + 1}
                </span>

                <div
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full border transition-all',
                    isSelected
                      ? 'bg-[#e5322d] border-violet-400 text-white scale-110'
                      : 'border-white/20 bg-black/40 text-transparent group-hover:border-white/40'
                  )}
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              </div>

              {/* Bottom Label */}
              <div className="relative z-10 text-center">
                <span
                  className={cn(
                    'inline-block px-2 py-0.5 rounded text-[10px] font-medium backdrop-blur-md',
                    isSelected
                      ? 'bg-[#e5322d]/40 text-violet-200'
                      : 'bg-black/60 text-white/60'
                  )}
                >
                  Halaman {i + 1}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
