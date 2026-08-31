import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  FileText, 
  AlertCircle, 
  Loader2, 
  KeyRound, 
  Eye, 
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Shield
} from 'lucide-react';
import { OperationResult } from '../../types';
import { NativePdfEngine } from '../../services/pdfEngine';
import { PrintShareService } from '../../services/printShareService';
import { AdminService } from '../../services/adminService';

interface ProtectToolProps {
  onClose: () => void;
  onComplete: (result: OperationResult) => void;
  onGenerateSample?: () => Promise<Uint8Array>;
}

export const ProtectTool: React.FC<ProtectToolProps> = ({
  onClose,
  onComplete,
}) => {
  const [fileData, setFileData] = useState<{ name: string; bytes: Uint8Array; size: number } | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [algorithm, setAlgorithm] = useState<'AES-256' | 'RC4'>('AES-256');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      setErrorMsg('');
      const bytes = await NativePdfEngine.readFileAsUint8Array(file);
      const info = await NativePdfEngine.getPdfInfo(bytes);
      setFileData({ name: file.name, bytes, size: file.size });
      setPageCount(info.pageCount);
    } catch (err: any) {
      setErrorMsg('Could not read PDF file: ' + err.message);
    }
  };

  const getPasswordStrength = () => {
    if (!password) return { label: 'Empty', score: 0, color: 'bg-slate-300' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { label: 'Weak', score: 1, color: 'bg-rose-500' };
    if (score <= 3) return { label: 'Moderate', score: 2, color: 'bg-amber-500' };
    return { label: 'Strong', score: 3, color: 'bg-emerald-500' };
  };

  const handleProtect = async () => {
    if (!fileData) return;
    if (!password) {
      setErrorMsg('Please enter a document open password.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify confirmation.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const protectedBytes = await NativePdfEngine.protectPdf(
        fileData.bytes, 
        password,
        undefined,
        {
          algorithm,
          allowPrinting: true,
          allowCopying: true,
          allowModifying: false,
          allowAnnotating: false,
          allowFillingForms: true,
        }
      );

      const blob = new Blob([protectedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      AdminService.logAppAction(
        'PDF_PROTECT',
        'protect',
        'SUCCESS',
        fileData.size,
        250,
        `Encrypted ${fileData.name} with ${algorithm} password security`
      );

      onComplete({
        operationName: 'PDF Protection & Encryption',
        originalFileName: fileData.name,
        resultFileName: `Protected_${fileData.name}`,
        originalSize: fileData.size,
        resultSize: protectedBytes.byteLength,
        pageCount: pageCount,
        pdfBytes: protectedBytes,
        blobUrl,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setErrorMsg('Protection failed: ' + err.message);
      AdminService.logAppAction('PDF_PROTECT', 'protect', 'FAILURE', fileData.size, 100, err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const passStrength = getPasswordStrength();
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in select-none">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-4 overflow-hidden max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Protect PDF with Password</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-800">
                  AES-256 Bit
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Encrypt PDF with industry-standard password protection
              </p>
            </div>
          </div>
          <button
            id="protect-close-btn"
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
            <div className="w-14 h-14 rounded-3xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">Select PDF to Encrypt</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Secure contracts, tax forms, medical records, or confidential PDF files with strong password encryption.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-lg shadow-violet-600/25 active:scale-95 transition-all">
                <FileText className="w-4 h-4" />
                <span>Choose Document</span>
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
            {/* File Info Bar */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
              <div className="flex items-center gap-3 truncate">
                <FileText className="w-5 h-5 text-violet-500 shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{fileData.name}</p>
                  <p className="text-[11px] text-slate-400">{pageCount} pages • {PrintShareService.formatBytes(fileData.size)}</p>
                </div>
              </div>
              <button
                onClick={() => setFileData(null)}
                className="text-xs text-violet-600 hover:underline font-bold shrink-0 cursor-pointer"
              >
                Change File
              </button>
            </div>

            {/* Encryption Standard Picker */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Encryption Algorithm</span>
                <span className="text-[10px] text-slate-400">PDF 2.0 Standard</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAlgorithm('AES-256')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    algorithm === 'AES-256'
                      ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-bold">AES-256 (Recommended)</p>
                    <p className={`text-[10px] ${algorithm === 'AES-256' ? 'text-violet-100' : 'text-slate-400'}`}>Highest security standard</p>
                  </div>
                  {algorithm === 'AES-256' && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setAlgorithm('RC4')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    algorithm === 'RC4'
                      ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-bold">RC4 (128-Bit)</p>
                    <p className={`text-[10px] ${algorithm === 'RC4' ? 'text-violet-100' : 'text-slate-400'}`}>Legacy PDF readers</p>
                  </div>
                  {algorithm === 'RC4' && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                </button>
              </div>
            </div>

            {/* Password Inputs */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Document Open Password
                  </label>
                  {password && (
                    <span className="text-[10px] font-semibold text-slate-500">
                      Strength: <strong className="text-violet-600 dark:text-violet-400">{passStrength.label}</strong>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="protect-password-input"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password to lock document"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {password && (
                  <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex gap-1 pt-0.5">
                    <div className={`h-full flex-1 rounded-full ${passStrength.score >= 1 ? passStrength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 rounded-full ${passStrength.score >= 2 ? passStrength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 rounded-full ${passStrength.score >= 3 ? passStrength.color : 'bg-transparent'}`} />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Confirm Password
                  </label>
                  {confirmPassword && (
                    <span className={`text-[10px] font-bold ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {passwordsMatch ? '✓ Passwords Match' : '✗ Passwords Do Not Match'}
                    </span>
                  )}
                </div>
                <input
                  id="protect-confirm-password-input"
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password to verify"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500 ${
                    confirmPassword && !passwordsMatch 
                      ? 'border-rose-400 dark:border-rose-600' 
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
              </div>
            </div>

            {/* Offline Privacy Guarantee */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-900 dark:text-violet-300 text-xs border border-violet-200 dark:border-violet-800/60">
              <ShieldCheck className="w-4 h-4 text-violet-600 shrink-0" />
              <span>100% Offline Cryptography: Encryption runs entirely on your device with no server uploads.</span>
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
              id="protect-submit-btn"
              onClick={handleProtect}
              disabled={isProcessing || !password || !passwordsMatch}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-600/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Encrypting PDF...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Encrypt & Lock PDF</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
