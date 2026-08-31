import { encryptPDF, EncryptPDFOptions } from '@pdfsmaller/pdf-encrypt';
import { decryptPDF, isEncrypted as checkIsEncrypted } from '@pdfsmaller/pdf-decrypt';

export interface PdfProtectionOptions {
  userPassword: string;
  ownerPassword?: string;
  algorithm?: 'AES-256' | 'RC4';
  allowPrinting?: boolean;
  allowModifying?: boolean;
  allowCopying?: boolean;
  allowAnnotating?: boolean;
  allowFillingForms?: boolean;
  allowExtraction?: boolean;
  allowAssembly?: boolean;
  allowHighQualityPrint?: boolean;
}

/**
 * Standard PDF Encryption & Decryption Engine
 * Uses Web Crypto API with ISO 32000 compliant AES-256 and RC4 encryption
 */
export class PdfCryptoEngine {

  /**
   * Check if a PDF file is encrypted
   */
  static async checkEncryption(pdfBytes: Uint8Array): Promise<{
    encrypted: boolean;
    algorithm?: 'AES-256' | 'RC4';
    version?: number;
    revision?: number;
    keyLength?: number;
  }> {
    try {
      return await checkIsEncrypted(pdfBytes);
    } catch {
      return { encrypted: false };
    }
  }

  /**
   * Apply PDF Password Security (AES-256 or RC4) with customizable permissions
   */
  static async encryptPdf(
    inputPdfBytes: Uint8Array,
    userPassword: string,
    ownerPassword?: string,
    options?: Partial<PdfProtectionOptions>
  ): Promise<Uint8Array> {
    if (!userPassword || userPassword.trim().length === 0) {
      throw new Error('Password cannot be empty.');
    }

    const effectiveUser = userPassword.trim();
    const effectiveOwner = ownerPassword && ownerPassword.trim().length > 0
      ? ownerPassword.trim()
      : effectiveUser;

    const encryptOptions: EncryptPDFOptions = {
      ownerPassword: effectiveOwner,
      algorithm: options?.algorithm || 'AES-256',
      allowPrinting: options?.allowPrinting ?? true,
      allowModifying: options?.allowModifying ?? false,
      allowCopying: options?.allowCopying ?? true,
      allowAnnotating: options?.allowAnnotating ?? false,
      allowFillingForms: options?.allowFillingForms ?? true,
      allowExtraction: options?.allowExtraction ?? true,
      allowAssembly: options?.allowAssembly ?? false,
      allowHighQualityPrint: options?.allowHighQualityPrint ?? true,
    };

    try {
      const encryptedBytes = await encryptPDF(inputPdfBytes, effectiveUser, encryptOptions);
      return encryptedBytes;
    } catch (err: any) {
      // If already encrypted, try decrypting first or report clear error
      if (err?.code === 'ALREADY_ENCRYPTED') {
        throw new Error('This PDF is already encrypted with a password. Please unlock it first.');
      }
      console.error('PDF Encryption error:', err);
      throw new Error(err?.message || 'Failed to protect PDF with password');
    }
  }

  /**
   * Decrypt password-protected PDF document
   */
  static async decryptPdf(
    inputPdfBytes: Uint8Array,
    password: string
  ): Promise<Uint8Array> {
    try {
      const decryptedBytes = await decryptPDF(inputPdfBytes, password);
      return decryptedBytes;
    } catch (err: any) {
      console.error('PDF Decryption error:', err);
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('invalid')) {
        throw new Error('Incorrect password. Please verify and try again.');
      }
      throw new Error(msg || 'Failed to decrypt PDF. Incorrect password or unsupported encryption.');
    }
  }
}
