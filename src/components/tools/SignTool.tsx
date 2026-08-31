import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  PenTool, 
  FileText, 
  AlertCircle, 
  Loader2, 
  RotateCcw, 
  Trash2, 
  Move, 
  Check, 
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  Copy,
  Info
} from 'lucide-react';
import { OperationResult, SignatureStroke } from '../../types';
import { NativePdfEngine } from '../../services/pdfEngine';
import { AdminService } from '../../services/adminService';

interface SignToolProps {
  onClose: () => void;
  onComplete: (result: OperationResult) => void;
  onGenerateSample?: () => Promise<Uint8Array>;
}

export const SignTool: React.FC<SignToolProps> = ({
  onClose,
  onComplete,
}) => {
  const [fileData, setFileData] = useState<{ name: string; bytes: Uint8Array; size: number } | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1); // 1-indexed preview
  const [step, setStep] = useState<'draw' | 'place'>('draw');
  
  // Signature Drawing State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<SignatureStroke[]>([]);
  const [strokeColor, setStrokeColor] = useState('#0f172a');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Target Pages Application Mode
  const [pageTargetMode, setPageTargetMode] = useState<'current' | 'all' | 'custom'>('current');
  const [customPagesInput, setCustomPagesInput] = useState('');

  // PDF Preview & Placement State
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sigPosition, setSigPosition] = useState({
    relativeX: 0.55,
    relativeY: 0.78,
    relativeWidth: 0.32,
    relativeHeight: 0.12,
  });

  // Dragging and Dropping the Signature box
  const [isDraggingSig, setIsDraggingSig] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; origRelX: number; origRelY: number }>({
    startX: 0,
    startY: 0,
    origRelX: 0.55,
    origRelY: 0.78,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadPdf = async (bytes: Uint8Array, name: string, size: number) => {
    try {
      const info = await NativePdfEngine.getPdfInfo(bytes);
      setFileData({ name, bytes, size });
      setPageCount(info.pageCount);
      setCurrentPage(1);
      setCustomPagesInput(`1-${info.pageCount}`);
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

  // Canvas Drawing Handlers
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  };

  useEffect(() => {
    if (step === 'draw') {
      redrawCanvas();
    }
  }, [strokes, step]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    setIsDrawing(true);
    const newStroke: SignatureStroke = {
      points: [{ x, y, time: Date.now() }],
      color: strokeColor,
      width: strokeWidth,
    };
    setStrokes((prev) => [...prev, newStroke]);
    setUndoneStrokes([]);
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const lastStroke = { ...prev[prev.length - 1] };
      lastStroke.points = [...lastStroke.points, { x, y, time: Date.now() }];
      return [...prev.slice(0, -1), lastStroke];
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setStrokes((prev) => prev.slice(0, -1));
    setUndoneStrokes((prev) => [...prev, last]);
  };

  const handleClear = () => {
    setStrokes([]);
    setUndoneStrokes([]);
    setSignatureDataUrl(null);
  };

  const handleProceedToPlacement = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) {
      setErrorMsg('Please draw your signature first.');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
    setStep('place');
  };

  // Render PDF page when placing
  useEffect(() => {
    if (step === 'place' && fileData && pdfCanvasRef.current) {
      NativePdfEngine.renderPageToCanvas(
        fileData.bytes,
        currentPage,
        pdfCanvasRef.current,
        1.2
      );
    }
  }, [step, fileData, currentPage]);

  // ----------------------------------------------------
  // Interactive Drag-and-Drop Placement for Signature
  // ----------------------------------------------------
  const handleSignatureDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingSig(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      origRelX: sigPosition.relativeX,
      origRelY: sigPosition.relativeY,
    };
  };

  const handleSignatureDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingSig || !pdfContainerRef.current) return;
    const container = pdfContainerRef.current.getBoundingClientRect();
    if (container.width === 0 || container.height === 0) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - dragStartRef.current.startX;
    const deltaY = clientY - dragStartRef.current.startY;

    const deltaRelX = deltaX / container.width;
    const deltaRelY = deltaY / container.height;

    const newX = Math.max(0, Math.min(1 - sigPosition.relativeWidth, dragStartRef.current.origRelX + deltaRelX));
    const newY = Math.max(0, Math.min(1 - sigPosition.relativeHeight, dragStartRef.current.origRelY + deltaRelY));

    setSigPosition((prev) => ({
      ...prev,
      relativeX: newX,
      relativeY: newY,
    }));
  };

  const handleSignatureDragEnd = () => {
    setIsDraggingSig(false);
  };

  // Direct Click to Position Signature Stamp
  const handlePageClickToPlace = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingSig) return;
    const container = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - container.left;
    const clickY = e.clientY - container.top;

    const relX = Math.max(0, Math.min(1 - sigPosition.relativeWidth, (clickX / container.width) - (sigPosition.relativeWidth / 2)));
    const relY = Math.max(0, Math.min(1 - sigPosition.relativeHeight, (clickY / container.height) - (sigPosition.relativeHeight / 2)));

    setSigPosition((prev) => ({
      ...prev,
      relativeX: relX,
      relativeY: relY,
    }));
  };

  // Parse Target Pages indices (0-indexed)
  const getResolvedPageIndices = (): number[] => {
    if (pageTargetMode === 'current') {
      return [currentPage - 1];
    }
    if (pageTargetMode === 'all') {
      return Array.from({ length: pageCount }, (_, i) => i);
    }
    // Custom range (e.g., "1, 3-5, 8")
    const indices = new Set<number>();
    const parts = customPagesInput.split(',').map((p) => p.trim());
    
    parts.forEach((part) => {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          for (let i = min; i <= max; i++) {
            if (i >= 1 && i <= pageCount) {
              indices.add(i - 1);
            }
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= pageCount) {
          indices.add(num - 1);
        }
      }
    });

    const sorted = Array.from(indices).sort((a, b) => a - b);
    return sorted.length > 0 ? sorted : [currentPage - 1];
  };

  const handleApplySignature = async () => {
    if (!fileData || !signatureDataUrl) return;
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const targetIndices = getResolvedPageIndices();
      if (targetIndices.length === 0) {
        throw new Error('Please specify at least one valid page number to sign.');
      }

      const signedBytes = await NativePdfEngine.signPdf(
        fileData.bytes,
        targetIndices,
        signatureDataUrl,
        sigPosition
      );

      const blob = new Blob([signedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      const pageDesc = 
        pageTargetMode === 'all' 
          ? `all ${pageCount} pages` 
          : pageTargetMode === 'custom' 
          ? `${targetIndices.length} custom pages (${targetIndices.map(i => i + 1).join(', ')})` 
          : `page ${currentPage}`;

      AdminService.logAppAction(
        'PDF_SIGN',
        'sign',
        'SUCCESS',
        fileData.size,
        220,
        `Stamped signature on ${pageDesc} of ${fileData.name}`
      );

      onComplete({
        operationName: 'PDF Digital Signature',
        originalFileName: fileData.name,
        resultFileName: `OpenPDF_Signed_${fileData.name}`,
        originalSize: fileData.size,
        resultSize: signedBytes.byteLength,
        pageCount: pageCount,
        pdfBytes: signedBytes,
        blobUrl,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setErrorMsg('Signing failed: ' + err.message);
      AdminService.logAppAction('PDF_SIGN', 'sign', 'FAILURE', fileData.size, 100, err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const targetIndices = getResolvedPageIndices();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in select-none">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-4 overflow-hidden max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Sign PDF Document</span>
                {step === 'place' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-800">
                    Step 2: Position & Target Pages
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {step === 'draw' 
                  ? 'Draw your signature with mouse, touch, or stylus' 
                  : 'Drag signature anywhere on page and select which pages to apply to'}
              </p>
            </div>
          </div>
          <button
            id="sign-close-btn"
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
            <div className="w-14 h-14 rounded-3xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 mx-auto flex items-center justify-center shadow-inner">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">Select PDF to Sign</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Sign contracts, invoices, agreements, or application forms with full page placement control.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm shadow-lg shadow-pink-600/25 active:scale-95 transition-all">
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
        ) : step === 'draw' ? (
          /* Step 1: Draw Signature */
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-pink-500" />
                <span>Draw Signature Pad</span>
              </p>
              
              <div className="flex items-center gap-2">
                {/* Pen Ink Color choices */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  {[
                    { color: '#0f172a', label: 'Dark Ink' },
                    { color: '#1d4ed8', label: 'Blue Pen' },
                    { color: '#be123c', label: 'Red Ink' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      onClick={() => setStrokeColor(c.color)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        strokeColor === c.color ? 'scale-110 border-pink-500 ring-2 ring-pink-400/40 shadow-xs' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    />
                  ))}
                </div>

                <button
                  onClick={handleUndo}
                  disabled={strokes.length === 0}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  title="Undo stroke"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClear}
                  disabled={strokes.length === 0}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-30 transition-colors"
                  title="Clear pad"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawing Canvas */}
            <div className="relative w-full h-64 sm:h-72 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center cursor-crosshair shadow-inner">
              <canvas
                ref={canvasRef}
                width={800}
                height={360}
                onMouseDown={startDrawing}
                onMouseMove={drawMove}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={drawMove}
                onTouchEnd={stopDrawing}
                className="w-full h-full touch-none"
              />
              {strokes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 space-y-1">
                  <PenTool className="w-8 h-8 opacity-40 animate-bounce" />
                  <span className="text-xs font-medium">Draw your signature with finger, mouse, or stylus</span>
                  <span className="text-[10px] text-slate-400">Smooth line rendering with pressure simulation</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-medium">Document: {fileData.name} ({pageCount} pages)</span>
              <button
                id="sign-proceed-btn"
                onClick={handleProceedToPlacement}
                disabled={strokes.length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-600/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>Proceed to Position on PDF</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Position Signature & Choose Target Pages */
          <div className="space-y-3.5 flex-1 flex flex-col min-h-0 overflow-y-auto pr-1">
            
            {/* Target Page Selection Options (All Pages vs Single Page vs Custom Range) */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-pink-500" />
                  <span>Apply Signature To Which Pages?</span>
                </span>
                <span className="text-[11px] font-bold text-pink-600 dark:text-pink-400">
                  {targetIndices.length} {targetIndices.length === 1 ? 'Page' : 'Pages'} Selected
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  id="sign-target-current-btn"
                  onClick={() => setPageTargetMode('current')}
                  className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    pageTargetMode === 'current'
                      ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-600/20 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-pink-300'
                  }`}
                >
                  <span>Current Page Only</span>
                  <span className={`text-[10px] ${pageTargetMode === 'current' ? 'text-pink-100' : 'text-slate-400'}`}>
                    Page #{currentPage}
                  </span>
                </button>

                <button
                  type="button"
                  id="sign-target-all-btn"
                  onClick={() => setPageTargetMode('all')}
                  className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    pageTargetMode === 'all'
                      ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-600/20 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-pink-300'
                  }`}
                >
                  <span>All Pages</span>
                  <span className={`text-[10px] ${pageTargetMode === 'all' ? 'text-pink-100' : 'text-slate-400'}`}>
                    Pages 1 through {pageCount}
                  </span>
                </button>

                <button
                  type="button"
                  id="sign-target-custom-btn"
                  onClick={() => setPageTargetMode('custom')}
                  className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    pageTargetMode === 'custom'
                      ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-600/20 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-pink-300'
                  }`}
                >
                  <span>Custom Pages</span>
                  <span className={`text-[10px] ${pageTargetMode === 'custom' ? 'text-pink-100' : 'text-slate-400'}`}>
                    e.g. 1, 3, 5-8
                  </span>
                </button>
              </div>

              {/* Custom Page Range Input Box */}
              {pageTargetMode === 'custom' && (
                <div className="pt-1 flex items-center gap-2 animate-in fade-in">
                  <span className="text-[11px] text-slate-500 font-medium shrink-0">Enter Pages:</span>
                  <input
                    type="text"
                    value={customPagesInput}
                    onChange={(e) => setCustomPagesInput(e.target.value)}
                    placeholder={`e.g. 1, 2, 4-${pageCount}`}
                    className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-pink-500 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Preview Navigation & Quick Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                  title="Previous Preview Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold px-1.5 text-slate-700 dark:text-slate-200">
                  Previewing Page {currentPage} / {pageCount}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage === pageCount}
                  className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                  title="Next Preview Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Signature Size Scale Controls */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Stamp Size:</span>
                <button
                  type="button"
                  onClick={() => setSigPosition(p => ({ ...p, relativeWidth: Math.max(0.18, p.relativeWidth - 0.05), relativeHeight: Math.max(0.06, p.relativeHeight - 0.02) }))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
                  title="Make Signature Smaller"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSigPosition(p => ({ ...p, relativeWidth: Math.min(0.6, p.relativeWidth + 0.05), relativeHeight: Math.min(0.25, p.relativeHeight + 0.02) }))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
                  title="Make Signature Larger"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setStep('draw')}
                  className="px-2.5 py-1 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Redraw
                </button>
              </div>
            </div>

            {/* Interactive Preview Canvas with Drag-and-Drop Signature Stamp */}
            <div 
              onMouseMove={handleSignatureDragMove}
              onMouseUp={handleSignatureDragEnd}
              onTouchMove={handleSignatureDragMove}
              onTouchEnd={handleSignatureDragEnd}
              className="relative w-full rounded-3xl bg-slate-100 dark:bg-slate-950 p-4 flex items-center justify-center overflow-hidden min-h-[300px] sm:min-h-[360px] border border-slate-200 dark:border-slate-800"
            >
              <div 
                ref={pdfContainerRef}
                onClick={handlePageClickToPlace}
                className="relative shadow-2xl border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white max-w-full cursor-crosshair group/page"
              >
                <canvas ref={pdfCanvasRef} className="max-w-full block pointer-events-none" />
                
                {/* Floating Movable Signature Stamp Box */}
                {signatureDataUrl && (
                  <div
                    onMouseDown={handleSignatureDragStart}
                    onTouchStart={handleSignatureDragStart}
                    style={{
                      position: 'absolute',
                      left: `${sigPosition.relativeX * 100}%`,
                      top: `${sigPosition.relativeY * 100}%`,
                      width: `${sigPosition.relativeWidth * 100}%`,
                      height: `${sigPosition.relativeHeight * 100}%`,
                    }}
                    className={`border-2 border-pink-500 bg-pink-500/15 rounded-xl cursor-grab active:cursor-grabbing flex items-center justify-center select-none shadow-lg transition-shadow duration-75 ${
                      isDraggingSig ? 'ring-4 ring-pink-400/50 shadow-2xl scale-105 opacity-90' : 'hover:bg-pink-500/20'
                    }`}
                  >
                    <img
                      src={signatureDataUrl}
                      alt="Signature Stamp"
                      className="w-full h-full object-contain pointer-events-none"
                    />
                    <div className="absolute -top-3 -right-3 p-1 rounded-full bg-pink-600 text-white text-[9px] font-bold shadow-md">
                      <Move className="w-3.5 h-3.5" />
                    </div>
                    <div className="absolute -bottom-2.5 left-2 px-1.5 py-0.2 rounded bg-pink-700 text-white text-[9px] font-bold uppercase tracking-wider shadow-xs">
                      Drag to Place
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Placement Presets */}
            <div className="flex flex-wrap items-center justify-between text-xs gap-2 shrink-0">
              <span className="text-slate-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                <span>Tip: Drag box with mouse/finger or click anywhere on page</span>
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setSigPosition(p => ({ ...p, relativeX: 0.08, relativeY: 0.8 }))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Bottom Left
                </button>
                <button
                  type="button"
                  onClick={() => setSigPosition(p => ({ ...p, relativeX: 0.58, relativeY: 0.8 }))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Bottom Right
                </button>
                <button
                  type="button"
                  onClick={() => setSigPosition(p => ({ ...p, relativeX: 0.34, relativeY: 0.45 }))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Center
                </button>
              </div>
            </div>

            {/* Final Action Bar */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Signing: <strong className="text-pink-600 dark:text-pink-400">{targetIndices.length} page(s)</strong> ({pageTargetMode === 'all' ? 'All Pages' : pageTargetMode === 'custom' ? `Pages: ${targetIndices.map(i => i + 1).join(', ')}` : `Page ${currentPage}`})
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('draw')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Back to Draw
                </button>
                <button
                  id="sign-apply-btn"
                  onClick={handleApplySignature}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-600/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Embedding Signature...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Apply Signature to {targetIndices.length} Page{targetIndices.length === 1 ? '' : 's'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

