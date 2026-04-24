import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { assertAdmin } from '@/lib/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get('userId'));

    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const adminCheck = await assertAdmin(userId);
    if (!adminCheck.ok) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });

    await authPool.query(`
      CREATE TABLE IF NOT EXISTS auth.creator_codes (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(50) NOT NULL UNIQUE,
        rewards VARCHAR(255) NOT NULL,
        max_uses INT UNSIGNED NOT NULL DEFAULT 100,
        current_uses INT UNSIGNED NOT NULL DEFAULT 0,
        creator_id INT UNSIGNED NOT NULL,
        min_level TINYINT UNSIGNED NOT NULL DEFAULT 40,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Auto-add min_level column if it doesn't exist yet
    try {
      await authPool.query(`ALTER TABLE auth.creator_codes ADD COLUMN min_level TINYINT UNSIGNED NOT NULL DEFAULT 40`);
    } catch { /* column already exists */ }

    const [codes] = await authPool.query<any[]>('SELECT * FROM auth.creator_codes ORDER BY created_at DESC');
    return NextResponse.json({ codes });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al cargar los códigos. Intenta de nuevo.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, code, rewards, maxUses, minLevel } = body;

    const adminCheck = await assertAdmin(userId);
    if (!adminCheck.ok) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });

    if (!code || !rewards || !maxUses) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const safeCode = String(code).toUpperCase().trim();
    const safeMinLevel = Math.max(1, Math.min(80, Number(minLevel) || 40));

    await authPool.query(`
      CREATE TABLE IF NOT EXISTS auth.creator_codes (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(50) NOT NULL UNIQUE,
        rewards VARCHAR(255) NOT NULL,
        max_uses INT UNSIGNED NOT NULL DEFAULT 100,
        current_uses INT UNSIGNED NOT NULL DEFAULT 0,
        creator_id INT UNSIGNED NOT NULL,
        min_level TINYINT UNSIGNED NOT NULL DEFAULT 40,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    try {
      await authPool.query(`ALTER TABLE auth.creator_codes ADD COLUMN min_level TINYINT UNSIGNED NOT NULL DEFAULT 40`);
    } catch { /* column already exists */ }

    await authPool.query(
      'INSERT INTO auth.creator_codes (code, rewards, max_uses, creator_id, min_level) VALUES (?, ?, ?, ?, ?)',
      [safeCode, String(rewards), Number(maxUses), userId, safeMinLevel]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'El código ya existe' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al crear el código. Intenta de nuevo.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, codeId, code, rewards, maxUses, minLevel } = body;

    const adminCheck = await assertAdmin(userId);
    if (!adminCheck.ok) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });

    if (!codeId || !code || !rewards || !maxUses) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const safeCode = String(code).toUpperCase().trim();
    const safeMinLevel = Math.max(1, Math.min(80, Number(minLevel) || 40));

    await authPool.query(
      'UPDATE auth.creator_codes SET code = ?, rewards = ?, max_uses = ?, min_level = ? WHERE id = ?',
      [safeCode, String(rewards), Number(maxUses), safeMinLevel, Number(codeId)]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'El código ya existe en otro registro' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al actualizar el código. Intenta de nuevo.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { userId, codeId } = body;

    const adminCheck = await assertAdmin(userId);
    if (!adminCheck.ok) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });

    if (!codeId) {
      return NextResponse.json({ error: 'Faltan datos (codeId)' }, { status: 400 });
    }

    await authPool.query('DELETE FROM auth.creator_codes WHERE id = ?', [Number(codeId)]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al eliminar el código. Intenta de nuevo.' }, { status: 500 });
  }
}
