import React, { useState, useEffect } from 'react';
import { 
  X, 
  Scissors, 
  FileText, 
  AlertCircle, 
  Loader2, 
  CheckSquare, 
  Square,
  Sparkles
} from 'lucide-react';
import { OperationResult } from '../../types';
import { NativePdfEngine, PageThumbnail } from '../../services/pdfEngine';
import { PrintShareService } from '../../services/printShareService';
import { AdminService } from '../../services/adminService';

interface SplitToolProps {
  onClose: () => void;
  onComplete: (result: OperationResult) => void;
  onGenerateSample?: () => Promise<Uint8Array>;
}

export const SplitTool: React.FC<SplitToolProps> = ({
  onClose,
  onComplete,
}) => {
  const [fileData, setFileData] = useState<{ name: string; bytes: Uint8Array; size: number } | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]); // 1-indexed for user
  const [rangeInput, setRangeInput] = useState('');
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadPdf = async (bytes: Uint8Array, name: string, size: number) => {
    try {
      setErrorMsg('');
      setIsLoadingPages(true);
      const info = await NativePdfEngine.getPdfInfo(bytes);
      setFileData({ name, bytes, size });
      setPageCount(info.pageCount);
      // default select first page
      setSelectedPages([1]);
      setRangeInput('1');

      // load thumbnails in background
      const thumbs = await NativePdfEngine.renderAllThumbnails(bytes);
      setThumbnails(thumbs);
    } catch (err: any) {
      setErrorMsg('Failed to read PDF: ' + err.message);
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

  const togglePage = (pageNum: number) => {
    const next = selectedPages.includes(pageNum)
      ? selectedPages.filter((p) => p !== pageNum)
      : [...selectedPages, pageNum].sort((a, b) => a - b);
    setSelectedPages(next);
    setRangeInput(next.join(', '));
  };

  const handleSelectAll = () => {
    if (selectedPages.length === pageCount) {
      setSelectedPages([]);
      setRangeInput('');
    } else {
      const all = Array.from({ length: pageCount }, (_, i) => i + 1);
      setSelectedPages(all);
      setRangeInput(`1-${pageCount}`);
    }
  };

  const handleRangeInputChange = (val: string) => {
    setRangeInput(val);
    try {
      const pagesSet = new Set<number>();
      const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        if (part.includes('-')) {
          const [startStr, endStr] = part.split('-').map((s) => s.trim());
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (!isNaN(start) && !isNaN(end)) {
            for (let p = Math.min(start, end); p <= Math.max(start, end); p++) {
              if (p >= 1 && p <= pageCount) pagesSet.add(p);
            }
          }
        } else {
          const p = parseInt(part, 10);
          if (!isNaN(p) && p >= 1 && p <= pageCount) {
            pagesSet.add(p);
          }
        }
      }
      setSelectedPages(Array.from(pagesSet).sort((a, b) => a - b));
    } catch {
      // ignore parsing during typing
    }
  };

  const handleSplit = async () => {
    if (!fileData || selectedPages.length === 0) {
      setErrorMsg('Please select at least 1 page to extract.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      // 0-indexed indices
      const indices = selectedPages.map((p) => p - 1);
      const splitBytes = await NativePdfEngine.splitPdf(fileData.bytes, indices);

      const blob = new Blob([splitBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      AdminService.logAppAction(
        'PDF_SPLIT',
        'SPLIT',
        'SUCCESS',
        `Extracted ${selectedPages.length} pages from ${fileData.name}`
      );

      onComplete({
        operationName: 'PDF Split & Extract',
        originalFileName: fileData.name,
        resultFileName: `OpenPDF_Split_${fileData.name.replace('.pdf', '')}_pages_${selectedPages.join('_')}.pdf`,
        originalSize: fileData.size,
        resultSize: splitBytes.byteLength,
        pageCount: selectedPages.length,
        pdfBytes: splitBytes,
        blobUrl,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setErrorMsg('Split operation failed: ' + err.message);
      AdminService.logAppAction('PDF_SPLIT', 'SPLIT', 'FAILURE', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Split / Extract PDF Pages</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Extract specific pages or page ranges into a separate PDF</p>
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
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Select a PDF to Split</p>
              <p className="text-xs text-slate-400">Choose a multi-page PDF document to view and extract pages</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-500/20 active:scale-95 transition-all">
                <span>Browse PDF</span>
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
            {/* File info bar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{fileData.name}</span>
                <span className="text-slate-400 font-mono">({pageCount} pages, {PrintShareService.formatBytes(fileData.size)})</span>
              </div>
              <button
                onClick={() => setFileData(null)}
                className="text-xs text-rose-600 hover:underline font-semibold shrink-0"
              >
                Change File
              </button>
            </div>

            {/* Range Input & Select All */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20">
              <div className="flex-1 w-full space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Page Range / Numbers</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1-2, 4"
                  value={rangeInput}
                  onChange={(e) => handleRangeInputChange(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
              <button
                onClick={handleSelectAll}
                className="w-full sm:w-auto mt-auto px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {selectedPages.length === pageCount ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Visual Page Thumbnails Grid */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Click pages to toggle ({selectedPages.length} of {pageCount} selected):
              </p>
              {isLoadingPages ? (
                <div className="flex items-center justify-center py-12 gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rendering page previews...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((pNum) => {
                    const isSelected = selectedPages.includes(pNum);
                    const thumb = thumbnails.find((t) => t.pageNumber === pNum);
                    return (
                      <div
                        key={pNum}
                        onClick={() => togglePage(pNum)}
                        className={`relative rounded-2xl border-2 p-2 cursor-pointer transition-all duration-150 flex flex-col items-center justify-between ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 shadow-md ring-2 ring-amber-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="w-full h-32 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
                          {thumb ? (
                            <img
                              src={thumb.dataUrl}
                              alt={`Page ${pNum}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">Page {pNum}</span>
                          )}
                        </div>

                        <div className="w-full mt-2 flex items-center justify-between text-xs px-1">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Page {pNum}</span>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-600 fill-amber-500/20" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Controls */}
        {fileData && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {selectedPages.length} pages will be extracted
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                id="split-submit-btn"
                onClick={handleSplit}
                disabled={isProcessing || selectedPages.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/25 active:scale-95 transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                <span>Extract {selectedPages.length} Pages</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
