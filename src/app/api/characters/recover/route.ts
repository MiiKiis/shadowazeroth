import { NextResponse } from 'next/server';
import pool, { authPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

type SchemaColumn = RowDataPacket & { COLUMN_NAME: string };

type AccountRow = RowDataPacket & { dp: number };

type TargetCharRow = RowDataPacket & {
  guid: number;
  online: number;
  deleteInfos_Name?: string | null;
  name?: string;
};

const RECOVERY_DP_COST = 1;

async function getCharactersColumns(): Promise<Set<string>> {
  const [rows] = await pool.query<SchemaColumn[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'characters'`
  );
  return new Set(rows.map((r) => String(r.COLUMN_NAME || '')));
}

export async function POST(request: Request) {
  let authConnection: Awaited<ReturnType<typeof authPool.getConnection>> | null = null;

  try {
    const body = await request.json();
    const accountId = Number(body?.accountId);
    const characterGuid = Number(body?.characterGuid);

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ error: 'accountId invalido' }, { status: 400 });
    }
    if (!Number.isInteger(characterGuid) || characterGuid <= 0) {
      return NextResponse.json({ error: 'characterGuid invalido' }, { status: 400 });
    }

    const columns = await getCharactersColumns();

    authConnection = await authPool.getConnection();
    await authConnection.beginTransaction();

    const [accRows] = await authConnection.query<AccountRow[]>(
      'SELECT dp FROM account WHERE id = ? FOR UPDATE',
      [accountId]
    );

    if (!accRows || accRows.length === 0) {
      await authConnection.rollback();
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    if (Number(accRows[0].dp || 0) < RECOVERY_DP_COST) {
      await authConnection.rollback();
      return NextResponse.json(
        { error: `Necesitas ${RECOVERY_DP_COST} credito para recuperar el personaje.` },
        { status: 400 }
      );
    }

    if (columns.has('deleteInfos_Account') && columns.has('deleteDate')) {
      const hasDeleteName = columns.has('deleteInfos_Name');

      const [targetRows] = await pool.query<TargetCharRow[]>(
        `SELECT guid, online${hasDeleteName ? ', deleteInfos_Name, name' : ', name'}
         FROM characters
         WHERE guid = ?
           AND deleteInfos_Account = ?
           AND deleteDate > 0
         LIMIT 1`,
        [characterGuid, accountId]
      );

      if (!targetRows || targetRows.length === 0) {
        await authConnection.rollback();
        return NextResponse.json({ error: 'Personaje borrado no encontrado para esta cuenta' }, { status: 404 });
      }

      const target = targetRows[0];
      if (Number(target.online || 0) === 1) {
        await authConnection.rollback();
        return NextResponse.json({ error: 'El personaje está online. Desconéctalo para recuperar.' }, { status: 400 });
      }

      const hasDeleteDate = columns.has('deleteDate');
      const hasAccount = columns.has('account');
      const targetName = hasDeleteName ? String(target.deleteInfos_Name || '').trim() : '';
      const canRestoreName = hasDeleteName && targetName.length > 0;

      const updates: string[] = [];
      const params: any[] = [];

      if (hasAccount) {
        updates.push('account = ?');
        params.push(accountId);
      }

      if (canRestoreName) {
        updates.push('name = ?');
        params.push(targetName);
      }

      updates.push('deleteInfos_Account = 0');
      if (hasDeleteName) updates.push('deleteInfos_Name = ""');
      if (hasDeleteDate) updates.push('deleteDate = 0');

      params.push(characterGuid, accountId);

      const [updateResult]: any = await pool.query(
        `UPDATE characters
         SET ${updates.join(', ')}
         WHERE guid = ?
           AND deleteInfos_Account = ?
           AND deleteDate > 0`,
        params
      );

      if (!Number(updateResult?.affectedRows || 0)) {
        await authConnection.rollback();
        return NextResponse.json({ error: 'No se pudo recuperar el personaje' }, { status: 409 });
      }
    } else if (columns.has('deleted')) {
      const [targetRows] = await pool.query<TargetCharRow[]>(
        `SELECT guid, online
         FROM characters
         WHERE guid = ?
           AND account = ?
           AND deleted = 1
         LIMIT 1`,
        [characterGuid, accountId]
      );

      if (!targetRows || targetRows.length === 0) {
        await authConnection.rollback();
        return NextResponse.json({ error: 'Personaje borrado no encontrado para esta cuenta' }, { status: 404 });
      }

      if (Number(targetRows[0].online || 0) === 1) {
        await authConnection.rollback();
        return NextResponse.json({ error: 'El personaje está online. Desconéctalo para recuperar.' }, { status: 400 });
      }

      const setDeletedAt = columns.has('deleted_at') ? ', deleted_at = NULL' : '';
      const [updateResult]: any = await pool.query(
        `UPDATE characters
         SET deleted = 0${setDeletedAt}
         WHERE guid = ?
           AND account = ?
           AND deleted = 1`,
        [characterGuid, accountId]
      );

      if (!Number(updateResult?.affectedRows || 0)) {
        await authConnection.rollback();
        return NextResponse.json({ error: 'No se pudo recuperar el personaje' }, { status: 409 });
      }
    } else if (columns.has('is_deleted')) {
      const [targetRows] = await pool.query<TargetCharRow[]>(
        `SELECT guid, online
         FROM characters
         WHERE guid = ?
           AND account = ?
           AND is_deleted = 1
         LIMIT 1`,
        [characterGuid, accountId]
      );

      if (!targetRows || targetRows.length === 0) {
        await authConnection.rollback();
        return NextResponse.json({ error: 'Personaje borrado no encontrado para esta cuenta' }, { status: 404 });
      }

      if (Number(targetRows[0].online || 0) === 1) {
        await authConnection.rollback();
        return NextResponse.json({ error: 'El personaje está online. Desconéctalo para recuperar.' }, { status: 400 });
      }

      const setDeletedAt = columns.has('deleted_at') ? ', deleted_at = NULL' : '';
      const [updateResult]: any = await pool.query(
        `UPDATE characters
         SET is_deleted = 0${setDeletedAt}
         WHERE guid = ?
           AND account = ?
           AND is_deleted = 1`,
        [characterGuid, accountId]
      );

      if (!Number(updateResult?.affectedRows || 0)) {
        await authConnection.rollback();
        return NextResponse.json({ error: 'No se pudo recuperar el personaje' }, { status: 409 });
      }
    } else {
      await authConnection.rollback();
      return NextResponse.json(
        {
          error: 'Tu esquema de personajes no soporta recuperación web automática.',
          code: 'DELETE_SCHEMA_UNSUPPORTED',
        },
        { status: 501 }
      );
    }

    const [deductResult]: any = await authConnection.query(
      'UPDATE account SET dp = dp - ? WHERE id = ? AND dp >= ?',
      [RECOVERY_DP_COST, accountId, RECOVERY_DP_COST]
    );

    if (!Number(deductResult?.affectedRows || 0)) {
      await authConnection.rollback();
      return NextResponse.json({ error: 'No se pudo descontar el credito de recuperación' }, { status: 409 });
    }

    await authConnection.commit();

    return NextResponse.json({
      success: true,
      message: `Personaje recuperado con éxito. Se descontó ${RECOVERY_DP_COST} credito.`,
      cost: RECOVERY_DP_COST,
      currency: 'dp',
    });
  } catch (error: any) {
    if (authConnection) {
      try {
        await authConnection.rollback();
      } catch {
        // ignore rollback error
      }
    }

    const dbErrorCode = String(error?.code || '');
    if (dbErrorCode === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        {
          error: 'No se pudo restaurar el nombre original porque ya existe otro personaje con ese nombre.',
          details: 'Cambia el nombre del personaje en soporte o elimina el conflicto de nombre e intenta de nuevo.',
          code: 'NAME_CONFLICT',
        },
        { status: 409 }
      );
    }

    console.error('Recover character POST error:', error);
    return NextResponse.json(
      {
        error: 'Error al recuperar personaje',
        details: error?.message || 'Error desconocido',
      },
      { status: 500 }
    );
  } finally {
    if (authConnection) authConnection.release();
  }
}
