import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

type SchemaColumn = RowDataPacket & { COLUMN_NAME: string };

type DeletedCharacterRow = RowDataPacket & {
  guid: number;
  name: string;
  level: number;
  race: number;
  class: number;
  online: number;
  deletedAt: number | null;
};

async function getCharactersColumns(): Promise<Set<string>> {
  const [rows] = await pool.query<SchemaColumn[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'characters'`
  );
  return new Set(rows.map((r) => String(r.COLUMN_NAME || '')));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = Number(searchParams.get('accountId'));

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ error: 'accountId invalido' }, { status: 400 });
    }

    const columns = await getCharactersColumns();

    if (columns.has('deleteInfos_Account') && columns.has('deleteDate')) {
      const hasDeleteName = columns.has('deleteInfos_Name');
      const selectName = hasDeleteName
        ? 'COALESCE(NULLIF(deleteInfos_Name, ""), name)'
        : 'name';

      const [rows] = await pool.query<DeletedCharacterRow[]>(
        `SELECT guid,
                ${selectName} AS name,
                level,
                race,
                class,
                online,
                deleteDate AS deletedAt
         FROM characters
         WHERE deleteInfos_Account = ?
           AND deleteDate > 0
         ORDER BY deleteDate DESC`,
        [accountId]
      );

      return NextResponse.json({
        deletedCharacters: rows,
        mode: 'acore_deleteInfos',
      });
    }

    if (columns.has('deleted')) {
      const deletedAtExpr = columns.has('deleted_at') ? 'deleted_at' : 'NULL';
      const [rows] = await pool.query<DeletedCharacterRow[]>(
        `SELECT guid, name, level, race, class, online, ${deletedAtExpr} AS deletedAt
         FROM characters
         WHERE account = ?
           AND deleted = 1
         ORDER BY guid DESC`,
        [accountId]
      );

      return NextResponse.json({
        deletedCharacters: rows,
        mode: 'custom_deleted_flag',
      });
    }

    if (columns.has('is_deleted')) {
      const deletedAtExpr = columns.has('deleted_at') ? 'deleted_at' : 'NULL';
      const [rows] = await pool.query<DeletedCharacterRow[]>(
        `SELECT guid, name, level, race, class, online, ${deletedAtExpr} AS deletedAt
         FROM characters
         WHERE account = ?
           AND is_deleted = 1
         ORDER BY guid DESC`,
        [accountId]
      );

      return NextResponse.json({
        deletedCharacters: rows,
        mode: 'custom_is_deleted',
      });
    }

    return NextResponse.json(
      {
        error: 'Tu tabla de personajes no tiene columnas de borrado compatibles para recuperación web.',
        code: 'DELETE_SCHEMA_UNSUPPORTED',
      },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('Deleted characters GET error:', error);
    return NextResponse.json(
      {
        error: 'Error al listar personajes borrados',
        details: error?.message || 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
