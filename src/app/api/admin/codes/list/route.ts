import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface AccessRow extends RowDataPacket {
  lv: number;
}

const SUPERADMIN_ACCOUNTS = ['miikiis'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!authPool) return NextResponse.json({ error: 'DB error' }, { status: 500 });

    const { assertAdmin } = await import('@/lib/admin');
    const adminCheck = await assertAdmin(Number(userId));
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error || 'Prohibido' }, { status: adminCheck.status || 403 });
    }

    // Obtener códigos
    const [codes] = await authPool.query<any[]>(
      'SELECT * FROM web_event_codes ORDER BY created_at DESC LIMIT 100'
    );

    return NextResponse.json({ codes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
