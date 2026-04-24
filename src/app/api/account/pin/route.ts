import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { calculateVerifier, calculateVerifierLegacy } from '@/lib/srp6';
import crypto from 'crypto';
import { safeInt, safePin, safeStr, isValidId, LIMITS } from '@/lib/sanitize';

function toBinaryBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
      return Buffer.from(trimmed, 'hex');
    }
    return Buffer.from(trimmed, 'binary');
  }
  throw new Error('Formato SRP6 no soportado');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const accountId = safeInt(body?.accountId);
    const password  = safeStr(body?.password, LIMITS.PASSWORD.max);
    const newPin    = safePin(body?.newPin);

    if (!isValidId(accountId)) {
      return NextResponse.json({ error: 'Cuenta no válida' }, { status: 400 });
    }
    if (!newPin) {
      return NextResponse.json({ error: 'El PIN debe ser exactamente de 4 dígitos' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 });
    }

    const connection = await authPool.getConnection();
    
    try {
      // 1. Verify user password securely
      const [rows]: any = await connection.query(
        'SELECT id, username, salt, verifier FROM account WHERE id = ? LIMIT 1',
        [accountId]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }

      const account = rows[0];
      const storedSalt = toBinaryBuffer(account.salt);
      const storedVerifier = toBinaryBuffer(account.verifier);

      const calculatedVerifier = calculateVerifier(account.username, password, storedSalt);
      const legacyCalculatedVerifier = calculateVerifierLegacy(account.username, password, storedSalt);

      if (!calculatedVerifier.equals(storedVerifier) && !legacyCalculatedVerifier.equals(storedVerifier)) {
        return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 401 });
      }

      // 2. Ensure PIN table exists
      await connection.query(`
        CREATE TABLE IF NOT EXISTS account_security_pin (
          account_id INT UNSIGNED NOT NULL,
          pin_salt VARBINARY(32) NOT NULL,
          pin_hash VARBINARY(32) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (account_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // 3. Generate new PIN hash
      const pinSalt = crypto.randomBytes(32);
      const pinHash = crypto
        .createHash('sha256')
        .update(pinSalt)
        .update(newPin)
        .digest();

      // 4. Upsert PIN into DB
      await connection.query(
        `INSERT INTO account_security_pin (account_id, pin_salt, pin_hash) 
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE pin_salt = VALUES(pin_salt), pin_hash = VALUES(pin_hash)`,
        [accountId, pinSalt, pinHash]
      );

      return NextResponse.json({ success: true, message: 'PIN actualizado exitosamente' }, { status: 200 });
    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('Update PIN Error:', error);
    return NextResponse.json({ 
      error: 'Error al actualizar el PIN. Por favor inténtalo de nuevo.'
    }, { status: 500 });
  }
}
