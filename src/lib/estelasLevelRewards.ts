import { authPool } from '@/lib/db';
import pool from '@/lib/db';
import { executeSoapCommand } from '@/lib/soap';

export type LevelReward = {
  level: number;
  estelas: number;
  subject: string;
  body: string;
};

export const LEVEL_REWARDS: LevelReward[] = [
  {
    level: 10,
    estelas: 3,
    subject: '¡Recompensa de Nivel 10!',
    body: '¡Felicidades, Adalid! Has dado tus primeros grandes pasos y alcanzaste el nivel 10. Aquí tienes 3 Estelas para la tienda web. ¡El viaje apenas comienza!',
  },
  {
    level: 40,
    estelas: 4,
    subject: '¡Recompensa de Nivel 40!',
    body: '¡Increíble, Adalid! Has llegado al nivel 40 y con ello obtienes tu primera montura rápida. Aquí tienes 4 Estelas para recompensar tu esfuerzo. ¡Sigue así!',
  },
  {
    level: 70,
    estelas: 3,
    subject: '¡Recompensa de Nivel 70!',
    body: '¡Felicidades, Adalid! Estás a solo un paso del continente helado y has superado Terrallende. Aquí están tus 3 Estelas finales. ¡Prepárate para Rasganorte!',
  },
];

export type AwardedReward = {
  level: number;
  estelas: number;
  character: string;
};

export type AwardLevelRewardsResult = {
  success: boolean;
  accountId: number;
  maxLevel: number;
  totalEstelas: number;
  rewards: AwardedReward[];
  message: string;
};

async function ensureRewardTable(connection: any) {
  const dbName = process.env.DB_AUTH_NAME || 'auth';
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.estelas_level_rewards_log (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      account_id INT UNSIGNED NOT NULL,
      reward_level SMALLINT UNSIGNED NOT NULL,
      estelas_awarded INT UNSIGNED NOT NULL,
      character_guid INT UNSIGNED NOT NULL,
      character_name VARCHAR(32) NOT NULL,
      awarded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_account_reward_level (account_id, reward_level),
      KEY idx_account (account_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}


async function sendInGameMail(characterName: string, subject: string, body: string) {
  try {
    const safeSubject = subject.replace(/"/g, '\\"');
    const safeBody = body.replace(/"/g, '\\"');
    const command = `.send mail ${characterName} "${safeSubject}" "${safeBody}"`;
    await executeSoapCommand(command);
  } catch {
    // Mail is best-effort and should never fail the reward transaction.
  }
}

export async function awardLevelRewardsForAccount(accountId: number): Promise<AwardLevelRewardsResult> {
  let authConn: any = null;
  let charConn: any = null;

  try {
    authConn = await authPool.getConnection();
    charConn = await pool.getConnection();

    await ensureRewardTable(authConn);

    const dbAuthName = process.env.DB_AUTH_NAME || 'auth';
    const dbCharName = process.env.DB_CHARACTERS_NAME || 'characters';

    // ── Check account joindate to enforce "new accounts only" rule ──
    const [accRows]: any = await authConn.query(
      `SELECT joindate FROM \`${dbAuthName}\`.account WHERE id = ? LIMIT 1`,
      [accountId]
    );

    if (!accRows || accRows.length === 0) {
      return { success: true, accountId, maxLevel: 0, totalEstelas: 0, rewards: [], message: 'Cuenta no encontrada.' };
    }

    const accountJoinDate = new Date(accRows[0].joindate);
    const cutoffDate = new Date('2026-04-18T00:00:00Z');

    if (accountJoinDate < cutoffDate) {
      return {
        success: true,
        accountId,
        maxLevel: 0,
        totalEstelas: 0,
        rewards: [],
        message: 'Las recompensas por nivel solo aplican a cuentas creadas a partir del 18 de Abril de 2026.',
      };
    }

    const [charRows]: any = await charConn.query(
      `SELECT guid, name, level, account
       FROM \`${dbCharName}\`.characters
       WHERE account = ?
       ORDER BY level DESC`,
      [accountId]
    );

    if (!charRows || charRows.length === 0) {
      return {
        success: true,
        accountId,
        maxLevel: 0,
        totalEstelas: 0,
        rewards: [],
        message: 'No hay personajes en esta cuenta.',
      };
    }

    const highestChar = charRows[0];
    const maxLevel = Number(highestChar.level);

    const [existingRewards]: any = await authConn.query(
      `SELECT reward_level FROM \`${dbAuthName}\`.estelas_level_rewards_log WHERE account_id = ?`,
      [accountId]
    );
    const alreadyAwarded = new Set((existingRewards || []).map((r: any) => Number(r.reward_level)));

    const newRewards: LevelReward[] = [];
    for (const reward of LEVEL_REWARDS) {
      if (maxLevel >= reward.level && !alreadyAwarded.has(reward.level)) {
        newRewards.push(reward);
      }
    }

    if (newRewards.length === 0) {
      return {
        success: true,
        accountId,
        maxLevel,
        totalEstelas: 0,
        rewards: [],
        message: 'No hay recompensas pendientes.',
      };
    }

    await authConn.beginTransaction();

    const awarded: AwardedReward[] = [];
    let totalEstelas = 0;

    for (const reward of newRewards) {
      const triggerChar = charRows.find((c: any) => Number(c.level) >= reward.level) || highestChar;

      try {
        await authConn.query(
          `INSERT INTO \`${dbAuthName}\`.estelas_level_rewards_log
           (account_id, reward_level, estelas_awarded, character_guid, character_name)
           VALUES (?, ?, ?, ?, ?)`,
          [accountId, reward.level, reward.estelas, triggerChar.guid, triggerChar.name]
        );

        totalEstelas += reward.estelas;
        awarded.push({
          level: reward.level,
          estelas: reward.estelas,
          character: triggerChar.name,
        });
      } catch (insertErr: any) {
        if (insertErr.code === 'ER_DUP_ENTRY') {
          continue;
        }
        throw insertErr;
      }
    }

    if (totalEstelas > 0) {
      await authConn.query(`UPDATE \`${dbAuthName}\`.account SET vp = vp + ? WHERE id = ?`, [totalEstelas, accountId]);
    }

    await authConn.commit();

    for (const reward of newRewards) {
      const triggerChar = charRows.find((c: any) => Number(c.level) >= reward.level) || highestChar;
      sendInGameMail(triggerChar.name, reward.subject, reward.body).catch(() => {});
    }

    return {
      success: true,
      accountId,
      maxLevel,
      totalEstelas,
      rewards: awarded,
      message: totalEstelas > 0 ? `¡${totalEstelas} Estelas otorgadas!` : 'No hay recompensas pendientes.',
    };
  } catch (err: any) {
    console.error('❌ Error fatal en awardLevelRewardsForAccount:', err);
    if (authConn) {
      try {
        await authConn.rollback();
      } catch {
        // ignore rollback errors
      }
    }
    throw new Error(`Error otorgando estelas por nivel: ${err.message || 'Error desconocido'}`);
  } finally {
    if (authConn) authConn.release();
    if (charConn) charConn.release();
  }
}

export async function getLevelRewardsStatus(accountId: number) {
  let authConn: any = null;
  let charConn: any = null;

  try {
    authConn = await authPool.getConnection();
    charConn = await pool.getConnection();

    await ensureRewardTable(authConn);

    const dbAuthName = process.env.DB_AUTH_NAME || 'auth';
    const dbCharName = process.env.DB_CHARACTERS_NAME || 'characters';

    // ── Check account joindate ──
    const [accRows]: any = await authConn.query(
      `SELECT joindate FROM \`${dbAuthName}\`.account WHERE id = ? LIMIT 1`,
      [accountId]
    );

    const isEligible = accRows && accRows.length > 0 && new Date(accRows[0].joindate) >= new Date('2026-04-18T00:00:00Z');

    if (!isEligible) {
      // Return 0 possible rewards for old accounts.
      return {
        accountId,
        maxLevel: 0,
        milestones: LEVEL_REWARDS.map((reward) => ({
          level: reward.level,
          estelas: reward.estelas,
          status: 'locked',
          awardedInfo: null,
        })),
        totalPossible: 0,
        totalAwarded: 0,
        remaining: 0,
      };
    }

    const [charRows]: any = await charConn.query(
      `SELECT MAX(level) AS maxLevel FROM \`${dbCharName}\`.characters WHERE account = ?`,
      [accountId]
    );
    const maxLevel = Number(charRows?.[0]?.maxLevel || 0);

    const [existingRewards]: any = await authConn.query(
      `SELECT reward_level, estelas_awarded, character_name, awarded_at FROM \`${dbAuthName}\`.estelas_level_rewards_log WHERE account_id = ? ORDER BY reward_level`,
      [accountId]
    );

    const alreadyAwarded = new Set((existingRewards || []).map((r: any) => Number(r.reward_level)));

    const milestones = LEVEL_REWARDS.map((reward) => ({
      level: reward.level,
      estelas: reward.estelas,
      status: alreadyAwarded.has(reward.level)
        ? 'awarded'
        : maxLevel >= reward.level
          ? 'pending'
          : 'locked',
      awardedInfo: (existingRewards || []).find((r: any) => Number(r.reward_level) === reward.level) || null,
    }));

    const totalPossible = LEVEL_REWARDS.reduce((sum, r) => sum + r.estelas, 0);
    const totalAwarded = (existingRewards || []).reduce((sum: number, r: any) => sum + Number(r.estelas_awarded), 0);

    return {
      accountId,
      maxLevel,
      milestones,
      totalPossible,
      totalAwarded,
      remaining: totalPossible - totalAwarded,
    };
  } finally {
    authConn?.release();
    charConn?.release();
  }
}