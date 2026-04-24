import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { ensureRecruitTables } from '@/lib/recruitAFriend';
import pool from '@/lib/db';

export async function GET(request: Request) {
  let connection: Awaited<ReturnType<typeof authPool.getConnection>> | null = null;

  try {
    const { searchParams } = new URL(request.url);
    const accountId = Number(searchParams.get('accountId') || 0);

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ error: 'accountId invalido' }, { status: 400 });
    }

    connection = await authPool.getConnection();
    await ensureRecruitTables(connection);

    const [asRecruiter]: any = await connection.query(
      `SELECT id, recruiter_account_id, recruiter_username, friend_name, friend_email,
              status, recruited_account_id, recruited_username, starter_bags_claimed, recruit_reward_given,
              accepted_at, created_at, levels_granted, last_summon_at, trigger_character_guid
       FROM auth.recruit_a_friend_referrals
       WHERE recruiter_account_id = ?
       ORDER BY created_at DESC`,
      [accountId]
    );

    const [asRecruited]: any = await connection.query(
      `SELECT id, recruiter_account_id, recruiter_username, friend_name, friend_email,
              status, recruited_account_id, recruited_username, starter_bags_claimed, recruit_reward_given,
              accepted_at, created_at, levels_granted, last_summon_at, trigger_character_guid
       FROM auth.recruit_a_friend_referrals
       WHERE recruited_account_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [accountId]
    );

    const recruiterRows = Array.isArray(asRecruiter) ? asRecruiter : [];
    const recruitedEntry = Array.isArray(asRecruited) && asRecruited.length > 0 ? asRecruited[0] : null;

    const accountIds = new Set<number>();
    for (const row of recruiterRows) {
      const rid = Number(row?.recruited_account_id || 0);
      if (rid > 0) accountIds.add(rid);
    }
    if (recruitedEntry) {
      const rid = Number(recruitedEntry?.recruited_account_id || 0);
      if (rid > 0) accountIds.add(rid);
    }

    const levelMap = new Map<number, number>();
    if (accountIds.size > 0) {
      const inParams = Array.from(accountIds);
      const placeholders = inParams.map(() => '?').join(',');
      const [levelRows]: any = await pool.query(
        `SELECT account, MAX(level) AS maxLevel
         FROM characters.characters
         WHERE account IN (${placeholders})
         GROUP BY account`,
        inParams
      );
      for (const row of levelRows || []) {
        const acc = Number(row?.account || 0);
        const maxLevel = Number(row?.maxLevel || 0);
        if (acc > 0) levelMap.set(acc, maxLevel);
      }
    }

    const recruiterInvites = recruiterRows.map((row: any) => {
      const recruitedAccountId = Number(row?.recruited_account_id || 0);
      const recruitedMaxLevel = recruitedAccountId > 0 ? Number(levelMap.get(recruitedAccountId) || 0) : 0;
      return {
        ...row,
        recruited_max_level: recruitedMaxLevel,
        level80_claimable: recruitedMaxLevel >= 80 && Number(row?.recruit_reward_given || 0) === 0,
      };
    });

    const recruitedPayload = recruitedEntry
      ? {
          ...recruitedEntry,
          recruited_max_level: Number(levelMap.get(Number(recruitedEntry.recruited_account_id || 0)) || 0),
          level80_claimable:
            Number(levelMap.get(Number(recruitedEntry.recruited_account_id || 0)) || 0) >= 80 &&
            Number(recruitedEntry.recruit_reward_given || 0) === 0,
        }
      : null;

    return NextResponse.json({
      success: true,
      recruiterInvites,
      recruitedEntry: recruitedPayload,
    });
  } catch (error: any) {
    console.error('Recruit status GET error:', error);
    return NextResponse.json({ error: 'Error cargando estado de reclutamiento', details: error?.message || 'Error desconocido' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
