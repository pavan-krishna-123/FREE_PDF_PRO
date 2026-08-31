export type ToolId = 
  | 'merge'
  | 'split'
  | 'compress'
  | 'protect'
  | 'unlock'
  | 'sign'
  | 'scanner'
  | 'rotate'
  | 'extract'
  | 'reorder'
  | 'delete_pages';

export type ToolCategory = 'core' | 'manipulate' | 'security' | 'capture';

export interface PdfToolItem {
  id: ToolId;
  name: string;
  shortDescription: string;
  description: string;
  iconName: string;
  badge?: string;
  category: ToolCategory;
  accentColor: string;
}

export interface PdfDocumentInfo {
  name: string;
  size: number;
  pageCount: number;
  lastModified: number;
  data: Uint8Array;
}

export interface OperationResult {
  operationName: string;
  originalFileName: string;
  resultFileName: string;
  originalSize: number;
  resultSize: number;
  pageCount: number;
  pdfBytes: Uint8Array;
  blobUrl: string;
  timestamp: number;
}

export interface AppLog {
  id: string;
  uid: string;
  action: string;
  operation: string;
  status: 'SUCCESS' | 'FAILURE' | 'INFO';
  timestamp: string;
  device: string;
  appVersion: string;
  details?: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: 'admin' | 'superadmin';
  enabled: boolean;
  createdAt: string;
  lastLoginAt: string;
  lastLogoutAt?: string;
  token?: string;
  expiresAt?: number;
}

export interface SystemHealthData {
  status: string;
  uptimeSeconds: number;
  serverStartTime: string;
  activeSessionsCount: number;
  memory: {
    rssMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
    externalMb: number;
    systemFreeMemMb: number;
    systemTotalMemMb: number;
  };
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    cpuCount: number;
    cpuModel: string;
    loadAvg: number[];
  };
  activeJobs: {
    wasmSandbox: string;
    pdfJsWorker: string;
    cryptoEngine: string;
  };
}

export interface ActivityLogItem {
  id?: string;
  tool: string;
  action: string;
  status: 'success' | 'failed';
  fileSize: number;
  durationMs: number;
  timestamp: string;
  details?: string;
}

export interface AdminEvent {
  id: string;
  uid: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SignaturePoint {
  x: number;
  y: number;
  time: number;
}

export interface SignatureStroke {
  points: SignaturePoint[];
  color: string;
  width: number;
}

export type ScanFilterMode = 'color' | 'magic_color' | 'document_bw' | 'grayscale' | 'contrast' | 'normal' | 'document';

export interface ScannedPage {
  id: string;
  dataUrl: string;
  originalDataUrl?: string;
  rotation: number;
  filter: ScanFilterMode;
  timestamp: number;
}
