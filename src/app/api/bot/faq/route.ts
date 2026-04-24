import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  if (!authPool) {
    return NextResponse.json({ error: 'Database pool not available' }, { status: 500 });
  }
  try {
    const [rows] = await authPool.query<RowDataPacket[]>(
      'SELECT id, question, answer, category FROM site_bot_faq ORDER BY order_index ASC, id DESC'
    );

    return NextResponse.json({ faqs: rows }, { status: 200 });
  } catch (error: unknown) {
    // If table doesn't exist yet, return empty list or fallback
    return NextResponse.json({ faqs: [] }, { status: 200 });
  }
}
