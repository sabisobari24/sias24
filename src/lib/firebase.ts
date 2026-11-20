import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  deleteDoc,
  writeBatch,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  enableNetwork,
  setLogLevel
} from 'firebase/firestore';
import { safeLocalStorageSet, safeLocalStorageGet, clearQuotaHeavyKeys } from '../utils/storageHelper';
import { isSupabaseConfigured, isSupabaseSecretKeyConfigured } from './supabase';
import {
  setSupabaseStatusNotifier,
  formatSupabaseErrorMessage,
  supabaseSyncCollection,
  supabaseSyncSingleDoc,
  supabaseSaveDocument,
  supabaseDeleteDocument,
  supabaseSaveDocumentsBatch,
  supabaseDeleteDocumentsBatch,
  supabaseSyncCollectionWithArray,
  supabaseClearAllCollections,
  supabaseGetDocument,
  supabaseGetCollectionDocs,
  supabaseQueryByField,
  supabaseDeleteByField,
  supabaseGetAttendanceWithFilter,
  supabasePingServer,
  supabaseTestReadWrite
} from './supabaseDb';

export { isSupabaseConfigured, isSupabaseSecretKeyConfigured };

export function getActiveDbBackend(): 'supabase' | 'firebase' {
  const configuredBackend = String((import.meta as any).env?.VITE_STORAGE_BACKEND || '').toLowerCase().trim();
  if (configuredBackend === 'firebase') return 'firebase';
  if (configuredBackend === 'supabase' || isSupabaseConfigured() || isSupabaseSecretKeyConfigured()) return 'supabase';
  return 'firebase';
}

// Clean up any stale firestore_targets_ keys in localStorage that exceed quota
clearQuotaHeavyKeys();

// Silence verbose internal Firestore SDK error logs
setLogLevel('silent');

const firebaseConfig = {
  apiKey: "AIzaSyBel9YYCMFyJpBfGLjDHnxEKDbJ_XxhZbA",
  authDomain: "turing-course-498805-p1.firebaseapp.com",
  projectId: "turing-course-498805-p1",
  storageBucket: "turing-course-498805-p1.firebasestorage.app",
  messagingSenderId: "1059388982698",
  appId: "1:1059388982698:web:3d47c9f5ff1f063988d7d3"
};

// Connection status & quota listener mechanism
type FirestoreStatusCallback = (status: 'online' | 'offline' | 'high_latency', latency?: number) => void;
const statusListeners: Set<FirestoreStatusCallback> = new Set();

type FirestoreQuotaCallback = (isQuotaExceeded: boolean, detail?: string) => void;
const quotaListeners: Set<FirestoreQuotaCallback> = new Set();

export function onFirestoreStatusChange(callback: FirestoreStatusCallback) {
  statusListeners.add(callback);
  return () => {
    statusListeners.delete(callback);
  };
}

export function onFirestoreQuotaChange(callback: FirestoreQuotaCallback) {
  quotaListeners.add(callback);
  return () => {
    quotaListeners.delete(callback);
  };
}

export function notifyFirestoreStatus(status: 'online' | 'offline' | 'high_latency', latency?: number) {
  statusListeners.forEach((cb) => {
    try {
      cb(status, latency);
    } catch { /* ignore */ }
  });
}

export function notifyFirestoreQuota(isQuotaExceeded: boolean, detail?: string) {
  safeLocalStorageSet('siakad_firestore_quota_exceeded', isQuotaExceeded ? 'true' : 'false');
  quotaListeners.forEach((cb) => {
    try {
      cb(isQuotaExceeded, detail);
    } catch { /* ignore */ }
  });
}

setSupabaseStatusNotifier(notifyFirestoreStatus);

// Initialize Firebase safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with multi-tab persistent cache & graceful fallback
let firestoreInstance;
const envDbId = (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID;
const defaultDbId = "ai-studio-portaladministra-da1cf664-8f69-44de-bd4f-4b85c7035cc8";
const DB_NAME = envDbId || defaultDbId;

try {
  firestoreInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  }, DB_NAME);
} catch (err) {
  console.warn('[Firestore] persistentLocalCache failed with DB_NAME, falling back:', err);
  try {
    firestoreInstance = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: memoryLocalCache()
    }, DB_NAME);
  } catch (_) {
    try {
      firestoreInstance = getFirestore(app, DB_NAME);
    } catch (e2) {
      console.warn('[Firestore] Falling back to default database (default):', e2);
      firestoreInstance = getFirestore(app);
    }
  }
}

export const db = firestoreInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  const code = String(err?.code || '').toLowerCase();
  const msg = String(err?.message || err || '').toLowerCase();
  return code === 'resource-exhausted' || msg.includes('quota') || msg.includes('resource-exhausted');
}

export function isPermissionDeniedError(err: any): boolean {
  if (!err) return false;
  const code = String(err?.code || '').toLowerCase();
  const msg = String(err?.message || err || '').toLowerCase();
  return code === 'permission-denied' || msg.includes('missing or insufficient permissions') || msg.includes('permission_denied');
}

export function formatFirestoreErrorMessage(err: any): string {
  const rawMsg = err instanceof Error ? err.message : String(err || 'Kesalahan tidak diketahui');
  const lowerMsg = rawMsg.toLowerCase();
  const isExplicitFirestoreErr =
    lowerMsg.includes('firestore.googleapis.com') ||
    lowerMsg.includes('free daily read units') ||
    isQuotaExceededError(err) ||
    isPermissionDeniedError(err);

  if (getActiveDbBackend() === 'supabase' && !isExplicitFirestoreErr) {
    return formatSupabaseErrorMessage(err);
  }
  if (isQuotaExceededError(err)) {
    return 'Kuota harian gratis Firebase Firestore (Spark Plan) terlampaui (Quota exceeded). Kuota akan reset besok atau tingkatkan paket proyek Firebase ke Blaze Plan.';
  }
  if (isPermissionDeniedError(err)) {
    return 'Akses tulis ditolak oleh aturan keamanan Firestore (Missing or insufficient permissions). Pastikan panjang karakter data sesuai batas & aturan keamanan telah di-deploy.';
  }
  if (lowerMsg.includes('offline') || lowerMsg.includes('unavailable') || lowerMsg.includes('network')) {
    return 'Server Firebase Firestore tidak dapat dijangkau (Offline/Timeout). Periksa koneksi internet Anda lalu coba lagi.';
  }
  return rawMsg;
}

export const FIRESTORE_UPGRADE_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${DB_NAME}/data?openUpgradeDialog=true`;

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function pingFirestoreServer(): Promise<void> {
  if (getActiveDbBackend() === 'supabase') {
    await supabasePingServer();
    return;
  }
  const docRef = doc(db, 'settings', 'headmaster');
  await getDocFromServer(docRef);
}

export async function testDatabaseReadWrite(): Promise<{ backend: 'supabase' | 'firebase'; readMs: number; totalMs: number }> {
  if (getActiveDbBackend() === 'supabase') {
    const res = await supabaseTestReadWrite();
    return { backend: 'supabase', ...res };
  }
  const startTime = performance.now();
  const docRef = doc(db, 'settings', 'headmaster');
  await getDocFromServer(docRef);
  const readMs = Math.round(performance.now() - startTime);
  const testRef = doc(db, 'system_diagnostics', 'connection-test');
  await setDoc(testRef, {
    timestamp: new Date().toISOString(),
    message: 'Tes diagnosa mandiri dari peramban pengguna',
    test: true
  }, { merge: true });
  const totalMs = Math.round(performance.now() - startTime);
  return { backend: 'firebase', readMs, totalMs };
}

export async function getDocumentById<T = any>(collectionPath: string, id: string): Promise<T | null> {
  if (!id) return null;
  if (getActiveDbBackend() === 'supabase') {
    return supabaseGetDocument<T>(collectionPath, id);
  }
  const snap = await getDoc(doc(db, collectionPath, id));
  if (!snap.exists()) return null;
  return { ...(snap.data() as any), id: snap.id } as T;
}

export async function getCollectionDocs<T = any>(collectionPath: string): Promise<T[]> {
  if (getActiveDbBackend() === 'supabase') {
    return supabaseGetCollectionDocs<T>(collectionPath);
  }
  const snap = await getDocs(collection(db, collectionPath));
  const items: T[] = [];
  snap.forEach((docSnap) => {
    items.push({ ...(docSnap.data() as any), id: docSnap.id } as T);
  });
  return items;
}

export async function queryDocumentsByField<T = any>(collectionPath: string, field: string, value: string): Promise<T[]> {
  if (getActiveDbBackend() === 'supabase') {
    return supabaseQueryByField<T>(collectionPath, field, value);
  }
  const q = query(collection(db, collectionPath), where(field, '==', value));
  const snap = await getDocs(q);
  const items: T[] = [];
  snap.forEach((docSnap) => {
    items.push({ ...(docSnap.data() as any), id: docSnap.id } as T);
  });
  return items;
}

export async function deleteDocumentsByField(collectionPath: string, field: string, value: string): Promise<number> {
  if (!value) return 0;
  if (getActiveDbBackend() === 'supabase') {
    return supabaseDeleteByField(collectionPath, field, value);
  }
  const q = query(collection(db, collectionPath), where(field, '==', value));
  const snap = await getDocs(q);
  if (snap.empty) return 0;
  let batch = writeBatch(db);
  let count = 0;
  for (const docSnap of snap.docs) {
    trackDeletedId(collectionPath, docSnap.id);
    batch.delete(docSnap.ref);
    count++;
    if (count >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) {
    await batch.commit();
  }
  return snap.size;
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (err: any) {
    console.error('Google Sign-In Error:', err);
    let errorMsg = err?.message || 'Gagal masuk dengan Google.';
    if (err?.code === 'auth/popup-blocked') {
      errorMsg = 'Jendela pop-up Google terblokir oleh browser. Izinkan pop-up untuk situs ini lalu coba lagi.';
    } else if (err?.code === 'auth/popup-closed-by-user') {
      errorMsg = 'Proses login Google dibatalkan (jendela ditutup sebelum selesai).';
    } else if (err?.code === 'auth/cancelled-popup-request') {
      errorMsg = 'Permintaan login Google sebelumnya dibatalkan. Silakan klik sekali lagi.';
    } else if (err?.code === 'auth/network-request-failed') {
      errorMsg = 'Koneksi internet terganggu saat menghubungkan ke akun Google.';
    }
    return { success: false, error: errorMsg };
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function onAuthUserChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Helper to recursively remove undefined properties and neutralize XSS/injection payloads
export function sanitizeData(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }
  if (typeof data === 'string') {
    // Allow safe raster data URL images, PDF, and video uploads directly without expensive regexes
    if (/^data:(image\/(png|jpe?g|gif|webp)|application\/pdf|video\/(mp4|webm|ogg));base64,/i.test(data)) {
      return data;
    }
    // Purge dangerous tags, inline event handlers, dangerous URI schemes, and deface URLs
    return data
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<svg[\s\S]*?>[\s\S]*?<\/svg>/gi, '')
      .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, '')
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
      .replace(/<form[\s\S]*?>[\s\S]*?<\/form>/gi, '')
      .replace(/<\/?(?:script|iframe|svg|object|embed|style|link|meta|form)[^>]*>/gi, '')
      .replace(/\bon[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(javascript|vbscript)\s*:/gi, 'blocked-uri:')
      .replace(/data\s*:\s*text\/html/gi, 'blocked-data:')
      .replace(/dhimasganteng\.netlify\.app[^\s"'>]*/gi, '')
      .replace(/deface\.js/gi, '');
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  if (typeof data === 'object') {
    if (data instanceof Date) {
      return data;
    }
    const clean: any = {};
    for (const key of Object.keys(data)) {
      if (data[key] !== undefined) {
        clean[key] = sanitizeData(data[key]);
      }
    }
    return clean;
  }
  return data;
}

// ============================================================================
// 1. DATA PROFIL STATIS ('users' COLLECTION) - getDoc() Tanpa Realtime Listener
// ============================================================================
export interface UserStaticProfile {
  uid: string;
  name: string;
  role: 'admin' | 'guru' | 'siswa' | 'orangtua';
  userClass?: string;
  nip?: string;
  nisn?: string;
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Mengambil data profil statis pengguna dari koleksi 'users' menggunakan getDoc() satu kali saat login.
 * Hemat biaya karena HANYA melakukan 1x read Firestore per login (tanpa persistent realtime listener).
 */
export async function getUserProfileOnce(userId: string): Promise<UserStaticProfile | null> {
  if (getActiveDbBackend() === 'supabase') {
    try {
      const data = await supabaseGetDocument<UserStaticProfile>('users', userId);
      if (data) return data;
    } catch { /* fallback to cache */ }
    const cached = safeLocalStorageGet(`user_profile_${userId}`);
    if (cached) {
      try { return JSON.parse(cached) as UserStaticProfile; } catch { /* ignore */ }
    }
    return null;
  }
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserStaticProfile;
    }
    // Cek cache lokal jika offline/gagal
    const cached = safeLocalStorageGet(`user_profile_${userId}`);
    if (cached) {
      return JSON.parse(cached) as UserStaticProfile;
    }
    return null;
  } catch (error) {
    console.warn(`[Firestore Profile] Gagal mengambil profil user ${userId}:`, error);
    const cached = safeLocalStorageGet(`user_profile_${userId}`);
    if (cached) {
      try { return JSON.parse(cached) as UserStaticProfile; } catch (e) { /* ignore */ }
    }
    return null;
  }
}

/**
 * Menyimpan / memperbarui profil statis di koleksi 'users'
 */
export async function saveUserProfile(userId: string, profileData: Partial<UserStaticProfile>) {
  const cleanData = sanitizeData({
    ...profileData,
    updatedAt: new Date().toISOString()
  });
  safeLocalStorageSet(`user_profile_${userId}`, JSON.stringify(cleanData));

  if (getActiveDbBackend() === 'supabase') {
    await supabaseSaveDocument('users', userId, cleanData).catch((e) => console.warn('[Supabase Profile] Error:', e));
    return;
  }

  try {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleQuotaError(error);
  }
}

// ============================================================================
// 2, 3, 4. TEKNIK DOCUMENT AGGREGATION (AGREGASI DOKUMEN DENGAN arrayUnion & CLIENT-SIDE SORTING)
// ============================================================================

/**
 * 3. Menambahkan data real-time baru ke array dalam SATU dokumen tunggal menggunakan operasi arrayUnion().
 * Mencegah overwriting data lama dan menghemat write request (1 update document saja).
 */
export async function appendAggregatedItem<T>(
  collectionPath: string,
  docId: string,
  newItem: T
) {
  const cleanItem = sanitizeData(newItem);
  if (getActiveDbBackend() === 'supabase') {
    const existing = await supabaseGetDocument<{ items?: T[]; createdAt?: string }>(collectionPath, docId).catch(() => null);
    const currentItems = Array.isArray(existing?.items) ? existing.items : [];
    await supabaseSaveDocument(collectionPath, docId, {
      items: [...currentItems, cleanItem],
      createdAt: existing?.createdAt || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    });
    return;
  }
  const docRef = doc(db, collectionPath, docId);

  try {
    // Coba tambahkan item ke array 'items' menggunakan arrayUnion
    await updateDoc(docRef, {
      items: arrayUnion(cleanItem),
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
      try {
        await setDoc(docRef, {
          items: [cleanItem],
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        handleQuotaError(e);
      }
    } else {
      handleQuotaError(error);
    }
  }
}

/**
 * Menghapus item dari array agregat menggunakan arrayRemove()
 */
export async function removeAggregatedItem<T>(
  collectionPath: string,
  docId: string,
  targetItem: T
) {
  const cleanTarget = sanitizeData(targetItem);
  if (getActiveDbBackend() === 'supabase') {
    const existing = await supabaseGetDocument<{ items?: T[] }>(collectionPath, docId).catch(() => null);
    const currentItems = Array.isArray(existing?.items) ? existing.items : [];
    const targetJson = JSON.stringify(cleanTarget);
    await supabaseSaveDocument(collectionPath, docId, {
      items: currentItems.filter((item) => JSON.stringify(item) !== targetJson),
      lastUpdated: new Date().toISOString(),
    });
    return;
  }
  const docRef = doc(db, collectionPath, docId);
  try {
    await updateDoc(docRef, {
      items: arrayRemove(cleanTarget),
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    handleQuotaError(error);
  }
}

export interface AggregatedSubscriptionOptions {
  sortKey?: string;      // Properti objek untuk pengurutan di client side (misal: 'timestamp' atau 'createdAt')
  reverse?: boolean;      // True jika ingin membalikkan urutan (misal: terbaru di atas)
  limitCount?: number;   // Membatasi jumlah data di memori client
}

/**
 * 4. Berlangganan (onSnapshot) secara spesifik ke SATU dokumen agregat tunggal (BUKAN seluruh koleksi).
 * Melakukan proses sorting/reversing data di sisi client (browser) untuk menghemat load/read quota server secara drastis.
 */
export function subscribeToAggregatedDoc<T>(
  collectionPath: string,
  docId: string,
  onUpdate: (items: T[]) => void,
  options: AggregatedSubscriptionOptions = {}
) {
  const cacheKey = `aggregated_cache_${collectionPath}_${docId}`;

  // Tampilkan data lokal/cached terlebih dahulu untuk respon UI instan
  const cachedData = safeLocalStorageGet(cacheKey);
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      if (Array.isArray(parsed)) {
        onUpdate(parsed);
      }
    } catch (e) {
      /* ignore */
    }
  }

  const processItems = (raw: T[]) => {
    let rawItems = [...raw];
    if (options.sortKey) {
      const key = options.sortKey;
      rawItems.sort((a: any, b: any) => {
        const valA = a[key] ?? '';
        const valB = b[key] ?? '';
        if (valA < valB) return options.reverse ? 1 : -1;
        if (valA > valB) return options.reverse ? -1 : 1;
        return 0;
      });
    } else if (options.reverse) {
      rawItems.reverse();
    }
    if (options.limitCount && options.limitCount > 0) {
      rawItems = rawItems.slice(0, options.limitCount);
    }
    onUpdate(rawItems);
    safeLocalStorageSet(cacheKey, JSON.stringify(rawItems));
  };

  if (getActiveDbBackend() === 'supabase') {
    return supabaseSyncSingleDoc<{ items?: T[] }>(collectionPath, docId, (data) => {
      processItems(Array.isArray(data?.items) ? data.items : []);
    });
  }

  const docRef = doc(db, collectionPath, docId);

  // Pasang onSnapshot SPESIFIK ke SATU DOKUMEN TUNGGAL (Hanya dihitung 1 read per snapshot update!)
  return onSnapshot(docRef, (snapshot) => {
    notifyFirestoreStatus('online');
    if (!snapshot.exists()) {
      onUpdate([]);
      safeLocalStorageSet(cacheKey, JSON.stringify([]));
      return;
    }

    const data = snapshot.data();
    const rawItems: T[] = Array.isArray(data?.items) ? data.items : [];
    processItems(rawItems);
  }, (error) => {
    handleQuotaError(error);
    console.warn(`[Document Aggregation Notice] Listener ${collectionPath}/${docId} terganggu, menggunakan data cache:`, error.message || error);
    const cached = safeLocalStorageGet(cacheKey);
    if (cached) {
      try {
        onUpdate(JSON.parse(cached));
      } catch (e) {
        /* ignore */
      }
    }
  });
}

// Activate Firestore network ONLY when Firestore is the active backend
if (getActiveDbBackend() !== 'supabase') {
  enableNetwork(db).catch(() => {});
}
safeLocalStorageSet('siakad_firestore_quota_exceeded', 'false');

function handleQuotaError(err: any) {
  if (isQuotaExceededError(err)) {
    const detail = formatFirestoreErrorMessage(err);
    notifyFirestoreQuota(true, detail);
    notifyFirestoreStatus('offline');
    console.warn('[Firestore] Daily read/write quota exceeded:', err?.message || err);
  } else if (err) {
    console.warn('[Firestore notice]:', err?.message || err);
  }
}

// Helpers for tracking locally deleted IDs so they never reappear upon server reconnect
export function trackDeletedId(collectionPath: string, id: string) {
  if (!id) return;
  const key = `siakad_deleted_${collectionPath}`;
  const existing = safeLocalStorageGet(key);
  let ids: string[] = [];
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed)) ids = parsed;
    } catch { /* ignore */ }
  }
  if (!ids.includes(id)) {
    ids.push(id);
    safeLocalStorageSet(key, JSON.stringify(ids));
  }
}

export function untrackDeletedId(collectionPath: string, id: string) {
  if (!id) return;
  const key = `siakad_deleted_${collectionPath}`;
  const existing = safeLocalStorageGet(key);
  if (existing) {
    try {
      let ids: string[] = JSON.parse(existing);
      if (Array.isArray(ids)) {
        ids = ids.filter((item) => item !== id);
        safeLocalStorageSet(key, JSON.stringify(ids));
      }
    } catch { /* ignore */ }
  }
}

export function getDeletedIds(collectionPath: string): Set<string> {
  const key = `siakad_deleted_${collectionPath}`;
  const existing = safeLocalStorageGet(key);
  if (existing) {
    try {
      const ids = JSON.parse(existing);
      if (Array.isArray(ids)) return new Set(ids);
    } catch { /* ignore */ }
  }
  return new Set();
}

export function clearDeletedIds(collectionPath: string) {
  const key = `siakad_deleted_${collectionPath}`;
  safeLocalStorageSet(key, JSON.stringify([]));
}

// Helper to monitor and sync a collection in real-time (Supabase PostgreSQL or Firestore)
export function syncCollection<T extends { id: string }>(
  collectionPath: string,
  onUpdate: (data: T[]) => void,
  initialData: T[] = [],
  forceRealtime: boolean = true
) {
  if (getActiveDbBackend() === 'supabase') {
    return supabaseSyncCollection<T>(collectionPath, onUpdate, initialData);
  }
  const colRef = collection(db, collectionPath);
  const cacheKey = `siakad_${collectionPath}`;
  const initKey = `siakad_col_initialized_${collectionPath}`;

  // 1. Instantly display cached data from localStorage so UI is non-blocking on first render
  const loadFallback = () => {
    const cached = safeLocalStorageGet(cacheKey);
    const deletedIds = getDeletedIds(collectionPath);
    if (cached) {
      // Purge any corrupted or injected local cache
      if (
        cached.includes('dhimasganteng') ||
        cached.includes('deface.js') ||
        /<script/i.test(cached) ||
        /onerror\s*=/i.test(cached)
      ) {
        try {
          localStorage.removeItem(cacheKey);
        } catch (_) {}
      } else {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const filtered = parsed.filter((item: any) => item && item.id && !deletedIds.has(item.id));
            if (filtered.length > 0) {
              onUpdate(filtered as T[]);
              return true;
            }
          }
        } catch (e) {
          console.error(`Error parsing cached data for ${collectionPath}:`, e);
        }
      }
    }
    // Only fall back to initialData display if this client has never seen this collection before
    const isAlreadyInitialized = safeLocalStorageGet(initKey) === 'true';
    if (!isAlreadyInitialized && initialData && initialData.length > 0) {
      const filtered = initialData.filter((item) => item && item.id && !deletedIds.has(item.id));
      onUpdate(filtered);
      return true;
    }
    onUpdate([]);
    return false;
  };
  
  loadFallback();

  // 2. Real-time Firestore Listener: Firestore is the single authoritative source of truth.
  const unsubscribeSnapshot = onSnapshot(colRef, async (snapshot) => {
    if (!snapshot.metadata.fromCache) {
      notifyFirestoreStatus('online');
      notifyFirestoreQuota(false);
    }
    const isInitializedLocally = safeLocalStorageGet(initKey) === 'true';
    const deletedIds = getDeletedIds(collectionPath);

    // Build items strictly from Firestore snapshot
    const serverItems: T[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data) {
        const docId = docSnap.id;
        const internalId = (data as any).id;

        // If tracked as deleted, make sure it is removed from Firestore and skipped
        if (deletedIds.has(docId) || (internalId && deletedIds.has(internalId))) {
          deleteDoc(docSnap.ref).catch(handleQuotaError);
        } else {
          serverItems.push({ ...(data as T), id: docSnap.id });
        }
      }
    });

    // Check if initial seeding is genuinely needed (only if DB was NEVER initialized anywhere)
    if (serverItems.length === 0 && !isInitializedLocally && initialData && initialData.length > 0) {
      try {
        const sysInitDoc = await getDoc(doc(db, 'settings', 'system_init'));
        if (!sysInitDoc.exists()) {
          // Fresh Firestore setup: Seed baseline once and record system_init so it NEVER re-seeds again
          let batch = writeBatch(db);
          let count = 0;
          for (const item of initialData) {
            if (!item || !item.id || deletedIds.has(item.id)) continue;
            const docRef = doc(db, collectionPath, item.id);
            batch.set(docRef, sanitizeData(item), { merge: true });
            count++;
            if (count >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
          if (count > 0) {
            await batch.commit();
          }
          await setDoc(doc(db, 'settings', 'system_init'), {
            initialized: true,
            initializedAt: new Date().toISOString()
          }, { merge: true });
          const validInitial = initialData.filter(i => i && i.id && !deletedIds.has(i.id));
          safeLocalStorageSet(initKey, 'true');
          safeLocalStorageSet(cacheKey, JSON.stringify(validInitial));
          onUpdate(validInitial);
          return;
        }
      } catch (err) {
        handleQuotaError(err);
      }
    }

    // Server data is 100% authoritative: Update UI state and keep local storage in sync
    safeLocalStorageSet(initKey, 'true');
    safeLocalStorageSet(cacheKey, JSON.stringify(serverItems));
    onUpdate(serverItems);
  }, (error) => {
    handleQuotaError(error);
    if (isPermissionDeniedError(error)) {
      console.error(`[Firestore Security Notice] ${collectionPath}:`, error.message || error);
    } else {
      console.warn(`[Firestore Realtime Notice] ${collectionPath} network issue, maintaining cache:`, error.message || error);
    }
    notifyFirestoreStatus('offline');
    loadFallback();
  });

  return () => {
    unsubscribeSnapshot();
  };
}

export interface KopSuratSettings {
  name: string;
  nip?: string;
  logoLeft?: string;
  logoRight?: string;
  govTitle?: string;
  deptTitle?: string;
  sudinTitle?: string;
  schoolTitle?: string;
  addressText?: string;
  contactText?: string;
  docNumber?: string;
  photo?: string;
  headImage?: string;
}

// Single-document settings sync helper
export function syncHeadmaster(onUpdate: (settings: KopSuratSettings) => void, defaultName: string) {
  const defaultPhoto = safeLocalStorageGet('siakad_headmaster_photo') || 'https://lh3.googleusercontent.com/d/1SoERM5qadbCj4AeCOUhZcJpDDi0fEVNj';
  const defaults: KopSuratSettings = {
    name: defaultName,
    nip: '196711261991032004',
    logoLeft: '',
    logoRight: '',
    govTitle: 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA',
    deptTitle: 'DINAS PENDIDIKAN PROVINSI DKI JAKARTA',
    sudinTitle: 'SUDIN PENDIDIKAN WILAYAH II KOTA ADMINISTRASI JAKARTA TIMUR',
    schoolTitle: 'SMP NEGERI 50 JAKARTA',
    addressText: 'Komplek Kodam Jaya Cililitan II Kramat Jati – Jakarta Timur – Kode Pos : 13510',
    contactText: 'Telp. (021) 8091734 – Fax (021) 809173 – Email : smpnegeri50@gmail.com, smpn50.jt2@gmail.com',
    docNumber: '',
    photo: defaultPhoto,
    headImage: defaultPhoto
  };
  if (getActiveDbBackend() === 'supabase') {
    return supabaseSyncSingleDoc<KopSuratSettings>('settings', 'headmaster', (data) => {
      onUpdate({ ...defaults, ...(data || {}) });
    }, defaults);
  }
  const docRef = doc(db, 'settings', 'headmaster');
  return onSnapshot(docRef, async (snapshot) => {
    notifyFirestoreStatus('online');
    if (!snapshot.exists()) {
      try {
        await setDoc(docRef, defaults);
      } catch (e) {
        console.warn('Could not set headmaster default in Firestore:', e);
      }
      onUpdate(defaults);
    } else {
      const data = snapshot.data();
      const currentPhoto = data.photo || data.headImage || safeLocalStorageGet('siakad_headmaster_photo') || 'https://lh3.googleusercontent.com/d/1SoERM5qadbCj4AeCOUhZcJpDDi0fEVNj';
      onUpdate({
        name: data.name || defaultName,
        nip: data.nip || '196711261991032004',
        logoLeft: data.logoLeft || '',
        logoRight: data.logoRight || '',
        govTitle: data.govTitle || 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA',
        deptTitle: data.deptTitle || 'DINAS PENDIDIKAN PROVINSI DKI JAKARTA',
        sudinTitle: data.sudinTitle || 'SUDIN PENDIDIKAN WILAYAH II KOTA ADMINISTRASI JAKARTA TIMUR',
        schoolTitle: data.schoolTitle || 'SMP NEGERI 50 JAKARTA',
        addressText: data.addressText || 'Komplek Kodam Jaya Cililitan II Kramat Jati – Jakarta Timur – Kode Pos : 13510',
        contactText: data.contactText || 'Telp. (021) 8091734 – Fax (021) 809173 – Email : smpnegeri50@gmail.com, smpn50.jt2@gmail.com',
        docNumber: data.docNumber || '',
        photo: currentPhoto,
        headImage: currentPhoto
      });
    }
  }, (error) => {
    console.warn('Error syncing headmaster (using local cache / default fallback):', error.message || error);
    const cachedName = safeLocalStorageGet('siakad_headmaster_name') || defaultName;
    const cachedNip = safeLocalStorageGet('siakad_headmaster_nip') || '196711261991032004';
    const cachedPhoto = safeLocalStorageGet('siakad_headmaster_photo') || 'https://lh3.googleusercontent.com/d/1SoERM5qadbCj4AeCOUhZcJpDDi0fEVNj';
    onUpdate({
      name: cachedName,
      nip: cachedNip,
      logoLeft: '',
      logoRight: '',
      govTitle: 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA',
      deptTitle: 'DINAS PENDIDIKAN PROVINSI DKI JAKARTA',
      sudinTitle: 'SUDIN PENDIDIKAN WILAYAH II KOTA ADMINISTRASI JAKARTA TIMUR',
      schoolTitle: 'SMP NEGERI 50 JAKARTA',
      addressText: 'Komplek Kodam Jaya Cililitan II Kramat Jati – Jakarta Timur – Kode Pos : 13510',
      contactText: 'Telp. (021) 8091734 – Fax (021) 809173 – Email : smpnegeri50@gmail.com, smpn50.jt2@gmail.com',
      docNumber: '',
      photo: cachedPhoto,
      headImage: cachedPhoto
    });
  });
}

// Single-document CBT PIN settings sync helper
export function syncCbtConfig(onUpdate: (pin: string) => void, defaultPin: string = '9999') {
  if (getActiveDbBackend() === 'supabase') {
    return supabaseSyncSingleDoc<{ bypassPin: string }>('settings', 'cbt_config', (data) => {
      onUpdate(data?.bypassPin || defaultPin);
    }, { bypassPin: defaultPin });
  }
  const docRef = doc(db, 'settings', 'cbt_config');
  return onSnapshot(docRef, async (snapshot) => {
    notifyFirestoreStatus('online');
    if (!snapshot.exists()) {
      try {
        await setDoc(docRef, { bypassPin: defaultPin });
      } catch (e) {
        console.warn('Could not set CBT config default in Firestore:', e);
      }
      onUpdate(defaultPin);
    } else {
      const data = snapshot.data();
      onUpdate(data.bypassPin || defaultPin);
    }
  }, (error) => {
    console.warn('Error syncing CBT config (using default fallback):', error.message || error);
    onUpdate(defaultPin);
  });
}

export async function saveCbtBypassPin(pin: string) {
  safeLocalStorageSet('siakad_cbt_pin', pin);
  if (getActiveDbBackend() === 'supabase') {
    await supabaseSaveDocument('settings', 'cbt_config', { bypassPin: pin });
    return;
  }
  try {
    const docRef = doc(db, 'settings', 'cbt_config');
    await setDoc(docRef, { bypassPin: pin }, { merge: true });
  } catch (e) {
    handleQuotaError(e);
  }
}

export interface CardDesignFirestoreSettings {
  presetId?: string;
  bgType?: 'preset' | 'custom_image';
  customBgImage?: string;
  showWatermark?: boolean;
  watermarkOpacity?: number;
  backTitle?: string;
  rules?: string[];
  footerNote?: string;
  cardLogo?: string;
  cardTitle?: string;
  cardSubtitle?: string;
  cardValidity?: string;
  issueDate?: string;
  schoolName?: string;
  headmasterName?: string;
  headmasterNip?: string;
}

export function syncCardDesign(onUpdate: (settings: CardDesignFirestoreSettings) => void) {
  if (getActiveDbBackend() === 'supabase') {
    return supabaseSyncSingleDoc<CardDesignFirestoreSettings>('settings', 'card_design', (data) => {
      if (data) onUpdate(data);
    });
  }
  const docRef = doc(db, 'settings', 'card_design');
  return onSnapshot(docRef, async (snapshot) => {
    notifyFirestoreStatus('online');
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as CardDesignFirestoreSettings);
    }
  }, (error) => {
    console.warn('Error syncing card design from Firestore:', error.message || error);
  });
}

export async function saveCardDesignToFirestore(settings: CardDesignFirestoreSettings): Promise<void> {
  if (getActiveDbBackend() === 'supabase') {
    await supabaseSaveDocument('settings', 'card_design', settings);
    return;
  }
  try {
    const docRef = doc(db, 'settings', 'card_design');
    await setDoc(docRef, sanitizeData(settings), { merge: true });
  } catch (e) {
    console.warn('Could not save card design to Firestore:', e);
  }
}

// Write/Update document helper (now propagates server/quota/permission errors to caller)
export async function saveDocument(collectionPath: string, id: string, data: any): Promise<void> {
  if (!id) return;
  untrackDeletedId(collectionPath, id);

  if (getActiveDbBackend() === 'supabase') {
    await supabaseSaveDocument(collectionPath, id, data);
    notifyFirestoreStatus('online');
    notifyFirestoreQuota(false);
    return;
  }

  const cleanData = sanitizeData({
    id,
    ...data,
    updatedAt: new Date().toISOString()
  });

  // Update local cache first for zero-latency UI responsiveness
  try {
    const cacheKey = `siakad_${collectionPath}`;
    const cached = safeLocalStorageGet(cacheKey);
    let parsed: any[] = [];
    if (cached) {
      try {
        const val = JSON.parse(cached);
        if (Array.isArray(val)) parsed = val;
      } catch (e) { /* ignore */ }
    }
    const idx = parsed.findIndex((item: any) => item && item.id === id);
    if (idx >= 0) {
      parsed[idx] = { ...parsed[idx], ...cleanData, id };
    } else {
      parsed.push({ id, ...cleanData });
    }
    safeLocalStorageSet(cacheKey, JSON.stringify(parsed));
  } catch (e) {
    console.warn(`Local cache save error for ${collectionPath}:`, e);
  }

  const docRef = doc(db, collectionPath, id);
  try {
    await setDoc(docRef, cleanData, { merge: true });
    notifyFirestoreStatus('online');
    notifyFirestoreQuota(false);
  } catch (error) {
    handleQuotaError(error);
    if (isPermissionDeniedError(error)) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionPath}/${id}`);
    }
    throw error;
  }
}

// Write a full array to Firestore/Supabase by syncing with existing documents (deleting missing, setting existing)
export async function syncCollectionWithArray(collectionPath: string, data: any[]) {
  if (getActiveDbBackend() === 'supabase') {
    await supabaseSyncCollectionWithArray(collectionPath, data);
    return;
  }
  const cacheKey = `siakad_${collectionPath}`;
  
  const newIds = new Set(data.map(item => item && item.id).filter(Boolean));
  data.forEach((item) => {
    if (item && item.id) untrackDeletedId(collectionPath, item.id);
  });

  const previousIds = new Set<string>();
  const cached = safeLocalStorageGet(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          if (item && item.id) previousIds.add(item.id);
        });
      }
    } catch (e) { /* ignore */ }
  }

  for (const docId of previousIds) {
    if (!newIds.has(docId)) {
      trackDeletedId(collectionPath, docId);
    }
  }

  try {
    safeLocalStorageSet(cacheKey, JSON.stringify(data));
  } catch (e) {
    console.warn(`Local cache save error for ${collectionPath}:`, e);
  }

  try {
    let batch = writeBatch(db);
    let operationCount = 0;
    
    // Delete items removed in local state
    for (const docId of previousIds) {
      if (!newIds.has(docId)) {
        batch.delete(doc(db, collectionPath, docId));
        operationCount++;
        if (operationCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }
    }
    
    // Add or update all items
    for (const item of data) {
      if (!item || !item.id) continue;
      batch.set(doc(db, collectionPath, item.id), sanitizeData(item), { merge: true });
      operationCount++;
      if (operationCount >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
      }
    }
    
    if (operationCount > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleQuotaError(error);
  }
}

// Delete document helper
export async function deleteDocument(collectionPath: string, id: string) {
  if (!id) return;
  trackDeletedId(collectionPath, id);
  if (getActiveDbBackend() === 'supabase') {
    await supabaseDeleteDocument(collectionPath, id);
    return;
  }

  // Prune from local cache immediately
  try {
    const cacheKey = `siakad_${collectionPath}`;
    const cached = safeLocalStorageGet(cacheKey);
    if (cached) {
      let parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        parsed = parsed.filter((item: any) => item && item.id !== id);
        safeLocalStorageSet(cacheKey, JSON.stringify(parsed));
      }
    }
  } catch (e) {
    console.warn(`Local cache deletion error for ${collectionPath}:`, e);
  }

  try {
    const docRef = doc(db, collectionPath, id);
    await deleteDoc(docRef);

    const q = query(collection(db, collectionPath), where('id', '==', id));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    handleQuotaError(error);
    if (isPermissionDeniedError(error)) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionPath}/${id}`);
    }
    throw error;
  }
}

// Save multiple documents in a single batch safely
export async function saveDocumentsBatch(collectionPath: string, items: any[]) {
  if (!items || items.length === 0) return;
  items.forEach((item) => {
    if (item && item.id) untrackDeletedId(collectionPath, item.id);
  });
  if (getActiveDbBackend() === 'supabase') {
    await supabaseSaveDocumentsBatch(collectionPath, items);
    notifyFirestoreStatus('online');
    notifyFirestoreQuota(false);
    return;
  }

  try {
    const cacheKey = `siakad_${collectionPath}`;
    const cached = safeLocalStorageGet(cacheKey);
    let parsed: any[] = [];
    if (cached) {
      try {
        const val = JSON.parse(cached);
        if (Array.isArray(val)) parsed = val;
      } catch (e) { /* ignore */ }
    }
    items.forEach((item) => {
      if (!item || !item.id) return;
      const idx = parsed.findIndex((el: any) => el && el.id === item.id);
      if (idx >= 0) {
        parsed[idx] = { ...parsed[idx], ...sanitizeData(item) };
      } else {
        parsed.push({ ...sanitizeData(item) });
      }
    });
    safeLocalStorageSet(cacheKey, JSON.stringify(parsed));
  } catch (e) {
    console.warn(`Local cache save error for ${collectionPath}:`, e);
  }

  try {
    let batch = writeBatch(db);
    let count = 0;
    for (const item of items) {
      if (!item || !item.id) continue;
      const docRef = doc(db, collectionPath, item.id);
      batch.set(docRef, sanitizeData({ ...item, updatedAt: new Date().toISOString() }), { merge: true });
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
    notifyFirestoreStatus('online');
    notifyFirestoreQuota(false);
  } catch (error) {
    handleQuotaError(error);
    if (isPermissionDeniedError(error)) {
      handleFirestoreError(error, OperationType.WRITE, collectionPath);
    }
    throw error;
  }
}

// Delete multiple documents in a single batch safely
export async function deleteDocumentsBatch(collectionPath: string, ids: string[]) {
  if (!ids || ids.length === 0) return;
  ids.forEach(id => trackDeletedId(collectionPath, id));
  if (getActiveDbBackend() === 'supabase') {
    await supabaseDeleteDocumentsBatch(collectionPath, ids);
    return;
  }

  try {
    const cacheKey = `siakad_${collectionPath}`;
    const cached = safeLocalStorageGet(cacheKey);
    if (cached) {
      let parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        const idSet = new Set(ids);
        parsed = parsed.filter((item: any) => item && !idSet.has(item.id));
        safeLocalStorageSet(cacheKey, JSON.stringify(parsed));
      }
    }
  } catch (e) {
    console.warn(`Local cache batch deletion error for ${collectionPath}:`, e);
  }

  try {
    let batch = writeBatch(db);
    let count = 0;
    for (const id of ids) {
      if (!id) continue;
      const docRef = doc(db, collectionPath, id);
      batch.delete(docRef);
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleQuotaError(error);
    if (isPermissionDeniedError(error)) {
      handleFirestoreError(error, OperationType.DELETE, collectionPath);
    }
    throw error;
  }
}

// Clear database helper
export async function clearAllCollections(collectionsToClear: string[]) {
  if (getActiveDbBackend() === 'supabase') {
    await supabaseClearAllCollections(collectionsToClear);
    return;
  }
  try {
    for (const colName of collectionsToClear) {
      const cacheKey = `siakad_${colName}`;
      const initKey = `siakad_col_initialized_${colName}`;
      safeLocalStorageSet(cacheKey, JSON.stringify([]));
      safeLocalStorageSet(initKey, 'true');
      clearDeletedIds(colName);

      try {
        const querySnapshot = await getDocs(collection(db, colName));
        let batch = writeBatch(db);
        let count = 0;
        for (const docSnap of querySnapshot.docs) {
          batch.delete(docSnap.ref);
          count++;
          if (count >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) {
          await batch.commit();
        }
      } catch (err) {
        handleQuotaError(err);
      }
    }
    // Reset headmaster doc
    const docRef = doc(db, 'settings', 'headmaster');
    const defaultHeadmaster = { name: 'Dra. Hj. Endah Purwani, M.M.', nip: '196711261991032004' };
    safeLocalStorageSet('siakad_headmaster', JSON.stringify(defaultHeadmaster));
    setDoc(docRef, defaultHeadmaster).catch(handleQuotaError);
  } catch (error) {
    handleQuotaError(error);
  }
}

// LOGIKA PENGHEMATAN KUOTA: Mengambil data absensi terbatas menggunakan query, filter where (tanggal/bulan), dan limit(50) untuk paginasi guna menghemat kuota Read
export async function getAttendanceWithFilter(
  dateFilter?: string,
  startAfterDoc?: any,
  limitCount: number = 50
) {
  if (getActiveDbBackend() === 'supabase') {
    return supabaseGetAttendanceWithFilter(dateFilter, limitCount);
  }
  try {
    const colRef = collection(db, 'attendance');
    let q = query(colRef);
    
    if (dateFilter) {
      // Filter where berdasarkan tanggal tertentu
      q = query(colRef, where('date', '==', dateFilter), orderBy('timestamp', 'desc'), limit(limitCount));
    } else {
      // Default: Ambil bulan berjalan untuk menghindari load ribuan record lawas
      const currentMonth = new Date().toISOString().substring(0, 7); // Format: "YYYY-MM"
      q = query(
        colRef, 
        where('date', '>=', `${currentMonth}-01`), 
        where('date', '<=', `${currentMonth}-31`), 
        orderBy('date', 'desc'), 
        limit(limitCount)
      );
    }
    
    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }
    
    const snapshot = await getDocs(q);
    const items: any[] = [];
    snapshot.forEach((doc) => {
      items.push({ ...doc.data(), id: doc.id });
    });
    return {
      items,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
    };
  } catch (error) {
    console.warn("Error fetching paginated attendance with filter (using local storage cache fallback):", error);
    const cached = localStorage.getItem('siakad_attendance');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          let items = parsed;
          if (dateFilter) {
            items = items.filter((a: any) => a.date === dateFilter);
          }
          return { items: items.slice(0, limitCount), lastDoc: null };
        }
      } catch (e) {
        console.error("Failed parsing cached attendance:", e);
      }
    }
    return { items: [], lastDoc: null };
  }
}

// Helper to deduplicate student records based on NISN and ID, keeping only 1 account per NISN
export function deduplicateStudents<T extends { id: string; nisn?: string; password?: string; phone?: string; parentPhone?: string; address?: string }>(
  studentsList: T[]
): { uniqueStudents: T[]; removedIds: string[] } {
  if (!Array.isArray(studentsList)) return { uniqueStudents: [], removedIds: [] };

  const seenNisnMap = new Map<string, T>();
  const seenIdMap = new Map<string, T>();
  const removedIds: string[] = [];

  studentsList.forEach((s) => {
    if (!s || !s.id) return;

    // Check duplicate ID
    if (seenIdMap.has(s.id)) {
      removedIds.push(s.id);
      return;
    }
    seenIdMap.set(s.id, s);

    // Check duplicate NISN
    const nisnKey = s.nisn ? String(s.nisn).trim() : '';
    if (nisnKey) {
      if (seenNisnMap.has(nisnKey)) {
        const existing = seenNisnMap.get(nisnKey)!;
        // Compare completeness score: password, phone, parentPhone, address
        const existingScore = (existing.password ? 5 : 0) + (existing.phone ? 2 : 0) + (existing.parentPhone ? 2 : 0) + (existing.address ? 1 : 0);
        const currentScore = (s.password ? 5 : 0) + (s.phone ? 2 : 0) + (s.parentPhone ? 2 : 0) + (s.address ? 1 : 0);

        if (currentScore > existingScore) {
          // Replace existing with current (mark existing id for removal)
          removedIds.push(existing.id);
          seenNisnMap.set(nisnKey, s);
        } else {
          // Keep existing, mark current id for removal
          removedIds.push(s.id);
        }
      } else {
        seenNisnMap.set(nisnKey, s);
      }
    }
  });

  const removedSet = new Set(removedIds);
  const uniqueStudents = studentsList.filter((s) => s && s.id && !removedSet.has(s.id));
  return { uniqueStudents, removedIds };
}