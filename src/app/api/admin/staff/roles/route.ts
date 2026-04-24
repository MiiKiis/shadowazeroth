import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { assertAdmin } from '@/lib/admin';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

async function ensureTable() {
  await authPool.query(`
    CREATE TABLE IF NOT EXISTS site_staff_roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_key VARCHAR(50) NOT NULL UNIQUE,
      label VARCHAR(100) NOT NULL,
      subtitle VARCHAR(100),
      icon VARCHAR(50) DEFAULT 'Shield',
      primary_color VARCHAR(20) DEFAULT '#FFFFFF',
      secondary_color VARCHAR(20) DEFAULT '#CCCCCC',
      gradient_from VARCHAR(50) DEFAULT 'from-gray-500',
      gradient_to VARCHAR(50) DEFAULT 'to-gray-400',
      glow_color VARCHAR(50) DEFAULT 'rgba(255,255,255,0.2)',
      border_color VARCHAR(50) DEFAULT 'border-gray-500/40',
      badge_bg VARCHAR(50) DEFAULT 'bg-gray-900/30',
      badge_text VARCHAR(50) DEFAULT 'text-gray-400',
      description TEXT,
      requirements TEXT, -- JSON array
      questions TEXT,     -- JSON array
      is_active TINYINT(1) DEFAULT 1,
      order_index INT DEFAULT 0,
      webhook_url VARCHAR(255) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get('userId') || 0);

    const adminCheck = await assertAdmin(userId);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 403 });
    }

    await ensureTable();

    const [rows] = await authPool.query<RowDataPacket[]>(
      'SELECT * FROM site_staff_roles ORDER BY order_index ASC'
    );

    return NextResponse.json({ roles: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    await ensureTable();

    const {
      role_key, label, subtitle, icon, primary_color, secondary_color,
      gradient_from, gradient_to, glow_color, border_color, badge_bg,
      badge_text, description, requirements, questions, order_index, webhook_url
    } = body;

    const [result] = await authPool.query<ResultSetHeader>(
      `INSERT INTO site_staff_roles 
      (role_key, label, subtitle, icon, primary_color, secondary_color, gradient_from, gradient_to, glow_color, border_color, badge_bg, badge_text, description, requirements, questions, order_index, webhook_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        role_key, label, subtitle, icon, primary_color, secondary_color,
        gradient_from, gradient_to, glow_color, border_color, badge_bg,
        badge_text, description, JSON.stringify(requirements), JSON.stringify(questions), order_index, webhook_url
      ]
    );

    return NextResponse.json({ id: result.insertId, message: 'Rol creado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const {
      role_key, label, subtitle, icon, primary_color, secondary_color,
      gradient_from, gradient_to, glow_color, border_color, badge_bg,
      badge_text, description, requirements, questions, order_index, webhook_url, is_active
    } = body;

    await authPool.query(
      `UPDATE site_staff_roles SET 
        role_key = ?, label = ?, subtitle = ?, icon = ?, primary_color = ?, secondary_color = ?, 
        gradient_from = ?, gradient_to = ?, glow_color = ?, border_color = ?, badge_bg = ?, 
        badge_text = ?, description = ?, requirements = ?, questions = ?, order_index = ?, 
        webhook_url = ?, is_active = ?
      WHERE id = ?`,
      [
        role_key, label, subtitle, icon, primary_color, secondary_color,
        gradient_from, gradient_to, glow_color, border_color, badge_bg,
        badge_text, description, JSON.stringify(requirements), JSON.stringify(questions), 
        order_index, webhook_url, is_active ? 1 : 0, id
      ]
    );

    return NextResponse.json({ message: 'Rol actualizado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await authPool.query('DELETE FROM site_staff_roles WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Rol eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
