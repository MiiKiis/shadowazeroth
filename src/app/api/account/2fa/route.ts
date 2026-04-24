import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import QRCode from 'qrcode';
import crypto from 'crypto';

// ── NATIVE TOTP IMPLEMENTATION (Guaranteed Google Auth & TrinityCore compat) ──
function generateBase32Secret(byteLength = 20) {
  const bytes = crypto.randomBytes(byteLength);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32ToBuffer(base32Input: string | Buffer) {
  const base32 = base32Input.toString();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.ceil((base32.length * 5) / 8));
  for (let i = 0; i < base32.length; i++) {
    const char = base32.charAt(i).toUpperCase();
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return Buffer.from(output.buffer, 0, index);
}

function verifyTOTP(token: string, secret: string, window = 4) { // +/- 4 steps (2 minutes tolerance)
  const key = base32ToBuffer(secret);
  const time = Math.floor(Date.now() / 30000);
  
  for (let i = -window; i <= window; i++) {
    const buf = Buffer.alloc(8);
    let t = time + i;
    for (let j = 7; j >= 0; j--) {
      buf[j] = t & 255;
      t >>= 8;
    }
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);
    const otp = (code % 1000000).toString().padStart(6, '0');
    if (otp === token) return true;
  }
  return false;
}

// Helper for querying with auto-column creation
async function getAccount2FA(accountId: string) {
  try {
    const [rows]: any = await authPool.query(
      'SELECT username, totp_secret FROM account WHERE id = ?',
      [accountId]
    );
    return rows;
  } catch (error: any) {
    if (error.code === 'ER_BAD_FIELD_ERROR' || error.errno === 1054) {
      // Create the column if it doesn't exist
      await authPool.query('ALTER TABLE account ADD COLUMN totp_secret VARCHAR(128) DEFAULT NULL');
      const [retryRows]: any = await authPool.query(
        'SELECT username, totp_secret FROM account WHERE id = ?',
        [accountId]
      );
      return retryRows;
    }
    throw error;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'Falta accountId' }, { status: 400 });
  }

  try {
    const rows = await getAccount2FA(accountId);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    const { username, totp_secret } = rows[0];

    // Si ya tiene 2FA
    if (totp_secret) {
      return NextResponse.json({ enabled: true });
    }

    // Generar nuevo secreto usando nuestra función nativa
    const secret = generateBase32Secret();
    const otpauth = `otpauth://totp/Shadow%20Azeroth:${encodeURIComponent(username)}?secret=${secret}&issuer=Shadow%20Azeroth`;
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    return NextResponse.json({ enabled: false, secret, qrCodeUrl });
  } catch (error: any) {
    console.error('Error generando 2FA:', error);
    return NextResponse.json({ error: `Error detallado: ${error.message || error}` }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { accountId, secret, token } = await req.json();

    if (!accountId || !secret || !token) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Verificar token con tolerancia nativa de 2 minutos (+/- 4 periodos)
    const isValid = verifyTOTP(token, secret, 4);

    if (!isValid) {
      return NextResponse.json({ error: 'El código ingresado es incorrecto' }, { status: 400 });
    }

    // Guardar en DB (aseguramos que la columna existe primero llamando al helper)
    await getAccount2FA(accountId);

    await authPool.query(
      'UPDATE account SET totp_secret = ? WHERE id = ?',
      [secret, accountId]
    );

    return NextResponse.json({ success: true, message: '2FA activado correctamente' });
  } catch (error) {
    console.error('Error verificando 2FA:', error);
    return NextResponse.json({ error: 'Error interno al guardar' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('accountId');
  const token = searchParams.get('token');

  if (!accountId || !token) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  try {
    const rows = await getAccount2FA(accountId);

    if (rows.length === 0 || !rows[0].totp_secret) {
      return NextResponse.json({ error: '2FA no está activado' }, { status: 400 });
    }

    const secret = rows[0].totp_secret;

    const isValid = verifyTOTP(token, secret, 4);

    if (!isValid) {
      return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 });
    }

    await authPool.query(
      'UPDATE account SET totp_secret = NULL WHERE id = ?',
      [accountId]
    );

    return NextResponse.json({ success: true, message: '2FA desactivado' });
  } catch (error) {
    console.error('Error desactivando 2FA:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
