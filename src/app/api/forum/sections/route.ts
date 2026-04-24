import { NextResponse } from 'next/server';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { authPool } from '@/lib/db';
import { getGMLevel } from '@/lib/gmLevel';

async function isGM(userId: number): Promise<boolean> {
  const lvl = await getGMLevel(userId);
  return lvl >= 3;
}

// Secciones por defecto para el foro (se insertan si la tabla está vacía)
const DEFAULT_SECTIONS = [
  { id: 'announcements', label: 'Anuncios', description: 'Noticias y anuncios oficiales del servidor.', icon: 'Megaphone',   color: 'from-yellow-700 to-amber-700',   border: 'border-yellow-700/50',  text_color: 'text-yellow-300',  parent_id: null, order_index: 0 },
  { id: 'general',       label: 'General',   description: 'Conversaciones generales sobre el servidor.',  icon: 'MessageSquare', color: 'from-purple-700 to-indigo-700', border: 'border-purple-700/50', text_color: 'text-purple-300', parent_id: null, order_index: 1 },
  { id: 'soporte',       label: 'Soporte',   description: 'Ayuda y soporte técnico para jugadores.',      icon: 'HelpCircle',    color: 'from-blue-700 to-cyan-700',     border: 'border-blue-700/50',   text_color: 'text-blue-300',    parent_id: null, order_index: 2 },
  { id: 'bugs',          label: 'Reporte de Bugs', description: 'Reporta errores o bugs del servidor.',    icon: 'Bug',           color: 'from-red-700 to-rose-700',      border: 'border-red-700/50',    text_color: 'text-red-300',     parent_id: null, order_index: 3 },
  { id: 'guias',         label: 'Guías',     description: 'Guías y tutoriales para nuevos jugadores.',    icon: 'BookOpen',      color: 'from-green-700 to-emerald-700', border: 'border-green-700/50',  text_color: 'text-green-300',   parent_id: null, order_index: 4 },
  { id: 'sugerencias',   label: 'Sugerencias', description: 'Propón mejoras para el servidor.',          icon: 'Lightbulb',     color: 'from-orange-700 to-red-700',    border: 'border-orange-700/50', text_color: 'text-orange-300',  parent_id: null, order_index: 5 },
];

async function seedDefaultSections() {
  try {
    // Asegurar que la tabla existe
    await authPool.query(`
      CREATE TABLE IF NOT EXISTS auth.forum_sections (
        id VARCHAR(64) PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(64) DEFAULT 'MessageSquare',
        color VARCHAR(255) DEFAULT 'from-purple-700 to-indigo-700',
        border VARCHAR(255) DEFAULT 'border-purple-700/50',
        text_color VARCHAR(255) DEFAULT 'text-purple-300',
        parent_id VARCHAR(64) NULL,
        order_index INT DEFAULT 0,
        is_locked TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES auth.forum_sections(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [existing] = await authPool.query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM auth.forum_sections');
    if (Number(existing[0]?.cnt) === 0) {
      for (const s of DEFAULT_SECTIONS) {
        await authPool.query(
          `INSERT IGNORE INTO auth.forum_sections (id, label, description, icon, color, border, text_color, parent_id, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, s.label, s.description, s.icon, s.color, s.border, s.text_color, s.parent_id, s.order_index]
        );
      }
    }
  } catch(e) {
    // Silent fail for seeding
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get('userId') || 0);
    const gm = userId > 0 ? await isGM(userId) : false;

    // Si la tabla está vacía, insertar secciones por defecto automáticamente
    await seedDefaultSections();

    const [rows] = await authPool.query<RowDataPacket[]>(
      'SELECT * FROM auth.forum_sections ORDER BY order_index ASC'
    );
    return NextResponse.json({ sections: rows, isGM: gm }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error cargando secciones', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, id, label, description, icon, color, border, text_color, parent_id, order_index } = body;

    if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const gm = await isGM(userId);
    if (!gm) return NextResponse.json({ error: 'No tienes permisos (GM 3+ requerido)' }, { status: 403 });

    if (!id || !label) return NextResponse.json({ error: 'Faltan campos obligatorios (ID, Label)' }, { status: 400 });

    const finalDesc = description || null;
    const finalIcon = icon || 'MessageSquare';
    const finalColor = color || 'from-purple-700 to-indigo-700';
    const finalBorder = border || 'border-purple-700/50';
    const finalTextColor = text_color || 'text-purple-300';
    const finalParent = parent_id || null;
    const finalOrder = Number(order_index || 0);

    await authPool.query(
      `INSERT INTO auth.forum_sections (id, label, description, icon, color, border, text_color, parent_id, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label=?, description=?, icon=?, color=?, border=?, text_color=?, parent_id=?, order_index=?`,
      [
        id, label, finalDesc, finalIcon, finalColor, finalBorder, finalTextColor, finalParent, finalOrder,
        label, finalDesc, finalIcon, finalColor, finalBorder, finalTextColor, finalParent, finalOrder
      ]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error creando sección', details: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, id, is_locked } = body;

    if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const gm = await isGM(userId);
    if (!gm) return NextResponse.json({ error: 'No tienes permisos (GM 3+ requerido)' }, { status: 403 });

    if (!id) return NextResponse.json({ error: 'ID de sección faltante' }, { status: 400 });

    // Intentar agregar la columna por si no existe
    try {
      await authPool.query('ALTER TABLE auth.forum_sections ADD COLUMN is_locked TINYINT(1) DEFAULT 0');
    } catch(e) {}

    await authPool.query(
      'UPDATE auth.forum_sections SET is_locked = ? WHERE id = ?',
      [is_locked ? 1 : 0, id]
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error actualizando sección', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get('userId') || 0);
    const sectionId = searchParams.get('id');

    if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const gm = await isGM(userId);
    if (!gm) return NextResponse.json({ error: 'No tienes permisos (GM 3+ requerido)' }, { status: 403 });

    if (!sectionId) return NextResponse.json({ error: 'ID de sección faltante' }, { status: 400 });

    // The front shouldn't be able to delete the hardcoded default sections just in case, but let's allow anything for now

    await authPool.query('DELETE FROM auth.forum_sections WHERE id = ? LIMIT 1', [sectionId]);

    // To prevent orphans, optionally move topics to 'general' or just let them be orphaned,
    // they just won't show in any section unless the category matches.
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error eliminando sección', details: error.message }, { status: 500 });
  }
}
