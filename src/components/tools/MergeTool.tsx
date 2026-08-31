import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  FileText, 
  Combine, 
  AlertCircle, 
  Loader2,
  FilePlus2,
  GripVertical
} from 'lucide-react';
import { OperationResult } from '../../types';
import { NativePdfEngine } from '../../services/pdfEngine';
import { PrintShareService } from '../../services/printShareService';
import { AdminService } from '../../services/adminService';

interface MergeToolProps {
  onClose: () => void;
  onComplete: (result: OperationResult) => void;
  onGenerateSample?: () => Promise<Uint8Array>;
}

interface SelectedFileItem {
  id: string;
  file: File | { name: string; size: number; bytes: Uint8Array };
  name: string;
  size: number;
  pageCount: number;
  bytes: Uint8Array;
}

export const MergeTool: React.FC<MergeToolProps> = ({
  onClose,
  onComplete,
}) => {
  const [filesList, setFilesList] = useState<SelectedFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [draggedFileIndex, setDraggedFileIndex] = useState<number | null>(null);
  const [dragOverFileIndex, setDragOverFileIndex] = useState<number | null>(null);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setErrorMsg('');
    const newFiles = Array.from(e.target.files) as File[];

    for (const file of newFiles) {
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        setErrorMsg('Please select valid PDF documents.');
        continue;
      }
      try {
        const bytes = await NativePdfEngine.readFileAsUint8Array(file);
        const info = await NativePdfEngine.getPdfInfo(bytes);
        setFilesList((prev) => [
          ...prev,
          {
            id: 'f_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            file,
            name: file.name,
            size: file.size,
            pageCount: info.pageCount,
            bytes,
          },
        ]);
      } catch (err: any) {
        setErrorMsg(`Failed to read ${file.name}: ${err.message || 'File corrupted'}`);
      }
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === filesList.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...filesList];
    const item = updated.splice(index, 1)[0];
    updated.splice(targetIndex, 0, item);
    setFilesList(updated);
  };

  const handleDragFileStart = (e: React.DragEvent, index: number) => {
    setDraggedFileIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragFileOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverFileIndex(index);
  };

  const handleDropFile = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedFileIndex === null || draggedFileIndex === targetIndex) {
      setDraggedFileIndex(null);
      setDragOverFileIndex(null);
      return;
    }

    const updated = [...filesList];
    const [moved] = updated.splice(draggedFileIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setFilesList(updated);
    setDraggedFileIndex(null);
    setDragOverFileIndex(null);
  };

  const handleRemove = (id: string) => {
    setFilesList((prev) => prev.filter((f) => f.id !== id));
  };

  const handleMerge = async () => {
    if (filesList.length < 2) {
      setErrorMsg('Please add at least 2 PDF documents to merge.');
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setErrorMsg('');

    try {
      const buffers = filesList.map((f) => f.bytes);
      const mergedBytes = await NativePdfEngine.mergePdfs(buffers, (p) => setProgress(p));
      const totalPages = filesList.reduce((acc, f) => acc + f.pageCount, 0);
      const originalTotalSize = filesList.reduce((acc, f) => acc + f.size, 0);

      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      AdminService.logAppAction(
        'PDF_MERGE',
        'merge',
        'SUCCESS',
        originalTotalSize,
        320,
        `Merged ${filesList.length} files (${totalPages} total pages)`
      );

      onComplete({
        operationName: 'PDF Merge',
        originalFileName: `${filesList[0].name} + ${filesList.length - 1} more`,
        resultFileName: `OpenPDF_Merged_${Date.now().toString().slice(-4)}.pdf`,
        originalSize: originalTotalSize,
        resultSize: mergedBytes.byteLength,
        pageCount: totalPages,
        pdfBytes: mergedBytes,
        blobUrl,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setErrorMsg('Merge failed: ' + (err.message || 'Unknown error occurred.'));
      AdminService.logAppAction('PDF_MERGE', 'MERGE', 'FAILURE', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPages = filesList.reduce((acc, f) => acc + f.pageCount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Combine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Merge PDF Documents</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Combine multiple PDFs into a single file</p>
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

        {/* Selected Files List Area */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-[160px] pr-1">
          {filesList.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <FilePlus2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No PDFs selected</p>
                <p className="text-xs text-slate-400">Select multiple PDF files from your device to begin merging</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-500/20 active:scale-95 transition-all">
                  <Plus className="w-4 h-4" />
                  <span>Choose PDF Files</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filesList.map((item, idx) => (
                <div
                  key={item.id}
                  draggable={true}
                  onDragStart={(e) => handleDragFileStart(e, idx)}
                  onDragOver={(e) => handleDragFileOver(e, idx)}
                  onDrop={(e) => handleDropFile(e, idx)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing text-xs gap-3 ${
                    draggedFileIndex === idx
                      ? 'opacity-40 bg-rose-500/10 border-rose-400'
                      : dragOverFileIndex === idx
                      ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-400'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      {idx + 1}
                    </span>
                    <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                    <div className="overflow-hidden">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {item.pageCount} pages • {PrintShareService.formatBytes(item.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === filesList.length - 1}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls */}
        {filesList.length > 0 && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{filesList.length} files selected ({totalPages} total pages)</span>
              <div>
                <label className="cursor-pointer font-semibold text-rose-600 dark:text-rose-400 hover:underline">
                  + Add More PDFs
                  <input
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {isProcessing && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-rose-600">
                  <span>Merging PDF streams...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-rose-600 transition-all duration-200 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                id="merge-submit-btn"
                onClick={handleMerge}
                disabled={isProcessing || filesList.length < 2}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/25 active:scale-95 transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Combine className="w-4 h-4" />}
                <span>Merge {filesList.length} PDFs</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
