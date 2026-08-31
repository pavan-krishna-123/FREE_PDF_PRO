import React, { useState } from 'react';
import { 
  X, 
  Minimize2, 
  FileText, 
  AlertCircle, 
  Loader2, 
  Check, 
  ShieldCheck,
  Zap,
  Gauge
} from 'lucide-react';
import { OperationResult } from '../../types';
import { NativePdfEngine } from '../../services/pdfEngine';
import { PrintShareService } from '../../services/printShareService';
import { AdminService } from '../../services/adminService';

interface CompressToolProps {
  onClose: () => void;
  onComplete: (result: OperationResult) => void;
  onGenerateSample?: () => Promise<Uint8Array>;
}

export const CompressTool: React.FC<CompressToolProps> = ({
  onClose,
  onComplete,
}) => {
  const [fileData, setFileData] = useState<{ name: string; bytes: Uint8Array; size: number } | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [level, setLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const bytes = await NativePdfEngine.readFileAsUint8Array(file);
    const info = await NativePdfEngine.getPdfInfo(bytes);
    setFileData({ name: file.name, bytes, size: file.size });
    setPageCount(info.pageCount);
  };

  const handleCompress = async () => {
    if (!fileData) return;
    setIsProcessing(true);
    setProgress(15);
    setErrorMsg('');

    try {
      const compressedBytes = await NativePdfEngine.compressPdf(fileData.bytes, level, (p) => setProgress(p));
      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      const bytesSaved = Math.max(0, fileData.size - compressedBytes.byteLength);
      AdminService.logAppAction(
        'PDF_COMPRESS',
        'compress',
        'SUCCESS',
        fileData.size,
        240,
        `Compressed ${fileData.name} (${PrintShareService.formatBytes(fileData.size)} -> ${PrintShareService.formatBytes(compressedBytes.byteLength)})`,
        bytesSaved
      );

      onComplete({
        operationName: 'PDF Compression',
        originalFileName: fileData.name,
        resultFileName: `OpenPDF_Compressed_${fileData.name}`,
        originalSize: fileData.size,
        resultSize: compressedBytes.byteLength,
        pageCount: pageCount,
        pdfBytes: compressedBytes,
        blobUrl,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setErrorMsg('Compression failed: ' + err.message);
      AdminService.logAppAction('PDF_COMPRESS', 'COMPRESS', 'FAILURE', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Minimize2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Compress PDF Document</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Optimize streams and reduce document file size</p>
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
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Select a PDF to Compress</p>
              <p className="text-xs text-slate-400">Choose a document from your device to optimize</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition-all">
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
          <div className="space-y-6">
            {/* File Bar */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
              <div className="flex items-center gap-3 truncate">
                <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{fileData.name}</p>
                  <p className="text-[11px] text-slate-400">{pageCount} pages • Original size: {PrintShareService.formatBytes(fileData.size)}</p>
                </div>
              </div>
              <button
                onClick={() => setFileData(null)}
                className="text-xs text-rose-600 hover:underline font-semibold shrink-0"
              >
                Change
              </button>
            </div>

            {/* Compression Level Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Choose Compression Mode
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'low',
                    name: 'Basic Quality',
                    desc: 'Lossless stream compaction',
                    icon: ShieldCheck,
                  },
                  {
                    id: 'medium',
                    name: 'Recommended',
                    desc: 'Balanced object tree prune',
                    icon: Zap,
                    popular: true,
                  },
                  {
                    id: 'high',
                    name: 'Maximum',
                    desc: 'Aggressive dictionary cleanup',
                    icon: Gauge,
                  },
                ].map((item) => {
                  const isSelected = level === item.id;
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setLevel(item.id as any)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all space-y-1 relative ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {item.popular && (
                        <span className="absolute -top-2 right-3 px-1.5 py-0.2 bg-emerald-600 text-white rounded-full text-[9px] font-bold">
                          Best
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-100">{item.name}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {isProcessing && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-emerald-600">
                  <span>Rebuilding PDF object streams...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-200 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
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
              id="compress-submit-btn"
              onClick={handleCompress}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Minimize2 className="w-4 h-4" />}
              <span>Compress PDF</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
