import React, { useState } from 'react';
import { 
  X, 
  Unlock, 
  FileText, 
  AlertCircle, 
  Loader2, 
  Key, 
  ShieldAlert,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { OperationResult } from '../../types';
import { NativePdfEngine } from '../../services/pdfEngine';
import { PrintShareService } from '../../services/printShareService';
import { AdminService } from '../../services/adminService';

interface UnlockToolProps {
  onClose: () => void;
  onComplete: (result: OperationResult) => void;
  onGenerateSample?: () => Promise<Uint8Array>;
}

export const UnlockTool: React.FC<UnlockToolProps> = ({
  onClose,
  onComplete,
}) => {
  const [fileData, setFileData] = useState<{ name: string; bytes: Uint8Array; size: number } | null>(null);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      setErrorMsg('');
      const bytes = await NativePdfEngine.readFileAsUint8Array(file);
      setFileData({ name: file.name, bytes, size: file.size });
    } catch (err: any) {
      setErrorMsg('Could not read PDF file: ' + err.message);
    }
  };

  const handleUnlock = async () => {
    if (!fileData) return;
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const unlockedBytes = await NativePdfEngine.unlockPdf(fileData.bytes, password);
      const info = await NativePdfEngine.getPdfInfo(unlockedBytes);
      const blob = new Blob([unlockedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      AdminService.logAppAction(
        'PDF_UNLOCK',
        'unlock',
        'SUCCESS',
        fileData.size,
        220,
        `Removed password protection from ${fileData.name}`
      );

      onComplete({
        operationName: 'PDF Security Removal',
        originalFileName: fileData.name,
        resultFileName: `Unlocked_${fileData.name}`,
        originalSize: fileData.size,
        resultSize: unlockedBytes.byteLength,
        pageCount: info.pageCount,
        pdfBytes: unlockedBytes,
        blobUrl,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to unlock PDF with this password.');
      AdminService.logAppAction('PDF_UNLOCK', 'unlock', 'FAILURE', fileData.size, 100, err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in select-none">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-4 overflow-hidden max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Unlock Protected PDF</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Remove password restriction and export an unlocked copy</p>
            </div>
          </div>
          <button
            id="unlock-close-btn"
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
            <div className="w-14 h-14 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-inner">
              <Key className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">Select Protected PDF</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">Choose a password-protected PDF to decrypt and permanently remove security lock.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 active:scale-95 transition-all">
                <FileText className="w-4 h-4" />
                <span>Select Protected PDF</span>
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
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            {/* File Bar */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
              <div className="flex items-center gap-3 truncate">
                <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{fileData.name}</p>
                  <p className="text-[11px] text-slate-400">{PrintShareService.formatBytes(fileData.size)}</p>
                </div>
              </div>
              <button
                onClick={() => setFileData(null)}
                className="text-xs text-indigo-600 hover:underline font-bold shrink-0 cursor-pointer"
              >
                Change File
              </button>
            </div>

            {/* Password input */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Document Password (if required)
              </label>
              <div className="relative">
                <input
                  id="unlock-password-input"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter PDF password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 text-xs border border-indigo-200 dark:border-indigo-800/60">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Decryption is performed locally in memory to preserve data confidentiality.</span>
            </div>
          </div>
        )}

        {/* Action Controls */}
        {fileData && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              id="unlock-submit-btn"
              onClick={handleUnlock}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Decrypting PDF...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Decrypt & Save Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
