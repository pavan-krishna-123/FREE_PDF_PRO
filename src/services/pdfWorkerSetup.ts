import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using CDN fallback with version matching
try {
  const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
} catch (e) {
  console.warn('PDF.js worker setup fallback:', e);
}

export { pdfjsLib };
