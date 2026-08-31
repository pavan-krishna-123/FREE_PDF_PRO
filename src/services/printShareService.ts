/**
 * Print, Share, and Storage utilities
 */
export class PrintShareService {

  /**
   * Save / Download PDF bytes locally using Native File System Access (SAF equivalent) or Blob fallback
   */
  static async savePdf(pdfBytes: Uint8Array, fileName: string): Promise<boolean> {
    try {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      // If modern File System Access API (like SAF Save Document) is supported
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: 'PDF Document',
                accept: { 'application/pdf': ['.pdf'] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return true;
        } catch (pickerErr: any) {
          if (pickerErr.name === 'AbortError') {
            return false; // User cancelled
          }
        }
      }

      // Standard browser download fallback
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    } catch (err) {
      console.error('Failed to save file:', err);
      return false;
    }
  }

  /**
   * Share PDF using native Share Sheet
   */
  static async sharePdf(pdfBytes: Uint8Array, fileName: string): Promise<boolean> {
    try {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
          text: `Shared via OpenPDF`,
        });
        return true;
      } else if (navigator.share) {
        await navigator.share({
          title: fileName,
          text: `OpenPDF document: ${fileName}`,
        });
        return true;
      } else {
        // Fallback: trigger download
        await this.savePdf(pdfBytes, fileName);
        return true;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
      console.warn('Share error fallback:', err);
      await this.savePdf(pdfBytes, fileName);
      return false;
    }
  }

  /**
   * Print PDF using native browser print manager
   */
  static printPdf(pdfBytes: Uint8Array): void {
    try {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      // Create an invisible iframe for direct printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;

      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Direct iframe print failed, opening in new tab:', e);
          const printWindow = window.open(blobUrl, '_blank');
          printWindow?.focus();
          printWindow?.print();
        } finally {
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(blobUrl);
          }, 60000);
        }
      };
    } catch (e) {
      console.error('Print failed:', e);
    }
  }

  /**
   * Format file size in bytes to KB/MB
   */
  static formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
