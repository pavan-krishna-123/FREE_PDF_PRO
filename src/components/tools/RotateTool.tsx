import React, { useState } from 'react';
import { 
  X, 
  RotateCw, 
  RotateCcw, 
  FileText, 
  AlertCircle, 
  Loader2, 
  Check, 
  RefreshCw 
} from 'lucide-react';
import { OperationResult } from '../../types';
import { NativePdfEngine, PageThumbnail } from '../../services/pdfEngine';
import { PrintShareService } from '../../services/printShareService';
import { AdminService } from '../../services/adminService';

interface RotateToolProps {
  onClose: () => void;
  onComplete: (result: OperationResult) => void;
  onGenerateSample?: () => Promise<Uint8Array>;
}

export const RotateTool: React.FC<RotateToolProps> = ({
  onClose,
  onComplete,
}) => {
  const [fileData, setFileData] = useState<{ name: string; bytes: Uint8Array; size: number } | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [rotations, setRotations] = useState<{ [pageIndex: number]: number }>({});
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadPdf = async (bytes: Uint8Array, name: string, size: number) => {
    try {
      setIsLoadingPages(true);
      setErrorMsg('');
      const info = await NativePdfEngine.getPdfInfo(bytes);
      setFileData({ name, bytes, size });
      setPageCount(info.pageCount);
      setRotations({});

      const thumbs = await NativePdfEngine.renderAllThumbnails(bytes);
      setThumbnails(thumbs);
    } catch (err: any) {
      setErrorMsg('Failed to load PDF: ' + err.message);
    } finally {
      setIsLoadingPages(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const bytes = await NativePdfEngine.readFileAsUint8Array(file);
    await loadPdf(bytes, file.name, file.size);
  };

  const rotateSinglePage = (pageIdx: number, deltaAngle: number) => {
    setRotations((prev) => {
      const current = prev[pageIdx] || 0;
      const next = (current + deltaAngle) % 360;
      return { ...prev, [pageIdx]: next };
    });
  };

  const rotateAllPages = (deltaAngle: number) => {
    setRotations((prev) => {
      const updated: { [pageIndex: number]: number } = {};
      for (let i = 0; i < pageCount; i++) {
        const current = prev[i] || 0;
        updated[i] = (current + deltaAngle) % 360;
      }
      return updated;
    });
  };

  const handleApplyRotations = async () => {
    if (!fileData) return;
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const rotatedBytes = await NativePdfEngine.rotatePdf(fileData.bytes, rotations);
      const blob = new Blob([rotatedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      AdminService.logAppAction(
        'PDF_ROTATE',
        'ROTATE',
        'SUCCESS',
        `Rotated pages in ${fileData.name}`
      );

      onComplete({
        operationName: 'PDF Page Rotation',
        originalFileName: fileData.name,
        resultFileName: `OpenPDF_Rotated_${fileData.name}`,
        originalSize: fileData.size,
        resultSize: rotatedBytes.byteLength,
        pageCount: pageCount,
        pdfBytes: rotatedBytes,
        blobUrl,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setErrorMsg('Rotation failed: ' + err.message);
      AdminService.logAppAction('PDF_ROTATE', 'ROTATE', 'FAILURE', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rotate PDF Pages</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Rotate all or individual pages 90°, 180°, or 270°</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!fileData ? (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Select PDF to Rotate</p>
              <p className="text-xs text-slate-400">Fix page orientation with live previews</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md shadow-sky-500/20 active:scale-95 transition-all">
                <span>Browse Document</span>
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
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Global Rotation Actions */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Rotate All Pages:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => rotateAllPages(270)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>90° Left</span>
                </button>
                <button
                  onClick={() => rotateAllPages(90)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-semibold"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>90° Right</span>
                </button>
                <button
                  onClick={() => rotateAllPages(180)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>180° Flip</span>
                </button>
              </div>
            </div>

            {/* Page Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: pageCount }, (_, i) => i).map((pageIdx) => {
                const angle = rotations[pageIdx] || 0;
                const thumb = thumbnails.find((t) => t.pageNumber === pageIdx + 1);

                return (
                  <div
                    key={pageIdx}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-between gap-2 shadow-xs"
                  >
                    <div className="w-full h-32 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center p-2">
                      {thumb ? (
                        <img
                          src={thumb.dataUrl}
                          alt={`Page ${pageIdx + 1}`}
                          style={{ transform: `rotate(${angle}deg)` }}
                          className="max-w-full max-h-full object-contain transition-transform duration-200"
                        />
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">Page {pageIdx + 1}</span>
                      )}
                    </div>

                    <div className="w-full flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        P. {pageIdx + 1} {angle > 0 && <span className="text-sky-500 font-mono">({angle}°)</span>}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => rotateSinglePage(pageIdx, 90)}
                          className="p-1 rounded-lg text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50"
                          title="Rotate 90° CW"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Controls */}
        {fileData && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              id="rotate-submit-btn"
              onClick={handleApplyRotations}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
              <span>Save Rotated PDF</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
