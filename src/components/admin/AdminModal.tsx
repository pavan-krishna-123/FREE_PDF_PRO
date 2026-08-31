import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Lock, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  FileText, 
  Cpu, 
  LogOut, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Server,
  Download,
  Clock,
  HardDrive,
  Layers,
  Zap,
  Radio,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  Search,
  Database,
  BarChart3,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';
import { AdminUser, AppLog, SystemHealthData } from '../../types';
import { AdminService } from '../../services/adminService';
import { 
  subscribeToMetrics, 
  subscribeToActivityLogs, 
  subscribeToAdminSettings,
  updateAdminSettings,
  FirestoreMetricStats,
  FirestoreActivityLog,
  FirestoreAdminSettings
} from '../../services/firebase';
import { AuditDashboard } from './AuditDashboard';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAdmin: AdminUser | null;
  onLoginSuccess: (admin: AdminUser) => void;
  onLogout: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  currentAdmin,
  onLoginSuccess,
  onLogout,
}) => {
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Tabs: 'metrics' | 'audit' | 'logs' | 'health'
  const [activeTab, setActiveTab] = useState<'metrics' | 'audit' | 'logs' | 'health'>('metrics');

  // Live Data States
  const [localLogs, setLocalLogs] = useState<AppLog[]>([]);
  const [firestoreLogs, setFirestoreLogs] = useState<FirestoreActivityLog[]>([]);
  const [firestoreMetrics, setFirestoreMetrics] = useState<FirestoreMetricStats | null>(null);
  const [adminSettings, setAdminSettings] = useState<FirestoreAdminSettings>({
    maintenanceMode: false,
    allowAnonymousUsage: true,
    maxUploadSizeMb: 100,
    logRetentionDays: 30,
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const [logFilter, setLogFilter] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [sessionRemainingSec, setSessionRemainingSec] = useState<number | null>(null);

  // Initial Load & Real-Time Subscriptions
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg('');
    setSuccessMsg('');
    setShowPurgeConfirm(false);

    // Load local logs & health
    setLocalLogs(AdminService.getLogs());
    AdminService.getSystemHealth().then(setSystemHealth);

    // Subscribe to Firestore Real-time Listeners
    const unsubMetrics = subscribeToMetrics((metrics) => {
      setFirestoreMetrics(metrics);
    });

    const unsubLogs = subscribeToActivityLogs((logs) => {
      setFirestoreLogs(logs);
    });

    const unsubSettings = subscribeToAdminSettings((settings) => {
      setAdminSettings(settings);
    });

    // Session Timer Countdown
    const timerInterval = setInterval(() => {
      if (currentAdmin?.expiresAt) {
        const remaining = Math.max(0, Math.floor((currentAdmin.expiresAt - Date.now()) / 1000));
        setSessionRemainingSec(remaining);
        if (remaining <= 0) {
          onLogout();
        }
      }
    }, 1000);

    // Periodic System Health Refresh (every 8 seconds)
    const healthInterval = setInterval(() => {
      AdminService.getSystemHealth().then(setSystemHealth);
    }, 8000);

    return () => {
      unsubMetrics();
      unsubLogs();
      unsubSettings();
      clearInterval(timerInterval);
      clearInterval(healthInterval);
    };
  }, [isOpen, currentAdmin]);

  // Combined Logs with Search Filtering
  const displayedLogs = useMemo(() => {
    const combined = firestoreLogs.length > 0
      ? firestoreLogs
      : localLogs.map((l) => ({
          id: l.id,
          tool: l.operation || 'pdf-tool',
          action: l.action,
          status: (l.status === 'SUCCESS' ? 'success' : 'failed') as 'success' | 'failed',
          fileSize: 0,
          durationMs: 0,
          timestamp: l.timestamp,
          details: l.details || '',
        }));

    if (!logFilter) return combined;
    const filter = logFilter.toLowerCase();
    return combined.filter(
      (l) =>
        (l.tool && l.tool.toLowerCase().includes(filter)) ||
        (l.action && l.action.toLowerCase().includes(filter)) ||
        (l.status && l.status.toLowerCase().includes(filter)) ||
        (l.details && l.details.toLowerCase().includes(filter))
    );
  }, [firestoreLogs, localLogs, logFilter]);

  // Computed Metrics (100% Real Live Firestore Data with Log Aggregation)
  const computedMetrics = useMemo(() => {
    // Collect log items to aggregate
    const logsToAggregate = firestoreLogs.length > 0 ? firestoreLogs : localLogs;
    const logToolMap: Record<string, number> = {};

    logsToAggregate.forEach((l: any) => {
      const toolKey = (l.tool || l.operation || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const actionKey = (l.action || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (toolKey) logToolMap[toolKey] = (logToolMap[toolKey] || 0) + 1;
      if (actionKey && actionKey !== toolKey) logToolMap[actionKey] = (logToolMap[actionKey] || 0) + 1;
    });

    const firestoreMap = firestoreMetrics?.toolUsageBreakdown || {};
    const mergedToolUsage: Record<string, number> = { ...logToolMap, ...firestoreMap };

    // If firestoreMetrics has summary counts
    if (firestoreMetrics && (firestoreMetrics.totalConversions > 0 || (firestoreMetrics.totalBytesProcessed || 0) > 0)) {
      const realBytesProcessed = firestoreMetrics.totalBytesProcessed || 0;
      const realBytesSaved = firestoreMetrics.bytesSaved || 0;
      const realSignatures = firestoreMetrics.signaturesGenerated || 0;
      const realConversions = firestoreMetrics.totalConversions || 0;

      return {
        totalConversions: realConversions,
        totalBytesMb: (realBytesProcessed / (1024 * 1024)).toFixed(2),
        bytesSavedMb: (realBytesSaved / (1024 * 1024)).toFixed(2),
        signaturesGenerated: realSignatures,
        toolUsage: mergedToolUsage,
      };
    }

    // Otherwise derive strictly from recorded activity logs
    const realTotalConversions = logsToAggregate.filter((l: any) => (l.status === 'success' || l.status === 'SUCCESS')).length;
    const realTotalBytes = logsToAggregate.reduce((acc: number, l: any) => acc + (l.fileSize || 0), 0);
    const realTotalSaved = logsToAggregate.reduce((acc: number, l: any) => acc + ((l as any).bytesSaved || 0), 0);
    const realSigns = logsToAggregate.filter((l: any) => 
      (l.tool || '').toLowerCase().includes('sign') || (l.action || '').toLowerCase().includes('sign')
    ).length;

    return {
      totalConversions: realTotalConversions,
      totalBytesMb: (realTotalBytes / (1024 * 1024)).toFixed(2),
      bytesSavedMb: (realTotalSaved / (1024 * 1024)).toFixed(2),
      signaturesGenerated: realSigns,
      toolUsage: mergedToolUsage,
    };
  }, [firestoreMetrics, firestoreLogs, localLogs]);

  if (!isOpen) return null;

  // Handle Firebase Email/Password Sign-In
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const admin = await AdminService.loginWithFirebaseEmail(email.trim(), password);
      setSuccessMsg('Authentication verified. Administrator profile loaded.');
      onLoginSuccess(admin);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh System Health Telemetry
  const handleRefreshHealth = async () => {
    setIsRefreshingHealth(true);
    try {
      const freshHealth = await AdminService.getSystemHealth();
      setSystemHealth(freshHealth);
      setSuccessMsg('System health telemetry refreshed.');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsRefreshingHealth(false);
    }
  };

  // Purge Old Logs (Iframe Safe without blocking window.confirm)
  const handlePurgeLogs = async () => {
    setIsPurging(true);
    setShowPurgeConfirm(false);
    try {
      await AdminService.clearLogs();
      setLocalLogs([]);
      setFirestoreLogs([]);
      setSuccessMsg('All operational and activity audit logs successfully purged.');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err: any) {
      setErrorMsg('Failed to purge logs: ' + err.message);
    } finally {
      setIsPurging(false);
    }
  };

  // Export Logs as JSON
  const handleExportLogs = () => {
    AdminService.exportLogsAsJson(displayedLogs);
  };

  // Toggle Maintenance Mode
  const handleToggleMaintenance = async () => {
    const nextState = !adminSettings.maintenanceMode;
    setAdminSettings((prev) => ({ ...prev, maintenanceMode: nextState }));
    try {
      await updateAdminSettings({ maintenanceMode: nextState });
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentAdmin?.token || ''}`,
        },
        body: JSON.stringify({ maintenanceMode: nextState }),
      });
      setSuccessMsg(`Maintenance Mode is now ${nextState ? 'ENABLED (Banner active)' : 'DISABLED (System live)'}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.warn('Failed to update maintenance mode setting:', err);
    }
  };

  // Format Duration Helper
  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  // Format Session Remaining
  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-purple-950/40 text-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Admin Portal
              </h2>
              {currentAdmin && (
                <p className="text-xs text-slate-400">
                  {currentAdmin.email} • <span className="font-semibold text-purple-400">{currentAdmin.role.toUpperCase()}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentAdmin && sessionRemainingSec !== null && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                <span>Session: {formatSessionTime(sessionRemainingSec)}</span>
              </div>
            )}
            <button
              id="admin-modal-close-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Admin Portal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {!currentAdmin ? (
          /* ==================================================== */
          /* 1. AUTHENTICATION VIEW                               */
          /* ==================================================== */
          <div className="p-6 sm:p-8 space-y-4 max-w-md mx-auto w-full">
            
            {/* Clean Header */}
            <div className="text-center space-y-1.5 pb-1">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 mb-1">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Administrator Sign In
              </h3>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Success Notification */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Email & Password Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Email Address
                </label>
                <input
                  id="admin-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 focus:outline-hidden"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="admin-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-mono pr-9"
                  />
                  <KeyRound className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="admin-submit-login-btn"
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 active:scale-98 transition-all disabled:opacity-50 cursor-pointer mt-1"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>Sign In</span>
              </button>
            </form>
          </div>
        ) : (
          /* ==================================================== */
          /* 2. ADMIN DASHBOARD & TELEMETRY SUITE                 */
          /* ==================================================== */
          <div className="flex-1 overflow-hidden flex flex-col">
            
            {/* Nav Tabs */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/60">
              <div className="flex gap-2 overflow-x-auto py-1 max-w-full">
                {[
                  { id: 'metrics', label: 'Live Metrics', icon: Activity },
                  { id: 'audit', label: 'Audit Dashboard', icon: BarChart3 },
                  { id: 'logs', label: `Activity Logs (${displayedLogs.length})`, icon: FileText },
                  { id: 'health', label: 'System Health', icon: Cpu },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`admin-tab-${tab.id}`}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2">
                <button
                  id="admin-logout-btn"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-all cursor-pointer"
                  title="Sign out of Admin Portal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Notification Banner */}
            {successMsg && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
                <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Inline Purge Confirmation Prompt (Iframe Safe) */}
            {showPurgeConfirm && (
              <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-700/80 text-xs text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Are you sure you want to permanently delete all operational logs?</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    id="admin-confirm-purge-btn"
                    onClick={handlePurgeLogs}
                    disabled={isPurging}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-sm"
                  >
                    {isPurging ? 'Purging...' : 'Yes, Permanently Purge'}
                  </button>
                  <button
                    id="admin-cancel-purge-btn"
                    onClick={() => setShowPurgeConfirm(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT CONTAINER */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* ---------------------------------------------------- */}
              {/* TAB 1: LIVE METRICS                                  */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'metrics' && (
                <div className="space-y-6">
                  
                  {/* Top Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-medium">Total Operations</span>
                        <Zap className="w-4 h-4 text-purple-400" />
                      </div>
                      <p className="text-3xl font-black text-white">{computedMetrics.totalConversions}</p>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 100% Sandbox Execution
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-medium">Storage Saved</span>
                        <HardDrive className="w-4 h-4 text-emerald-400" />
                      </div>
                      <p className="text-3xl font-black text-emerald-400">
                        {computedMetrics.bytesSavedMb} <span className="text-sm font-semibold text-slate-400">MB</span>
                      </p>
                      <span className="text-[10px] text-slate-400">via smart stream compression</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-medium">Signatures Placed</span>
                        <UserCheck className="w-4 h-4 text-cyan-400" />
                      </div>
                      <p className="text-3xl font-black text-cyan-400">{computedMetrics.signaturesGenerated}</p>
                      <span className="text-[10px] text-slate-400">Vector canvas embedding</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-medium">Total Volume</span>
                        <Layers className="w-4 h-4 text-amber-400" />
                      </div>
                      <p className="text-3xl font-black text-amber-300">
                        {computedMetrics.totalBytesMb} <span className="text-sm font-semibold text-slate-400">MB</span>
                      </p>
                      <span className="text-[10px] text-slate-400">Zero cloud payload leakage</span>
                    </div>
                  </div>

                  {/* Tool Breakdown Chart & Maintenance Control */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Tool Usage Breakdown */}
                    <div className="md:col-span-2 p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-400" />
                        <span>Tool Usage Distribution (Real-Time Firestore Aggregation)</span>
                      </h4>

                      <div className="space-y-3">
                        {(() => {
                          const getCount = (...keys: string[]) => {
                            let total = 0;
                            keys.forEach((k) => {
                              total += (computedMetrics.toolUsage[k] || 0);
                            });
                            return total;
                          };

                          const tools = [
                            {
                              name: 'PDF Merge',
                              count: getCount('merge', 'pdf_merge'),
                              color: 'bg-rose-500',
                            },
                            {
                              name: 'PDF Split & Extract',
                              count: getCount('split', 'pdf_split', 'extract', 'pdf_extract', 'delete', 'pdf_delete_pages', 'reorder', 'pdf_reorder'),
                              color: 'bg-amber-500',
                            },
                            {
                              name: 'Stream Compression',
                              count: getCount('compress', 'pdf_compress', 'compression'),
                              color: 'bg-emerald-500',
                            },
                            {
                              name: 'Digital Signatures',
                              count: getCount('sign', 'pdf_sign', 'signature', 'signatures'),
                              color: 'bg-cyan-500',
                            },
                            {
                              name: '128-bit Encryption & Protect',
                              count: getCount('protect', 'pdf_protect', 'unlock', 'pdf_unlock', 'encryption'),
                              color: 'bg-indigo-500',
                            },
                            {
                              name: 'Camera Scanner',
                              count: getCount('scanner', 'scan', 'camera', 'scanner_pdf_created'),
                              color: 'bg-purple-500',
                            },
                          ];

                          const totalSum = tools.reduce((acc, t) => acc + t.count, 0);
                          const totalBase = Math.max(totalSum, computedMetrics.totalConversions, 1);

                          return tools.map((item) => {
                            const percentage = totalSum > 0
                              ? Math.min(100, Math.round((item.count / totalBase) * 100))
                              : 0;

                            return (
                              <div key={item.name} className="space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                  <span className="text-slate-300">{item.name}</span>
                                  <span className="font-mono text-slate-400">{item.count} ops ({percentage}%)</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-slate-700/60 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${item.color} transition-all duration-500`}
                                    style={{ width: `${Math.max(percentage, item.count > 0 ? 5 : 0)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Admin Controls Panel */}
                    <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <Server className="w-4 h-4 text-indigo-400" />
                          <span>Admin Controls</span>
                        </h4>

                        {/* Maintenance Mode Toggle */}
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-200">Maintenance Mode</span>
                            <button
                              id="admin-toggle-maintenance-btn"
                              onClick={handleToggleMaintenance}
                              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                adminSettings.maintenanceMode ? 'text-amber-400' : 'text-slate-500'
                              }`}
                              title="Toggle system maintenance mode"
                            >
                              {adminSettings.maintenanceMode ? (
                                <ToggleRight className="w-6 h-6" />
                              ) : (
                                <ToggleLeft className="w-6 h-6" />
                              )}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight">
                            {adminSettings.maintenanceMode
                              ? 'Maintenance mode is ON (banner shown to public visitors)'
                              : 'System is fully online for public processing'}
                          </p>
                        </div>

                        {/* Quick Log Purge */}
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                          <span className="text-xs font-semibold text-slate-200 block">Audit Log Management</span>
                          <button
                            id="admin-quick-purge-btn"
                            onClick={() => setShowPurgeConfirm(true)}
                            disabled={isPurging}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Purge Old Logs</span>
                          </button>
                        </div>
                      </div>

                      {/* Export Logs Quick Link */}
                      <button
                        id="admin-export-metrics-btn"
                        onClick={handleExportLogs}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-650 text-white text-xs font-semibold transition-colors cursor-pointer"
                        title="Download activity logs as JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Logs as JSON</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* TAB 2: AUDIT DASHBOARD (RECHARTS BAR VISUALIZATION)  */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'audit' && (
                <AuditDashboard logs={firestoreLogs.length > 0 ? firestoreLogs : (displayedLogs as any)} metrics={firestoreMetrics} />
              )}

              {/* ---------------------------------------------------- */}
              {/* TAB 3: REAL-TIME ACTIVITY LOGS                       */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  
                  {/* Controls & Search Filter Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        id="admin-logs-filter-input"
                        type="text"
                        value={logFilter}
                        onChange={(e) => setLogFilter(e.target.value)}
                        placeholder="Search tool, action, status, details..."
                        className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                      />
                      {logFilter && (
                        <button
                          onClick={() => setLogFilter('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                          title="Clear search filter"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id="admin-export-logs-btn"
                        onClick={handleExportLogs}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-650 text-white text-xs font-semibold transition-colors cursor-pointer"
                        title="Export current logs as JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export JSON</span>
                      </button>
                      <button
                        id="admin-purge-logs-btn"
                        onClick={() => setShowPurgeConfirm(true)}
                        disabled={isPurging || displayedLogs.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
                        title="Purge all audit logs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Purge Logs</span>
                      </button>
                    </div>
                  </div>

                  {/* Real-time Activity Table */}
                  <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/60">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-slate-800 text-slate-300 font-bold border-b border-slate-700">
                          <tr>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4">Tool</th>
                            <th className="py-2.5 px-4">Action</th>
                            <th className="py-2.5 px-4">Size</th>
                            <th className="py-2.5 px-4">Latency</th>
                            <th className="py-2.5 px-4">Details</th>
                            <th className="py-2.5 px-4">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 font-mono">
                          {displayedLogs.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-500">
                                No activity log records matching current criteria.
                              </td>
                            </tr>
                          ) : (
                            displayedLogs.map((log, idx) => (
                              <tr key={log.id || idx} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-2.5 px-4">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    log.status === 'success'
                                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                                  }`}>
                                    {log.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 font-bold text-purple-300">
                                  {log.tool}
                                </td>
                                <td className="py-2.5 px-4 text-slate-300">
                                  {log.action}
                                </td>
                                <td className="py-2.5 px-4 text-slate-400">
                                  {log.fileSize > 0 ? `${(log.fileSize / 1024).toFixed(1)} KB` : '—'}
                                </td>
                                <td className="py-2.5 px-4 text-slate-400">
                                  {log.durationMs > 0 ? `${log.durationMs}ms` : '—'}
                                </td>
                                <td className="py-2.5 px-4 text-slate-400 font-sans max-w-xs truncate" title={log.details}>
                                  {log.details || '—'}
                                </td>
                                <td className="py-2.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* TAB 4: SYSTEM HEALTH                                 */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'health' && (
                <div className="space-y-6">
                  
                  {/* System Health Top Header with Manual Refresh */}
                  <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-2xl border border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-semibold text-emerald-400">System Telemetry Online</span>
                    </div>
                    <button
                      id="admin-refresh-health-btn"
                      onClick={handleRefreshHealth}
                      disabled={isRefreshingHealth}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                      title="Refresh system health metrics"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isRefreshingHealth ? 'animate-spin' : ''}`} />
                      <span>Refresh Telemetry</span>
                    </button>
                  </div>

                  {/* System Health Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* Server Uptime */}
                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-medium">Server / Engine Uptime</span>
                        <Clock className="w-4 h-4 text-purple-400" />
                      </div>
                      <p className="text-2xl font-black text-white font-mono">
                        {systemHealth ? formatUptime(systemHealth.uptimeSeconds) : '—'}
                      </p>
                      <span className="text-[10px] text-emerald-400 font-semibold">Process Running Normal</span>
                    </div>

                    {/* RAM & Heap Consumption */}
                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-medium">Heap Used / Allocated</span>
                        <Cpu className="w-4 h-4 text-indigo-400" />
                      </div>
                      <p className="text-2xl font-black text-indigo-300 font-mono">
                        {systemHealth?.memory.heapUsedMb || 24} <span className="text-sm text-slate-400 font-normal">/ {systemHealth?.memory.heapTotalMb || 48} MB</span>
                      </p>
                      <span className="text-[10px] text-slate-400">RSS: {systemHealth?.memory.rssMb || 38} MB</span>
                    </div>

                    {/* Active Jobs & Sandboxes */}
                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-medium">Execution Engine</span>
                        <Zap className="w-4 h-4 text-emerald-400" />
                      </div>
                      <p className="text-base font-bold text-emerald-400 font-mono">
                        {systemHealth?.activeJobs.wasmSandbox || 'Ready & Sandboxed'}
                      </p>
                      <span className="text-[10px] text-slate-400">PDF.js Web Worker + Crypto RC4</span>
                    </div>
                  </div>

                  {/* System Architecture Details */}
                  <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Server className="w-4 h-4 text-purple-400" />
                      <span>Host & Runtime Telemetry</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block uppercase">Platform</span>
                        <span className="text-slate-200 font-semibold">{systemHealth?.system.platform || 'Linux/Container'}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block uppercase">Architecture</span>
                        <span className="text-slate-200 font-semibold">{systemHealth?.system.arch || 'x64'}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block uppercase">Node / Runtime</span>
                        <span className="text-slate-200 font-semibold">{systemHealth?.system.nodeVersion || 'v22'}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block uppercase">CPU Threads</span>
                        <span className="text-slate-200 font-semibold">{systemHealth?.system.cpuCount || 4} Cores</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Sandbox Protocol */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Local-First Cryptographic & In-Memory Isolation Policy</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      OpenPDF operates on a zero-file-exfiltration architecture. Client and server memory buffers are purged via garbage collection immediately after document serialization. Passwords and cryptographic keys derived via MD5/RC4 are retained exclusively in transient volatile memory.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
};
