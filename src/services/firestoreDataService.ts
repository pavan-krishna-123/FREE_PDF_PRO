import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp, 
  writeBatch,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { FirestoreMetricStats, FirestoreActivityLog } from './firebase';
import { AdminUser } from '../types';

export interface ActivityLogInput {
  tool: string;
  action: string;
  status: 'success' | 'failed';
  fileSize?: number;
  durationMs?: number;
  details?: string;
  bytesSaved?: number;
  isSignature?: boolean;
}

export class FirestoreDataService {
  private static readonly METRICS_COLLECTION = 'metrics';
  private static readonly METRICS_DOC_ID = 'summary';
  private static readonly ACTIVITY_LOGS_COLLECTION = 'activity_logs';
  private static readonly ADMINS_COLLECTION = 'admins';

  /**
   * Fetch admin user data directly from Firestore 'admins/{uid}'
   */
  static async getAdmin(uid: string): Promise<AdminUser | null> {
    try {
      const adminDocRef = doc(db, this.ADMINS_COLLECTION, uid);
      const docSnap = await getDoc(adminDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          uid,
          email: data.email || '',
          role: (data.role as 'admin' | 'superadmin') || 'admin',
          enabled: data.enabled !== false,
          createdAt: data.createdAt || new Date().toISOString(),
          lastLoginAt: data.lastLoginAt || new Date().toISOString(),
          lastLogoutAt: data.lastLogoutAt || undefined,
        };
      }
      return null;
    } catch (err) {
      console.warn('FirestoreDataService: Error fetching admin from Firestore:', err);
      return null;
    }
  }

  /**
   * Save or update an admin user record in Firestore 'admins/{uid}'
   */
  static async upsertAdmin(adminData: Partial<AdminUser> & { uid: string; email: string }): Promise<AdminUser> {
    try {
      const adminDocRef = doc(db, this.ADMINS_COLLECTION, adminData.uid);
      const existing = await this.getAdmin(adminData.uid);

      const nowIso = new Date().toISOString();
      const updatedAdmin: AdminUser = {
        uid: adminData.uid,
        email: adminData.email,
        role: adminData.role || existing?.role || 'admin',
        enabled: adminData.enabled !== undefined ? adminData.enabled : (existing?.enabled ?? true),
        createdAt: existing?.createdAt || adminData.createdAt || nowIso,
        lastLoginAt: adminData.lastLoginAt || existing?.lastLoginAt || nowIso,
        lastLogoutAt: adminData.lastLogoutAt || existing?.lastLogoutAt,
      };

      const docPayload: Record<string, any> = {
        uid: updatedAdmin.uid,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        enabled: updatedAdmin.enabled,
        createdAt: updatedAdmin.createdAt,
        lastLoginAt: updatedAdmin.lastLoginAt,
        updatedAt: serverTimestamp(),
      };

      if (updatedAdmin.lastLogoutAt) {
        docPayload.lastLogoutAt = updatedAdmin.lastLogoutAt;
      }

      await setDoc(adminDocRef, docPayload, { merge: true });

      return updatedAdmin;
    } catch (err) {
      console.warn('FirestoreDataService: Error upserting admin in Firestore:', err);
      return {
        uid: adminData.uid,
        email: adminData.email,
        role: adminData.role || 'admin',
        enabled: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Fetch all registered administrators from Firestore 'admins' collection
   */
  static async getAllAdmins(): Promise<AdminUser[]> {
    try {
      const adminsCol = collection(db, this.ADMINS_COLLECTION);
      const snapshot = await getDocs(adminsCol);
      const admins: AdminUser[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        admins.push({
          uid: docSnap.id,
          email: data.email || '',
          role: (data.role as 'admin' | 'superadmin') || 'admin',
          enabled: data.enabled !== false,
          createdAt: data.createdAt || new Date().toISOString(),
          lastLoginAt: data.lastLoginAt || new Date().toISOString(),
          lastLogoutAt: data.lastLogoutAt || undefined,
        });
      });

      return admins;
    } catch (err) {
      console.warn('FirestoreDataService: Error fetching all admins from Firestore:', err);
      return [];
    }
  }

  /**
   * Look up an administrator directly by email in Firestore 'admins' collection
   */
  static async findAdminByEmail(email: string): Promise<(AdminUser & { password?: string }) | null> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const adminsCol = collection(db, this.ADMINS_COLLECTION);
      const snapshot = await getDocs(adminsCol);

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const docEmail = (data.email || '').trim().toLowerCase();
        if (docEmail === cleanEmail || docSnap.id.toLowerCase() === cleanEmail) {
          return {
            uid: docSnap.id,
            email: data.email || email,
            role: (data.role as 'admin' | 'superadmin') || 'admin',
            enabled: data.enabled !== false,
            createdAt: data.createdAt || new Date().toISOString(),
            lastLoginAt: data.lastLoginAt || new Date().toISOString(),
            password: data.password || data.pass || data.secret || undefined,
          };
        }
      }
      return null;
    } catch (err) {
      console.warn('FirestoreDataService: Error searching admin by email in Firestore:', err);
      return null;
    }
  }

  /**
   * Record a new activity log entry in 'activity_logs' and atomically update 'metrics' counters
   */
  static async recordActivityLog(data: ActivityLogInput): Promise<string | null> {
    const {
      tool,
      action,
      status,
      fileSize = 0,
      durationMs = 0,
      details = '',
      bytesSaved = 0,
      isSignature = false
    } = data;

    try {
      // 1. Insert into 'activity_logs'
      const logsCol = collection(db, this.ACTIVITY_LOGS_COLLECTION);
      const docRef = await addDoc(logsCol, {
        tool,
        action,
        status,
        fileSize,
        durationMs,
        timestamp: serverTimestamp(),
        details,
      });

      // 2. Atomically update 'metrics/summary'
      const metricsDocRef = doc(db, this.METRICS_COLLECTION, this.METRICS_DOC_ID);
      const toolKey = tool.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const toolField = `toolUsageBreakdown.${toolKey}`;

      await setDoc(
        metricsDocRef,
        {
          totalConversions: increment(status === 'success' ? 1 : 0),
          totalBytesProcessed: increment(fileSize),
          bytesSaved: increment(bytesSaved > 0 ? bytesSaved : 0),
          signaturesGenerated: increment(isSignature || tool.toLowerCase().includes('sign') ? 1 : 0),
          [toolField]: increment(1),
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );

      return docRef.id;
    } catch (err) {
      console.warn('FirestoreDataService: Error recording activity log to Firestore:', err);
      return null;
    }
  }

  /**
   * Fetch recent activity logs from 'activity_logs' collection
   */
  static async getActivityLogs(maxLimit = 100): Promise<FirestoreActivityLog[]> {
    try {
      const logsQuery = query(
        collection(db, this.ACTIVITY_LOGS_COLLECTION),
        orderBy('timestamp', 'desc'),
        limit(maxLimit)
      );

      const snapshot = await getDocs(logsQuery);
      const logs: FirestoreActivityLog[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let formattedDate = new Date().toISOString();
        if (data.timestamp instanceof Timestamp) {
          formattedDate = data.timestamp.toDate().toISOString();
        } else if (data.timestamp?.toDate) {
          formattedDate = data.timestamp.toDate().toISOString();
        } else if (typeof data.timestamp === 'string') {
          formattedDate = data.timestamp;
        }

        logs.push({
          id: docSnap.id,
          tool: data.tool || 'general',
          action: data.action || 'OPERATION',
          status: data.status || 'success',
          fileSize: data.fileSize || 0,
          durationMs: data.durationMs || 0,
          timestamp: formattedDate,
          details: data.details || '',
        });
      });

      return logs;
    } catch (err) {
      console.warn('FirestoreDataService: Error fetching activity logs:', err);
      return [];
    }
  }

  /**
   * Fetch current aggregated metrics from 'metrics/summary'
   */
  static async getMetrics(): Promise<FirestoreMetricStats> {
    try {
      const metricsDocRef = doc(db, this.METRICS_COLLECTION, this.METRICS_DOC_ID);
      const docSnap = await getDoc(metricsDocRef);

      if (docSnap.exists()) {
        return docSnap.data() as FirestoreMetricStats;
      }
    } catch (err) {
      console.warn('FirestoreDataService: Error fetching metrics:', err);
    }

    return {
      totalConversions: 0,
      totalBytesProcessed: 0,
      bytesSaved: 0,
      signaturesGenerated: 0,
      toolUsageBreakdown: {},
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Subscribe to real-time changes in 'metrics/summary'
   */
  static subscribeMetrics(callback: (metrics: FirestoreMetricStats) => void): () => void {
    const metricsDocRef = doc(db, this.METRICS_COLLECTION, this.METRICS_DOC_ID);
    return onSnapshot(
      metricsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as FirestoreMetricStats);
        } else {
          callback({
            totalConversions: 0,
            totalBytesProcessed: 0,
            bytesSaved: 0,
            signaturesGenerated: 0,
            toolUsageBreakdown: {},
            lastUpdated: new Date().toISOString(),
          });
        }
      },
      (err) => {
        console.warn('FirestoreDataService: Metrics subscription error:', err);
      }
    );
  }

  /**
   * Subscribe to real-time changes in 'activity_logs'
   */
  static subscribeActivityLogs(
    callback: (logs: FirestoreActivityLog[]) => void,
    maxLimit = 100
  ): () => void {
    const logsQuery = query(
      collection(db, this.ACTIVITY_LOGS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(maxLimit)
    );

    return onSnapshot(
      logsQuery,
      (querySnapshot) => {
        const logs: FirestoreActivityLog[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          let formattedDate = new Date().toISOString();
          if (data.timestamp instanceof Timestamp) {
            formattedDate = data.timestamp.toDate().toISOString();
          } else if (data.timestamp?.toDate) {
            formattedDate = data.timestamp.toDate().toISOString();
          } else if (typeof data.timestamp === 'string') {
            formattedDate = data.timestamp;
          }

          logs.push({
            id: docSnap.id,
            tool: data.tool || 'general',
            action: data.action || 'OPERATION',
            status: data.status || 'success',
            fileSize: data.fileSize || 0,
            durationMs: data.durationMs || 0,
            timestamp: formattedDate,
            details: data.details || '',
          });
        });
        callback(logs);
      },
      (err) => {
        console.warn('FirestoreDataService: Activity logs subscription error:', err);
      }
    );
  }

  /**
   * Purge activity logs in batches from 'activity_logs'
   */
  static async purgeActivityLogs(batchLimit = 150): Promise<number> {
    try {
      const logsQuery = query(
        collection(db, this.ACTIVITY_LOGS_COLLECTION),
        limit(batchLimit)
      );
      const snapshot = await getDocs(logsQuery);
      const batch = writeBatch(db);
      let count = 0;

      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
      }

      return count;
    } catch (err) {
      console.warn('FirestoreDataService: Error purging activity logs:', err);
      return 0;
    }
  }
}
