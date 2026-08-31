import { ToolId } from '../types';

export interface ToolSeoInfo {
  id: ToolId;
  slug: string;
  name: string;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  subtitle: string;
  actionButtonText: string;
  howToTitle: string;
  steps: {
    number: number;
    title: string;
    description: string;
  }[];
  features: {
    title: string;
    description: string;
  }[];
  faq: {
    question: string;
    answer: string;
  }[];
  keywords: string[];
}

export const TOOLS_SEO_MAP: Record<string, ToolSeoInfo> = {
  'merge-pdf': {
    id: 'merge',
    slug: 'merge-pdf',
    name: 'Merge PDF',
    seoTitle: 'Merge PDF Online Free – Combine PDF Files | OpenPDF',
    metaDescription: 'Combine multiple PDF files into one single document online for free. Rearrange pages, join files quickly with zero server uploads and 100% private in-browser processing.',
    h1: 'Merge PDF Files Online Free',
    subtitle: 'Combine multiple PDF documents into a single organized file in seconds without uploading to any remote server.',
    actionButtonText: 'Choose PDF Files to Merge',
    howToTitle: 'How to Merge PDF Files Online',
    steps: [
      {
        number: 1,
        title: 'Upload your PDF documents',
        description: 'Select two or more PDF files from your computer, tablet, or mobile phone.',
      },
      {
        number: 2,
        title: 'Arrange and reorder documents',
        description: 'Drag and drop or use arrow controls to set the exact order you want the files to appear in.',
      },
      {
        number: 3,
        title: 'Merge and download your PDF',
        description: 'Click Merge PDFs to instantly combine streams in memory and download your unified file.',
      },
    ],
    features: [
      {
        title: '100% Client-Side Privacy',
        description: 'Your confidential documents never leave your browser or get sent to remote servers.',
      },
      {
        title: 'Drag & Drop Page Reordering',
        description: 'Easily rearrange files in any sequence before combining them into a single PDF.',
      },
      {
        title: 'No File Size or Quantity Limits',
        description: 'Merge as many documents as you need with zero watermarks and completely free forever.',
      },
    ],
    faq: [
      {
        question: 'How do I merge PDF files for free?',
        answer: 'Simply click "Choose PDF Files to Merge", select multiple PDFs from your device, order them in your preferred sequence, and click "Merge PDFs". The combined document will be ready to download instantly.',
      },
      {
        question: 'Are my confidential documents secure?',
        answer: 'Yes, 100%. OpenPDF processes all PDF streams locally in your browser’s memory using WebAssembly/JavaScript. Zero bytes of your files are ever uploaded to any third-party server.',
      },
      {
        question: 'Can I merge PDFs on my iPhone or Android device?',
        answer: 'Yes! OpenPDF works seamlessly on all modern mobile browsers including Safari on iOS and Chrome on Android without needing any app installation.',
      },
      {
        question: 'Is there any limit to the number of PDF files I can merge?',
        answer: 'No arbitrary limits! Because processing occurs on your device, you can merge dozens of files at once as long as your device memory allows.',
      },
    ],
    keywords: ['merge pdf', 'combine pdf online', 'join pdf files', 'free pdf merge tool', 'merge pdf without upload'],
  },

  'compress-pdf': {
    id: 'compress',
    slug: 'compress-pdf',
    name: 'Compress PDF',
    seoTitle: 'Compress PDF Online Free – Reduce PDF Size | OpenPDF',
    metaDescription: 'Compress PDF files online for free. Reduce PDF size while preserving high visual quality. Zero uploads, instant browser compression for email and web.',
    h1: 'Compress PDF Online Free',
    subtitle: 'Shrink large PDF file sizes while maintaining sharp text and image quality with local browser compression.',
    actionButtonText: 'Select PDF to Compress',
    howToTitle: 'How to Compress a PDF Document',
    steps: [
      {
        number: 1,
        title: 'Select your PDF document',
        description: 'Click the upload button or drag and drop your large PDF file into the workspace.',
      },
      {
        number: 2,
        title: 'Choose compression level',
        description: 'Select between Extreme, Recommended, or Light compression depending on your size requirements.',
      },
      {
        number: 3,
        title: 'Download your optimized PDF',
        description: 'Click Compress PDF to reduce object streams and download your compact document immediately.',
      },
    ],
    features: [
      {
        title: 'Preserve Visual Sharpness',
        description: 'Smart object stream optimization strips bloat and optimizes embedded imagery without degrading readability.',
      },
      {
        title: 'Ideal for Email Attachments',
        description: 'Easily reduce 20MB+ PDFs down under common 10MB or 5MB email gateway limits.',
      },
      {
        title: 'No Server Upload Delays',
        description: 'Local compression happens in milliseconds without waiting on slow network upload and download speeds.',
      },
    ],
    faq: [
      {
        question: 'How do I reduce the size of a PDF without losing quality?',
        answer: 'OpenPDF removes redundant metadata, compresses font subsets, and optimizes content streams. This results in significant size reduction while preserving high text sharpness.',
      },
      {
        question: 'Can I compress PDF to under 100KB or 200KB?',
        answer: 'Yes, choose the "Extreme Compression" profile to aggressively minimize image resolutions and clean auxiliary streams for maximum shrinkage.',
      },
      {
        question: 'Is compressing PDFs online safe for private financial/tax forms?',
        answer: 'With OpenPDF it is completely safe because no files are ever sent across the internet. Everything is processed directly inside your browser.',
      },
    ],
    keywords: ['compress pdf', 'reduce pdf size', 'compress pdf to 100kb', 'shrink pdf file', 'free pdf optimizer'],
  },

  'split-pdf': {
    id: 'split',
    slug: 'split-pdf',
    name: 'Split PDF',
    seoTitle: 'Split PDF Online Free – Separate PDF Pages | OpenPDF',
    metaDescription: 'Split PDF files online for free. Extract individual pages, custom page ranges, or break large documents into separate PDF files with zero uploads.',
    h1: 'Split PDF Pages Online Free',
    subtitle: 'Separate single pages or extract custom page intervals from your PDF documents with visual page selectors.',
    actionButtonText: 'Select PDF to Split',
    howToTitle: 'How to Split a PDF File',
    steps: [
      {
        number: 1,
        title: 'Upload your PDF document',
        description: 'Choose the multi-page PDF you want to split or extract pages from.',
      },
      {
        number: 2,
        title: 'Specify page intervals or ranges',
        description: 'Enter specific page numbers (e.g. 1-3, 5, 8-10) or choose to split every page into its own PDF.',
      },
      {
        number: 3,
        title: 'Split and download',
        description: 'Download individual extracted files or a complete archive of your split document.',
      },
    ],
    features: [
      {
        title: 'Custom Range Extraction',
        description: 'Flexible range syntax supports extracting arbitrary chapters, odd/even pages, or individual sheets.',
      },
      {
        title: 'Visual Page Thumbnails',
        description: 'Preview pages before splitting to ensure you extract the exact content you need.',
      },
      {
        title: 'Lossless Page Extraction',
        description: 'Original text vectors, fonts, and images are preserved with zero quality degradation.',
      },
    ],
    faq: [
      {
        question: 'How do I extract only specific pages from a PDF?',
        answer: 'Upload your PDF to the Split tool, choose "Custom Range", type the page numbers you want (e.g. 1-4, 7), and click Split. A new PDF containing only those pages will be generated.',
      },
      {
        question: 'Can I split a 500-page PDF into separate single-page files?',
        answer: 'Yes! OpenPDF handles large multi-hundred-page documents easily and allows batch extraction in seconds.',
      },
    ],
    keywords: ['split pdf', 'separate pdf pages', 'extract pages from pdf', 'cut pdf online', 'free pdf splitter'],
  },

  'protect-pdf': {
    id: 'protect',
    slug: 'protect-pdf',
    name: 'Protect PDF',
    seoTitle: 'Protect PDF with Password Online Free | OpenPDF',
    metaDescription: 'Encrypt and protect your PDF documents with strong passwords online. Prevent unauthorized viewing and copying with client-side cryptography.',
    h1: 'Protect PDF with Password Online Free',
    subtitle: 'Secure sensitive PDF contracts, tax records, and private documents with modern password encryption.',
    actionButtonText: 'Select PDF to Protect',
    howToTitle: 'How to Password Protect a PDF',
    steps: [
      {
        number: 1,
        title: 'Upload your PDF',
        description: 'Select the confidential PDF file you want to secure with password encryption.',
      },
      {
        number: 2,
        title: 'Enter a strong password',
        description: 'Type your desired password and confirm it. Optionally set permissions for printing or copying.',
      },
      {
        number: 3,
        title: 'Encrypt and download',
        description: 'Click Protect PDF to apply cryptography and download your secured file.',
      },
    ],
    features: [
      {
        title: 'Cryptographic Security',
        description: 'Standard PDF password encryption prevents unauthorized opening and viewing across all viewers.',
      },
      {
        title: 'Zero Cloud Storage of Passwords',
        description: 'Your passwords and files are never logged or stored anywhere on remote servers.',
      },
      {
        title: 'Universal Compatibility',
        description: 'Protected PDFs open reliably in Adobe Acrobat, Apple Preview, Chrome, Edge, and mobile readers.',
      },
    ],
    faq: [
      {
        question: 'How does PDF password protection work?',
        answer: 'The document stream is encrypted using cryptographic algorithms. Anyone opening the file will be prompted for the password before contents can be displayed.',
      },
      {
        question: 'What happens if I forget my password?',
        answer: 'Because encryption is mathematical and done locally without backdoors, you must remember the password or keep a secure copy.',
      },
    ],
    keywords: ['protect pdf', 'password protect pdf', 'encrypt pdf online', 'secure pdf file', 'lock pdf'],
  },

  'unlock-pdf': {
    id: 'unlock',
    slug: 'unlock-pdf',
    name: 'Unlock PDF',
    seoTitle: 'Unlock PDF Online Free – Remove PDF Password | OpenPDF',
    metaDescription: 'Remove password and restrictions from protected PDF files online for free. Authenticate once and generate a permanently unlocked PDF.',
    h1: 'Unlock Password-Protected PDF Online',
    subtitle: 'Remove password restrictions from PDFs you own to create clean, unlocked copies for easy sharing.',
    actionButtonText: 'Select PDF to Unlock',
    howToTitle: 'How to Unlock a PDF File',
    steps: [
      {
        number: 1,
        title: 'Upload protected PDF',
        description: 'Choose the locked PDF document from your device.',
      },
      {
        number: 2,
        title: 'Enter document password',
        description: 'Provide the authorized password to decrypt the file stream.',
      },
      {
        number: 3,
        title: 'Generate unlocked PDF',
        description: 'Download the permanently unlocked document ready to open without future password prompts.',
      },
    ],
    features: [
      {
        title: 'Permanent Password Removal',
        description: 'Generate an open PDF version so you and your team don’t have to type passwords repeatedly.',
      },
      {
        title: 'Preserves File Integrity',
        description: 'All text, vector graphics, form fields, and attachments remain 100% intact.',
      },
    ],
    faq: [
      {
        question: 'Can I unlock a PDF if I know the password?',
        answer: 'Yes! Simply enter the password once, and OpenPDF will produce an unrestricted version of the document.',
      },
    ],
    keywords: ['unlock pdf', 'remove pdf password', 'decrypt pdf', 'pdf password remover'],
  },

  'sign-pdf': {
    id: 'sign',
    slug: 'sign-pdf',
    name: 'Sign PDF',
    seoTitle: 'Sign PDF Online Free – Electronic Signature Tool | OpenPDF',
    metaDescription: 'Sign PDF documents online for free. Draw your signature, upload signature images, and stamp them on any page with zero uploads.',
    h1: 'Sign PDF Documents Online Free',
    subtitle: 'Create electronic signatures with your finger, mouse, or stylus and stamp them onto any PDF page with ease.',
    actionButtonText: 'Select PDF to Sign',
    howToTitle: 'How to Sign a PDF Document Online',
    steps: [
      {
        number: 1,
        title: 'Upload your document',
        description: 'Select the contract, form, or document you need to sign.',
      },
      {
        number: 2,
        title: 'Draw or create signature',
        description: 'Use the interactive signature canvas or upload a signature image.',
      },
      {
        number: 3,
        title: 'Position and download',
        description: 'Drag, resize, and place the signature exactly where needed, then download the signed PDF.',
      },
    ],
    features: [
      {
        title: 'Precision Touch & Stylus Support',
        description: 'Smooth vector smoothing produces crisp, authentic electronic signatures on touchscreens and desktops.',
      },
      {
        title: 'Multi-Page Placement',
        description: 'Place multiple signatures, dates, or initials on any page of your document.',
      },
      {
        title: 'Instant Execution',
        description: 'Sign and return contracts in seconds without printing, scanning, or buying expensive software.',
      },
    ],
    faq: [
      {
        question: 'Is signing PDFs with OpenPDF legally valid?',
        answer: 'Electronic signatures placed on documents are widely accepted for most business contracts, invoices, and standard agreements.',
      },
      {
        question: 'Is my signature uploaded or saved to any server?',
        answer: 'No! Your signature is stamped directly into the PDF binary inside your browser memory. We never store or transmit your signature.',
      },
    ],
    keywords: ['sign pdf online', 'electronic signature pdf', 'draw signature on pdf', 'free pdf signer', 'espan signature'],
  },

  'scan-pdf': {
    id: 'scanner',
    slug: 'scan-pdf',
    name: 'Camera Scanner',
    seoTitle: 'Camera Scanner Online Free – Scan Documents to PDF | OpenPDF',
    metaDescription: 'Scan paper documents using your mobile or laptop camera and convert them into clean, multi-page PDF files instantly.',
    h1: 'Online Document Camera Scanner',
    subtitle: 'Capture receipts, IDs, notes, and multi-page paper documents with your camera and compile into clean PDFs.',
    actionButtonText: 'Open Camera Scanner',
    howToTitle: 'How to Scan Documents to PDF with Camera',
    steps: [
      {
        number: 1,
        title: 'Open camera viewfinder',
        description: 'Allow camera permissions and frame your paper document in good lighting.',
      },
      {
        number: 2,
        title: 'Capture pages',
        description: 'Snap multiple pages, apply contrast enhancements, or re-order captured shots.',
      },
      {
        number: 3,
        title: 'Compile and download PDF',
        description: 'Click Generate PDF to bundle all captured pages into a standardized PDF document.',
      },
    ],
    features: [
      {
        title: 'Multi-Page Document Capture',
        description: 'Easily snap book pages, receipts, or contracts into a single continuous PDF file.',
      },
      {
        title: 'Document Enhancement Filters',
        description: 'Optimize readability with black & white, grayscale, or high-contrast document filters.',
      },
    ],
    faq: [
      {
        question: 'Can I use my mobile phone camera to scan documents?',
        answer: 'Yes! OpenPDF works directly in Safari on iOS and Chrome on Android with full CameraX high-resolution support.',
      },
    ],
    keywords: ['scan to pdf', 'camera scanner online', 'document scanner browser', 'photo to pdf scanner'],
  },

  'rotate-pdf': {
    id: 'rotate',
    slug: 'rotate-pdf',
    name: 'Rotate PDF',
    seoTitle: 'Rotate PDF Pages Online Free – Permanent Rotation | OpenPDF',
    metaDescription: 'Rotate PDF pages permanently online for free. Fix upside-down or sideways pages by 90, 180, or 270 degrees with visual page previews.',
    h1: 'Rotate PDF Pages Online Free',
    subtitle: 'Fix upside-down and sideways PDF pages with interactive visual previews and permanent orientation correction.',
    actionButtonText: 'Select PDF to Rotate',
    howToTitle: 'How to Rotate PDF Pages',
    steps: [
      {
        number: 1,
        title: 'Upload PDF file',
        description: 'Choose the PDF with incorrect page orientations.',
      },
      {
        number: 2,
        title: 'Rotate individual pages or all',
        description: 'Click rotate buttons on individual thumbnails or rotate all pages at once by 90°, 180°, or 270°.',
      },
      {
        number: 3,
        title: 'Save rotated PDF',
        description: 'Download the updated PDF with permanent page orientation metadata saved.',
      },
    ],
    features: [
      {
        title: 'Permanent Orientation Fix',
        description: 'Rotates the actual PDF coordinate matrix so the document displays correctly in all PDF readers.',
      },
      {
        title: 'Selective Page Rotation',
        description: 'Rotate only specific landscape charts while keeping portrait text pages intact.',
      },
    ],
    faq: [
      {
        question: 'Will rotated PDF pages stay rotated when emailed?',
        answer: 'Yes! OpenPDF alters the actual PDF page dictionary rotation attribute permanently.',
      },
    ],
    keywords: ['rotate pdf', 'rotate pdf pages online', 'fix upside down pdf', 'turn pdf 90 degrees'],
  },

  'extract-pdf': {
    id: 'extract',
    slug: 'extract-pdf',
    name: 'Extract PDF Pages',
    seoTitle: 'Extract Pages from PDF Online Free | OpenPDF',
    metaDescription: 'Extract specific pages from any PDF online for free. Select pages using a visual thumbnail selector and create a new PDF file.',
    h1: 'Extract Pages from PDF Online Free',
    subtitle: 'Select and export specific pages from large documents into a clean, dedicated PDF file.',
    actionButtonText: 'Select PDF to Extract Pages',
    howToTitle: 'How to Extract Pages from a PDF',
    steps: [
      {
        number: 1,
        title: 'Upload your PDF',
        description: 'Select the document containing pages you wish to extract.',
      },
      {
        number: 2,
        title: 'Select desired pages',
        description: 'Click on page thumbnails to select the exact pages you want to keep.',
      },
      {
        number: 3,
        title: 'Export new PDF',
        description: 'Click Extract to create a new PDF containing only your selected pages.',
      },
    ],
    features: [
      {
        title: 'Visual Page Picker',
        description: 'Easily select pages with one click on visual page thumbnails.',
      },
      {
        title: 'High-Fidelity Extraction',
        description: 'Preserves fonts, vector drawings, images, and form elements without quality loss.',
      },
    ],
    faq: [
      {
        question: 'How do I extract a single page from a PDF?',
        answer: 'Upload your PDF, click on the thumbnail of the page you want, and click "Extract Pages". You will get a new 1-page PDF file.',
      },
    ],
    keywords: ['extract pdf pages', 'take pages out of pdf', 'save specific pdf pages', 'export pdf pages'],
  },

  'reorder-pdf': {
    id: 'reorder',
    slug: 'reorder-pdf',
    name: 'Reorder PDF Pages',
    seoTitle: 'Reorder PDF Pages Online Free – Rearrange Pages | OpenPDF',
    metaDescription: 'Rearrange and reorder PDF pages online for free. Drag and drop page thumbnails into any order and download your reorganized PDF.',
    h1: 'Reorder PDF Pages Online Free',
    subtitle: 'Rearrange, sort, and organize the order of pages in your PDF document with a smooth drag-and-drop interface.',
    actionButtonText: 'Select PDF to Reorder',
    howToTitle: 'How to Rearrange Pages in a PDF',
    steps: [
      {
        number: 1,
        title: 'Upload your PDF',
        description: 'Select the multi-page PDF document you want to organize.',
      },
      {
        number: 2,
        title: 'Drag and drop pages',
        description: 'Drag page thumbnails to re-sequence them into the perfect order.',
      },
      {
        number: 3,
        title: 'Save reorganized PDF',
        description: 'Click Save Reordered PDF to download your newly arranged document.',
      },
    ],
    features: [
      {
        title: 'Intuitive Drag & Drop',
        description: 'Easily drag pages to any position in the sequence with immediate visual feedback.',
      },
      {
        title: 'Thumbnail Grid Previews',
        description: 'Full page preview thumbnails ensure you move the right pages every time.',
      },
    ],
    faq: [
      {
        question: 'Can I reorder pages in a large PDF document?',
        answer: 'Yes! OpenPDF’s virtualized page grid makes organizing 50+ page documents fast and effortless.',
      },
    ],
    keywords: ['reorder pdf pages', 'rearrange pdf pages', 'sort pdf pages', 'organize pdf online'],
  },

  'delete-pdf-pages': {
    id: 'delete_pages',
    slug: 'delete-pdf-pages',
    name: 'Delete PDF Pages',
    seoTitle: 'Delete Pages from PDF Online Free | OpenPDF',
    metaDescription: 'Remove unwanted, blank, or corrupted pages from PDF files online for free. Visual page selection with 100% private in-browser processing.',
    h1: 'Delete Pages from PDF Online Free',
    subtitle: 'Remove unwanted, blank, or duplicate pages from your PDF documents with a simple click.',
    actionButtonText: 'Select PDF to Delete Pages',
    howToTitle: 'How to Delete Pages from a PDF',
    steps: [
      {
        number: 1,
        title: 'Upload PDF document',
        description: 'Select the PDF containing pages you want to eliminate.',
      },
      {
        number: 2,
        title: 'Select pages to delete',
        description: 'Click the trash icon on the page thumbnails you want to remove.',
      },
      {
        number: 3,
        title: 'Download cleaned PDF',
        description: 'Click Apply & Save to download the trimmed PDF without the deleted pages.',
      },
    ],
    features: [
      {
        title: 'Quick Page Removal',
        description: 'Eliminate accidental blank pages, duplicate scans, or confidential sheets in seconds.',
      },
      {
        title: 'Safe & Non-Destructive',
        description: 'Your original file on your computer remains untouched while a new cleaned copy is created.',
      },
    ],
    faq: [
      {
        question: 'How do I delete blank pages from a scanned PDF?',
        answer: 'Upload your document to the Delete Pages tool, click on the blank page thumbnails to mark them for deletion, and download your clean PDF.',
      },
    ],
    keywords: ['delete pdf pages', 'remove pages from pdf', 'delete blank pages pdf', 'cut pages out of pdf'],
  },
};

// Aliases for user-friendly routes
export const SLUG_TO_TOOL_ID: Record<string, ToolId> = {
  'merge-pdf': 'merge',
  'merge': 'merge',
  'compress-pdf': 'compress',
  'compress': 'compress',
  'split-pdf': 'split',
  'split': 'split',
  'protect-pdf': 'protect',
  'protect': 'protect',
  'unlock-pdf': 'unlock',
  'unlock': 'unlock',
  'sign-pdf': 'sign',
  'sign': 'sign',
  'scan-pdf': 'scanner',
  'scanner': 'scanner',
  'rotate-pdf': 'rotate',
  'rotate': 'rotate',
  'extract-pdf': 'extract',
  'extract': 'extract',
  'reorder-pdf': 'reorder',
  'reorder': 'reorder',
  'delete-pdf-pages': 'delete_pages',
  'delete-pages': 'delete_pages',
};

export const TOOL_ID_TO_SLUG: Record<ToolId, string> = {
  merge: 'merge-pdf',
  split: 'split-pdf',
  compress: 'compress-pdf',
  protect: 'protect-pdf',
  unlock: 'unlock-pdf',
  sign: 'sign-pdf',
  scanner: 'scan-pdf',
  rotate: 'rotate-pdf',
  extract: 'extract-pdf',
  reorder: 'reorder-pdf',
  delete_pages: 'delete-pdf-pages',
};
