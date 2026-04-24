import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface AccessRow extends RowDataPacket {
  lv: number;
}

const SUPERADMIN_ACCOUNTS = ['miikiis'];

export async function POST(request: Request) {
  try {
    const { accountId, itemId, quantity = 1 } = await request.json();

    if (!accountId || !itemId) {
      return NextResponse.json({ error: 'Faltan datos (accountId, itemId)' }, { status: 400 });
    }

    if (!authPool) {
      return NextResponse.json({ error: 'DB connection error' }, { status: 500 });
    }

    const { assertAdmin } = await import('@/lib/admin');
    const adminCheck = await assertAdmin(accountId);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error || 'No tienes permisos de administrador' }, { status: adminCheck.status || 403 });
    }

    // 2. Generar código aleatorio 
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 10; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const code = generateCode();

    // 3. Guardar en DB
    await authPool.query(
      'INSERT INTO web_event_codes (code, item_id, quantity) VALUES (?, ?, ?)',
      [code, itemId, quantity]
    );

    return NextResponse.json({ success: true, code });
  } catch (error: any) {
    console.error('Code generation error:', error);
    return NextResponse.json({ error: 'Error del servidor', details: error.message }, { status: 500 });
  }
}
