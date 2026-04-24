import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { calculateVerifier, calculateVerifierLegacy } from '@/lib/srp6';
import { awardLevelRewardsForAccount } from '@/lib/estelasLevelRewards';
import { RowDataPacket } from 'mysql2';
import crypto from 'crypto';
import { safeStr, isValidId, LIMITS } from '@/lib/sanitize';

function toBinaryBuffer(value: unknown): Buffer {
  if (!value) return Buffer.alloc(32);
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === 'object' && value !== null) {
    const maybeBuffer = value as { type?: string; data?: number[] };
    if (maybeBuffer.type === 'Buffer' && Array.isArray(maybeBuffer.data)) {
      return Buffer.from(maybeBuffer.data);
    }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^[0-9a-fA-F]+$/.test(trimmed) && (trimmed.length === 64 || trimmed.length % 2 === 0)) {
      return Buffer.from(trimmed, 'hex');
    }
    return Buffer.from(trimmed, 'binary');
  }
  // Try to convert to string if it's something else
  try {
    const str = String(value);
    return Buffer.from(str, 'binary');
  } catch {
    throw new Error('Formato de credenciales SRP6 no soportado en base de datos');
  }
}

function calculateShaPassHash(username: string, password: string): string {
  return crypto
    .createHash('sha1')
    .update(`${username.toUpperCase()}:${password.toUpperCase()}`)
    .digest('hex')
    .toUpperCase();
}

function isValidSrpField(field: Buffer | null | undefined): boolean {
  return Boolean(field && field.length === 32);
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const normalizedUsername = safeStr(username, LIMITS.USERNAME.max);
    const normalizedPassword = safeStr(password, LIMITS.PASSWORD.max);

    if (!normalizedUsername || !normalizedPassword) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    // 1. Get account from acore_auth
    if (!authPool) {
      return NextResponse.json({ error: 'Base de datos de autenticación no disponible' }, { status: 500 });
    }

    interface AccountRow extends RowDataPacket {
      id: number;
      username: string;
      salt: string | Buffer;
      verifier: string | Buffer;
      sha_pass_hash?: string | null;
    }

    let rows: AccountRow[] = [];
    try {
      const [result] = await authPool.query<AccountRow[]>(
        'SELECT id, username, salt, verifier FROM auth.account WHERE UPPER(username) = UPPER(?)',
        [normalizedUsername]
      );
      rows = result;
    } catch (queryErr: any) {
      // Solo hacer fallback si el error es columna inexistente (esquema antiguo).
      if (queryErr?.code && queryErr.code !== 'ER_BAD_FIELD_ERROR') {
        throw queryErr;
      }
      const [result] = await authPool.query<AccountRow[]>(
        'SELECT id, username, salt, verifier FROM account WHERE UPPER(username) = UPPER(?)',
        [normalizedUsername]
      );
      rows = result;
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 });
    }

    const account = rows[0];
    let authenticated = false;

    // 2. Primary auth: SRP6 verifier
    try {
      const storedSalt = toBinaryBuffer(account.salt);
      const storedVerifier = toBinaryBuffer(account.verifier);

      if (isValidSrpField(storedSalt) && isValidSrpField(storedVerifier)) {
        const calculatedVerifier = calculateVerifier(account.username, normalizedPassword, storedSalt);
        const legacyCalculatedVerifier = calculateVerifierLegacy(account.username, normalizedPassword, storedSalt);
        authenticated = calculatedVerifier.equals(storedVerifier) || legacyCalculatedVerifier.equals(storedVerifier);
      }
    } catch (cryptoError: unknown) {
      console.error('[Login] Error en verificación SRP6:', cryptoError);
    }

    // 3. Legacy fallback: sha_pass_hash
    if (!authenticated && account.sha_pass_hash) {
      const expected = String(account.sha_pass_hash || '').trim().toUpperCase();
      const calculated = calculateShaPassHash(account.username, normalizedPassword);
      authenticated = expected.length > 0 && expected === calculated;
    }

    if (!authenticated) {
      return NextResponse.json({ error: 'Código de acceso incorrecto' }, { status: 401 });
    }

    // Best effort: grant pending milestone estelas on login.
    setTimeout(() => {
      awardLevelRewardsForAccount(Number(account.id)).catch((err) => {
        console.error('Estelas login award error:', err);
      });
    }, 3000);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: account.id,
        username: account.username,
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Fatal Login Error:', error);
    return NextResponse.json({ 
      error: 'Error de autenticación. Intenta de nuevo.'
    }, { status: 500 });
  }
}
