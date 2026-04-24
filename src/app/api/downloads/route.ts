import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
  if (!authPool) {
    return NextResponse.json({ error: 'Database pool not available' }, { status: 500 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const [rows] = await authPool.query<RowDataPacket[]>(
        'SELECT * FROM site_downloads WHERE slug = ? LIMIT 1',
        [slug]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Descarga no encontrada' }, { status: 404 });
      }
      return NextResponse.json({ download: rows[0] }, { status: 200 });
    }

    const [rows] = await authPool.query<RowDataPacket[]>(
      'SELECT * FROM site_downloads ORDER BY order_index ASC, id DESC'
    );

    return NextResponse.json({ downloads: rows }, { status: 200 });
  } catch (error: unknown) {
    console.error('Downloads GET error:', error);
    return NextResponse.json({ error: 'No se pudieron cargar las descargas' }, { status: 500 });
  }
}
