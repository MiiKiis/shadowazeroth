import crypto from 'crypto';
import pool, { authPool } from '@/lib/db';
import { executeSoapCommand } from '@/lib/soap';

export const RAF_RECRUITER_REWARD_VP = 2;
export const RAF_RECRUIT_REWARD_VP = 3;
export const RAF_STARTER_BAG_ITEM = 21841;
export const RAF_STARTER_BAG_COUNT = 4;
export const RAF_STARTER_GOLD = 300;

export type RecruitReferralRow = {
  id: number;
  recruiter_account_id: number;
  recruiter_username: string;
  friend_name: string;
  friend_email: string;
  invite_token: string;
  status: 'invited' | 'registered' | 'rewarded';
  recruited_account_id: number | null;
  recruited_username: string | null;
  starter_bags_claimed: number;
  recruit_reward_given: number;
  accepted_at: string | null;
  created_at: string;
};

export function buildRecruitInviteToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export async function ensureRecruitTables(connection: Awaited<ReturnType<typeof authPool.getConnection>> | typeof authPool) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS auth.recruit_a_friend_referrals (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      recruiter_account_id INT UNSIGNED NOT NULL,
      recruiter_username VARCHAR(32) NOT NULL DEFAULT '',
      friend_name VARCHAR(64) NOT NULL DEFAULT '',
      friend_email VARCHAR(120) NOT NULL DEFAULT '',
      invite_token VARCHAR(96) NOT NULL,
      status ENUM('invited','registered','rewarded') NOT NULL DEFAULT 'invited',
      recruited_account_id INT UNSIGNED NULL,
      recruited_username VARCHAR(32) NULL,
      starter_bags_claimed TINYINT(1) NOT NULL DEFAULT 0,
      starter_bags_claimed_at TIMESTAMP NULL DEFAULT NULL,
      recruit_reward_given TINYINT(1) NOT NULL DEFAULT 0,
      recruit_reward_given_at TIMESTAMP NULL DEFAULT NULL,
      trigger_character_guid INT UNSIGNED NULL,
      accepted_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_invite_token (invite_token),
      UNIQUE KEY uq_recruited_account (recruited_account_id),
      KEY idx_recruiter (recruiter_account_id, created_at),
      KEY idx_status (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [columnRows]: any = await connection.query('SHOW COLUMNS FROM auth.recruit_a_friend_referrals');
  const existingColumns = new Set<string>((columnRows || []).map((row: any) => String(row?.Field || '')));

  const ensureColumn = async (name: string, definition: string) => {
    if (existingColumns.has(name)) return;
    await connection.query(`ALTER TABLE auth.recruit_a_friend_referrals ADD COLUMN ${definition}`);
    existingColumns.add(name);
  };

  const runSafeAlter = async (sql: string) => {
    try {
      await connection.query(sql);
    } catch (error: any) {
      // Non-critical migration failures should not block API usage.
      console.warn('ensureRecruitTables migration warning:', error?.message || error);
    }
  };

  await ensureColumn('recruiter_username', "recruiter_username VARCHAR(32) NOT NULL DEFAULT '' AFTER recruiter_account_id");
  await ensureColumn('friend_name', "friend_name VARCHAR(64) NOT NULL DEFAULT '' AFTER recruiter_username");
  await ensureColumn('friend_email', "friend_email VARCHAR(120) NOT NULL DEFAULT '' AFTER friend_name");
  await ensureColumn('invite_token', 'invite_token VARCHAR(96) NOT NULL AFTER friend_email');
  await ensureColumn('status', "status ENUM('invited','registered','rewarded') NOT NULL DEFAULT 'invited' AFTER invite_token");
  await ensureColumn('recruited_account_id', 'recruited_account_id INT UNSIGNED NULL AFTER status');
  await ensureColumn('recruited_username', 'recruited_username VARCHAR(32) NULL AFTER recruited_account_id');
  await ensureColumn('starter_bags_claimed', 'starter_bags_claimed TINYINT(1) NOT NULL DEFAULT 0 AFTER recruited_username');
  await ensureColumn('starter_bags_claimed_at', 'starter_bags_claimed_at TIMESTAMP NULL DEFAULT NULL AFTER starter_bags_claimed');
  await ensureColumn('recruit_reward_given', 'recruit_reward_given TINYINT(1) NOT NULL DEFAULT 0 AFTER starter_bags_claimed_at');
  await ensureColumn('recruit_reward_given_at', 'recruit_reward_given_at TIMESTAMP NULL DEFAULT NULL AFTER recruit_reward_given');
  await ensureColumn('trigger_character_guid', 'trigger_character_guid INT UNSIGNED NULL AFTER recruit_reward_given_at');
  await ensureColumn('accepted_at', 'accepted_at TIMESTAMP NULL DEFAULT NULL AFTER trigger_character_guid');
  await ensureColumn('created_at', 'created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER accepted_at');

  // Ensure enum includes rewarded in existing installations.
  await runSafeAlter(
    "ALTER TABLE auth.recruit_a_friend_referrals MODIFY COLUMN status ENUM('invited','registered','rewarded') NOT NULL DEFAULT 'invited'"
  );

  const [indexRows]: any = await connection.query('SHOW INDEX FROM auth.recruit_a_friend_referrals');
  const existingIndexes = new Set<string>((indexRows || []).map((row: any) => String(row?.Key_name || '')));

  if (!existingIndexes.has('uq_invite_token')) {
    await runSafeAlter('ALTER TABLE auth.recruit_a_friend_referrals ADD UNIQUE KEY uq_invite_token (invite_token)');
  }
  if (!existingIndexes.has('uq_recruited_account')) {
    await runSafeAlter('ALTER TABLE auth.recruit_a_friend_referrals ADD UNIQUE KEY uq_recruited_account (recruited_account_id)');
  }
  if (!existingIndexes.has('idx_recruiter')) {
    await runSafeAlter('ALTER TABLE auth.recruit_a_friend_referrals ADD KEY idx_recruiter (recruiter_account_id, created_at)');
  }
  if (!existingIndexes.has('idx_status')) {
    await runSafeAlter('ALTER TABLE auth.recruit_a_friend_referrals ADD KEY idx_status (status, created_at)');
  }

  await ensureColumn('last_summon_at', 'last_summon_at TIMESTAMP NULL DEFAULT NULL AFTER recruit_reward_given_at');
  await ensureColumn('levels_granted', 'levels_granted INT UNSIGNED NOT NULL DEFAULT 0 AFTER last_summon_at');
}

export async function summonFriend(params: {
  requesterAccountId: number;
  referralId: number;
  sourceCharGuid: number;
  targetCharGuid?: number;
}): Promise<{ success: boolean; message: string }> {
  let connection: Awaited<ReturnType<typeof authPool.getConnection>> | null = null;
  try {
    connection = await authPool.getConnection();
    const [referralRows]: any = await connection.query(
      `SELECT * FROM auth.recruit_a_friend_referrals WHERE id = ? AND (recruiter_account_id = ? OR recruited_account_id = ?) LIMIT 1`,
      [params.referralId, params.requesterAccountId, params.requesterAccountId]
    );

    if (!referralRows || referralRows.length === 0) {
      return { success: false, message: 'Vinculo de reclutamiento no encontrado.' };
    }

    const referral = referralRows[0];
    const now = new Date();
    const lastSummon = referral.last_summon_at ? new Date(referral.last_summon_at) : null;
    
    if (lastSummon && (now.getTime() - lastSummon.getTime()) < 3600000) {
      const minutesLeft = Math.ceil((3600000 - (now.getTime() - lastSummon.getTime())) / 60000);
      return { success: false, message: `El hechizo de invocacion esta en enfriamiento. Faltan ${minutesLeft} minutos.` };
    }

    // Verify source charity belongs to requester
    const [sourceCharRows]: any = await pool.query(
      'SELECT name, online FROM characters.characters WHERE guid = ? AND account = ? LIMIT 1',
      [params.sourceCharGuid, params.requesterAccountId]
    );

    if (!sourceCharRows || sourceCharRows.length === 0) {
      return { success: false, message: 'Personaje de origen no valido.' };
    }
    const sourceChar = sourceCharRows[0];

    // Verify target char belongs to the OTHER account in the link
    const otherAccountId = Number(referral.recruiter_account_id) === params.requesterAccountId 
      ? Number(referral.recruited_account_id) 
      : Number(referral.recruiter_account_id);

    let targetChar: any = null;
    if (params.targetCharGuid && params.targetCharGuid > 0) {
       const [targetCharRows]: any = await pool.query(
         'SELECT name, online FROM characters WHERE guid = ? AND account = ? LIMIT 1',
         [params.targetCharGuid, otherAccountId]
       );
       if (targetCharRows && targetCharRows.length > 0) {
          targetChar = targetCharRows[0];
       }
    }

    if (!targetChar) {
       // Search for ANY online character of the friend
       const [onlineChars]: any = await pool.query(
         'SELECT name, online FROM characters WHERE account = ? AND online = 1 LIMIT 1',
         [otherAccountId]
       );
       if (onlineChars && onlineChars.length > 0) {
          targetChar = onlineChars[0];
       }
    }

    if (!targetChar) {
      return { success: false, message: 'Tu amigo no tiene ningun personaje conectado para recibir la invocacion.' };
    }

    if (Number(sourceChar.online) === 0 || Number(targetChar.online) === 0) {
      return { success: false, message: 'Ambos personajes deben estar conectados para la invocacion.' };
    }

    // Perform summon via SOAP
    const sourceName = sourceChar.name;
    const targetName = targetChar.name;

    try {
      await executeSoapCommand(`.tele ${targetName} ${sourceName}`);
    } catch (e) {
      console.error('SOAP summon error:', e);
      return { success: false, message: 'No se pudo procesar la invocacion en el servidor. Verifica que el comando .tele <p1> <p2> este habilitado.' };
    }

    await connection.query('UPDATE auth.recruit_a_friend_referrals SET last_summon_at = NOW() WHERE id = ?', [params.referralId]);

    return { success: true, message: `Has invocado a ${targetName} con exito.` };
  } catch (error: any) {
    console.error('summonFriend error:', error);
    return { success: false, message: 'Error interno al procesar la invocacion.' };
  } finally {
    if (connection) connection.release();
  }
}

export async function grantLevelToRecruiter(params: {
  recruitAccountId: number;
  referralId: number;
  recruitCharGuid?: number;
  recruiterCharGuid?: number;
  count?: number;
}): Promise<{ success: boolean; message: string }> {
  let connection: Awaited<ReturnType<typeof authPool.getConnection>> | null = null;
  try {
    connection = await authPool.getConnection();
    const [referralRows]: any = await connection.query(
      `SELECT * FROM auth.recruit_a_friend_referrals WHERE id = ? AND recruited_account_id = ? LIMIT 1`,
      [params.referralId, params.recruitAccountId]
    );

    if (!referralRows || referralRows.length === 0) {
      return { success: false, message: 'No eres el reclutado de este vinculo.' };
    }

    const referral = referralRows[0];
    const recruiterAccountId = Number(referral.recruiter_account_id);

    // Resolve characters if not provided
    let recruitCharGuid = params.recruitCharGuid;
    if (!recruitCharGuid || recruitCharGuid <= 0) {
       const char = await getHighestCharacterForAccount(params.recruitAccountId);
       recruitCharGuid = char?.guid;
    }

    let recruiterCharGuid = params.recruiterCharGuid;
    if (!recruiterCharGuid || recruiterCharGuid <= 0) {
       const char = await getHighestCharacterForAccount(recruiterAccountId);
       recruiterCharGuid = char?.guid;
    }

    if (!recruitCharGuid || !recruiterCharGuid) {
      return { success: false, message: 'No se encontraron personajes para realizar la operacion.' };
    }

    // Check characters
    const [recruitCharRows]: any = await pool.query(
      'SELECT name, level, online FROM characters.characters WHERE guid = ? AND account = ? LIMIT 1',
      [recruitCharGuid, params.recruitAccountId]
    );
    const [recruiterCharRows]: any = await pool.query(
      'SELECT name, level, online FROM characters.characters WHERE guid = ? AND account = ? LIMIT 1',
      [recruiterCharGuid, recruiterAccountId]
    );

    if (!recruitCharRows?.length || !recruiterCharRows?.length) {
      return { success: false, message: 'Uno de los personajes ya no existe.' };
    }

    const recruitChar = recruitCharRows[0];
    const recruiterChar = recruiterCharRows[0];

    if (Number(recruiterChar.level) >= 60) {
      return { success: false, message: 'Solo puedes otorgar niveles a personajes menores a nivel 60.' };
    }

    if (Number(recruitChar.level) <= Number(recruiterChar.level)) {
      return { success: false, message: 'Tu personaje ("' + recruitChar.name + '") debe tener un nivel mayor al del reclutador para otorgar niveles.' };
    }

    const levelsToGrant = Math.max(1, Number(params.count || 1));
    const grantable = Math.floor((Number(recruitChar.level) - 1) / 2) - Number(referral.levels_granted || 0);
    
    if (levelsToGrant > grantable) {
      return { success: false, message: `Solo puedes otorgar ${grantable} niveles en este momento.` };
    }

    if (Number(recruiterChar.level) + levelsToGrant > 60) {
      return { success: false, message: 'Solo puedes otorgar niveles hasta que el reclutador alcance el nivel 60.' };
    }

    if (Number(recruitChar.level) <= Number(recruiterChar.level) + levelsToGrant) {
       return { success: false, message: 'No puedes otorgar tantos niveles; tu nivel debe ser mayor al del reclutador tras el regalo.' };
    }

    // Apply level
    const newLevel = Number(recruiterChar.level) + levelsToGrant;
    let applied = false;
    try {
      await executeSoapCommand(`.character level ${recruiterChar.name} ${newLevel}`);
      applied = true;
    } catch {
      // Fallback to direct DB update if offline
      if (Number(recruiterChar.online) === 0) {
        await pool.query('UPDATE characters.characters SET level = ? WHERE guid = ?', [newLevel, recruiterCharGuid]);
        applied = true;
      }
    }

    if (!applied) {
      return { success: false, message: 'El personaje del reclutador esta online y el comando SOAP fallo.' };
    }

    await connection.query('UPDATE auth.recruit_a_friend_referrals SET levels_granted = levels_granted + ? WHERE id = ?', [levelsToGrant, params.referralId]);

    return { success: true, message: `¡Has otorgado ${levelsToGrant} nivel(es) a ${recruiterChar.name}! (Nuevo Nivel: ${newLevel})` };
  } catch (error: any) {
    console.error('grantLevel error:', error);
    return { success: false, message: 'Error interno al otorgar nivel.' };
  } finally {
    if (connection) connection.release();
  }
}


function sanitizeMailText(input: string): string {
  return String(input || '').replace(/[\r\n]+/g, ' ').replace(/"/g, "'").trim();
}

async function getPrimaryCharacterName(accountId: number): Promise<string | null> {
  const [rows]: any = await pool.query(
    `SELECT name
     FROM characters.characters
     WHERE account = ?
     ORDER BY level DESC, guid ASC
     LIMIT 1`,
    [accountId]
  );

  const characterName = String(rows?.[0]?.name || '').trim();
  return characterName || null;
}

async function getCharacterNameForAccountGuid(accountId: number, targetGuid: number): Promise<string | null> {
  const [rows]: any = await pool.query(
    `SELECT name
     FROM characters.characters
     WHERE account = ? AND guid = ?
     LIMIT 1`,
    [accountId, targetGuid]
  );

  const characterName = String(rows?.[0]?.name || '').trim();
  return characterName || null;
}

export async function deliverRecruitStarterBags(accountId: number, targetCharacterGuid?: number): Promise<{ deliveredTo: string; gold: number }> {
  let characterName: string | null = null;

  if (Number.isInteger(Number(targetCharacterGuid)) && Number(targetCharacterGuid) > 0) {
    characterName = await getCharacterNameForAccountGuid(accountId, Number(targetCharacterGuid));
    if (!characterName) {
      throw new Error('El personaje seleccionado no pertenece a tu cuenta o no existe.');
    }
  } else {
    characterName = await getPrimaryCharacterName(accountId);
  }

  if (!characterName) {
    throw new Error('No se encontró un personaje en la cuenta reclutada para enviar el kit inicial.');
  }

  const subject = sanitizeMailText('Recluta un Amigo - Bienvenida');
  const body = sanitizeMailText('Gracias por unirte por invitacion. Aqui tienes 4 bolsas de bienvenida y 300 de oro.');
  await executeSoapCommand(
    `.send items ${characterName} "${subject}" "${body}" ${RAF_STARTER_BAG_ITEM}:${RAF_STARTER_BAG_COUNT}`
  );
  await executeSoapCommand(`.send money ${characterName} "${subject}" "${body}" ${RAF_STARTER_GOLD * 10000}`);

  return { deliveredTo: characterName, gold: RAF_STARTER_GOLD };
}

async function getHighestCharacterForAccount(accountId: number): Promise<{ guid: number; name: string; level: number } | null> {
  const [rows]: any = await pool.query(
    `SELECT guid, name, level
     FROM characters.characters
     WHERE account = ?
     ORDER BY level DESC, guid ASC
     LIMIT 1`,
    [accountId]
  );

  if (!rows || rows.length === 0) return null;
  return {
    guid: Number(rows[0].guid || 0),
    name: String(rows[0].name || ''),
    level: Number(rows[0].level || 0),
  };
}

export async function claimRecruitLevel80Rewards(params: {
  requesterAccountId: number;
  referralId?: number;
}): Promise<{ awarded: boolean; message: string }> {
  let connection: Awaited<ReturnType<typeof authPool.getConnection>> | null = null;

  try {
    connection = await authPool.getConnection();
    await ensureRecruitTables(connection);
    await connection.beginTransaction();

    const requesterAccountId = Number(params.requesterAccountId || 0);
    const referralId = Number(params.referralId || 0);

    if (!Number.isInteger(requesterAccountId) || requesterAccountId <= 0) {
      await connection.rollback();
      return { awarded: false, message: 'Cuenta solicitante inválida.' };
    }

    let rows: any[] = [];
    if (Number.isInteger(referralId) && referralId > 0) {
      const [result]: any = await connection.query(
        `SELECT *
         FROM auth.recruit_a_friend_referrals
         WHERE id = ?
           AND (recruiter_account_id = ? OR recruited_account_id = ?)
         LIMIT 1
         FOR UPDATE`,
        [referralId, requesterAccountId, requesterAccountId]
      );
      rows = result || [];
    } else {
      const [result]: any = await connection.query(
        `SELECT *
         FROM auth.recruit_a_friend_referrals
         WHERE recruited_account_id = ?
         LIMIT 1
         FOR UPDATE`,
        [requesterAccountId]
      );
      rows = result || [];
    }

    if (!rows || rows.length === 0) {
      await connection.rollback();
      return { awarded: false, message: 'No hay referencia de reclutamiento válida para reclamar.' };
    }

    const referral = rows[0] as RecruitReferralRow;
    if (Number(referral.recruit_reward_given || 0) === 1) {
      await connection.rollback();
      return { awarded: false, message: 'Recompensa de nivel 80 ya otorgada.' };
    }

    const recruitedAccountId = Number(referral.recruited_account_id || 0);
    if (!Number.isInteger(recruitedAccountId) || recruitedAccountId <= 0) {
      await connection.rollback();
      return { awarded: false, message: 'El invitado aún no se registró con el enlace especial.' };
    }

    const topCharacter = await getHighestCharacterForAccount(recruitedAccountId);
    if (!topCharacter || topCharacter.level < 80) {
      await connection.rollback();
      return { awarded: false, message: 'El reclutado todavía no alcanza nivel 80.' };
    }

    await connection.query(
      'UPDATE auth.account SET vp = vp + ? WHERE id = ?',
      [RAF_RECRUIT_REWARD_VP, recruitedAccountId]
    );
    await connection.query(
      'UPDATE auth.account SET vp = vp + ? WHERE id = ?',
      [RAF_RECRUITER_REWARD_VP, Number(referral.recruiter_account_id)]
    );

    await connection.query(
      `UPDATE auth.recruit_a_friend_referrals
       SET recruit_reward_given = 1,
           recruit_reward_given_at = NOW(),
           trigger_character_guid = ?,
           status = 'rewarded'
       WHERE id = ?`,
      [topCharacter.guid, Number(referral.id)]
    );

    await connection.commit();

    try {
      const recruiterChar = await getPrimaryCharacterName(Number(referral.recruiter_account_id));
      if (recruiterChar) {
        await executeSoapCommand(
          `.send mail ${recruiterChar} "Recluta un Amigo" "Tu reclutado llego a nivel 80. Recibiste ${RAF_RECRUITER_REWARD_VP} Estelas."`
        );
      }
      if (topCharacter.name) {
        await executeSoapCommand(
          `.send mail ${topCharacter.name} "Recluta un Amigo" "Felicidades por llegar a nivel 80. Recibiste ${RAF_RECRUIT_REWARD_VP} Estelas."`
        );
      }
    } catch {
      // Best-effort mail; reward already committed.
    }

    return { awarded: true, message: 'Recompensas de nivel 80 otorgadas.' };
  } catch (error: any) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore rollback errors
      }
    }
    console.error('claimRecruitLevel80Rewards error:', error);
    return { awarded: false, message: 'Error recuperando recompensas de nivel 80.' };
  } finally {
    if (connection) connection.release();
  }
}
