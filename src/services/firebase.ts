import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  memoryLocalCache,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  writeBatch,
  increment,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Auth & Firestore with robust fallback & auto-detect long polling
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export let db: Firestore;
try {
  const dbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    localCache: memoryLocalCache(),
  }, dbId);
} catch {
  try {
    if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
      db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    } else {
      db = getFirestore(app);
    }
  } catch (err) {
    console.warn('Initializing default Firestore instance:', err);
    db = getFirestore(app);
  }
}

// ----------------------------------------------------
// FIRESTORE INTERFACES & SERVICES
// ----------------------------------------------------

export interface FirestoreMetricStats {
  totalConversions: number;
  totalBytesProcessed: number;
  bytesSaved: number;
  signaturesGenerated: number;
  toolUsageBreakdown: Record<string, number>;
  lastUpdated?: string;
}

export interface FirestoreActivityLog {
  id?: string;
  tool: string;
  action: string;
  status: 'success' | 'failed';
  fileSize: number;
  durationMs: number;
  timestamp: any;
  details?: string;
}

export interface FirestoreAdminSettings {
  maintenanceMode: boolean;
  allowAnonymousUsage: boolean;
  maxUploadSizeMb: number;
  logRetentionDays: number;
}

/**
 * Log tool execution to Firestore and update real-time aggregated metrics
 */
export async function logOperationToFirestore(
  tool: string,
  action: string,
  status: 'success' | 'failed',
  fileSize: number = 0,
  durationMs: number = 0,
  details: string = '',
  bytesSaved: number = 0,
  isSignature: boolean = false
): Promise<void> {
  try {
    // 1. Add log to activity_logs collection
    const logsCol = collection(db, 'activity_logs');
    await addDoc(logsCol, {
      tool,
      action,
      status,
      fileSize,
      durationMs,
      timestamp: serverTimestamp(),
      details,
    });

    // 2. Increment summary metric counters in metrics collection
    const metricsDocRef = doc(db, 'metrics', 'summary');
    const toolField = `toolUsageBreakdown.${tool.toLowerCase()}`;

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
  } catch (err) {
    console.warn('Firestore log/metrics sync deferred (local fallback active):', err);
  }
}

/**
 * Real-time listener for aggregated metrics
 */
export function subscribeToMetrics(callback: (metrics: FirestoreMetricStats) => void) {
  const metricsDocRef = doc(db, 'metrics', 'summary');
  return onSnapshot(
    metricsDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as FirestoreMetricStats);
      } else {
        // Initial defaults
        const initial: FirestoreMetricStats = {
          totalConversions: 0,
          totalBytesProcessed: 0,
          bytesSaved: 0,
          signaturesGenerated: 0,
          toolUsageBreakdown: {},
          lastUpdated: new Date().toISOString(),
        };
        callback(initial);
      }
    },
    (err) => {
      console.warn('Metrics snapshot listener error:', err);
    }
  );
}

/**
 * Real-time listener for recent activity logs (up to 100 entries)
 */
export function subscribeToActivityLogs(callback: (logs: FirestoreActivityLog[]) => void) {
  const parseDocToLog = (doc: any): FirestoreActivityLog => {
    const data = doc.data();
    let formattedDate = new Date().toISOString();
    if (data.timestamp?.toDate) {
      formattedDate = data.timestamp.toDate().toISOString();
    } else if (data.timestamp instanceof Date) {
      formattedDate = data.timestamp.toISOString();
    } else if (typeof data.timestamp === 'number') {
      formattedDate = new Date(data.timestamp).toISOString();
    } else if (typeof data.timestamp === 'string') {
      formattedDate = data.timestamp;
    }

    return {
      id: doc.id,
      tool: data.tool || 'general',
      action: data.action || 'OPERATION',
      status: data.status || 'success',
      fileSize: data.fileSize || 0,
      durationMs: data.durationMs || 0,
      timestamp: formattedDate,
      details: data.details || '',
    };
  };

  try {
    const logsQuery = query(
      collection(db, 'activity_logs'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    return onSnapshot(
      logsQuery,
      (querySnapshot) => {
        const logs: FirestoreActivityLog[] = [];
        querySnapshot.forEach((doc) => {
          logs.push(parseDocToLog(doc));
        });
        callback(logs);
      },
      (err) => {
        console.warn('Ordered snapshot listener error, falling back to base collection stream:', err);
        // Fallback to unordered collection snapshot if index is missing
        const fallbackQuery = query(collection(db, 'activity_logs'), limit(100));
        return onSnapshot(fallbackQuery, (snapshot) => {
          const logs: FirestoreActivityLog[] = [];
          snapshot.forEach((doc) => {
            logs.push(parseDocToLog(doc));
          });
          logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          callback(logs);
        });
      }
    );
  } catch (err) {
    console.warn('Failed to initialize logs subscription query:', err);
    // Unordered fallback
    const fallbackQuery = query(collection(db, 'activity_logs'), limit(100));
    return onSnapshot(fallbackQuery, (snapshot) => {
      const logs: FirestoreActivityLog[] = [];
      snapshot.forEach((doc) => {
        logs.push(parseDocToLog(doc));
      });
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(logs);
    });
  }
}

/**
 * Real-time listener for admin global settings
 */
export function subscribeToAdminSettings(callback: (settings: FirestoreAdminSettings) => void) {
  const settingsDocRef = doc(db, 'admin_settings', 'global_config');
  return onSnapshot(
    settingsDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as FirestoreAdminSettings);
      } else {
        const defaultSettings: FirestoreAdminSettings = {
          maintenanceMode: false,
          allowAnonymousUsage: true,
          maxUploadSizeMb: 100,
          logRetentionDays: 30,
        };
        callback(defaultSettings);
      }
    },
    (err) => {
      console.warn('Settings snapshot listener error:', err);
    }
  );
}

/**
 * Update Admin Global Settings in Firestore
 */
export async function updateAdminSettings(settings: Partial<FirestoreAdminSettings>): Promise<void> {
  const settingsDocRef = doc(db, 'admin_settings', 'global_config');
  await setDoc(settingsDocRef, settings, { merge: true });
}

/**
 * Purge old activity logs in Firestore
 */
export async function purgeFirestoreLogs(): Promise<number> {
  const logsQuery = query(collection(db, 'activity_logs'), limit(150));
  const snapshot = await getDocs(logsQuery);
  const batch = writeBatch(db);
  let count = 0;
  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });
  if (count > 0) {
    await batch.commit();
  }
  return count;
}
