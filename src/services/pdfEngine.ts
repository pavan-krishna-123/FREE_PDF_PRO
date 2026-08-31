import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { pdfjsLib } from './pdfWorkerSetup';
import { PdfCryptoEngine } from './pdfCryptoEngine';

export interface PageThumbnail {
  pageNumber: number; // 1-indexed
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Native PDF Engine - Real local PDF processing with pdf-lib & pdfjs-dist
 */
export class NativePdfEngine {

  /**
   * Cleans and ensures a safe Uint8Array with %PDF- header alignment
   */
  static toSafeUint8Array(data: Uint8Array | ArrayBuffer): Uint8Array {
    let bytes: Uint8Array;
    if (data instanceof Uint8Array) {
      // Create a fresh clone so original buffer is not detached
      bytes = new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    } else {
      bytes = new Uint8Array(data.slice(0));
    }

    // Check for standard %PDF- header
    const pdfHeader = [0x25, 0x50, 0x44, 0x46, 0x2d]; // '%PDF-'
    if (bytes.length >= 5) {
      if (
        bytes[0] === pdfHeader[0] &&
        bytes[1] === pdfHeader[1] &&
        bytes[2] === pdfHeader[2] &&
        bytes[3] === pdfHeader[3] &&
        bytes[4] === pdfHeader[4]
      ) {
        return bytes;
      }
      // Scan up to first 4KB for %PDF- in case of leading whitespace or metadata
      const searchLimit = Math.min(bytes.length - 5, 4096);
      for (let i = 0; i <= searchLimit; i++) {
        if (
          bytes[i] === pdfHeader[0] &&
          bytes[i + 1] === pdfHeader[1] &&
          bytes[i + 2] === pdfHeader[2] &&
          bytes[i + 3] === pdfHeader[3] &&
          bytes[i + 4] === pdfHeader[4]
        ) {
          return bytes.slice(i);
        }
      }
    }
    return bytes;
  }

  /**
   * Safely loads a PDFDocument with pdf-lib handling offsets and encryption flags
   */
  static async loadPdfDoc(pdfBytes: Uint8Array | ArrayBuffer): Promise<PDFDocument> {
    const safeBytes = NativePdfEngine.toSafeUint8Array(pdfBytes);
    try {
      return await PDFDocument.load(safeBytes, { ignoreEncryption: true });
    } catch (primaryError) {
      // Secondary fallback: search for '%PDF' anywhere in header
      const headerIndex = safeBytes.findIndex((b, idx) => b === 0x25 && safeBytes[idx + 1] === 0x50);
      if (headerIndex > 0) {
        return await PDFDocument.load(safeBytes.slice(headerIndex), { ignoreEncryption: true });
      }
      throw primaryError;
    }
  }

  /**
   * Reads a File or Blob into a safe, non-detached Uint8Array
   */
  static async readFileAsUint8Array(file: File | Blob): Promise<Uint8Array> {
    const arrayBuffer = await file.arrayBuffer();
    return NativePdfEngine.toSafeUint8Array(arrayBuffer);
  }

  /**
   * Get basic information about a PDF
   */
  static async getPdfInfo(pdfBytes: Uint8Array | ArrayBuffer): Promise<{ pageCount: number; title?: string }> {
    const pdfDoc = await NativePdfEngine.loadPdfDoc(pdfBytes);
    return {
      pageCount: pdfDoc.getPageCount(),
      title: pdfDoc.getTitle(),
    };
  }

  /**
   * Render a specific page to a Canvas using PDF.js
   */
  static async renderPageToCanvas(
    pdfData: Uint8Array | ArrayBuffer,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale = 1.0,
    password?: string
  ): Promise<{ width: number; height: number }> {
    const safeCopy = NativePdfEngine.toSafeUint8Array(pdfData);
    const loadingTask = pdfjsLib.getDocument({
      data: safeCopy,
      password: password,
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas as any,
    } as any).promise;

    return { width: viewport.width, height: viewport.height };
  }

  /**
   * Render page thumbnail as a data URL for fast grid viewing
   */
  static async renderPageThumbnail(
    pdfData: Uint8Array | ArrayBuffer,
    pageNumber: number,
    maxWidth = 240
  ): Promise<PageThumbnail> {
    const safeCopy = NativePdfEngine.toSafeUint8Array(pdfData);
    const loadingTask = pdfjsLib.getDocument({
      data: safeCopy,
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);
    
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = maxWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context creation failed');

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas: canvas as any,
    } as any).promise;

    return {
      pageNumber,
      dataUrl: canvas.toDataURL('image/jpeg', 0.85),
      width: viewport.width,
      height: viewport.height,
    };
  }

  /**
   * Render all page thumbnails of a PDF
   */
  static async renderAllThumbnails(
    pdfData: Uint8Array | ArrayBuffer,
    onProgress?: (current: number, total: number) => void
  ): Promise<PageThumbnail[]> {
    const safeCopy = NativePdfEngine.toSafeUint8Array(pdfData);
    const loadingTask = pdfjsLib.getDocument({
      data: safeCopy,
    });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    const thumbnails: PageThumbnail[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const scale = 200 / unscaledViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas: canvas as any } as any).promise;
        thumbnails.push({
          pageNumber: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.8),
          width: viewport.width,
          height: viewport.height,
        });
      }
      if (onProgress) onProgress(i, totalPages);
    }

    return thumbnails;
  }

  /**
   * Merge multiple PDFs into one single PDF
   */
  static async mergePdfs(
    pdfBuffers: (Uint8Array | ArrayBuffer)[],
    onProgress?: (progress: number) => void
  ): Promise<Uint8Array> {
    const mergedDoc = await PDFDocument.create();
    const totalDocs = pdfBuffers.length;

    for (let i = 0; i < totalDocs; i++) {
      const srcDoc = await NativePdfEngine.loadPdfDoc(pdfBuffers[i]);
      const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
      if (onProgress) onProgress(Math.round(((i + 1) / totalDocs) * 100));
    }

    return await mergedDoc.save();
  }

  /**
   * Split PDF by extracting selected pages
   */
  static async splitPdf(
    pdfBytes: Uint8Array | ArrayBuffer,
    pageIndices: number[] // 0-indexed
  ): Promise<Uint8Array> {
    const srcDoc = await NativePdfEngine.loadPdfDoc(pdfBytes);
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));
    return await newDoc.save();
  }

  /**
   * Compress PDF by rebuilding document tree, stripping unused objects and optimizing streams
   */
  static async compressPdf(
    pdfBytes: Uint8Array | ArrayBuffer,
    level: 'low' | 'medium' | 'high' = 'medium',
    onProgress?: (percent: number) => void
  ): Promise<Uint8Array> {
    if (onProgress) onProgress(20);
    const srcDoc = await NativePdfEngine.loadPdfDoc(pdfBytes);
    if (onProgress) onProgress(50);
    
    // Create clean new document to drop orphaned objects and reduce overhead
    const compressedDoc = await PDFDocument.create();
    const totalPages = srcDoc.getPageCount();
    const indices = Array.from({ length: totalPages }, (_, i) => i);
    
    const copiedPages = await compressedDoc.copyPages(srcDoc, indices);
    copiedPages.forEach((p) => compressedDoc.addPage(p));
    
    // Set minimal metadata
    compressedDoc.setProducer('OpenPDF Engine');
    compressedDoc.setCreator('OpenPDF Native Android');

    if (onProgress) onProgress(80);
    
    // Save with optimized object streams enabled
    const resultBytes = await compressedDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });
    
    if (onProgress) onProgress(100);
    return resultBytes;
  }

  /**
   * Protect PDF with Password Encryption (AES-256 / RC4, Owner / User Password)
   */
  static async protectPdf(
    pdfBytes: Uint8Array | ArrayBuffer,
    userPassword: string,
    ownerPassword?: string,
    options?: {
      algorithm?: 'AES-256' | 'RC4';
      allowPrinting?: boolean;
      allowModifying?: boolean;
      allowCopying?: boolean;
      allowAnnotating?: boolean;
      allowFillingForms?: boolean;
    }
  ): Promise<Uint8Array> {
    const safeBytes = NativePdfEngine.toSafeUint8Array(pdfBytes);
    
    // First verify and normalize PDF structure with pdf-lib
    const srcDoc = await NativePdfEngine.loadPdfDoc(safeBytes);
    const protectedDoc = await PDFDocument.create();
    const copiedPages = await protectedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((p) => protectedDoc.addPage(p));
    
    // Embed security metadata
    protectedDoc.setTitle(srcDoc.getTitle() || `Document [Protected]`);
    protectedDoc.setSubject(`Protected with OpenPDF Security`);
    protectedDoc.setProducer('OpenPDF Engine');

    const cleanBytes = await protectedDoc.save({ useObjectStreams: false });
    
    // Apply military-grade AES-256 or RC4-128 encryption
    return await PdfCryptoEngine.encryptPdf(cleanBytes, userPassword, ownerPassword, options);
  }

  /**
   * Unlock PDF by decrypting authenticated document and saving an unencrypted copy
   */
  static async unlockPdf(
    pdfBytes: Uint8Array | ArrayBuffer,
    password?: string
  ): Promise<Uint8Array> {
    const safeBytes = NativePdfEngine.toSafeUint8Array(pdfBytes);
    
    if (password && password.length > 0) {
      try {
        const decryptedBytes = await PdfCryptoEngine.decryptPdf(safeBytes, password);
        // Verify it can be loaded cleanly
        const testDoc = await NativePdfEngine.loadPdfDoc(decryptedBytes);
        testDoc.setTitle('Document [Unlocked]');
        return await testDoc.save();
      } catch (err: any) {
        // Fallback to pdf-lib in case it wasn't hard-locked
        try {
          const srcDoc = await NativePdfEngine.loadPdfDoc(safeBytes);
          const unlockedDoc = await PDFDocument.create();
          const copiedPages = await unlockedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
          copiedPages.forEach((p) => unlockedDoc.addPage(p));
          unlockedDoc.setTitle('Document [Unlocked]');
          return await unlockedDoc.save();
        } catch {
          throw err;
        }
      }
    }

    // Attempt standard decryption / unsetting security flags
    const srcDoc = await NativePdfEngine.loadPdfDoc(safeBytes);
    const unlockedDoc = await PDFDocument.create();
    const copiedPages = await unlockedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((p) => unlockedDoc.addPage(p));
    unlockedDoc.setTitle('Document [Unlocked]');
    return await unlockedDoc.save();
  }

  /**
   * Rotate specified pages by degrees (90, 180, 270)
   */
  static async rotatePdf(
    pdfBytes: Uint8Array | ArrayBuffer,
    rotations: { [pageIndex: number]: number } // pageIndex (0-indexed) -> angle (90, 180, 270)
  ): Promise<Uint8Array> {
    const pdfDoc = await NativePdfEngine.loadPdfDoc(pdfBytes);
    const pages = pdfDoc.getPages();

    for (const [indexStr, angle] of Object.entries(rotations)) {
      const idx = parseInt(indexStr, 10);
      if (idx >= 0 && idx < pages.length) {
        const page = pages[idx];
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + angle) % 360));
      }
    }

    return await pdfDoc.save();
  }

  /**
   * Extract selected pages to a new PDF
   */
  static async extractPages(
    pdfBytes: Uint8Array | ArrayBuffer,
    pageIndices: number[] // 0-indexed
  ): Promise<Uint8Array> {
    const srcDoc = await NativePdfEngine.loadPdfDoc(pdfBytes);
    const newDoc = await PDFDocument.create();
    const copied = await newDoc.copyPages(srcDoc, pageIndices);
    copied.forEach((page) => newDoc.addPage(page));
    return await newDoc.save();
  }

  /**
   * Reorder pages in a PDF
   */
  static async reorderPages(
    pdfBytes: Uint8Array | ArrayBuffer,
    newOrder: number[] // 0-indexed array of page indices in new desired order
  ): Promise<Uint8Array> {
    const srcDoc = await NativePdfEngine.loadPdfDoc(pdfBytes);
    const newDoc = await PDFDocument.create();
    const copied = await newDoc.copyPages(srcDoc, newOrder);
    copied.forEach((page) => newDoc.addPage(page));
    return await newDoc.save();
  }

  /**
   * Delete selected pages from a PDF
   */
  static async deletePages(
    pdfBytes: Uint8Array | ArrayBuffer,
    pagesToDelete: number[] // 0-indexed
  ): Promise<Uint8Array> {
    const srcDoc = await NativePdfEngine.loadPdfDoc(pdfBytes);
    const totalPages = srcDoc.getPageCount();
    const toDeleteSet = new Set(pagesToDelete);
    const pagesToKeep = Array.from({ length: totalPages }, (_, i) => i).filter(
      (idx) => !toDeleteSet.has(idx)
    );

    if (pagesToKeep.length === 0) {
      throw new Error('Cannot delete all pages from a PDF.');
    }

    const newDoc = await PDFDocument.create();
    const copied = await newDoc.copyPages(srcDoc, pagesToKeep);
    copied.forEach((page) => newDoc.addPage(page));
    return await newDoc.save();
  }

  /**
   * Apply a drawn signature onto single or multiple target PDF pages
   */
  static async signPdf(
    pdfBytes: Uint8Array | ArrayBuffer,
    targetPageIndices: number | number[], // 0-indexed page index or array of indices
    signatureDataUrl: string,
    position: {
      relativeX: number; // 0 to 1 (from left)
      relativeY: number; // 0 to 1 (from top)
      relativeWidth: number; // 0 to 1 (fraction of page width)
      relativeHeight: number; // fraction of page height
    }
  ): Promise<Uint8Array> {
    const pdfDoc = await NativePdfEngine.loadPdfDoc(pdfBytes);
    const pages = pdfDoc.getPages();
    
    const pageIndexList = Array.isArray(targetPageIndices)
      ? targetPageIndices
      : [targetPageIndices];

    if (pageIndexList.length === 0) {
      throw new Error('At least one target page must be selected for signing.');
    }

    // Convert dataUrl to PNG bytes
    const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const pngImage = await pdfDoc.embedPng(bytes);

    for (const pIdx of pageIndexList) {
      if (pIdx < 0 || pIdx >= pages.length) continue;
      const page = pages[pIdx];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const sigWidth = pageWidth * position.relativeWidth;
      const sigHeight = pageHeight * position.relativeHeight;
      const sigX = pageWidth * position.relativeX;
      // PDF coordinate system origin (0,0) is at bottom-left
      const sigY = pageHeight - (pageHeight * position.relativeY) - sigHeight;

      page.drawImage(pngImage, {
        x: Math.max(0, sigX),
        y: Math.max(0, sigY),
        width: sigWidth,
        height: sigHeight,
      });
    }

    return await pdfDoc.save();
  }

  /**
   * Convert scanned/captured images into a multi-page PDF
   */
  static async imagesToPdf(
    images: { dataUrl: string; width?: number; height?: number }[],
    onProgress?: (progress: number) => void
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const total = images.length;

    for (let i = 0; i < total; i++) {
      const imgItem = images[i];
      const base64Data = imgItem.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let j = 0; j < binaryString.length; j++) {
        bytes[j] = binaryString.charCodeAt(j);
      }

      let embeddedImage;
      if (imgItem.dataUrl.startsWith('data:image/png')) {
        embeddedImage = await pdfDoc.embedPng(bytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(bytes);
      }

      // Standard A4 dimensions: 595.28 x 841.89
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      const imgDims = embeddedImage.scaleToFit(pageWidth - 40, pageHeight - 40);
      const x = (pageWidth - imgDims.width) / 2;
      const y = (pageHeight - imgDims.height) / 2;

      page.drawImage(embeddedImage, {
        x,
        y,
        width: imgDims.width,
        height: imgDims.height,
      });

      if (onProgress) onProgress(Math.round(((i + 1) / total) * 100));
    }

    return await pdfDoc.save();
  }

  /**
   * Generates a rich sample PDF for testing all operations offline
   */
  static async createSamplePdf(title = 'Sample Document', numPages = 3): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (let i = 1; i <= numPages; i++) {
      const page = pdfDoc.addPage([595.28, 841.89]);
      const { width, height } = page.getSize();

      // Header Banner
      page.drawRectangle({
        x: 40,
        y: height - 120,
        width: width - 80,
        height: 60,
        color: rgb(0.92, 0.24, 0.35),
      });

      page.drawText('OpenPDF Document Toolkit', {
        x: 60,
        y: height - 85,
        size: 20,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText(`${title} - Page ${i} of ${numPages}`, {
        x: 60,
        y: height - 105,
        size: 11,
        font: font,
        color: rgb(0.95, 0.95, 0.95),
      });

      // Body Section
      page.drawText(`Section ${i}: Document Content Overview`, {
        x: 40,
        y: height - 160,
        size: 15,
        font: fontBold,
        color: rgb(0.1, 0.15, 0.2),
      });

      const bodyParagraphs = [
        `This sample PDF was generated locally on your device by the OpenPDF native engine.`,
        `Every tool in OpenPDF performs genuine, offline-first manipulation on this document:`,
        `• Merge with other PDFs to combine pages into a unified document`,
        `• Split or extract pages 1, 2, or 3 into independent files`,
        `• Sign pages using the native finger or stylus canvas signature pad`,
        `• Compress file structure to minimize bandwidth and storage size`,
        `• Protect with high-grade password encryption and custom permissions`,
        `• Rotate, reorder, or delete unwanted pages with real-time visual previews.`,
      ];

      let yPos = height - 190;
      for (const para of bodyParagraphs) {
        page.drawText(para, {
          x: 40,
          y: yPos,
          size: 11,
          font: font,
          color: rgb(0.25, 0.3, 0.35),
        });
        yPos -= 22;
      }

      // Visual shape box
      page.drawRectangle({
        x: 40,
        y: yPos - 90,
        width: width - 80,
        height: 70,
        color: rgb(0.95, 0.96, 0.98),
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 1,
      });

      page.drawText(`Page Indicator Badge [ #${i} ]`, {
        x: 60,
        y: yPos - 50,
        size: 12,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.3),
      });

      page.drawText(`Timestamp: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, {
        x: 60,
        y: yPos - 70,
        size: 9,
        font: font,
        color: rgb(0.45, 0.5, 0.55),
      });

      // Footer
      page.drawText(`OpenPDF 100% Native Offline Engine • Page ${i} / ${numPages}`, {
        x: 40,
        y: 40,
        size: 9,
        font: font,
        color: rgb(0.6, 0.65, 0.7),
      });
    }

    return await pdfDoc.save();
  }
}
