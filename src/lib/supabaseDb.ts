import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { safeLocalStorageSet, safeLocalStorageGet } from '../utils/storageHelper';

const TABLE_NAME = 'sias_documents';

// Known static collections across the entire SIAS application
export const ALL_SIAS_COLLECTIONS = [
  'classes',
  'teachers',
  'students',
  'pending_registrations',
  'web_content',
  'settings',
  'users',
  'violation_types',
  'violations',
  'attendance',
  'counselor_notes',
  'homeroom_notes',
  'parent_messages',
  'exam_schedules',
  'exam_grades',
  'student_submissions',
  'question_banks',
  'absent_teachers',
  'important_events',
  'teaching_journals',
  'bimbingan_journals',
  'bimbingan_schedules',
  'student_achievements',
  'elearning_materials',
  'elearning_progress',
  'pemberkasan_schedules',
  'nomor_surat',
  'inventory_items',
  'inventory_loans',
  'bos_bop_reports',
  'eco_categories',
  'eco_rewards',
  'eco_deposits',
  'eco_redemptions',
  'eco_config',
  'student_permits',
  'ekskul_members',
] as const;

type StatusCallback = (status: 'online' | 'offline' | 'high_latency', latency?: number) => void;
let statusNotifier: StatusCallback = () => {};

export function setSupabaseStatusNotifier(cb: StatusCallback) {
  statusNotifier = cb;
}

// Local sanitization mirror (avoid circular dependency with firebase.ts)
export function sanitizeForStorage(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }
  if (typeof data === 'string') {
    if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(data)) {
      return data;
    }
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
    return data.map(sanitizeForStorage);
  }
  if (typeof data === 'object') {
    if (data instanceof Date) {
      return data.toISOString();
    }
    const clean: any = {};
    for (const key of Object.keys(data)) {
      if (data[key] !== undefined) {
        clean[key] = sanitizeForStorage(data[key]);
      }
    }
    return clean;
  }
  return data;
}

function getLocalDeletedIds(collectionPath: string): Set<string> {
  const existing = safeLocalStorageGet(`siakad_deleted_${collectionPath}`);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed)) return new Set(parsed);
    } catch {
      /* ignore */
    }
  }
  return new Set();
}

export function formatSupabaseErrorMessage(err: any): string {
  const code = String(err?.code || '').toUpperCase();
  const msg = String(err?.message || err || 'Kesalahan koneksi Supabase');

  if (msg.toLowerCase().includes('forbidden use of secret api key in browser')) {
    return 'Kunci API yang dimasukkan ke VITE_SUPABASE_ANON_KEY adalah Secret Key (sb_secret_... / service_role), yang dilarang dipakai di browser. Ganti dengan Publishable Key (sb_publishable_...) atau anon public key dari Supabase -> Project Settings -> API Keys, lalu redeploy/restart.';
  }
  if (code === '42P01' || (msg.includes('sias_documents') && msg.includes('does not exist'))) {
    return 'Tabel public.sias_documents belum dibuat di Supabase. Jalankan skrip SQL setup di Supabase Dashboard -> SQL Editor terlebih dahulu.';
  }
  if (code === '42501' || msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('permission denied')) {
    return 'Akses ditolak oleh kebijakan Row Level Security (RLS) Supabase. Pastikan skrip setup SQL terbaru sudah dijalankan.';
  }
  if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
    return 'Gagal menghubungi server Supabase. Periksa koneksi internet atau VITE_SUPABASE_URL Anda.';
  }
  return msg;
}

// ============================================================================
// SINGLE SHARED REALTIME CHANNEL + IN-MEMORY COLLECTION STORE
// ============================================================================
type CollectionListener = (items: any[]) => void;
const collectionListeners = new Map<string, Set<CollectionListener>>();
const singleDocListeners = new Map<string, Set<(docData: any | null) => void>>();
const collectionCache = new Map<string, Map<string, any>>();
const inflightFetches = new Map<string, Promise<any[]>>();
let sharedRealtimeChannel: RealtimeChannel | null = null;

function notifyCollectionSubscribers(collectionPath: string) {
  const map = collectionCache.get(collectionPath);
  const deletedIds = getLocalDeletedIds(collectionPath);
  const items = map
    ? Array.from(map.values()).filter((item) => item && item.id && !deletedIds.has(item.id))
    : [];

  if (collectionPath !== 'settings') {
    safeLocalStorageSet(`siakad_col_initialized_${collectionPath}`, 'true');
    safeLocalStorageSet(`siakad_${collectionPath}`, JSON.stringify(items));
  }

  const listeners = collectionListeners.get(collectionPath);
  if (listeners) {
    listeners.forEach((cb) => {
      try {
        cb(items);
      } catch (e) {
        console.warn(`[Supabase] Listener error for ${collectionPath}:`, e);
      }
    });
  }

  // Also notify any single-doc listeners (e.g. settings/headmaster)
  if (map) {
    map.forEach((docObj, docId) => {
      const key = `${collectionPath}::${docId}`;
      const docListeners = singleDocListeners.get(key);
      if (docListeners) {
        docListeners.forEach((cb) => {
          try {
            cb(docObj);
          } catch {
            /* ignore */
          }
        });
      }
    });
  }
}

function ensureSharedRealtimeSubscription() {
  if (!supabase || sharedRealtimeChannel) return;

  sharedRealtimeChannel = supabase
    .channel('sias_documents_realtime_sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE_NAME },
      (payload) => {
        statusNotifier('online');
        const row = (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) as any;
        const colName = row?.collection_name;
        const docId = row?.id;
        if (!colName || !docId) return;

        let map = collectionCache.get(colName);
        if (!map) {
          map = new Map<string, any>();
          collectionCache.set(colName, map);
        }

        if (payload.eventType === 'DELETE') {
          map.delete(docId);
          const singleKey = `${colName}::${docId}`;
          singleDocListeners.get(singleKey)?.forEach((cb) => cb(null));
        } else {
          const docData = { ...(row.data || {}), id: docId };
          map.set(docId, docData);
        }

        notifyCollectionSubscribers(colName);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        statusNotifier('online');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        statusNotifier('high_latency');
      }
    });
}

async function fetchCollectionRows(collectionPath: string): Promise<any[]> {
  if (!supabase) return [];

  const existingFetch = inflightFetches.get(collectionPath);
  if (existingFetch) return existingFetch;

  const promise = (async () => {
    const startTime = performance.now();
    // Paginate cleanly in 1000-row chunks so large schools never truncate at Supabase default 1000 limit
    const allRows: any[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase!
        .from(TABLE_NAME)
        .select('id, data')
        .eq('collection_name', collectionPath)
        .range(from, from + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    const latency = Math.round(performance.now() - startTime);
    statusNotifier('online', latency);

    const map = new Map<string, any>();
    for (const row of allRows) {
      if (row && row.id) {
        map.set(row.id, { ...(row.data || {}), id: row.id });
      }
    }
    collectionCache.set(collectionPath, map);
    return Array.from(map.values());
  })();

  inflightFetches.set(collectionPath, promise);
  try {
    return await promise;
  } finally {
    inflightFetches.delete(collectionPath);
  }
}

function getCachedMergedDoc(collectionPath: string, id: string): Record<string, any> | null {
  const memDoc = collectionCache.get(collectionPath)?.get(id);
  if (memDoc && typeof memDoc === 'object') return memDoc;

  const localStr = safeLocalStorageGet(`siakad_${collectionPath}`);
  if (localStr) {
    try {
      const parsed = JSON.parse(localStr);
      if (Array.isArray(parsed)) {
        const found = parsed.find((x: any) => x && x.id === id);
        if (found) return found;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

// ============================================================================
// PUBLIC DROP-IN ADAPTER FUNCTIONS
// ============================================================================

export function supabaseSyncCollection<T extends { id: string }>(
  collectionPath: string,
  onUpdate: (data: T[]) => void,
  initialData: T[] = []
): () => void {
  const cacheKey = `siakad_${collectionPath}`;
  const initKey = `siakad_col_initialized_${collectionPath}`;
  const deletedIds = getLocalDeletedIds(collectionPath);

  // Instant cached load
  const loadFallback = () => {
    const cached = safeLocalStorageGet(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((item: any) => item && item.id && !deletedIds.has(item.id));
          if (filtered.length > 0) {
            onUpdate(filtered as T[]);
            return;
          }
        }
      } catch {
        /* ignore */
      }
    }
    const isAlreadyInitialized = safeLocalStorageGet(initKey) === 'true';
    if (!isAlreadyInitialized && initialData.length > 0) {
      onUpdate(initialData.filter((i) => i && i.id && !deletedIds.has(i.id)));
      return;
    }
    onUpdate([]);
  };

  loadFallback();

  let listeners = collectionListeners.get(collectionPath);
  if (!listeners) {
    listeners = new Set();
    collectionListeners.set(collectionPath, listeners);
  }
  listeners.add(onUpdate);

  ensureSharedRealtimeSubscription();

  // Fetch authoritative rows from Supabase PostgreSQL
  (async () => {
    if (!supabase) return;
    try {
      const serverItems = await fetchCollectionRows(collectionPath);

      if (serverItems.length === 0 && initialData.length > 0) {
        const initDocId = `init_${collectionPath}`;
        const { data: colInit } = await supabase
          .from(TABLE_NAME)
          .select('id')
          .eq('collection_name', 'settings')
          .eq('id', initDocId)
          .maybeSingle();

        // Always seed an uninitialized Supabase database regardless of stale browser localStorage
        const shouldSeed = !colInit;

        if (shouldSeed) {
          const toSeed = initialData.filter((item) => item && item.id && !deletedIds.has(item.id));
          if (toSeed.length > 0) {
            await supabaseSaveDocumentsBatch(collectionPath, toSeed);
          }
          await supabaseSaveDocument('settings', initDocId, {
            initialized: true,
            collection: collectionPath,
            initializedAt: new Date().toISOString(),
          });
          notifyCollectionSubscribers(collectionPath);
          return;
        }
      }

      if (serverItems.length === 0 && collectionPath === 'web_content' && initialData.length > 0) {
        const map = new Map<string, any>();
        initialData.forEach((item) => {
          if (item && item.id) map.set(item.id, item);
        });
        collectionCache.set(collectionPath, map);
      }

      notifyCollectionSubscribers(collectionPath);
    } catch (err) {
      console.warn(`[Supabase] Failed loading ${collectionPath}:`, formatSupabaseErrorMessage(err));
      statusNotifier('offline');
    }
  })();

  return () => {
    const set = collectionListeners.get(collectionPath);
    if (set) {
      set.delete(onUpdate);
      if (set.size === 0) collectionListeners.delete(collectionPath);
    }
  };
}

export function supabaseSyncSingleDoc<T extends Record<string, any>>(
  collectionPath: string,
  docId: string,
  onUpdate: (data: T | null) => void,
  defaults?: T
): () => void {
  const key = `${collectionPath}::${docId}`;
  let set = singleDocListeners.get(key);
  if (!set) {
    set = new Set();
    singleDocListeners.set(key, set);
  }
  set.add(onUpdate);

  ensureSharedRealtimeSubscription();

  (async () => {
    if (!supabase) {
      if (defaults) onUpdate(defaults);
      return;
    }
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('id, data')
        .eq('collection_name', collectionPath)
        .eq('id', docId)
        .maybeSingle();

      if (error) throw error;
      statusNotifier('online');

      if (!data) {
        if (defaults) {
          await supabaseSaveDocument(collectionPath, docId, defaults).catch(() => {});
          onUpdate(defaults);
        } else {
          onUpdate(null);
        }
      } else {
        const merged = { ...(data.data || {}), id: data.id } as unknown as T;
        let map = collectionCache.get(collectionPath);
        if (!map) {
          map = new Map();
          collectionCache.set(collectionPath, map);
        }
        map.set(docId, merged);
        onUpdate(merged);
      }
    } catch (err) {
      console.warn(`[Supabase] Single doc sync fallback (${collectionPath}/${docId}):`, formatSupabaseErrorMessage(err));
      if (defaults) onUpdate(defaults);
    }
  })();

  return () => {
    const listeners = singleDocListeners.get(key);
    if (listeners) {
      listeners.delete(onUpdate);
      if (listeners.size === 0) singleDocListeners.delete(key);
    }
  };
}

export async function supabaseSaveDocument(collectionPath: string, id: string, data: any): Promise<void> {
  if (!id) return;
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');

  // Preserve Firestore merge: true behavior by merging with existing document fields
  let existingDoc = getCachedMergedDoc(collectionPath, id);
  if (!existingDoc) {
    const { data: remoteRow } = await supabase
      .from(TABLE_NAME)
      .select('data')
      .eq('collection_name', collectionPath)
      .eq('id', id)
      .maybeSingle();
    if (remoteRow?.data && typeof remoteRow.data === 'object') {
      existingDoc = remoteRow.data;
    }
  }

  const cleanPayload = sanitizeForStorage({
    ...(existingDoc || {}),
    ...data,
    id,
    updatedAt: new Date().toISOString(),
  });

  // Update in-memory + localStorage immediately
  let map = collectionCache.get(collectionPath);
  if (!map) {
    map = new Map();
    collectionCache.set(collectionPath, map);
  }
  map.set(id, cleanPayload);
  if (collectionPath !== 'settings') {
    safeLocalStorageSet(`siakad_${collectionPath}`, JSON.stringify(Array.from(map.values())));
  }

  const startTime = performance.now();
  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(
      {
        collection_name: collectionPath,
        id,
        data: cleanPayload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'collection_name,id' }
    );

  if (error) {
    throw error;
  }

  statusNotifier('online', Math.round(performance.now() - startTime));
  notifyCollectionSubscribers(collectionPath);
}

export async function supabaseDeleteDocument(collectionPath: string, id: string): Promise<void> {
  if (!id) return;
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');

  const map = collectionCache.get(collectionPath);
  if (map) map.delete(id);

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('collection_name', collectionPath)
    .eq('id', id);

  if (error) throw error;

  statusNotifier('online');
  notifyCollectionSubscribers(collectionPath);
}

export async function supabaseSaveDocumentsBatch(collectionPath: string, items: any[]): Promise<void> {
  if (!items || items.length === 0) return;
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');

  let map = collectionCache.get(collectionPath);
  if (!map) {
    map = new Map();
    collectionCache.set(collectionPath, map);
  }

  const nowIso = new Date().toISOString();
  const rowsToUpsert = items
    .filter((item) => item && item.id)
    .map((item) => {
      const existing = map!.get(item.id) || {};
      const merged = sanitizeForStorage({
        ...existing,
        ...item,
        id: item.id,
        updatedAt: nowIso,
      });
      map!.set(item.id, merged);
      return {
        collection_name: collectionPath,
        id: item.id,
        data: merged,
        updated_at: nowIso,
      };
    });

  if (collectionPath !== 'settings') {
    safeLocalStorageSet(`siakad_${collectionPath}`, JSON.stringify(Array.from(map.values())));
  }

  const chunkSize = 250;
  for (let i = 0; i < rowsToUpsert.length; i += chunkSize) {
    const chunk = rowsToUpsert.slice(i, i + chunkSize);
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(chunk, { onConflict: 'collection_name,id' });
    if (error) throw error;
  }

  statusNotifier('online');
  notifyCollectionSubscribers(collectionPath);
}

export async function supabaseDeleteDocumentsBatch(collectionPath: string, ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');

  const validIds = ids.filter(Boolean);
  if (validIds.length === 0) return;

  const map = collectionCache.get(collectionPath);
  if (map) {
    validIds.forEach((id) => map.delete(id));
  }

  const chunkSize = 250;
  for (let i = 0; i < validIds.length; i += chunkSize) {
    const chunk = validIds.slice(i, i + chunkSize);
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('collection_name', collectionPath)
      .in('id', chunk);
    if (error) throw error;
  }

  statusNotifier('online');
  notifyCollectionSubscribers(collectionPath);
}

export async function supabaseSyncCollectionWithArray(collectionPath: string, data: any[]): Promise<void> {
  if (!supabase) return;
  const currentRows = await fetchCollectionRows(collectionPath);
  const newIds = new Set(data.map((item) => item?.id).filter(Boolean));
  const idsToDelete = currentRows.map((r) => r.id).filter((id) => id && !newIds.has(id));

  if (idsToDelete.length > 0) {
    await supabaseDeleteDocumentsBatch(collectionPath, idsToDelete);
  }
  if (data.length > 0) {
    await supabaseSaveDocumentsBatch(collectionPath, data);
  }
}

export async function supabaseClearAllCollections(collectionsToClear: string[]): Promise<void> {
  if (!supabase) return;

  for (const col of collectionsToClear) {
    collectionCache.set(col, new Map());
    safeLocalStorageSet(`siakad_${col}`, JSON.stringify([]));
    safeLocalStorageSet(`siakad_col_initialized_${col}`, 'true');

    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('collection_name', col);
    if (error) {
      console.warn(`[Supabase] Error clearing ${col}:`, formatSupabaseErrorMessage(error));
    }
    // Record server initialization marker so intentionally cleared collections do not re-seed defaults on reload
    await supabaseSaveDocument('settings', `init_${col}`, {
      initialized: true,
      collection: col,
      clearedAt: new Date().toISOString(),
    }).catch(() => {});
    notifyCollectionSubscribers(col);
  }

  await supabaseSaveDocument('settings', 'headmaster', {
    name: 'Dra. Hj. Endah Purwani, M.M.',
    nip: '196711261991032004',
  }).catch(() => {});
}

export async function supabaseGetDocument<T = any>(collectionPath: string, id: string): Promise<T | null> {
  if (!supabase || !id) return null;
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id, data')
    .eq('collection_name', collectionPath)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { ...(data.data || {}), id: data.id } as T;
}

export async function supabaseGetCollectionDocs<T = any>(collectionPath: string): Promise<T[]> {
  return (await fetchCollectionRows(collectionPath)) as T[];
}

export async function supabaseQueryByField<T = any>(
  collectionPath: string,
  field: string,
  value: string
): Promise<T[]> {
  if (!supabase) return [];
  // Only allow safe alphanumeric/underscore property names for JSONB path lookup
  if (!/^[a-zA-Z0-9_]+$/.test(field)) return [];

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id, data')
    .eq('collection_name', collectionPath)
    .filter(`data->>${field}`, 'eq', value);

  if (error) throw error;
  return (data || []).map((row: any) => ({ ...(row.data || {}), id: row.id })) as T[];
}

export async function supabaseDeleteByField(
  collectionPath: string,
  field: string,
  value: string
): Promise<number> {
  if (!supabase || !value) return 0;
  const matches = await supabaseQueryByField<{ id: string }>(collectionPath, field, value);
  const ids = matches.map((m) => m.id).filter(Boolean);
  if (ids.length > 0) {
    await supabaseDeleteDocumentsBatch(collectionPath, ids);
  }
  return ids.length;
}

export async function supabaseGetAttendanceWithFilter(dateFilter?: string, limitCount: number = 50) {
  if (!supabase) return { items: [], lastDoc: null };
  let q = supabase
    .from(TABLE_NAME)
    .select('id, data')
    .eq('collection_name', 'attendance');

  if (dateFilter) {
    q = q.filter('data->>date', 'eq', dateFilter);
  } else {
    const currentMonth = new Date().toISOString().substring(0, 7);
    q = q.filter('data->>date', 'gte', `${currentMonth}-01`).filter('data->>date', 'lte', `${currentMonth}-31`);
  }

  const { data, error } = await q.limit(limitCount);
  if (error) throw error;
  const items = (data || []).map((r: any) => ({ ...(r.data || {}), id: r.id }));
  return { items, lastDoc: null };
}

export async function supabasePingServer(): Promise<number> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const startTime = performance.now();
  const { error } = await supabase
    .from(TABLE_NAME)
    .select('id')
    .limit(1);
  if (error) throw error;
  return Math.round(performance.now() - startTime);
}

export async function supabaseTestReadWrite(): Promise<{ readMs: number; totalMs: number }> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const startTime = performance.now();
  const { error: readErr } = await supabase
    .from(TABLE_NAME)
    .select('id')
    .eq('collection_name', 'settings')
    .eq('id', 'headmaster')
    .maybeSingle();

  if (readErr) throw readErr;
  const readMs = Math.round(performance.now() - startTime);

  const testPayload = {
    id: 'connection-test',
    timestamp: new Date().toISOString(),
    message: 'Tes diagnosa mandiri Supabase PostgreSQL dari peramban pengguna',
    test: true,
  };
  const { error: writeErr } = await supabase
    .from(TABLE_NAME)
    .upsert(
      {
        collection_name: 'system_diagnostics',
        id: 'connection-test',
        data: testPayload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'collection_name,id' }
    );

  if (writeErr) throw writeErr;
  const totalMs = Math.round(performance.now() - startTime);
  return { readMs, totalMs };
}
