import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { deliverRecruitStarterBags, ensureRecruitTables } from '@/lib/recruitAFriend';

export async function POST(request: Request) {
  let connection: Awaited<ReturnType<typeof authPool.getConnection>> | null = null;

  try {
    const body = await request.json();
    const accountId = Number(body?.accountId || 0);
    const targetCharacterGuid = Number(body?.targetCharacterGuid || 0);

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ error: 'accountId invalido' }, { status: 400 });
    }
    if (!Number.isInteger(targetCharacterGuid) || targetCharacterGuid <= 0) {
      return NextResponse.json({ error: 'Debes seleccionar un personaje valido para recibir el kit inicial.' }, { status: 400 });
    }

    connection = await authPool.getConnection();
    await ensureRecruitTables(connection);
    await connection.beginTransaction();

    const [rows]: any = await connection.query(
      `SELECT id, starter_bags_claimed
       FROM recruit_a_friend_referrals
       WHERE recruited_account_id = ?
       LIMIT 1
       FOR UPDATE`,
      [accountId]
    );

    if (!rows || rows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'No tienes una invitacion de reclutamiento vinculada.' }, { status: 404 });
    }

    const referral = rows[0];
    if (Number(referral.starter_bags_claimed || 0) === 1) {
      await connection.rollback();
      return NextResponse.json({ error: 'Las bolsas de bienvenida ya fueron reclamadas.' }, { status: 409 });
    }

    const delivery = await deliverRecruitStarterBags(accountId, targetCharacterGuid);

    await connection.query(
      `UPDATE recruit_a_friend_referrals
       SET starter_bags_claimed = 1,
           starter_bags_claimed_at = NOW()
       WHERE id = ?`,
      [Number(referral.id)]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `Se enviaron 4 bolsas y ${delivery.gold}g al personaje ${delivery.deliveredTo}. Revisa tu buzón in-game.`,
    });
  } catch (error: any) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore rollback errors
      }
    }
    console.error('Recruit claim starter POST error:', error);
    return NextResponse.json({ error: 'Error reclamando bolsas de bienvenida', details: error?.message || 'Error desconocido' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
