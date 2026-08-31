import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  ListOrdered, 
  FileText, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  ArrowRight,
  GripVertical,
  RotateCcw,
  ArrowLeftRight,
  ZoomIn,
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Hand
} from 'lucide-react';
import { OperationResult } from '../../types';
import { NativePdfEngine, PageThumbnail } from '../../services/pdfEngine';
import { AdminService } from '../../services/adminService';

interface ReorderToolProps {
  onClose: () => void;
  onComplete: (result: OperationResult) => void;
  onGenerateSample?: () => Promise<Uint8Array>;
}

export const ReorderTool: React.FC<ReorderToolProps> = ({
  onClose,
  onComplete,
}) => {
  const [fileData, setFileData] = useState<{ name: string; bytes: Uint8Array; size: number } | null>(null);
  const [pageOrder, setPageOrder] = useState<number[]>([]); // array of 0-indexed original page numbers
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewZoomPage, setPreviewZoomPage] = useState<number | null>(null);

  // Drag and Drop States (Mouse & Touch)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before');

  // Touch Screen Specific States
  const [touchActive, setTouchActive] = useState(false);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const loadPdf = async (bytes: Uint8Array, name: string, size: number) => {
    try {
      setErrorMsg('');
      const info = await NativePdfEngine.getPdfInfo(bytes);
      setFileData({ name, bytes, size });
      const initialOrder = Array.from({ length: info.pageCount }, (_, i) => i);
      setPageOrder(initialOrder);

      const thumbs = await NativePdfEngine.renderAllThumbnails(bytes);
      setThumbnails(thumbs);
    } catch (err: any) {
      setErrorMsg('Failed to load PDF: ' + err.message);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const bytes = await NativePdfEngine.readFileAsUint8Array(file);
    await loadPdf(bytes, file.name, file.size);
  };

  // Reorder Logic
  const reorderSlots = (sourceIndex: number, targetIndex: number, position: 'before' | 'after') => {
    if (sourceIndex === targetIndex) return;

    const newOrder = [...pageOrder];
    const [movedItem] = newOrder.splice(sourceIndex, 1);

    // Calculate insertion index
    let insertAt = targetIndex;
    if (sourceIndex < targetIndex) {
      // If moving forward, splice already decremented downstream indices by 1
      insertAt = position === 'after' ? targetIndex : targetIndex - 1;
    } else {
      insertAt = position === 'after' ? targetIndex + 1 : targetIndex;
    }

    // Clamp insert index
    insertAt = Math.max(0, Math.min(newOrder.length, insertAt));
    newOrder.splice(insertAt, 0, movedItem);

    setPageOrder(newOrder);

    // Trigger subtle haptic feedback if supported on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(25); } catch {}
    }
  };

  const movePage = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= pageOrder.length) return;

    const newOrder = [...pageOrder];
    const item = newOrder.splice(fromIndex, 1)[0];
    newOrder.splice(toIndex, 0, item);
    setPageOrder(newOrder);
  };

  const moveToExtreme = (fromIndex: number, destination: 'start' | 'end') => {
    const newOrder = [...pageOrder];
    const [item] = newOrder.splice(fromIndex, 1);
    if (destination === 'start') {
      newOrder.unshift(item);
    } else {
      newOrder.push(item);
    }
    setPageOrder(newOrder);
  };

  const handleReverseOrder = () => {
    setPageOrder([...pageOrder].reverse());
  };

  const handleResetOrder = () => {
    if (!fileData) return;
    setPageOrder(Array.from({ length: pageOrder.length }, (_, i) => i));
  };

  // ----------------------------------------------------
  // HTML5 Drag and Drop (Mouse / Pointer)
  // ----------------------------------------------------
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex === null) return;

    // Determine whether cursor is in the left or right half of the card
    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const isAfter = e.clientX > midX;

    setDragOverIndex(index);
    setDropPosition(isAfter ? 'after' : 'before');
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null) {
      reorderSlots(draggedIndex, targetIndex, dropPosition);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    isDraggingRef.current = false;
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    isDraggingRef.current = false;
  };

  // ----------------------------------------------------
  // Touch Screen Drag and Drop (Mobile / Tablets)
  // ----------------------------------------------------
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    setDraggedIndex(index);
    setTouchActive(true);
    setTouchPos({ x: touch.clientX, y: touch.clientY });
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchActive || draggedIndex === null) return;
    const touch = e.touches[0];
    setTouchPos({ x: touch.clientX, y: touch.clientY });

    // Auto-scroll container if near top or bottom edge
    if (scrollContainerRef.current) {
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      const edgeThreshold = 60;
      if (touch.clientY < containerRect.top + edgeThreshold) {
        scrollContainerRef.current.scrollTop -= 10;
      } else if (touch.clientY > containerRect.bottom - edgeThreshold) {
        scrollContainerRef.current.scrollTop += 10;
      }
    }

    // Determine which slot element is beneath finger
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const cardElement = element?.closest('[data-slot-index]');

    if (cardElement) {
      const targetSlot = parseInt(cardElement.getAttribute('data-slot-index') || '-1', 10);
      if (targetSlot >= 0 && targetSlot < pageOrder.length) {
        const rect = cardElement.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const isAfter = touch.clientX > midX;

        setDragOverIndex(targetSlot);
        setDropPosition(isAfter ? 'after' : 'before');
      }
    }
  };

  const handleTouchEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null) {
      reorderSlots(draggedIndex, dragOverIndex, dropPosition);
    }
    setTouchActive(false);
    setTouchPos(null);
    setDraggedIndex(null);
    setDragOverIndex(null);
    isDraggingRef.current = false;
  };

  const handleSaveReordered = async () => {
    if (!fileData) return;
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const reorderedBytes = await NativePdfEngine.reorderPages(fileData.bytes, pageOrder);
      const blob = new Blob([reorderedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      AdminService.logAppAction(
        'PDF_REORDER',
        'reorder',
        'SUCCESS',
        fileData.size,
        280,
        `Reordered ${pageOrder.length} pages in ${fileData.name}`
      );

      onComplete({
        operationName: 'PDF Page Reordering',
        originalFileName: fileData.name,
        resultFileName: `OpenPDF_Reordered_${fileData.name}`,
        originalSize: fileData.size,
        resultSize: reorderedBytes.byteLength,
        pageCount: pageOrder.length,
        pdfBytes: reorderedBytes,
        blobUrl,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setErrorMsg('Reordering failed: ' + err.message);
      AdminService.logAppAction('PDF_REORDER', 'reorder', 'FAILURE', fileData.size, 100, err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const draggedThumb = draggedIndex !== null 
    ? thumbnails.find((t) => t.pageNumber === pageOrder[draggedIndex] + 1)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in select-none">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-4 overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Reorder PDF Pages</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
                  <Hand className="w-3 h-3" /> Touch & Drag Enabled
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Drag and drop pages with your finger or mouse to organize their sequence
              </p>
            </div>
          </div>
          <button
            id="reorder-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!fileData ? (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4 my-auto">
            <div className="w-14 h-14 rounded-3xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 mx-auto flex items-center justify-center shadow-inner">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">Select PDF to Reorder Pages</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Upload any multi-page document to freely drag, rearrange, and re-sequence pages.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-600/25 active:scale-95 transition-all">
                <FileText className="w-4 h-4" />
                <span>Choose PDF File</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            
            {/* Toolbar Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs shrink-0">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                <span className="font-bold text-orange-600 dark:text-orange-400">{pageOrder.length} Pages</span>
                <span className="text-slate-400">•</span>
                <span className="truncate max-w-[180px] sm:max-w-xs">{fileData.name}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  id="reorder-reverse-btn"
                  onClick={handleReverseOrder}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all"
                  title="Reverse page sequence"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-orange-500" />
                  <span>Reverse All</span>
                </button>
                <button
                  id="reorder-reset-btn"
                  onClick={handleResetOrder}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all"
                  title="Reset to original PDF page order"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Instruction Tip */}
            <div className="px-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hand className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                <span><strong>Drag any page card</strong> to insert it anywhere. Tap image to zoom.</span>
              </span>
              <span className="hidden sm:inline text-slate-400 font-mono">
                Order: {pageOrder.map(i => i + 1).slice(0, 8).join(' → ')}{pageOrder.length > 8 ? '...' : ''}
              </span>
            </div>

            {/* Draggable Pages Grid Container */}
            <div 
              ref={scrollContainerRef}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className="flex-1 overflow-y-auto p-1.5 space-y-4 touch-pan-y"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {pageOrder.map((origIdx, currentSlot) => {
                  const thumb = thumbnails.find((t) => t.pageNumber === origIdx + 1);
                  const isBeingDragged = draggedIndex === currentSlot;
                  const isDragTarget = dragOverIndex === currentSlot;

                  return (
                    <div
                      key={`page-slot-${origIdx}-${currentSlot}`}
                      data-slot-index={currentSlot}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, currentSlot)}
                      onDragOver={(e) => handleDragOver(e, currentSlot)}
                      onDrop={(e) => handleDrop(e, currentSlot)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(e, currentSlot)}
                      className={`relative group select-none p-3 rounded-2xl transition-all duration-150 flex flex-col justify-between items-center gap-2 cursor-grab active:cursor-grabbing border ${
                        isBeingDragged
                          ? 'opacity-40 scale-95 border-orange-500 bg-orange-500/10 shadow-inner'
                          : isDragTarget
                          ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/40 shadow-lg ring-2 ring-orange-400'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-orange-300 dark:hover:border-orange-700/60 hover:shadow-md'
                      }`}
                    >
                      {/* Insertion Indicator Line */}
                      {isDragTarget && !isBeingDragged && (
                        <div
                          className={`absolute top-0 bottom-0 w-1.5 bg-orange-500 rounded-full z-20 shadow-md ${
                            dropPosition === 'before' ? '-left-1.5' : '-right-1.5'
                          }`}
                        />
                      )}

                      {/* Card Header: Slot Badge & Grip Handle */}
                      <div className="w-full flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500 transition-colors" />
                          <span className="font-bold text-orange-600 dark:text-orange-400 text-[11px]">
                            #{currentSlot + 1}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-300">
                          Orig {origIdx + 1}
                        </span>
                      </div>

                      {/* Thumbnail Container */}
                      <div 
                        onClick={() => setPreviewZoomPage(origIdx + 1)}
                        className="w-full h-32 sm:h-36 bg-slate-100 dark:bg-slate-900/90 rounded-xl overflow-hidden flex items-center justify-center p-1.5 relative group/img cursor-zoom-in"
                        title="Click to preview page"
                      >
                        {thumb ? (
                          <img 
                            src={thumb.dataUrl} 
                            alt={`Page ${origIdx + 1}`} 
                            className="max-w-full max-h-full object-contain shadow-xs rounded pointer-events-none" 
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <FileText className="w-6 h-6" />
                            <span className="text-[10px] font-mono">Page {origIdx + 1}</span>
                          </div>
                        )}

                        {/* Hover Zoom Icon */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                          <ZoomIn className="w-5 h-5 text-white drop-shadow" />
                        </div>
                      </div>

                      {/* Bottom Button Controls for Quick Single-Tap Precision */}
                      <div className="w-full flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveToExtreme(currentSlot, 'start'); }}
                            disabled={currentSlot === 0}
                            className="p-1 rounded-lg text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 transition-colors"
                            title="Move to First Slot"
                          >
                            <ChevronsLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); movePage(currentSlot, 'left'); }}
                            disabled={currentSlot === 0}
                            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 disabled:opacity-20 transition-colors"
                            title="Shift Left"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-[10px] font-semibold text-slate-400">
                          {origIdx + 1}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); movePage(currentSlot, 'right'); }}
                            disabled={currentSlot === pageOrder.length - 1}
                            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 disabled:opacity-20 transition-colors"
                            title="Shift Right"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveToExtreme(currentSlot, 'end'); }}
                            disabled={currentSlot === pageOrder.length - 1}
                            className="p-1 rounded-lg text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 transition-colors"
                            title="Move to Last Slot"
                          >
                            <ChevronsRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Floating Touch Drag Preview Avatar Following Finger */}
        {touchActive && touchPos && draggedIndex !== null && (
          <div
            style={{
              position: 'fixed',
              left: `${touchPos.x - 45}px`,
              top: `${touchPos.y - 65}px`,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
            className="w-24 h-32 rounded-2xl bg-orange-600/90 text-white p-2 shadow-2xl ring-4 ring-orange-400/50 flex flex-col items-center justify-between animate-pulse"
          >
            <div className="w-full flex items-center justify-between text-[10px] font-bold">
              <span>Moving</span>
              <span>P.{pageOrder[draggedIndex] + 1}</span>
            </div>
            {draggedThumb ? (
              <img
                src={draggedThumb.dataUrl}
                alt="Dragging"
                className="max-h-16 object-contain rounded bg-white"
              />
            ) : (
              <FileText className="w-8 h-8" />
            )}
            <span className="text-[10px] font-semibold">Drop anywhere</span>
          </div>
        )}

        {/* Page Zoom Preview Modal */}
        {previewZoomPage !== null && (
          <div 
            onClick={() => setPreviewZoomPage(null)}
            className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-700 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-400" />
                  <span>Original Page {previewZoomPage} Preview</span>
                </h3>
                <button
                  onClick={() => setPreviewZoomPage(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="h-80 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center p-2">
                {thumbnails.find(t => t.pageNumber === previewZoomPage)?.dataUrl ? (
                  <img
                    src={thumbnails.find(t => t.pageNumber === previewZoomPage)?.dataUrl}
                    alt={`Page ${previewZoomPage}`}
                    className="max-h-full max-w-full object-contain rounded"
                  />
                ) : (
                  <span className="text-xs text-slate-500">Preview rendering...</span>
                )}
              </div>

              <button
                onClick={() => setPreviewZoomPage(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}

        {/* Action Controls */}
        {fileData && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              New sequence: <span className="font-bold text-orange-600 dark:text-orange-400">{pageOrder.length} pages configured</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                id="reorder-submit-btn"
                onClick={handleSaveReordered}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compiling New PDF...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Reordered PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

