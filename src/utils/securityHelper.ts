/**
 * Security & Anti-Intrusion Protection Helper
 * Defends against automated Termux bots, brute-force attacks, XSS, and malicious input injections.
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes lockout

export interface SecurityAuditLog {
  timestamp: string;
  type: 'failed_login' | 'lockout' | 'malicious_input';
  identifier: string;
}

/**
 * Strips script tags, event handlers, control characters, SQL/NoSQL tokens, and shell injection characters.
 */
export function sanitizeSecurityInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<[^>]*>?/gm, '') // Strip remaining HTML tags
    .replace(/onerror\s*=/gi, '')
    .replace(/onload\s*=/gi, '')
    .replace(/onclick\s*=/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/dhimasganteng[^\s"'>]*/gi, '')
    .replace(/deface\.js/gi, '')
    .replace(/[;&|\`$><]/g, '') // Strip shell execution characters used in Termux scripts
    .replace(/(\.\.\/|\.\.\\)/g, '') // Strip path traversal
    .replace(/[\x00-\x1F\x7F]/g, '') // Strip null bytes & control chars
    .trim();
}

/**
 * Deeply sanitizes any string, array, or object to purge malicious injections.
 */
export function sanitizeSecurityObject<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    return sanitizeSecurityInput(data) as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeSecurityObject(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    if (data instanceof Date) return data;
    const clean: any = {};
    for (const key of Object.keys(data)) {
      clean[key] = sanitizeSecurityObject((data as any)[key]);
    }
    return clean as T;
  }
  return data;
}

/**
 * Detects if a text contains known intrusion or exploit signatures (XSS, Deface, Termux commands).
 */
export function detectSecurityThreat(input: string): { isThreat: boolean; reason?: string } {
  if (!input || typeof input !== 'string') return { isThreat: false };

  if (/<script[\s\S]*?>/i.test(input) || /<\/script>/i.test(input)) {
    return { isThreat: true, reason: 'Script tag injection detected' };
  }
  if (/onerror\s*=/i.test(input) || /onload\s*=/i.test(input) || /onclick\s*=/i.test(input)) {
    return { isThreat: true, reason: 'Inline JavaScript event handler injection detected' };
  }
  if (/javascript\s*:/i.test(input)) {
    return { isThreat: true, reason: 'JavaScript URI scheme injection detected' };
  }
  if (/dhimasganteng/i.test(input) || /deface\.js/i.test(input) || /hacked by/i.test(input)) {
    return { isThreat: true, reason: 'Deface signature payload detected' };
  }
  if (/(\.\.\/|\.\.\\)/.test(input)) {
    return { isThreat: true, reason: 'Directory traversal pattern detected' };
  }
  return { isThreat: false };
}

export function checkLoginRateLimit(): { isLocked: boolean; remainingSeconds: number } {
  try {
    const lockoutUntil = parseInt(localStorage.getItem('sec_lockout_until') || '0', 10);
    const now = Date.now();
    if (lockoutUntil && now < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
      return { isLocked: true, remainingSeconds };
    }
    // Lockout expired
    if (lockoutUntil && now >= lockoutUntil) {
      localStorage.removeItem('sec_lockout_until');
      localStorage.setItem('sec_failed_attempts', '0');
    }
    return { isLocked: false, remainingSeconds: 0 };
  } catch {
    return { isLocked: false, remainingSeconds: 0 };
  }
}

export function recordFailedLogin(identifier: string): { isNowLocked: boolean; attemptsLeft: number; remainingSeconds: number } {
  try {
    const currentAttempts = parseInt(localStorage.getItem('sec_failed_attempts') || '0', 10) + 1;
    localStorage.setItem('sec_failed_attempts', currentAttempts.toString());
    
    // Log intrusion attempt
    logSecurityEvent({
      timestamp: new Date().toISOString(),
      type: 'failed_login',
      identifier: identifier.substring(0, 10) + '***'
    });

    if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem('sec_lockout_until', lockoutUntil.toString());
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        type: 'lockout',
        identifier: 'System auto-locked due to excessive failed attempts'
      });
      return { isNowLocked: true, attemptsLeft: 0, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
    }

    return {
      isNowLocked: false,
      attemptsLeft: MAX_FAILED_ATTEMPTS - currentAttempts,
      remainingSeconds: 0
    };
  } catch {
    return { isNowLocked: false, attemptsLeft: 3, remainingSeconds: 0 };
  }
}

export function resetLoginRateLimit(): void {
  try {
    localStorage.removeItem('sec_failed_attempts');
    localStorage.removeItem('sec_lockout_until');
  } catch { /* ignore */ }
}

export function logSecurityEvent(event: SecurityAuditLog) {
  try {
    const raw = localStorage.getItem('sec_audit_logs');
    const logs: SecurityAuditLog[] = raw ? JSON.parse(raw) : [];
    logs.push(event);
    if (logs.length > 50) logs.shift(); // Keep last 50 events
    localStorage.setItem('sec_audit_logs', JSON.stringify(logs));
  } catch { /* ignore */ }
}

export async function hashPassword(plainText: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText + 'siakad_salt_smpn50_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return plainText;
  }
}

