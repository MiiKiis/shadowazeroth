import { NextResponse } from 'next/server';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { authPool, pool } from '@/lib/db';
import { readAvatarMap } from '@/lib/avatarStore';
import { getAccountAccessSchema, getGMLevel } from '@/lib/gmLevel';

type GmRow = RowDataPacket & { gmlevel: number | null };
type AccountRow = RowDataPacket & { id: number };
type CharacterRow = RowDataPacket & { guid: number };
type TopicRow = RowDataPacket & {
  id: number;
  title: string;
  category: string;
  pinned: number;
  locked: number;
  completed: number;
  in_review: number;
  denied: number;
  views: number;
  created_at: string;
  author_username: string;
  author_id: number;
  gmlevel: number | null;
  comment_count: number;
  last_reply_at: string | null;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido';
}

function normalizeLoose(input: string): string {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isInSectionTree(startId: string, rootId: string, parentMap: Map<string, string | null>): boolean {
  let current = String(startId || '');
  const target = String(rootId || '');
  const guard = new Set<string>();

  while (current) {
    if (current === target) return true;
    if (guard.has(current)) break;
    guard.add(current);
    current = String(parentMap.get(current) || '');
  }

  return false;
}

// ─── Migraciones one-time (se ejecutan UNA sola vez por proceso) ──────────────
let migrationsRan: Promise<void> | null = null;

async function runMigrations(): Promise<void> {
  if (migrationsRan) return migrationsRan;

  migrationsRan = (async () => {
    // 0. Base tables (para instalaciones nuevas)
    await authPool.query(`
      CREATE TABLE IF NOT EXISTS auth.forum_topics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(64) NOT NULL DEFAULT 'general',
        author_id INT UNSIGNED NOT NULL,
        pinned TINYINT(1) NOT NULL DEFAULT 0,
        locked TINYINT(1) NOT NULL DEFAULT 0,
        completed TINYINT(1) NOT NULL DEFAULT 0,
        in_review TINYINT(1) NOT NULL DEFAULT 0,
        denied TINYINT(1) NOT NULL DEFAULT 0,
        views INT NOT NULL DEFAULT 0,
        order_index INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await authPool.query(`
      CREATE TABLE IF NOT EXISTS auth.forum_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        topic_id INT NOT NULL,
        author_id INT UNSIGNED NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (topic_id) REFERENCES auth.forum_topics(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 1. Tabla de secciones
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES auth.forum_sections(id) ON DELETE SET NULL
      )
    `);

    // 2. Seeds si vacía
    const [sectionRows]: any = await authPool.query('SELECT COUNT(*) as count FROM auth.forum_sections');
    if (sectionRows[0].count === 0) {
      const defaults = [
        ['announcements', 'Reporte de Bugs', 'Reporta errores encontrados en el juego', 'Wrench', 'from-fuchsia-700 to-fuchsia-900', 'border-fuchsia-700/50', 'text-fuchsia-300', null],
        ['support', 'Soporte', 'Ayuda técnica', 'LifeBuoy', 'from-rose-700 to-rose-900', 'border-rose-700/50', 'text-rose-300', null],
        ['guides', 'Guías', 'Tutoriales y tips', 'Lightbulb', 'from-cyan-700 to-cyan-900', 'border-cyan-700/50', 'text-cyan-300', null],
        ['reports', 'Denuncias', 'Reporta infracciones', 'AlertOctagon', 'from-red-700 to-red-900', 'border-red-700/50', 'text-red-300', null],
        ['suggestions', 'Sugerencias', 'Ideas de mejora', 'Sparkles', 'from-emerald-700 to-emerald-900', 'border-emerald-700/50', 'text-emerald-300', null],
        ['migrations', 'Migraciones', 'Cambia de servidor', 'Globe', 'from-blue-700 to-blue-900', 'border-blue-700/50', 'text-blue-300', null],
      ];
      for (const d of defaults) {
        await authPool.query(
          'INSERT IGNORE INTO auth.forum_sections (id, label, description, icon, color, border, text_color, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          d
        );
      }
    }

    // 3. Columna `completed`
    const dbName = process.env.DB_AUTH || 'auth';
    const [completedRows]: any = await authPool.query(
      `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'auth' AND TABLE_NAME = 'forum_topics' AND COLUMN_NAME = 'completed' LIMIT 1`,
      []
    );
    if (!completedRows?.length) {
      await authPool.query(
        'ALTER TABLE auth.forum_topics ADD COLUMN completed TINYINT(1) NOT NULL DEFAULT 0 AFTER locked'
      );
    }

    // 3.1 Columna `in_review` para estado intermedio del staff/GM
    const [reviewRows]: any = await authPool.query(
      `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'auth' AND TABLE_NAME = 'forum_topics' AND COLUMN_NAME = 'in_review' LIMIT 1`,
      []
    );
    if (!reviewRows?.length) {
      await authPool.query(
        'ALTER TABLE auth.forum_topics ADD COLUMN in_review TINYINT(1) NOT NULL DEFAULT 0 AFTER completed'
      );
    }

    // 3.2 Columna `denied` para casos rechazados
    const [deniedRows]: any = await authPool.query(
      `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'auth' AND TABLE_NAME = 'forum_topics' AND COLUMN_NAME = 'denied' LIMIT 1`,
      []
    );
    if (!deniedRows?.length) {
      await authPool.query(
        'ALTER TABLE auth.forum_topics ADD COLUMN denied TINYINT(1) NOT NULL DEFAULT 0 AFTER in_review'
      );
    }

    // 4. Migrar category ENUM → VARCHAR
    const [catRows]: any = await authPool.query(
      `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'auth' AND TABLE_NAME = 'forum_topics' AND COLUMN_NAME = 'category' LIMIT 1`,
      []
    );
    if (catRows?.length && catRows[0].DATA_TYPE === 'enum') {
      await authPool.query(
        'ALTER TABLE auth.forum_topics MODIFY COLUMN category VARCHAR(64) NOT NULL DEFAULT "general"'
      );
    }

    // 2.1 Crear sub-secciones de resultado para "Personajes borrados"
    const [allSections]: any = await authPool.query('SELECT id, label, parent_id FROM auth.forum_sections');
    const sectionList = Array.isArray(allSections) ? allSections : [];
    const parentDeletedSection = sectionList.find((row: any) => {
      const idNorm = normalizeLoose(String(row?.id || ''));
      const labelNorm = normalizeLoose(String(row?.label || ''));
      return idNorm.includes('personajes-borrados') ||
        idNorm.includes('personajes_borrados') ||
        idNorm.includes('deleted-characters') ||
        labelNorm.includes('personajes borrados') ||
        labelNorm.includes('personajes eliminados');
    });

    // 2.1b Renombrar Anuncios a Reporte de Bugs si existe
    await authPool.query(
      `UPDATE auth.forum_sections 
       SET label = 'Reporte de Bugs', 
           description = 'Reporta errores encontrados en el juego',
           icon = 'Wrench'
       WHERE id = 'announcements' AND (label = 'Anuncios' OR label = 'announcements')`
    );

    if (parentDeletedSection?.id) {
      await authPool.query(
        `INSERT IGNORE INTO forum_sections (id, label, description, icon, color, border, text_color, parent_id, order_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          'personajes-borrados-solucionado',
          'Solucionado',
          'Solicitudes resueltas de personajes borrados',
          'CheckCircle2',
          'from-emerald-700 to-emerald-900',
          'border-emerald-700/50',
          'text-emerald-300',
          String(parentDeletedSection.id),
          90,
        ]
      );

      await authPool.query(
        `INSERT IGNORE INTO forum_sections (id, label, description, icon, color, border, text_color, parent_id, order_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          'personajes-borrados-denegado',
          'Denegado',
          'Solicitudes rechazadas de personajes borrados',
          'XCircle',
          'from-rose-700 to-rose-900',
          'border-rose-700/50',
          'text-rose-300',
          String(parentDeletedSection.id),
          91,
        ]
      );
    }

    const migrationsParentSection = sectionList.find((row: any) => {
      const idNorm = normalizeLoose(String(row?.id || ''));
      const labelNorm = normalizeLoose(String(row?.label || ''));
      return idNorm === 'migrations' || idNorm.includes('migraciones') || labelNorm.includes('migraciones');
    });

    if (migrationsParentSection?.id) {
      await authPool.query(
        `INSERT IGNORE INTO auth.forum_sections (id, label, description, icon, color, border, text_color, parent_id, order_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'migracion-aceptada',
          'Migración aceptada',
          'Solicitudes de migración aprobadas',
          'CheckCircle2',
          'from-emerald-700 to-emerald-900',
          'border-emerald-700/50',
          'text-emerald-300',
          String(migrationsParentSection.id),
          80,
        ]
      );
    }

    // 2.2 Reubicar temas existentes (sin borrar datos), solo por estado solucionado:
    // - Completados del flujo migraciones/personajes borrados -> Migración aceptada
    const [sectionsAfter]: any = await authPool.query('SELECT id, label, parent_id FROM auth.forum_sections');
    const sectionsAfterList = Array.isArray(sectionsAfter) ? sectionsAfter : [];
    const parentMap = new Map<string, string | null>(
      sectionsAfterList.map((row: any) => [String(row?.id || ''), row?.parent_id ? String(row.parent_id) : null])
    );

    const deletedParentAfter = sectionsAfterList.find((row: any) => {
      const idNorm = normalizeLoose(String(row?.id || ''));
      const labelNorm = normalizeLoose(String(row?.label || ''));
      return idNorm.includes('personajes-borrados') ||
        idNorm.includes('personajes_borrados') ||
        idNorm.includes('deleted-characters') ||
        labelNorm.includes('personajes borrados') ||
        labelNorm.includes('personajes eliminados');
    });
    const deletedParentId = deletedParentAfter?.id ? String(deletedParentAfter.id) : '';

    const migrationsParentAfter = sectionsAfterList.find((row: any) => {
      const idNorm = normalizeLoose(String(row?.id || ''));
      const labelNorm = normalizeLoose(String(row?.label || ''));
      return idNorm === 'migrations' || idNorm.includes('migraciones') || labelNorm.includes('migraciones');
    });
    const migrationsParentId = migrationsParentAfter?.id ? String(migrationsParentAfter.id) : '';

    const migrationAcceptedSection = sectionsAfterList.find((row: any) => {
      const idNorm = normalizeLoose(String(row?.id || ''));
      const labelNorm = normalizeLoose(String(row?.label || ''));
      return idNorm.includes('migracion-aceptada') || labelNorm.includes('migracion aceptada');
    });
    const migrationAcceptedId = migrationAcceptedSection?.id ? String(migrationAcceptedSection.id) : '';

    const deletedTreeIds = deletedParentId
      ? sectionsAfterList
          .map((row: any) => String(row?.id || ''))
          .filter((id: string) => isInSectionTree(id, deletedParentId, parentMap))
      : [];
    const migrationsTreeIds = migrationsParentId
      ? sectionsAfterList
          .map((row: any) => String(row?.id || ''))
          .filter((id: string) => isInSectionTree(id, migrationsParentId, parentMap))
      : [];

    if (migrationAcceptedId) {
      if (deletedTreeIds.length > 0) {
        await authPool.query(
          `UPDATE forum_topics
           SET category = ?, completed = 1, in_review = 0, denied = 0, updated_at = NOW()
           WHERE completed = 1
             AND category IN (${deletedTreeIds.map(() => '?').join(',')})`,
          [migrationAcceptedId, ...deletedTreeIds]
        );
      }

      const migrationsCandidates = migrationsTreeIds.filter((id: string) => id !== migrationAcceptedId);
      if (migrationsCandidates.length > 0) {
        await authPool.query(
          `UPDATE forum_topics
           SET category = ?, completed = 1, in_review = 0, denied = 0, updated_at = NOW()
           WHERE completed = 1
             AND category IN (${migrationsCandidates.map(() => '?').join(',')})`,
          [migrationAcceptedId, ...migrationsCandidates]
        );
      }
    }

    // 5. Columna `updated_at` — sin ella el ORDER BY falla
    const [updatedRows]: any = await authPool.query(
      `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'auth' AND TABLE_NAME = 'forum_topics' AND COLUMN_NAME = 'updated_at' LIMIT 1`
    );
    if (!updatedRows?.length) {
      await authPool.query(
        'ALTER TABLE auth.forum_topics ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
      );
    }

    // 5.1 Columna `author_character` para mostrar PJ en lugar de cuenta
    const [authorCharacterRows]: any = await authPool.query(
      `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'auth' AND TABLE_NAME = 'forum_topics' AND COLUMN_NAME = 'author_character' LIMIT 1`
    );
    if (!authorCharacterRows?.length) {
      await authPool.query(
        'ALTER TABLE auth.forum_topics ADD COLUMN author_character VARCHAR(32) NULL DEFAULT NULL AFTER author_id'
      );
    }

    // 6. Índices de performance en forum_topics
    try {
      await authPool.query('ALTER TABLE auth.forum_topics ADD INDEX idx_category (category)');
    } catch { /* índice ya existe */ }
    try {
      await authPool.query('ALTER TABLE auth.forum_topics ADD INDEX idx_pinned_updated (pinned, updated_at)');
    } catch { /* índice ya existe */ }

    // 7. Índice en forum_comments para las agregaciones
    try {
      await authPool.query('ALTER TABLE auth.forum_comments ADD INDEX idx_topic_id (topic_id)');
    } catch { /* índice ya existe */ }

  })().catch((err) => {
    console.error('[Forum] Error en migraciones:', err);
    migrationsRan = null; // Permitir reintento en el próximo ciclo
  });

  return migrationsRan;
}

async function reconcileSolvedTopicsToMigrationAccepted(): Promise<void> {
  const [rows]: any = await authPool.query('SELECT id, label, parent_id FROM auth.forum_sections');
  const sections = Array.isArray(rows) ? rows : [];
  if (!sections.length) return;

  const parentMap = new Map<string, string | null>(
    sections.map((row: any) => [String(row?.id || ''), row?.parent_id ? String(row.parent_id) : null])
  );

  const migrationAccepted = sections.find((row: any) => {
    const idNorm = normalizeLoose(String(row?.id || ''));
    const labelNorm = normalizeLoose(String(row?.label || ''));
    return idNorm.includes('migracion-aceptada') || labelNorm.includes('migracion aceptada');
  });
  const migrationAcceptedId = migrationAccepted?.id ? String(migrationAccepted.id) : '';
  if (!migrationAcceptedId) return;

  const migrationsParent = sections.find((row: any) => {
    const idNorm = normalizeLoose(String(row?.id || ''));
    const labelNorm = normalizeLoose(String(row?.label || ''));
    return idNorm === 'migrations' || idNorm.includes('migraciones') || labelNorm.includes('migraciones');
  });
  const migrationsParentId = migrationsParent?.id ? String(migrationsParent.id) : '';

  const deletedParent = sections.find((row: any) => {
    const idNorm = normalizeLoose(String(row?.id || ''));
    const labelNorm = normalizeLoose(String(row?.label || ''));
    return idNorm.includes('personajes-borrados') ||
      idNorm.includes('personajes_borrados') ||
      idNorm.includes('deleted-characters') ||
      labelNorm.includes('personajes borrados') ||
      labelNorm.includes('personajes eliminados');
  });
  const deletedParentId = deletedParent?.id ? String(deletedParent.id) : '';

  const migrationsTreeIds = migrationsParentId
    ? sections
        .map((row: any) => String(row?.id || ''))
        .filter((id: string) => isInSectionTree(id, migrationsParentId, parentMap))
    : [];
  const deletedTreeIds = deletedParentId
    ? sections
        .map((row: any) => String(row?.id || ''))
        .filter((id: string) => isInSectionTree(id, deletedParentId, parentMap))
    : [];

  const legacySolvedIds = sections
    .filter((row: any) => {
      const idNorm = normalizeLoose(String(row?.id || ''));
      const labelNorm = normalizeLoose(String(row?.label || ''));
      return idNorm.includes('solucionado') || labelNorm.includes('solucionado');
    })
    .map((row: any) => String(row.id));

  const fromCategoryIds = Array.from(new Set([
    ...migrationsTreeIds.filter((id: string) => id !== migrationAcceptedId),
    ...deletedTreeIds,
    ...legacySolvedIds,
  ])).filter((id) => !!id && id !== migrationAcceptedId);

  if (!fromCategoryIds.length) return;

  await authPool.query(
    `UPDATE auth.forum_topics
     SET category = ?, completed = 1, in_review = 0, denied = 0, updated_at = NOW()
     WHERE category IN (${fromCategoryIds.map(() => '?').join(',')})
       AND (completed = 1 OR category IN (${legacySolvedIds.length ? legacySolvedIds.map(() => '?').join(',') : 'NULL'}))
       AND category <> ?`,
    [migrationAcceptedId, ...fromCategoryIds, ...(legacySolvedIds.length ? legacySolvedIds : []), migrationAcceptedId]
  );
}

function resolveRole(gmlevel: number | null): string {
  const lvl = Number(gmlevel ?? 0);
  if (lvl >= 3) return 'GM';
  if (lvl >= 1) return 'Moderador';
  return 'Jugador';
}

async function isGM(userId: number): Promise<boolean> {
  const lvl = await getGMLevel(userId);
  return lvl >= 3;
}

export async function GET(request: Request) {
  try {
    // Migrations corren una sola vez; en requests subsiguientes es un noop
    await runMigrations();
    await reconcileSolvedTopicsToMigrationAccepted();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || null;

    const schema = await getAccountAccessSchema();

    // ─── Query optimizada: LEFT JOINs en lugar de subconsultas correlacionadas ──
    const [rows] = await authPool.query<TopicRow[]>(
      `SELECT
         t.id,
         t.title,
         t.category,
         t.pinned,
         t.locked,
         COALESCE(t.completed, 0)          AS completed,
         COALESCE(t.in_review, 0)          AS in_review,
        COALESCE(t.denied, 0)             AS denied,
         t.views,
         t.order_index,
         t.created_at,
         COALESCE(t.updated_at, t.created_at) AS updated_at,
         COALESCE(NULLIF(t.author_character, ''), COALESCE(a.username, '[Deleted]')) AS author_username,
         t.author_id                       AS author_id,
          MAX(aa.\`${schema.gmCol}\`)                   AS user_gmlevel,
         COALESCE(fc_agg.comment_count, 0) AS comment_count,
          fc_agg.last_reply_at              AS last_reply_at
       FROM auth.forum_topics t
       LEFT JOIN auth.account a          ON t.author_id = a.id
       LEFT JOIN auth.account_access aa  ON a.id = aa.\`${schema.idCol}\`
       LEFT JOIN (
         SELECT topic_id,
                COUNT(*)        AS comment_count,
                MAX(created_at) AS last_reply_at
         FROM auth.forum_comments
         GROUP BY topic_id
       ) fc_agg ON fc_agg.topic_id = t.id
       ${category ? 'WHERE t.category = ?' : ''}
       GROUP BY t.id, t.title, t.category, t.pinned, t.locked, t.completed, t.in_review, t.denied,
                t.views, t.order_index, t.created_at, t.updated_at, t.author_id, a.username,
                fc_agg.comment_count, fc_agg.last_reply_at
       ORDER BY (COALESCE(t.completed, 0) = 1 OR COALESCE(t.denied, 0) = 1) ASC,
                t.pinned DESC,
                t.order_index ASC,
                COALESCE(t.updated_at, t.created_at) DESC`,
      category ? [category] : []
    );

    const avatarMap = await readAvatarMap();

    // Ya filtramos en SQL con WHERE; no se necesita doble-filtrado JS
    const topics = rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      pinned: !!r.pinned,
      locked: !!r.locked,
      completed: !!r.completed,
      in_review: !!r.in_review,
      denied: !!r.denied,
      views: r.views,
      order_index: r.order_index,
      created_at: r.created_at,
      last_reply_at: r.last_reply_at ?? null,
      comment_count: Number(r.comment_count),
      author: {
        id: r.author_id,
        username: r.author_username,
        avatar: avatarMap[String(r.author_id)] ?? null,
        role: resolveRole(r.user_gmlevel),
      },
    }));

    return NextResponse.json({ topics }, { status: 200 });
  } catch (e: unknown) {
    console.error('GET /api/forum/topics error:', e);
    return NextResponse.json({ error: 'Error cargando temas', details: getErrorMessage(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await runMigrations();

    const body = await request.json();
    const userId   = Number(body?.userId || 0);
    const title    = String(body?.title || '').trim();
    const category = String(body?.category || 'general');
    const comment  = String(body?.comment || '').trim();
    const characterName = String(body?.characterName || '').trim();
    const pinned   = body?.pinned ? 1 : 0;
    const orderIndex = Number(body?.orderIndex || 0);

    const [sections] = await authPool.query<RowDataPacket[]>('SELECT id FROM auth.forum_sections');
    const validCategories = sections.map(s => s.id);

    if (!userId || userId <= 0)       return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!title || title.length < 3)   return NextResponse.json({ error: 'El título debe tener al menos 3 caracteres' }, { status: 400 });
    if (title.length > 200)           return NextResponse.json({ error: 'El título no puede exceder 200 caracteres' }, { status: 400 });
    if (validCategories.length > 0 && !validCategories.includes(category)) return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });
    if (!comment || comment.length < 10) return NextResponse.json({ error: 'El mensaje debe tener al menos 10 caracteres' }, { status: 400 });
    if (!characterName) return NextResponse.json({ error: 'Debes seleccionar un personaje para publicar' }, { status: 400 });

    const [accountRows] = await authPool.query<AccountRow[]>('SELECT id FROM auth.account WHERE id = ? LIMIT 1', [userId]);
    if (!accountRows.length) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });

    const [characterRows] = await pool.query<CharacterRow[]>(
      'SELECT guid FROM characters.characters WHERE account = ? AND name = ? LIMIT 1',
      [userId, characterName]
    );
    if (!characterRows.length) return NextResponse.json({ error: 'El personaje seleccionado no pertenece a tu cuenta' }, { status: 403 });

    /* Remuevo restricción de anuncios para que puedan reportar bugs */
    /*
    if (category === 'announcements') {
      const gm = await isGM(userId);
      if (!gm) {
        return NextResponse.json({ error: 'Solo el staff puede publicar anuncios' }, { status: 403 });
      }
    }
    */

    const conn = await authPool.getConnection();
    try {
      await conn.beginTransaction();
      const [topicResult] = await conn.query<ResultSetHeader>(
        'INSERT INTO auth.forum_topics (title, category, author_id, author_character, pinned, order_index) VALUES (?, ?, ?, ?, ?, ?)',
        [title, category, userId, characterName, pinned, orderIndex]
      );
      const topicId = topicResult.insertId;
      await conn.query(
        'INSERT INTO auth.forum_comments (topic_id, author_id, comment) VALUES (?, ?, ?)',
        [topicId, userId, comment]
      );
      await conn.commit();
      return NextResponse.json({ success: true, topicId }, { status: 201 });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (e: unknown) {
    console.error('POST /api/forum/topics error:', e);
    const details = getErrorMessage(e);
    if (details.toLowerCase().includes('incorrect') && details.toLowerCase().includes('category')) {
      return NextResponse.json(
        { error: 'La base de datos del foro necesita migración de categorías', details: 'Ejecuta alter-forum-categories.sql para habilitar las categorías nuevas.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Error creando tema', details }, { status: 500 });
  }
}
