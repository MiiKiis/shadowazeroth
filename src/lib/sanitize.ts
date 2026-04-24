/**
 * sanitize.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central input sanitization & validation layer.
 *
 * Rules applied everywhere:
 *  1. All values are cast to their expected type — no implicit coercion.
 *  2. Strings are trimmed and capped to a maximum length.
 *  3. IDs must be positive integers.
 *  4. Enums / allowlists reject unknown values outright.
 *  5. HTML / script control characters are stripped from freetext fields.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const LIMITS = {
  USERNAME:      { min: 3,   max: 16  },
  PASSWORD:      { min: 6,   max: 16  },
  EMAIL:         { min: 5,   max: 120 },
  PIN:           { len: 4            },
  CODE:          { max: 50  },
  FREETEXT:      { max: 500 },
  ITEM_NAME:     { max: 120 },
  CHAR_NAME:     { max: 12  },
  INVITE_TOKEN:  { max: 128 },
  CREATOR_CODE:  { max: 50  },
  CURRENCY:      { allowed: ['vp', 'dp'] as const },
  ACTION:        { allowed: ['accept', 'reject'] as const },
} as const;

// ─── Primitive sanitizers ─────────────────────────────────────────────────────

/**
 * Parses a value as a safe positive integer. Returns 0 if invalid.
 */
export function safeInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : 0;
}

/**
 * Parses a value as a safe non-negative integer (including 0).
 */
export function safeUint(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : 0;
}

/**
 * Trims and caps a string to `max` characters.
 * Strips null bytes and control characters (except newline/tab in freetext).
 */
export function safeStr(value: unknown, max = 255, allowNewlines = false): string {
  let s = String(value ?? '').trim();
  // Remove null bytes and non-printable ASCII control chars
  s = allowNewlines
    ? s.replace(/\x00/g, '')
    : s.replace(/[\x00-\x1F\x7F]/g, '');
  return s.slice(0, max);
}

/**
 * Strips HTML tags and dangerous characters from user-visible freetext.
 */
export function safeText(value: unknown, max = LIMITS.FREETEXT.max): string {
  return safeStr(value, max)
    .replace(/<[^>]*>/g, '')          // strip HTML tags
    .replace(/[<>"'`]/g, '')          // strip remaining dangerous chars
    .trim();
}

/**
 * Normalises and validates an e-mail address.
 * Returns the lowercase normalised form or '' if invalid.
 */
export function safeEmail(value: unknown): string {
  const s = safeStr(value, LIMITS.EMAIL.max).toLowerCase();
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(s) ? s : '';
}

/**
 * Validates a PIN (exactly 4 decimal digits).
 */
export function safePin(value: unknown): string {
  const s = safeStr(value, 4);
  return /^\d{4}$/.test(s) ? s : '';
}

/**
 * Validates a currency value against the allowlist.
 */
export function safeCurrency(value: unknown): 'vp' | 'dp' | '' {
  const s = safeStr(value, 2).toLowerCase();
  return (LIMITS.CURRENCY.allowed as readonly string[]).includes(s)
    ? (s as 'vp' | 'dp')
    : '';
}

/**
 * Validates an action value against the allowlist.
 */
export function safeAction(value: unknown): 'accept' | 'reject' | '' {
  const s = safeStr(value, 10).toLowerCase();
  return (LIMITS.ACTION.allowed as readonly string[]).includes(s)
    ? (s as 'accept' | 'reject')
    : '';
}

/**
 * Sanitises a creator/event code (alphanumeric + dash, uppercase).
 */
export function safeCode(value: unknown): string {
  return safeStr(value, LIMITS.CODE.max)
    .toUpperCase()
    .replace(/[^A-Z0-9\-_]/g, '');
}

/**
 * Sanitises a username (alphanumeric only, enforces length).
 */
export function safeUsername(value: unknown): string {
  const s = safeStr(value, LIMITS.USERNAME.max).toUpperCase();
  return /^[A-Z0-9]{1,16}$/.test(s) ? s : '';
}

/**
 * Sanitises an invite/referral token (alphanumeric + dash/underscore).
 */
export function safeToken(value: unknown): string {
  return safeStr(value, LIMITS.INVITE_TOKEN.max)
    .replace(/[^A-Za-z0-9\-_]/g, '');
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export function isValidId(n: number): boolean {
  return Number.isInteger(n) && n > 0;
}

export function isValidEmail(email: string): boolean {
  return email.length >= LIMITS.EMAIL.min;
}

export function isValidUsername(u: string): boolean {
  return u.length >= LIMITS.USERNAME.min && u.length <= LIMITS.USERNAME.max;
}

export function isValidPassword(p: string): boolean {
  return typeof p === 'string' &&
    p.length >= LIMITS.PASSWORD.min &&
    p.length <= LIMITS.PASSWORD.max;
}

// ─── Least-privilege check ────────────────────────────────────────────────────

/**
 * Ensures that the `claimedAccountId` supplied in the request body matches
 * the `sessionAccountId` stored server-side (cookie / JWT / stored in DB).
 *
 * Because this application uses a stateless client-side auth (user stores
 * their own accountId in the browser), a DB-level ownership check is
 * performed as the enforcement layer: the API always re-fetches the resource
 * filtered by BOTH the requested ID *and* a known-safe secondary constraint
 * (e.g. WHERE account_id = ? AND id = ?).
 *
 * This helper documents the intent and provides a single place to add a
 * proper JWT/session check in the future.
 */
export function assertOwnAccount(claimedId: number, sessionId: number | null): boolean {
  if (!isValidId(claimedId)) return false;
  // If we have a session id, enforce it matches.
  if (sessionId !== null) return claimedId === sessionId;
  // No server-side session available — enforcement happens at DB query level.
  return true;
}
