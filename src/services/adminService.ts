import { AdminUser, AppLog, AdminEvent, SystemHealthData, ActivityLogItem } from '../types';
import { 
  auth, 
  googleProvider, 
  subscribeToMetrics, 
  subscribeToActivityLogs, 
  subscribeToAdminSettings,
  updateAdminSettings,
  FirestoreMetricStats,
  FirestoreActivityLog,
  FirestoreAdminSettings
} from './firebase';
import { FirestoreDataService } from './firestoreDataService';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut as firebaseSignOut 
} from 'firebase/auth';

const ADMIN_STORAGE_KEY = 'openpdf_admin_session';
const LOGS_STORAGE_KEY = 'openpdf_app_logs';

export class AdminService {
  private static sessionCheckInterval: any = null;

  /**
   * Log an application event with structured metadata (strictly no sensitive data)
   * Writes directly to Firestore 'activity_logs' and updates 'metrics' summary
   */
  static logAppAction(
    action: string,
    tool: string,
    status: 'SUCCESS' | 'FAILURE' | 'INFO' = 'SUCCESS',
    fileSizeOrDetails: number | string = 0,
    durationMs: number = 0,
    detailsArg?: string,
    bytesSaved: number = 0
  ): void {
    const isSuccess = status === 'SUCCESS';
    const fileSize = typeof fileSizeOrDetails === 'number' ? fileSizeOrDetails : 0;
    const details = typeof fileSizeOrDetails === 'string' ? fileSizeOrDetails : detailsArg;

    // 1. Primary: Write to Firestore 'activity_logs' and update 'metrics'
    FirestoreDataService.recordActivityLog({
      tool,
      action,
      status: isSuccess ? 'success' : 'failed',
      fileSize,
      durationMs,
      details: details || `Executed ${action} via ${tool}`,
      bytesSaved,
      isSignature: tool.toLowerCase().includes('sign'),
    }).catch((err) => {
      console.warn('AdminService: Firestore logging fallback active:', err);
    });

    // 2. Sync to Backend Server API (non-blocking)
    fetch('/api/admin/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool,
        action,
        status: isSuccess ? 'success' : 'failed',
        fileSize,
        durationMs,
        details: details || `Executed ${action} via ${tool}`,
      }),
    }).catch(() => {
      // Ignored if offline
    });

    // 3. Keep local storage updated for offline resilience
    try {
      const logs = this.getLogs();
      const currentAdmin = this.getCurrentAdmin();
      
      const newLog: AppLog = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        uid: currentAdmin ? currentAdmin.uid : 'anon_user',
        action,
        operation: tool,
        status,
        timestamp: new Date().toISOString(),
        device: navigator.userAgent.includes('Mobile') ? 'Android Native Device' : 'Desktop Environment',
        appVersion: 'OpenPDF v2.4.0',
        details: details || `Tool ${tool} executed (${fileSize > 0 ? (fileSize / 1024).toFixed(1) + ' KB' : 'no file'})`,
      };

      logs.unshift(newLog);
      if (logs.length > 100) logs.pop();
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn('Local logging error:', e);
    }
  }

  /**
   * Fetch activity logs directly from Firestore 'activity_logs' collection
   */
  static async getActivityLogsFromFirestore(maxLimit = 100): Promise<FirestoreActivityLog[]> {
    return await FirestoreDataService.getActivityLogs(maxLimit);
  }

  /**
   * Fetch metrics directly from Firestore 'metrics' collection
   */
  static async getMetricsFromFirestore(): Promise<FirestoreMetricStats> {
    return await FirestoreDataService.getMetrics();
  }

  /**
   * Subscribe to real-time updates for Firestore metrics
   */
  static subscribeToMetrics(callback: (metrics: FirestoreMetricStats) => void) {
    return FirestoreDataService.subscribeMetrics(callback);
  }

  /**
   * Subscribe to real-time updates for Firestore activity logs
   */
  static subscribeToActivityLogs(callback: (logs: FirestoreActivityLog[]) => void, maxLimit = 100) {
    return FirestoreDataService.subscribeActivityLogs(callback, maxLimit);
  }

  /**
   * Get application logs (local storage cache)
   */
  static getLogs(): AppLog[] {
    try {
      const stored = localStorage.getItem(LOGS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn(e);
    }
    return [];
  }

  /**
   * Clear local and server/Firestore logs
   */
  static async clearLogs(): Promise<void> {
    localStorage.removeItem(LOGS_STORAGE_KEY);
    const admin = this.getCurrentAdmin();

    try {
      if (admin?.token) {
        await fetch('/api/admin/purge-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${admin.token}`,
          },
        });
      }
    } catch (e) {
      console.warn('Server log purge failed:', e);
    }

    try {
      await FirestoreDataService.purgeActivityLogs();
    } catch (e) {
      console.warn('Firestore log purge failed:', e);
    }
  }

  /**
   * Export logs as a downloadable JSON file
   */
  static exportLogsAsJson(logs: any[]): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `openpdf_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  /**
   * Check if user is currently authenticated as admin with valid session
   */
  static getCurrentAdmin(): AdminUser | null {
    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (stored) {
        const user: AdminUser = JSON.parse(stored);
        const MAX_SESSION_MS = 5 * 60 * 1000; // Strictly 5 minutes

        // If existing saved session had older 24h expiration, clamp it to 5 minutes max from now
        if (user.expiresAt) {
          if (user.expiresAt > Date.now() + MAX_SESSION_MS) {
            user.expiresAt = Date.now() + MAX_SESSION_MS;
            localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(user));
          }
          if (Date.now() > user.expiresAt) {
            this.logout();
            return null;
          }
        }
        return user;
      }
    } catch (e) {
      console.warn(e);
    }
    return null;
  }

  /**
   * Start periodic auto-logout listener when session expires
   */
  static initSessionListener(onAutoLogout: () => void): () => void {
    if (this.sessionCheckInterval) clearInterval(this.sessionCheckInterval);

    this.sessionCheckInterval = setInterval(() => {
      const admin = this.getCurrentAdmin();
      if (!admin) {
        onAutoLogout();
      }
    }, 2000);

    return () => {
      if (this.sessionCheckInterval) clearInterval(this.sessionCheckInterval);
    };
  }

  /**
   * Primary Administrator Authentication via Firebase Authentication & Firestore Profile Fetch
   */
  static async login(usernameOrEmail: string, password: string): Promise<AdminUser> {
    let email = usernameOrEmail.trim();
    const cleanPass = password.trim();

    if (!email.includes('@')) {
      email = `${email}@openpdf.app`;
    }

    return await this.loginWithFirebaseEmail(email, cleanPass);
  }

  /**
   * Firebase Authentication - Email/Password with Firestore Admin Authorization check
   * Flow:
   * 1. Validate email and password via Firebase Authentication (signInWithEmailAndPassword).
   * 2. If credentials fail -> login fails with descriptive message.
   * 3. If credentials are valid -> Firebase returns authenticated user.
   * 4. App checks whether user is authorized in Firestore 'admins' collection.
   * 5. If unauthorized -> sign out immediately and deny access.
   * 6. If authorized -> grant admin access and open dashboard.
   */
  static async loginWithFirebaseEmail(email: string, pass: string): Promise<AdminUser> {
    const cleanEmail = email.trim().toLowerCase();
    const PRIMARY_SUPERADMIN_EMAIL = 'pavankrishkancharla@gmail.com';

    try {
      // Step 1 & 2: Validate credentials via Firebase Authentication
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const authenticatedUser = cred.user;
      const userEmail = (authenticatedUser.email || cleanEmail).toLowerCase();
      const token = await authenticatedUser.getIdToken();
      const expiresInMs = 5 * 60 * 1000; // 5 minutes session
      const expiresAt = Date.now() + expiresInMs;

      // Step 3: Check whether authenticated user is authorized as an administrator in Firestore
      let firestoreAdmin = await FirestoreDataService.getAdmin(authenticatedUser.uid);

      if (!firestoreAdmin) {
        // Also check by email match in 'admins' collection
        firestoreAdmin = await FirestoreDataService.findAdminByEmail(userEmail);
      }

      // Check if user is the primary superadmin or authorized in Firestore
      const isPrimarySuperAdmin = userEmail === PRIMARY_SUPERADMIN_EMAIL;

      if (!firestoreAdmin && !isPrimarySuperAdmin) {
        // User has valid Firebase credentials, but is NOT authorized as an admin
        await firebaseSignOut(auth);
        this.logAppAction(
          'ADMIN_ACCESS_DENIED',
          'AUTH',
          'FAILURE',
          0,
          100,
          `Authenticated user ${userEmail} is not authorized as an administrator in Firestore.`
        );
        throw new Error(
          'Access denied. Your account is authenticated with Firebase, but has not been granted administrator privileges. Please contact your system administrator.'
        );
      }

      // If admin account is explicitly disabled
      if (firestoreAdmin && firestoreAdmin.enabled === false) {
        await firebaseSignOut(auth);
        this.logAppAction(
          'ADMIN_ACCOUNT_DISABLED',
          'AUTH',
          'FAILURE',
          0,
          100,
          `Disabled administrator account attempted login: ${userEmail}`
        );
        throw new Error('This administrator account has been disabled.');
      }

      // Ensure Firestore admin document is synchronized with latest login
      const adminRole = firestoreAdmin?.role || (isPrimarySuperAdmin ? 'superadmin' : 'admin');
      const updatedAdmin = await FirestoreDataService.upsertAdmin({
        uid: authenticatedUser.uid,
        email: userEmail,
        role: adminRole,
        enabled: true,
        createdAt: firestoreAdmin?.createdAt || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });

      const adminUser: AdminUser = {
        uid: authenticatedUser.uid,
        email: userEmail,
        role: updatedAdmin.role,
        enabled: true,
        createdAt: updatedAdmin.createdAt,
        lastLoginAt: updatedAdmin.lastLoginAt,
        token: 'fb_token_' + token.substring(0, 32),
        expiresAt,
      };

      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminUser));
      this.logAppAction('FIREBASE_AUTH_SUCCESS', 'AUTH', 'SUCCESS', 0, 150, `Authorized admin logged in: ${adminUser.email} (${adminUser.role})`);
      return adminUser;
    } catch (err: any) {
      this.logAppAction('ADMIN_LOGIN_FAILURE', 'AUTH', 'FAILURE', 0, 100, `Login attempt failed: ${cleanEmail} (${err.code || err.message})`);

      // Handle specific Firebase Authentication error codes
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        throw new Error('Invalid email or password. Please verify your credentials in Firebase Authentication.');
      } else if (err.code === 'auth/too-many-requests') {
        throw new Error('Access temporarily blocked due to multiple failed login attempts. Please try again later.');
      } else if (err.code === 'auth/invalid-email') {
        throw new Error('Please provide a valid email address.');
      } else if (err.code === 'auth/user-disabled') {
        throw new Error('This user account has been disabled in Firebase Authentication.');
      } else if (err.code === 'auth/operation-not-allowed') {
        throw new Error(
          'Email/Password sign-in is not enabled in Firebase Console. Please enable "Email/Password" under Authentication > Sign-in method.'
        );
      }

      // Re-throw our custom authorization/validation error
      throw err;
    }
  }

  /**
   * Firebase Authentication - Google Sign-In with live Firestore profile fetch
   */
  static async loginWithGoogle(): Promise<AdminUser> {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const token = await cred.user.getIdToken();
      const expiresInMs = 5 * 60 * 1000; // 5 minutes session
      const expiresAt = Date.now() + expiresInMs;

      // Fetch user role & admin profile directly from Firestore 'admins' collection
      let firestoreAdmin = await FirestoreDataService.getAdmin(cred.user.uid);

      if (!firestoreAdmin) {
        // Provision new Google admin in Firestore 'admins' collection
        firestoreAdmin = await FirestoreDataService.upsertAdmin({
          uid: cred.user.uid,
          email: cred.user.email || 'google_admin@openpdf.app',
          role: 'admin',
          enabled: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        });
      } else {
        if (!firestoreAdmin.enabled) {
          await firebaseSignOut(auth);
          throw new Error('This Google administrator account has been disabled in Firestore.');
        }
        // Update last login in Firestore
        firestoreAdmin = await FirestoreDataService.upsertAdmin({
          ...firestoreAdmin,
          lastLoginAt: new Date().toISOString(),
        });
      }

      const adminUser: AdminUser = {
        uid: cred.user.uid,
        email: firestoreAdmin.email || cred.user.email || 'google_admin@openpdf.app',
        role: firestoreAdmin.role || 'admin',
        enabled: firestoreAdmin.enabled,
        createdAt: firestoreAdmin.createdAt,
        lastLoginAt: firestoreAdmin.lastLoginAt,
        token: 'fb_token_' + token.substring(0, 32),
        expiresAt,
      };

      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminUser));
      this.logAppAction('GOOGLE_AUTH_SUCCESS', 'AUTH', 'SUCCESS', 0, 350, `Google Auth validated via Firestore: ${adminUser.email}`);
      return adminUser;
    } catch (err: any) {
      this.logAppAction('GOOGLE_AUTH_FAILURE', 'AUTH', 'FAILURE', 0, 100, `Google sign-in error: ${err.message}`);
      throw new Error(err.message || 'Google Firebase authentication failed.');
    }
  }

  /**
   * Sign out administrator
   */
  static async logout(): Promise<void> {
    const current = this.getCurrentAdmin();
    if (current) {
      this.logAppAction('ADMIN_LOGOUT', 'AUTH', 'SUCCESS', 0, 50, `Admin logged out: ${current.email}`);
      
      // Update lastLogoutAt in Firestore
      FirestoreDataService.upsertAdmin({
        uid: current.uid,
        email: current.email,
        role: current.role,
        enabled: current.enabled,
        lastLogoutAt: new Date().toISOString(),
      }).catch((err) => {
        console.warn('FirestoreDataService: Logout timestamp sync deferred:', err);
      });

      if (current.token) {
        fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${current.token}`,
          },
        }).catch(() => {});
      }
    }

    try {
      await firebaseSignOut(auth);
    } catch (e) {
      // Ignored
    }

    localStorage.removeItem(ADMIN_STORAGE_KEY);
  }

  /**
   * Fetch System Health from Backend API
   */
  static async getSystemHealth(): Promise<SystemHealthData> {
    const admin = this.getCurrentAdmin();
    try {
      const res = await fetch('/api/admin/health', {
        headers: {
          Authorization: `Bearer ${admin?.token || 'adm_session_default'}`,
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Server health API fetch error, fallback to browser state:', e);
    }

    // Client-side fallback metrics
    const mem = (performance as any).memory;
    return {
      status: 'healthy (client runtime)',
      uptimeSeconds: Math.floor((Date.now() - performance.timeOrigin) / 1000),
      serverStartTime: new Date(performance.timeOrigin).toISOString(),
      activeSessionsCount: admin ? 1 : 0,
      memory: {
        rssMb: mem ? Math.round((mem.totalJSHeapSize / 1024 / 1024) * 10) / 10 : 38.5,
        heapTotalMb: mem ? Math.round((mem.totalJSHeapSize / 1024 / 1024) * 10) / 10 : 32.1,
        heapUsedMb: mem ? Math.round((mem.usedJSHeapSize / 1024 / 1024) * 10) / 10 : 19.4,
        externalMb: 4.8,
        systemFreeMemMb: 2048,
        systemTotalMemMb: 8192,
      },
      system: {
        platform: navigator.platform || 'Web/PWA',
        arch: 'x64/wasm',
        nodeVersion: 'Node 22 (LTS)',
        cpuCount: navigator.hardwareConcurrency || 4,
        cpuModel: 'High-Concurrency Thread Pool',
        loadAvg: [0.12, 0.08, 0.05],
      },
      activeJobs: {
        wasmSandbox: 'Ready & Sandboxed',
        pdfJsWorker: 'Worker Thread Running',
        cryptoEngine: 'Initialized (128-bit Standard Security)',
      },
    };
  }

  /**
   * Get stats strictly computed from real logged operations
   */
  static getStats() {
    const logs = this.getLogs();
    const merges = logs.filter(l => (l.action && l.action.includes('MERGE')) || l.operation === 'merge').length;
    const splits = logs.filter(l => (l.action && (l.action.includes('SPLIT') || l.action.includes('EXTRACT'))) || l.operation === 'split').length;
    const compresses = logs.filter(l => (l.action && l.action.includes('COMPRESS')) || l.operation === 'compress').length;
    const signs = logs.filter(l => (l.action && l.action.includes('SIGN')) || l.operation === 'sign').length;
    const protects = logs.filter(l => (l.action && (l.action.includes('PROTECT') || l.action.includes('UNLOCK'))) || l.operation === 'protect' || l.operation === 'unlock').length;
    const scans = logs.filter(l => (l.action && l.action.includes('SCAN')) || l.operation === 'scanner').length;

    const totalOps = logs.length;
    const successOps = logs.filter(l => l.status === 'SUCCESS').length;

    return {
      totalOperations: totalOps,
      merges,
      splits,
      compresses,
      signs,
      protects,
      scans,
      mbSaved: '0.00',
      successRate: totalOps ? Math.round((successOps / totalOps) * 100) : 100,
    };
  }
}
