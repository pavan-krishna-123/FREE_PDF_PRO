import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Share2, 
  Download, 
  X, 
  FileCheck, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { OperationResult } from '../types';
import { PrintShareService } from '../services/printShareService';

interface OperationResultModalProps {
  result: OperationResult | null;
  onClose: () => void;
}

export const OperationResultModal: React.FC<OperationResultModalProps> = ({
  result,
  onClose,
}) => {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  if (!result) return null;

  const handleSave = async () => {
    const success = await PrintShareService.savePdf(result.pdfBytes, result.resultFileName);
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    await PrintShareService.sharePdf(result.pdfBytes, result.resultFileName);
    setIsSharing(false);
  };

  const sizeDifference = result.originalSize > 0 
    ? Math.round(((result.resultSize - result.originalSize) / result.originalSize) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden">
        
        {/* Decorative Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-rose-500" />

        {/* Close Button */}
        <button
          id="modal-result-close-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Success State */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Operation Completed Successfully</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {result.operationName}
            </h2>
          </div>
        </div>

        {/* File Information Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs text-slate-400 font-medium">Output Document</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[240px] sm:max-w-xs">
                  {result.resultFileName}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs">
              {PrintShareService.formatBytes(result.resultSize)}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <span className="text-slate-400">Pages: </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{result.pageCount} page(s)</span>
            </div>
            {result.originalSize > 0 && (
              <div>
                <span className="text-slate-400">Size Change: </span>
                <span className={`font-semibold ${sizeDifference <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {sizeDifference > 0 ? `+${sizeDifference}%` : `${sizeDifference}%`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Processed locally in private sandbox. No remote data transmitted.</span>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {/* Save / Download Document */}
          <button
            id="result-save-btn"
            onClick={handleSave}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-98 ${
              savedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>{savedSuccess ? 'Saved to Device!' : 'Save Document'}</span>
          </button>

          {/* Share */}
          <button
            id="result-share-btn"
            onClick={handleShare}
            disabled={isSharing}
            className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors"
          >
            <Share2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Share PDF</span>
          </button>
        </div>

        {/* Done Button */}
        <button
          id="result-done-btn"
          onClick={onClose}
          className="w-full py-2.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          Done & Return to Dashboard
        </button>
      </div>
    </div>
  );
};
