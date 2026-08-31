import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  FileText, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  FileX 
} from 'lucide-react';
import { OperationResult } from '../../types';
import { NativePdfEngine, PageThumbnail } from '../../services/pdfEngine';
import { PrintShareService } from '../../services/printShareService';
import { AdminService } from '../../services/adminService';

interface DeletePagesToolProps {
  onClose: () => void;
  onComplete: (result: OperationResult) => void;
  onGenerateSample?: () => Promise<Uint8Array>;
}

export const DeletePagesTool: React.FC<DeletePagesToolProps> = ({
  onClose,
  onComplete,
}) => {
  const [fileData, setFileData] = useState<{ name: string; bytes: Uint8Array; size: number } | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pagesToDelete, setPagesToDelete] = useState<number[]>([]); // 0-indexed
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadPdf = async (bytes: Uint8Array, name: string, size: number) => {
    try {
      setErrorMsg('');
      const info = await NativePdfEngine.getPdfInfo(bytes);
      setFileData({ name, bytes, size });
      setPageCount(info.pageCount);
      setPagesToDelete([]);

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

  const toggleDelete = (idx: number) => {
    setPagesToDelete((prev) =>
      prev.includes(idx) ? prev.filter((p) => p !== idx) : [...prev, idx]
    );
  };

  const handleDelete = async () => {
    if (!fileData) return;
    if (pagesToDelete.length === 0) {
      setErrorMsg('Please select at least 1 page to delete.');
      return;
    }
    if (pagesToDelete.length === pageCount) {
      setErrorMsg('Cannot delete all pages. At least 1 page must remain.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const cleanedBytes = await NativePdfEngine.deletePages(fileData.bytes, pagesToDelete);
      const blob = new Blob([cleanedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      const remainingCount = pageCount - pagesToDelete.length;

      AdminService.logAppAction(
        'PDF_DELETE_PAGES',
        'DELETE',
        'SUCCESS',
        `Removed ${pagesToDelete.length} pages from ${fileData.name} (${remainingCount} pages kept)`
      );

      onComplete({
        operationName: 'PDF Page Deletion',
        originalFileName: fileData.name,
        resultFileName: `OpenPDF_Cleaned_${fileData.name}`,
        originalSize: fileData.size,
        resultSize: cleanedBytes.byteLength,
        pageCount: remainingCount,
        pdfBytes: cleanedBytes,
        blobUrl,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setErrorMsg('Deletion failed: ' + err.message);
      AdminService.logAppAction('PDF_DELETE_PAGES', 'DELETE', 'FAILURE', err.message);
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
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Delete PDF Pages</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Remove unnecessary, blank, or unwanted pages</p>
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
              <FileX className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Select PDF to Delete Pages</p>
              <p className="text-xs text-slate-400">Click on any page you want to discard</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-500/20 active:scale-95 transition-all">
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
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {pagesToDelete.length} page(s) marked for deletion • {pageCount - pagesToDelete.length} will be kept
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: pageCount }, (_, i) => i).map((idx) => {
                const isMarked = pagesToDelete.includes(idx);
                const thumb = thumbnails.find((t) => t.pageNumber === idx + 1);

                return (
                  <div
                    key={idx}
                    onClick={() => toggleDelete(idx)}
                    className={`p-2.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between items-center relative ${
                      isMarked
                        ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                    }`}
                  >
                    {isMarked && (
                      <div className="absolute top-2 right-2 p-1 rounded-full bg-red-600 text-white z-10 shadow-xs">
                        <Trash2 className="w-3 h-3" />
                      </div>
                    )}

                    <div className="w-full h-32 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center p-1">
                      {thumb ? (
                        <img
                          src={thumb.dataUrl}
                          alt={`Page ${idx + 1}`}
                          className={`max-w-full max-h-full object-contain ${isMarked ? 'opacity-40 grayscale' : ''}`}
                        />
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">Page {idx + 1}</span>
                      )}
                    </div>

                    <div className="w-full mt-2 flex items-center justify-between text-xs px-1">
                      <span className={`font-bold ${isMarked ? 'text-red-600 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                        Page {idx + 1}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {isMarked ? 'Delete' : 'Keep'}
                      </span>
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
              id="delete-pages-submit-btn"
              onClick={handleDelete}
              disabled={isProcessing || pagesToDelete.length === 0 || pagesToDelete.length === pageCount}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Delete {pagesToDelete.length} Pages</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
