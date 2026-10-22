'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  ZoomIn,
  X,
  Copy,
  ChevronLeft,
  ChevronRight,
  Plus,
  Undo2,
  Layers,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { OrganizePageDefinition } from '@/lib/pdf-engine';

export interface OrganizePageItem extends OrganizePageDefinition {
  id: string;
  originalPageNumber: number; // 1-based in source file
  fileName: string;
}

interface PageGridProps {
  file?: File;
  files?: File[];
  onFilesChanged?: (files: File[]) => void;
  onPagesChanged?: (pages: OrganizePageItem[]) => void;
}

function SortablePage({
  page,
  index,
  totalCount,
  thumbnail,
  onRotate,
  onDelete,
  onZoom,
  onDuplicate,
  onMove,
  multiFile,
}: {
  page: OrganizePageItem;
  index: number;
  totalCount: number;
  thumbnail: string | null;
  onRotate: (id: string, delta: number) => void;
  onDelete: (id: string) => void;
  onZoom: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (index: number, direction: 'left' | 'right') => void;
  multiFile: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative aspect-[3/4] rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] overflow-hidden transition-all select-none shadow-sm',
        isDragging
          ? 'z-50 shadow-2xl shadow-red-500/25 opacity-90 scale-105 border-[#e5322d] ring-2 ring-red-500/40'
          : 'hover:border-white/20 hover:shadow-md'
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      layout
    >
      {/* Drag & Drop Surface */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing z-0"
        {...attributes}
        {...listeners}
      />

      {/* Sequential Page Number Badge (Position in final PDF) */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-lg bg-black/70 backdrop-blur-md px-2 py-1 border border-white/10 shadow-sm pointer-events-none">
        <span className="h-1.5 w-1.5 rounded-full bg-[#e5322d]" />
        <span className="text-xs font-bold text-white tracking-wide">
          #{index + 1}
        </span>
      </div>

      {/* Rotation Indicator Badge */}
      {page.rotation !== 0 && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg bg-[#e5322d]/90 backdrop-blur-md px-2 py-1 text-[11px] font-semibold text-white border border-red-400/30 shadow-sm pointer-events-none">
          <RotateCw className="h-3 w-3" />
          <span>{page.rotation}°</span>
        </div>
      )}

      {/* Thumbnail Display */}
      <div className="absolute inset-2 flex items-center justify-center p-3 pointer-events-none">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Page ${page.originalPageNumber}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow-sm transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${page.rotation}deg)` }}
            draggable={false}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-white/30 text-xs">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#e5322d] border-t-transparent" />
            <span>Memuat...</span>
          </div>
        )}
      </div>

      {/* Bottom Info: Source Page & File */}
      <div className="absolute bottom-2 inset-x-2 z-10 flex items-center justify-between px-2 py-1 rounded-lg bg-black/65 backdrop-blur-md text-[11px] text-white/80 border border-white/10 pointer-events-none">
        <span className="truncate">
          Hal {page.originalPageNumber}
        </span>
        {multiFile && (
          <span className="truncate max-w-[80px] text-[10px] text-[#e5322d]/80 font-mono ml-1">
            {page.fileName}
          </span>
        )}
      </div>

      {/* Hover Controls Overlay */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/55 backdrop-blur-[2px]">
        {/* Top Control Bar */}
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onZoom(page.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-lg bg-white/15 hover:bg-blue-600 p-1.5 text-white shadow-sm transition-colors"
            title="Preview Zoom"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(page.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-lg bg-white/15 hover:bg-red-600 p-1.5 text-white shadow-sm transition-colors"
            title="Hapus Halaman"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Center Main Action: Rotate & Duplicate */}
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRotate(page.id, 90);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 rounded-xl bg-[#e5322d] hover:bg-[#e5322d] px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-colors"
            title="Putar 90° Searah Jarum Jam"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Putar</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(page.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-xl bg-white/20 hover:bg-white/30 p-1.5 text-white shadow-sm transition-colors"
            title="Duplikat Halaman"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Bottom Quick Step Reorder: Move Left / Right */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              onMove(index, 'left');
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-lg bg-white/15 hover:bg-white/30 p-1 text-white disabled:opacity-20 transition-colors"
            title="Geser ke Kiri"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[10px] text-white/50 font-medium">Geser</span>
          <button
            type="button"
            disabled={index === totalCount - 1}
            onClick={(e) => {
              e.stopPropagation();
              onMove(index, 'right');
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-lg bg-white/15 hover:bg-white/30 p-1 text-white disabled:opacity-20 transition-colors"
            title="Geser ke Kanan"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function PageGrid({
  file,
  files: propsFiles,
  onFilesChanged,
  onPagesChanged,
}: PageGridProps) {
  // Normalize file list: propsFiles or [file]
  const initialFiles = propsFiles && propsFiles.length > 0 ? propsFiles : file ? [file] : [];
  const [fileList, setFileList] = useState<File[]>(initialFiles);
  const [pages, setPages] = useState<OrganizePageItem[]>([]);
  const [initialPages, setInitialPages] = useState<OrganizePageItem[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [zoomedPageId, setZoomedPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const addPdfInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filesKey = (propsFiles || (file ? [file] : []))
    .map((f) => `${f.name}-${f.size}-${f.lastModified}`)
    .join('|');

  // Load pages and render thumbnails from fileList
  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      const activeFiles = propsFiles && propsFiles.length > 0 ? propsFiles : file ? [file] : [];
      if (activeFiles.length === 0) return;
      setFileList(activeFiles);
      setLoading(true);

      try {
        const pdfjsLib = await import('pdfjs-dist');
        if (typeof window !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }

        const newPages: OrganizePageItem[] = [];
        const newThumbs: Record<string, string> = {};

        for (let fIdx = 0; fIdx < activeFiles.length; fIdx++) {
          const currentFile = activeFiles[fIdx];
          const arrayBuffer = await currentFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const count = pdf.numPages;

          for (let pIdx = 0; pIdx < count; pIdx++) {
            const pageId = `f${fIdx}-p${pIdx}`;
            newPages.push({
              id: pageId,
              fileIndex: fIdx,
              pageIndex: pIdx,
              rotation: 0,
              originalPageNumber: pIdx + 1,
              fileName: currentFile.name,
            });

            // Render thumbnail
            const thumbKey = `${fIdx}-${pIdx}`;
            const page = await pdf.getPage(pIdx + 1);
            const viewport = page.getViewport({ scale: 0.6 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport, canvas }).promise;
              newThumbs[thumbKey] = canvas.toDataURL('image/jpeg', 0.8);
            }
          }
        }

        if (cancelled) return;
        setThumbnails(newThumbs);
        setPages(newPages);
        setInitialPages(newPages);
        onPagesChanged?.(newPages);
      } catch (err) {
        console.error('Failed to load PDF pages in PageGrid:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [filesKey]);

  // Keep a fresh reference to onPagesChanged to avoid stale callbacks
  const onPagesChangedRef = useRef(onPagesChanged);
  useEffect(() => {
    onPagesChangedRef.current = onPagesChanged;
  }, [onPagesChanged]);

  // Synchronize pages state to parent component whenever pages or loading state updates
  useEffect(() => {
    if (!loading) {
      onPagesChangedRef.current?.(pages);
    }
  }, [pages, loading]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPages((prev) => {
        const oldIndex = prev.findIndex((p) => p.id === active.id);
        const newIndex = prev.findIndex((p) => p.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const handleRotate = useCallback((id: string, delta: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p
      )
    );
  }, []);

  const handleRotateAll = useCallback((delta: number) => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + delta + 360) % 360,
      }))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleDuplicate = useCallback((id: string) => {
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const target = prev[idx];
      const duplicateItem: OrganizePageItem = {
        ...target,
        id: `${target.id}-dup-${Date.now()}`,
      };
      const copy = [...prev];
      copy.splice(idx + 1, 0, duplicateItem);
      return copy;
    });
  }, []);

  const handleMove = useCallback((index: number, direction: 'left' | 'right') => {
    setPages((prev) => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      return arrayMove(prev, index, targetIndex);
    });
  }, []);

  const handleReset = useCallback(() => {
    setPages(initialPages);
  }, [initialPages]);

  const handleAddPdf = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter((f) =>
        f.name.toLowerCase().endsWith('.pdf')
      );
      if (newFiles.length === 0) return;
      const updatedFileList = [...fileList, ...newFiles];
      setFileList(updatedFileList);
      onFilesChanged?.(updatedFileList);
      e.target.value = '';
    }
  }, [fileList, onFilesChanged]);

  const rotatedCount = pages.filter((p) => p.rotation !== 0).length;
  const deletedCount = initialPages.length - pages.length;
  const zoomedPage = pages.find((p) => p.id === zoomedPageId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e5322d] border-t-transparent" />
        <p className="text-sm text-white/50 mt-3 font-medium">
          Mempersiapkan halaman PDF...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Interactive Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        {/* Info badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-lg bg-red-500/15 border border-[#e5322d]/30 px-2.5 py-1 text-violet-200 font-semibold">
            <Layers className="h-3.5 w-3.5" />
            {pages.length} Halaman Aktif
          </span>
          {rotatedCount > 0 && (
            <span className="flex items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 text-amber-200 font-medium">
              <RotateCw className="h-3 w-3" />
              {rotatedCount} Diputar
            </span>
          )}
          {deletedCount > 0 && (
            <span className="flex items-center gap-1 rounded-lg bg-red-500/20 border border-red-500/30 px-2.5 py-1 text-red-200 font-medium">
              <Trash2 className="h-3 w-3" />
              {deletedCount} Dihapus
            </span>
          )}
          <span className="text-white/40 hidden md:inline">• Drag halaman untuk ubah urutan</span>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleRotateAll(-90)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors"
            title="Putar Semua Halaman 90° ke Kiri"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Semua Kiri</span>
          </button>

          <button
            type="button"
            onClick={() => handleRotateAll(90)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors"
            title="Putar Semua Halaman 90° ke Kanan"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Semua Kanan</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-amber-500/20 hover:text-amber-200 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors"
            title="Kembalikan Urutan dan Rotasi ke Asli"
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>

          {/* Add more PDF files input */}
          <input
            type="file"
            ref={addPdfInputRef}
            accept=".pdf,application/pdf"
            multiple
            onChange={handleAddPdf}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => addPdfInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5322d]/30 bg-[#e5322d]/15 hover:bg-[#e5322d]/25 px-3 py-1.5 text-xs font-semibold text-[#e5322d] transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah PDF Lain</span>
          </button>
        </div>
      </div>

      {/* Pages Sortable Grid */}
      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-white/15 bg-white/[0.01] text-center p-6">
          <FileText className="h-10 w-10 text-white/20 mb-3" />
          <p className="text-sm font-semibold text-white/80">
            Semua Halaman Telah Dihapus
          </p>
          <p className="text-xs text-white/40 mt-1 max-w-sm">
            Klik tombol &quot;Reset&quot; di toolbar untuk mengembalikan halaman asli atau klik &quot;Tambah PDF Lain&quot;.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 rounded-xl bg-[#e5322d] hover:bg-[#e5322d] px-4 py-2 text-xs font-semibold text-white transition-colors"
          >
            Kembalikan Halaman
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
              {pages.map((page, index) => {
                const thumbKey = `${page.fileIndex}-${page.pageIndex}`;
                return (
                  <SortablePage
                    key={page.id}
                    page={page}
                    index={index}
                    totalCount={pages.length}
                    thumbnail={thumbnails[thumbKey] || null}
                    onRotate={handleRotate}
                    onDelete={handleDelete}
                    onZoom={(id) => setZoomedPageId(id)}
                    onDuplicate={handleDuplicate}
                    onMove={handleMove}
                    multiFile={fileList.length > 1}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* High-res Zoom Modal */}
      <AnimatePresence>
        {zoomedPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            onClick={() => setZoomedPageId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center justify-center p-4 rounded-3xl bg-zinc-900/90 border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Bar */}
              <div className="w-full flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-white">
                    Preview Halaman #{pages.findIndex((p) => p.id === zoomedPage.id) + 1}
                  </h4>
                  <p className="text-xs text-white/50">
                    Asal: Hal {zoomedPage.originalPageNumber} • {zoomedPage.fileName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRotate(zoomedPage.id, 90)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 hover:bg-[#e5322d] px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    <span>Putar 90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomedPageId(null)}
                    className="rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Main Image */}
              <div className="relative flex items-center justify-center max-h-[70vh] overflow-hidden p-2">
                <img
                  src={thumbnails[`${zoomedPage.fileIndex}-${zoomedPage.pageIndex}`]}
                  alt="Page Zoom"
                  className="max-w-full max-h-[68vh] object-contain rounded-xl shadow-2xl transition-transform duration-300"
                  style={{ transform: `rotate(${zoomedPage.rotation}deg)` }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
