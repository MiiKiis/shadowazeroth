import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { assertAdmin } from '@/lib/admin';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(request: Request) {
  if (!authPool) {
    return NextResponse.json({ error: 'Database pool not available' }, { status: 500 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get('userId') || 0);

    const adminCheck = await assertAdmin(userId);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 403 });
    }

    // Auto-create table if not exists
    await authPool.query(`
      CREATE TABLE IF NOT EXISTS site_bot_faq (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'General',
        order_index INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [rows] = await authPool.query<RowDataPacket[]>(
      'SELECT * FROM site_bot_faq ORDER BY order_index ASC, id DESC'
    );

    return NextResponse.json({ faqs: rows }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'No se pudieron cargar las preguntas del bot' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = Number(body?.userId || 0);

    const adminCheck = await assertAdmin(userId);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 403 });
    }

    const question = String(body?.question || '').trim();
    const answer = String(body?.answer || '').trim();
    const category = String(body?.category || 'General').trim();
    const orderIndex = Number(body?.orderIndex || 0);

    if (!question || !answer) {
      return NextResponse.json({ error: 'Pregunta y respuesta son obligatorias' }, { status: 400 });
    }

    const [result] = await authPool.query<ResultSetHeader>(
      'INSERT INTO site_bot_faq (question, answer, category, order_index) VALUES (?, ?, ?, ?)',
      [question, answer, category, orderIndex]
    );

    return NextResponse.json({ id: result.insertId, message: 'Pregunta creada' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'No se pudo crear la pregunta', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const userId = Number(body?.userId || 0);
    const id = Number(body?.id || 0);

    const adminCheck = await assertAdmin(userId);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 403 });
    }

    if (!id) return NextResponse.json({ error: 'ID es obligatorio' }, { status: 400 });

    const question = String(body?.question || '').trim();
    const answer = String(body?.answer || '').trim();
    const category = String(body?.category || 'General').trim();
    const orderIndex = Number(body?.orderIndex || 0);

    await authPool.query(
      'UPDATE site_bot_faq SET question = ?, answer = ?, category = ?, order_index = ? WHERE id = ?',
      [question, answer, category, orderIndex, id]
    );

    return NextResponse.json({ message: 'Pregunta actualizada' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'No se pudo actualizar la pregunta', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get('userId') || 0);
    const id = Number(searchParams.get('id') || 0);

    const adminCheck = await assertAdmin(userId);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 403 });
    }

    if (!id) return NextResponse.json({ error: 'ID es obligatorio' }, { status: 400 });

    await authPool.query('DELETE FROM site_bot_faq WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Pregunta eliminada' }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'No se pudo eliminar la pregunta' }, { status: 500 });
  }
}
