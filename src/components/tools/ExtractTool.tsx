import React, { useState } from 'react';
import { 
  X, 
  FileOutput, 
  FileText, 
  AlertCircle, 
  Loader2, 
  CheckSquare, 
  Square 
} from 'lucide-react';
import { OperationResult } from '../../types';
import { NativePdfEngine, PageThumbnail } from '../../services/pdfEngine';
import { PrintShareService } from '../../services/printShareService';
import { AdminService } from '../../services/adminService';

interface ExtractToolProps {
  onClose: () => void;
  onComplete: (result: OperationResult) => void;
  onGenerateSample?: () => Promise<Uint8Array>;
}

export const ExtractTool: React.FC<ExtractToolProps> = ({
  onClose,
  onComplete,
}) => {
  const [fileData, setFileData] = useState<{ name: string; bytes: Uint8Array; size: number } | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]); // 1-indexed
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
      setSelectedPages([1]);

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

  const togglePage = (pageNum: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  const handleExtract = async () => {
    if (!fileData || selectedPages.length === 0) {
      setErrorMsg('Please select at least 1 page to extract.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const indices = selectedPages.map((p) => p - 1);
      const extractedBytes = await NativePdfEngine.extractPages(fileData.bytes, indices);
      const blob = new Blob([extractedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      AdminService.logAppAction(
        'PDF_EXTRACT',
        'EXTRACT',
        'SUCCESS',
        `Extracted ${selectedPages.length} pages from ${fileData.name}`
      );

      onComplete({
        operationName: 'PDF Page Extraction',
        originalFileName: fileData.name,
        resultFileName: `OpenPDF_Extracted_${fileData.name}`,
        originalSize: fileData.size,
        resultSize: extractedBytes.byteLength,
        pageCount: selectedPages.length,
        pdfBytes: extractedBytes,
        blobUrl,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setErrorMsg('Extraction failed: ' + err.message);
      AdminService.logAppAction('PDF_EXTRACT', 'EXTRACT', 'FAILURE', err.message);
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
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <FileOutput className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Extract Specific Pages</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Select pages to create a standalone new PDF</p>
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
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Select PDF to Extract Pages</p>
              <p className="text-xs text-slate-400">Pick pages visually from a thumbnail gallery</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-500/20 active:scale-95 transition-all">
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
                {selectedPages.length} of {pageCount} pages selected
              </span>
              <button
                onClick={() => {
                  if (selectedPages.length === pageCount) setSelectedPages([]);
                  else setSelectedPages(Array.from({ length: pageCount }, (_, i) => i + 1));
                }}
                className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline"
              >
                {selectedPages.length === pageCount ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Thumbnail Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((pNum) => {
                const isSelected = selectedPages.includes(pNum);
                const thumb = thumbnails.find((t) => t.pageNumber === pNum);
                return (
                  <div
                    key={pNum}
                    onClick={() => togglePage(pNum)}
                    className={`p-2.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between items-center ${
                      isSelected
                        ? 'border-teal-500 bg-teal-500/10 shadow-sm ring-1 ring-teal-500/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-full h-32 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
                      {thumb ? (
                        <img src={thumb.dataUrl} alt={`Page ${pNum}`} className="max-w-full max-h-full object-contain" />
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">Page {pNum}</span>
                      )}
                    </div>
                    <div className="w-full mt-2 flex items-center justify-between text-xs px-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Page {pNum}</span>
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-teal-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
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
              id="extract-submit-btn"
              onClick={handleExtract}
              disabled={isProcessing || selectedPages.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileOutput className="w-4 h-4" />}
              <span>Extract {selectedPages.length} Pages</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
