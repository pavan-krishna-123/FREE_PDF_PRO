import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  RotateCw, 
  Trash2, 
  Sparkles, 
  Sliders, 
  Check, 
  Plus, 
  AlertCircle, 
  Loader2,
  FileCheck,
  Palette,
  FileText,
  Eye,
  ZoomIn,
  SunMedium,
  CheckCircle2
} from 'lucide-react';
import { OperationResult, ScannedPage, ScanFilterMode } from '../../types';
import { NativePdfEngine } from '../../services/pdfEngine';
import { AdminService } from '../../services/adminService';

interface ScannerToolProps {
  onClose: () => void;
  onComplete: (result: OperationResult) => void;
}

const FILTER_OPTIONS: { id: ScanFilterMode; label: string; icon: React.FC<{ className?: string }>; description: string }[] = [
  { id: 'color', label: 'True Color', icon: Palette, description: 'Original full RGB colors without modification' },
  { id: 'magic_color', label: 'Magic Color', icon: Sparkles, description: 'Cleans paper background while preserving full colors' },
  { id: 'document_bw', label: 'B&W Document', icon: FileText, description: 'High-contrast black & white for text documents' },
  { id: 'grayscale', label: 'Grayscale', icon: SunMedium, description: 'Smooth monochrome grayscale' },
  { id: 'contrast', label: 'High Contrast', icon: Sliders, description: 'Binary crisp threshold' },
];

export const ScannerTool: React.FC<ScannerToolProps> = ({
  onClose,
  onComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedPages, setScannedPages] = useState<ScannedPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterMode, setFilterMode] = useState<ScanFilterMode>('color');
  const [previewZoomPage, setPreviewZoomPage] = useState<ScannedPage | null>(null);

  // Initialize camera
  const startCamera = async () => {
    try {
      setErrorMsg('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setStream(mediaStream);
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setHasCameraPermission(false);
      setErrorMsg('Camera access denied or unavailable. You can also upload photos to convert to PDF.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Filter Algorithm Application
  const processImageWithFilter = (
    sourceCanvas: HTMLCanvasElement,
    filter: ScanFilterMode
  ): string => {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return sourceCanvas.toDataURL('image/jpeg', 0.92);

    ctx.drawImage(sourceCanvas, 0, 0);

    if (filter === 'color' || filter === 'normal') {
      // 100% True Full Color - No alteration
      return canvas.toDataURL('image/jpeg', 0.92);
    }

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      if (filter === 'magic_color') {
        // Magic Color: Cleans background paper to crisp white while keeping colorful stamps, inks, and photos
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;

        if (sat < 0.2 && gray > 135) {
          // Neutral bright background -> whiten to clean document paper
          const boost = 1 + ((gray - 135) / 120) * 0.45;
          d[i] = Math.min(255, Math.round(r * boost));
          d[i + 1] = Math.min(255, Math.round(g * boost));
          d[i + 2] = Math.min(255, Math.round(b * boost));
        } else {
          // Color inks, stamps, text -> enhance clarity with slight contrast boost
          const contrastFactor = 1.12;
          d[i] = Math.min(255, Math.max(0, Math.round((r - 128) * contrastFactor + 128)));
          d[i + 1] = Math.min(255, Math.max(0, Math.round((g - 128) * contrastFactor + 128)));
          d[i + 2] = Math.min(255, Math.max(0, Math.round((b - 128) * contrastFactor + 128)));
        }
      } else if (filter === 'grayscale') {
        // Smooth monochrome grayscale
        d[i] = gray;
        d[i + 1] = gray;
        d[i + 2] = gray;
      } else if (filter === 'document_bw' || filter === 'document') {
        // High contrast B&W document scan
        const enhanced = gray > 138 ? Math.min(255, Math.round(gray * 1.35)) : Math.max(0, Math.round(gray * 0.7));
        d[i] = enhanced;
        d[i + 1] = enhanced;
        d[i + 2] = enhanced;
      } else if (filter === 'contrast') {
        // Binary threshold B&W
        const binary = gray > 128 ? 255 : 0;
        d[i] = binary;
        d[i + 1] = binary;
        d[i + 2] = binary;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = video.videoWidth || 1280;
    rawCanvas.height = video.videoHeight || 720;
    const rawCtx = rawCanvas.getContext('2d');
    if (!rawCtx) return;

    // Draw raw video frame
    rawCtx.drawImage(video, 0, 0, rawCanvas.width, rawCanvas.height);
    const originalDataUrl = rawCanvas.toDataURL('image/jpeg', 0.95);

    // Apply selected filter
    const dataUrl = processImageWithFilter(rawCanvas, filterMode);

    const newPage: ScannedPage = {
      id: 'scan_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      dataUrl,
      originalDataUrl,
      rotation: 0,
      filter: filterMode,
      timestamp: Date.now(),
    };

    setScannedPages((prev) => {
      const updated = [...prev, newPage];
      setActivePageIndex(updated.length - 1);
      return updated;
    });

    // Mobile haptic vibration feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(40); } catch {}
    }
  };

  const handleImageUploadFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        if (loadEvt.target?.result) {
          const originalDataUrl = loadEvt.target.result as string;
          const img = new Image();
          img.src = originalDataUrl;
          img.onload = () => {
            const rawCanvas = document.createElement('canvas');
            rawCanvas.width = img.width;
            rawCanvas.height = img.height;
            const ctx = rawCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = processImageWithFilter(rawCanvas, filterMode);
              const newPage: ScannedPage = {
                id: 'scan_upload_' + Date.now() + Math.random().toString(36).slice(2, 6),
                dataUrl,
                originalDataUrl,
                rotation: 0,
                filter: filterMode,
                timestamp: Date.now(),
              };
              setScannedPages((prev) => [...prev, newPage]);
            }
          };
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Change filter on an already captured page
  const handleChangePageFilter = (pageIndex: number, newFilter: ScanFilterMode) => {
    const page = scannedPages[pageIndex];
    if (!page) return;

    const sourceUrl = page.originalDataUrl || page.dataUrl;
    const img = new Image();
    img.src = sourceUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const newFilteredUrl = processImageWithFilter(canvas, newFilter);

        setScannedPages((prev) => {
          const updated = [...prev];
          updated[pageIndex] = {
            ...updated[pageIndex],
            dataUrl: newFilteredUrl,
            filter: newFilter,
          };
          return updated;
        });

        if (previewZoomPage && previewZoomPage.id === page.id) {
          setPreviewZoomPage({
            ...previewZoomPage,
            dataUrl: newFilteredUrl,
            filter: newFilter,
          });
        }
      }
    };
  };

  const handleRotatePage = (index: number) => {
    const page = scannedPages[index];
    if (!page) return;

    const img = new Image();
    img.src = page.dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        const newUrl = canvas.toDataURL('image/jpeg', 0.92);

        setScannedPages((prev) => {
          const updated = [...prev];
          updated[index] = { 
            ...updated[index], 
            dataUrl: newUrl, 
            rotation: (updated[index].rotation + 90) % 360 
          };
          return updated;
        });
      }
    };
  };

  const handleDeletePage = (index: number) => {
    setScannedPages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (activePageIndex >= updated.length) {
        setActivePageIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const handleGeneratePdf = async () => {
    if (scannedPages.length === 0) {
      setErrorMsg('Please capture at least 1 document page.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const imagesData = scannedPages.map((p) => ({ dataUrl: p.dataUrl }));
      const pdfBytes = await NativePdfEngine.imagesToPdf(imagesData);

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      AdminService.logAppAction(
        'SCANNER_PDF_CREATED',
        'scan',
        'SUCCESS',
        pdfBytes.byteLength,
        340,
        `Generated PDF from ${scannedPages.length} scanned camera pages (Filter: ${filterMode})`
      );

      // Stop camera
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      onComplete({
        operationName: 'Camera Document Scan',
        originalFileName: `${scannedPages.length} Scanned Page(s)`,
        resultFileName: `OpenPDF_Scan_${new Date().toISOString().slice(0, 10)}.pdf`,
        originalSize: 0,
        resultSize: pdfBytes.byteLength,
        pageCount: scannedPages.length,
        pdfBytes,
        blobUrl,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setErrorMsg('PDF generation failed: ' + err.message);
      AdminService.logAppAction('SCANNER_PDF_CREATED', 'scan', 'FAILURE', 0, 100, err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in select-none">
      <div className="relative w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl p-5 sm:p-6 space-y-4 overflow-hidden max-h-[95vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>Camera Document Scanner</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Full Color & B&W
                </span>
              </h2>
              <p className="text-xs text-slate-400">Capture documents in vivid True Color or crisp B&W and compile to standard PDF</p>
            </div>
          </div>
          <button
            id="scanner-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main View: Camera Stream + Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-y-auto">
          
          {/* Viewfinder Column */}
          <div className="lg:col-span-7 space-y-3 flex flex-col">
            
            {/* Color Mode Selection Bar */}
            <div className="p-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-1 overflow-x-auto">
              {FILTER_OPTIONS.map((f) => {
                const IconComponent = f.icon;
                const isSelected = filterMode === f.id;
                return (
                  <button
                    key={f.id}
                    id={`scanner-filter-${f.id}-btn`}
                    onClick={() => setFilterMode(f.id)}
                    className={`flex-1 min-w-[70px] inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                    title={f.description}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span className="text-[11px] whitespace-nowrap">{f.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Video Viewfinder Container */}
            <div className="relative w-full flex-1 min-h-[260px] sm:min-h-[320px] bg-black rounded-3xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder guidelines */}
              <div className="absolute inset-5 sm:inset-6 border-2 border-cyan-400/35 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between items-center text-[10px] text-cyan-400 font-mono">
                  <span className="bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
                    Mode: {FILTER_OPTIONS.find(f => f.id === filterMode)?.label}
                  </span>
                  <span className="bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
                    {filterMode === 'color' ? '🎨 100% Full RGB' : filterMode === 'magic_color' ? '✨ Vibrant Color' : '📄 High Contrast'}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[11px] font-mono text-cyan-300 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                    Align document inside frame
                  </span>
                </div>
                <div className="h-2" />
              </div>

              {/* Shutter Capture Button */}
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
                <button
                  id="scanner-shutter-btn"
                  onClick={handleCapture}
                  className="w-16 h-16 rounded-full bg-white hover:bg-cyan-50 text-slate-900 flex items-center justify-center shadow-2xl active:scale-90 transition-transform ring-4 ring-cyan-400/50 cursor-pointer"
                  title="Capture Document Page"
                >
                  <Camera className="w-7 h-7 text-slate-900" />
                </button>
              </div>
            </div>

            {/* Fallback Upload bar */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <label className="cursor-pointer text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1.5 transition-colors">
                <Plus className="w-4 h-4" />
                <span>Upload Photos from Gallery</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUploadFallback}
                  className="hidden"
                />
              </label>
              <span>{scannedPages.length} captured page(s)</span>
            </div>
          </div>

          {/* Scanned Pages Tray Column */}
          <div className="lg:col-span-5 p-4 rounded-3xl bg-slate-800/60 border border-slate-700/60 space-y-3 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                <span>Captured Pages Tray</span>
              </p>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800">
                {scannedPages.length} {scannedPages.length === 1 ? 'Page' : 'Pages'}
              </span>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 min-h-[160px]">
              {scannedPages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500 my-auto">
                  <Camera className="w-8 h-8 text-slate-600" />
                  <p className="text-xs font-medium">No pages captured yet</p>
                  <p className="text-[11px] text-slate-500">Tap the round camera button above or import photos from your device.</p>
                </div>
              ) : (
                scannedPages.map((page, index) => (
                  <div
                    key={page.id}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-700/80 hover:border-slate-600 transition-all flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      
                      {/* Thumbnail with Zoom trigger */}
                      <div 
                        onClick={() => setPreviewZoomPage(page)}
                        className="relative w-12 h-14 bg-slate-950 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center cursor-pointer group shrink-0"
                        title="Click to zoom preview"
                      >
                        <img
                          src={page.dataUrl}
                          alt={`Scan ${index + 1}`}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-200">Page {index + 1}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-800 text-cyan-300">
                            {FILTER_OPTIONS.find(f => f.id === page.filter)?.label || 'Color'}
                          </span>
                        </div>

                        {/* Page Filter Selector Switcher */}
                        <div className="flex items-center gap-1">
                          {(['color', 'magic_color', 'document_bw'] as ScanFilterMode[]).map((modeKey) => (
                            <button
                              key={modeKey}
                              onClick={() => handleChangePageFilter(index, modeKey)}
                              className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
                                page.filter === modeKey
                                  ? 'bg-cyan-500 text-slate-950 font-bold'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {modeKey === 'color' ? 'Color' : modeKey === 'magic_color' ? 'Magic' : 'B&W'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleRotatePage(index)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                        title="Rotate 90° Clockwise"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePage(index)}
                        className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors"
                        title="Remove page"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Page Zoom Preview Modal */}
        {previewZoomPage && (
          <div 
            onClick={() => setPreviewZoomPage(null)}
            className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-xl w-full bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-700 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Scanned Page Preview</h3>
                  <span className="text-xs text-slate-400">({FILTER_OPTIONS.find(f => f.id === previewZoomPage.filter)?.label})</span>
                </div>
                <button
                  onClick={() => setPreviewZoomPage(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="h-96 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center p-2 border border-slate-800">
                <img
                  src={previewZoomPage.dataUrl}
                  alt="Full preview"
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">Filter applied: <strong className="text-cyan-300">{FILTER_OPTIONS.find(f => f.id === previewZoomPage.filter)?.label}</strong></span>
                <button
                  onClick={() => setPreviewZoomPage(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 hidden sm:inline">
            {scannedPages.length} scanned page(s) ready to compile into PDF
          </span>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              id="scanner-compile-pdf-btn"
              onClick={handleGeneratePdf}
              disabled={isProcessing || scannedPages.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compiling PDF...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Compile {scannedPages.length} Page PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

