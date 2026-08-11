/**
 * Safe LocalStorage utilities that handle QuotaExceededError gracefully
 * without crashing the React application.
 */

export function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (
      e?.name === 'QuotaExceededError' ||
      e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e?.code === 22 ||
      e?.number === -2147024882
    ) {
      console.warn(`[LocalStorage Quota Exceeded] Pruning local caches for key '${key}'`);
      
      // Clear non-critical heavy keys and firestore_ keys to free up space in localStorage
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('firestore_') || k.includes('cert_') || k.includes('journal'))) {
            if (k !== key) {
              localStorage.removeItem(k);
            }
          }
        }
      } catch (_) {}

      const HEAVY_KEYS_TO_PRUNE = [
        'siakad_web_content',
        'siakad_web_home_content',
        'siakad_attendance',
        'siakad_teaching_journals',
        'siakad_bimbingan_journals',
        'siakad_cert_bg_url',
        'siakad_cert_academic_bg_url',
        'siakad_cert_non_academic_bg_url',
        'siakad_student_submissions'
      ];

      for (const k of HEAVY_KEYS_TO_PRUNE) {
        if (k !== key) {
          try {
            localStorage.removeItem(k);
          } catch (_) {}
        }
      }

      // Retry setItem once
      try {
        localStorage.setItem(key, value);
      } catch (retryErr) {
        console.warn(`[LocalStorage Quota] Could not store '${key}' locally. Relying on Firestore cloud database.`, retryErr);
      }
    } else {
      console.warn(`[LocalStorage Error] Unable to save '${key}':`, e);
    }
  }
}

export function clearQuotaHeavyKeys(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('firestore_targets_')) {
        localStorage.removeItem(key);
      }
    }
  } catch (_) {}
}

export function safeLocalStorageGet(key: string, fallback: string | null = null): string | null {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (e) {
    console.warn(`[LocalStorage Error] Unable to read '${key}':`, e);
    return fallback;
  }
}
