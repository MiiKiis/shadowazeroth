import { NextResponse } from 'next/server';
import pool, { authPool } from '@/lib/db';
import { executeSoapCommand } from '@/lib/soap';
import { RowDataPacket } from 'mysql2';
import { safeInt, safeCode, isValidId } from '@/lib/sanitize';

interface CodeRow extends RowDataPacket {
  id: number;
  code: string;
  item_id: number;
  quantity: number;
  is_used: number;
}

interface CharRow extends RowDataPacket {
  guid: number;
  name: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accountId = safeInt(body?.accountId);
    const code      = safeCode(body?.code);
    const charGuid  = safeInt(body?.charGuid);

    if (!isValidId(accountId) || !code || !isValidId(charGuid)) {
      return NextResponse.json({ error: 'Faltan datos requeridos (Cuenta, Código, Personaje)' }, { status: 400 });
    }

    if (!authPool || !pool) {
      return NextResponse.json({ error: 'DB connection error' }, { status: 500 });
    }

    // Ensure creator_codes table exists
    await authPool.query(`
      CREATE TABLE IF NOT EXISTS auth.creator_codes (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(50) NOT NULL UNIQUE,
        rewards VARCHAR(255) NOT NULL,
        max_uses INT UNSIGNED NOT NULL DEFAULT 100,
        current_uses INT UNSIGNED NOT NULL DEFAULT 0,
        creator_id INT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 1. Check Creator Codes (New system)
    const [crRows] = await authPool.query<any[]>(
      'SELECT id, rewards, max_uses, current_uses FROM auth.creator_codes WHERE code = ? LIMIT 1',
      [code]
    );

    let isCreatorCode = false;
    let creatorCodeData = null;

    if (crRows && crRows.length > 0) {
      isCreatorCode = true;
      creatorCodeData = crRows[0];
    }

    if (isCreatorCode) {
      if (creatorCodeData.current_uses >= creatorCodeData.max_uses) {
        return NextResponse.json({ error: 'Este código ha alcanzado su límite de usos.' }, { status: 400 });
      }

      // Check if user already claimed this code
      const [accCheckRows] = await authPool.query<any[]>(
        'SELECT claimed FROM auth.account_creator_codes WHERE account_id = ? AND code_id = ? LIMIT 1',
        [accountId, creatorCodeData.id]
      );

      if (accCheckRows && accCheckRows.length > 0 && accCheckRows[0].claimed === 1) {
        return NextResponse.json({ error: 'Ya has canjeado este código.' }, { status: 400 });
      }

      // 2. Verifiy character
      const [charRows] = await pool.query<CharRow[]>(
        'SELECT name FROM characters.characters WHERE guid = ? AND account = ? LIMIT 1',
        [charGuid, accountId]
      );

      if (!charRows || charRows.length === 0) {
        return NextResponse.json({ error: 'El personaje no pertenece a tu cuenta o no existe' }, { status: 403 });
      }
      const charName = charRows[0].name;

      // Ensure account_creator_codes table has the right schema
      await authPool.query(`
        CREATE TABLE IF NOT EXISTS auth.account_creator_codes (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            account_id INT UNSIGNED NOT NULL,
            code_id INT UNSIGNED NOT NULL,
            claimed TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_acc_code (account_id, code_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Claim Items via SOAP (Multiple)
      const rewardsArray = creatorCodeData.rewards.split(',').map((r: string) => r.trim()).filter(Boolean);
      for (const reward of rewardsArray) {
         try {
           await executeSoapCommand(`.send items ${charName} "Premio Promocional" "¡Felicidades! Aquí tienes tu premio." ${reward}`);
         } catch(e) {
           console.error("Error envoyando reward", reward, e);
         }
      }

      // Increment uses if they hadn't already inputted this code at registration
      let shouldIncrement = true;
      if (accCheckRows && accCheckRows.length > 0) {
        shouldIncrement = false; // Registration already incremented it
      }

      if (shouldIncrement) {
         await authPool.query('UPDATE auth.creator_codes SET current_uses = current_uses + 1 WHERE id = ?', [creatorCodeData.id]);
      }

      // Mark claimed
      await authPool.query(
        'INSERT INTO auth.account_creator_codes (account_id, code_id, claimed) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE claimed = 1',
        [accountId, creatorCodeData.id]
      );

      return NextResponse.json({ 
          success: true, 
          message: `¡Código canjeado con éxito! Tus premios han sido enviados por correo a ${charName}.` 
      });
    }

    // 1.5. Verificar si el código existe y no está usado (Legacy web_event_codes)
    const [cRows] = await authPool.query<CodeRow[]>(
      'SELECT id, item_id, quantity, is_used FROM auth.web_event_codes WHERE code = ? LIMIT 1',
      [code]
    );

    if (!cRows || cRows.length === 0) {
      return NextResponse.json({ error: 'Código inválido o inexistente' }, { status: 404 });
    }

    const codeInfo = cRows[0];
    if (codeInfo.is_used === 1) {
      return NextResponse.json({ error: 'Este código ya ha sido canjeado' }, { status: 400 });
    }

    // 2. Verificar si el personaje pertenece a la cuenta
    const [charRows] = await pool.query<CharRow[]>(
      'SELECT name FROM characters.characters WHERE guid = ? AND account = ? LIMIT 1',
      [charGuid, accountId]
    );

    if (!charRows || charRows.length === 0) {
      return NextResponse.json({ error: 'El personaje no pertenece a tu cuenta o no existe' }, { status: 403 });
    }

    const charName = charRows[0].name;

    // 3. Entregar item vía SOAP
    const subject = "Premio de Evento";
    const emailBody = "¡Felicidades! Aquí tienes tu premio por participar en los eventos de Shadow Azeroth.";
    const soapCmd = `.send items ${charName} "${subject}" "${emailBody}" ${codeInfo.item_id}:${codeInfo.quantity}`;

    try {
      await executeSoapCommand(soapCmd);
    } catch (soapError: any) {
      console.error('SOAP Error in redemption:', soapError);
      return NextResponse.json({ error: 'No se pudo entregar el premio. Por favor contacta a un GM.' }, { status: 500 });
    }

    // 4. Marcar como usado
    await authPool.query(
      'UPDATE auth.web_event_codes SET is_used = 1, used_by_account_id = ?, used_at = NOW() WHERE id = ?',
      [accountId, codeInfo.id]
    );

    return NextResponse.json({ 
        success: true, 
        message: `¡Código canjeado con éxito! El item ${codeInfo.item_id} ha sido enviado por correo a ${charName}.` 
    });

  } catch (error: any) {
    console.error('Redeem API Error:', error);
    return NextResponse.json({ error: 'Error al canjear el código. Intenta de nuevo.' }, { status: 500 });
  }
}
