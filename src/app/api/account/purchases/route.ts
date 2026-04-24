import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';

type PurchaseRow = {
  id: number;
  account_id: number;
  item_id: number;
  item_name: string;
  currency: 'vp' | 'dp';
  price: number;
  character_guid: number | null;
  character_name: string;
  is_gift: number;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = Number(searchParams.get('accountId'));
    const limitParam = Number(searchParams.get('limit') || 50);
    const limit = Number.isInteger(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ error: 'accountId invalido' }, { status: 400 });
    }

    const [rows] = await authPool.query(
      `SELECT p.id, p.account_id, p.item_name, p.currency, p.price, p.character_guid, p.character_name, p.is_gift, p.created_at,
              i.item_id as item_id, i.service_type as service_type
       FROM shop_purchases p
       LEFT JOIN shop_items i ON p.item_id = i.id
       WHERE p.account_id = ?
       ORDER BY p.id DESC
       LIMIT ?`,
      [accountId, limit]
    );

    return NextResponse.json({ purchases: rows as PurchaseRow[] }, { status: 200 });
  } catch (error: any) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json({ purchases: [] }, { status: 200 });
    }

    console.error('Account purchases API error:', error);
    return NextResponse.json(
      { error: 'Error al cargar el historial de compras.' },
      { status: 500 }
    );
  }
}
