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
      CREATE TABLE IF NOT EXISTS site_downloads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        url VARCHAR(255) NOT NULL,
        icon VARCHAR(50) DEFAULT 'Rocket',
        description VARCHAR(255),
        long_description TEXT,
        requirements TEXT,
        image_url VARCHAR(255),
        video_url VARCHAR(255),
        category VARCHAR(50) DEFAULT 'general',
        order_index INT NOT NULL DEFAULT 0,
        version VARCHAR(50),
        realmlist VARCHAR(255),
        file_size VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Patch table for existing columns if needed
    const columns = [
      { name: 'slug', type: 'VARCHAR(255) NOT NULL UNIQUE' },
      { name: 'url', type: 'VARCHAR(255) NOT NULL' },
      { name: 'icon', type: 'VARCHAR(50) DEFAULT \'Rocket\'' },
      { name: 'description', type: 'VARCHAR(255)' },
      { name: 'long_description', type: 'TEXT' },
      { name: 'requirements', type: 'TEXT' },
      { name: 'image_url', type: 'VARCHAR(255)' },
      { name: 'video_url', type: 'VARCHAR(255)' },
      { name: 'category', type: 'VARCHAR(50) DEFAULT \'general\'' },
      { name: 'order_index', type: 'INT NOT NULL DEFAULT 0' },
      { name: 'version', type: 'VARCHAR(50)' },
      { name: 'realmlist', type: 'VARCHAR(255)' },
      { name: 'file_size', type: 'VARCHAR(50)' }
    ];
    for (const col of columns) {
      try {
        // First try to add the column as defined
        await authPool.query(`ALTER TABLE site_downloads ADD COLUMN ${col.name} ${col.type}`);
      } catch (err: any) {
        // If it fails because it already exists, ignore. 
        // If it fails for other reasons (like UNIQUE constraint on existing rows), 
        // try to add it as nullable without UNIQUE first.
        if (err.code !== 'ER_DUP_FIELDNAME') {
           try {
             const nullableType = col.type.replace('NOT NULL', '').replace('UNIQUE', '');
             await authPool.query(`ALTER TABLE site_downloads ADD COLUMN ${col.name} ${nullableType}`);
           } catch (innerErr) {
             /* ignore */
           }
        }
      }
    }

    // Check if empty and seed initial data
    const [existing] = await authPool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM site_downloads');
    if (existing[0].count === 0) {
      await authPool.query(`
        INSERT INTO site_downloads (name, slug, url, icon, description, category, order_index) VALUES
        ('Launcher', 'launcher-oficial', '#', 'Rocket', 'Instalador rápido', 'launcher', 1),
        ('Cliente Normal', 'cliente-normal', '#', 'Gamepad2', 'WotLK 3.3.5a puro', 'client', 2),
        ('Cliente HD', 'cliente-hd', '#', 'Monitor', 'Texturas 2024', 'client', 3),
        ('Parche Eventos', 'parche-eventos', '#', 'ShieldAlert', 'Obligatorio (Custom)', 'patch', 4)
      `);
    }

    const [rows] = await authPool.query<RowDataPacket[]>(
      'SELECT * FROM site_downloads ORDER BY order_index ASC, id DESC'
    );

    // Debug: Get table structure
    let structure = [];
    try {
      const [desc] = await authPool.query<RowDataPacket[]>('DESCRIBE site_downloads');
      structure = desc;
    } catch {}

    return NextResponse.json({ downloads: rows, _debug_structure: structure }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'No se pudieron cargar las descargas' }, { status: 500 });
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

    const name = String(body?.name || '').trim();
    const slug = String(body?.slug || name.toLowerCase().replace(/\s+/g, '-')).trim();
    const url = String(body?.url || '').trim();
    const icon = String(body?.icon || 'Rocket').trim();
    const description = String(body?.description || '').trim();
    const longDescription = String(body?.longDescription || '').trim();
    const requirements = String(body?.requirements || '').trim();
    const imageUrl = String(body?.imageUrl || '').trim();
    const videoUrl = String(body?.videoUrl || '').trim();
    const category = String(body?.category || 'general').trim();
    const orderIndex = Number(body?.orderIndex || 0);
    const version = String(body?.version || '').trim();
    const realmlist = String(body?.realmlist || '').trim();
    const fileSize = String(body?.fileSize || '').trim();

    if (!name || !url) {
      return NextResponse.json({ error: 'Nombre y URL son obligatorios' }, { status: 400 });
    }

    const [result] = await authPool.query<ResultSetHeader>(
      'INSERT INTO site_downloads (name, slug, url, icon, description, long_description, requirements, image_url, video_url, category, order_index, version, realmlist, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, slug, url, icon, description, longDescription, requirements, imageUrl, videoUrl, category, orderIndex, version, realmlist, fileSize]
    );

    return NextResponse.json({ id: result.insertId, message: 'Descarga creada' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'No se pudo crear la descarga',
      details: error.message 
    }, { status: 500 });
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

    const name = String(body?.name || '').trim();
    const slug = String(body?.slug || name.toLowerCase().replace(/\s+/g, '-')).trim();
    const url = String(body?.url || '').trim();
    const icon = String(body?.icon || 'Rocket').trim();
    const description = String(body?.description || '').trim();
    const longDescription = String(body?.longDescription || '').trim();
    const requirements = String(body?.requirements || '').trim();
    const imageUrl = String(body?.imageUrl || '').trim();
    const videoUrl = String(body?.videoUrl || '').trim();
    const category = String(body?.category || 'general').trim();
    const orderIndex = Number(body?.orderIndex || 0);
    const version = String(body?.version || '').trim();
    const realmlist = String(body?.realmlist || '').trim();
    const fileSize = String(body?.fileSize || '').trim();

    await authPool.query(
      'UPDATE site_downloads SET name = ?, slug = ?, url = ?, icon = ?, description = ?, long_description = ?, requirements = ?, image_url = ?, video_url = ?, category = ?, order_index = ?, version = ?, realmlist = ?, file_size = ? WHERE id = ?',
      [name, slug, url, icon, description, longDescription, requirements, imageUrl, videoUrl, category, orderIndex, version, realmlist, fileSize, id]
    );

    return NextResponse.json({ message: 'Descarga actualizada' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'No se pudo actualizar la descarga',
      details: error.message 
    }, { status: 500 });
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

    await authPool.query('DELETE FROM site_downloads WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Descarga eliminada' }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'No se pudo eliminar la descarga' }, { status: 500 });
  }
}
