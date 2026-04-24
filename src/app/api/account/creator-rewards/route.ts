import { NextResponse } from 'next/server';
import pool, { authPool } from '@/lib/db';
import { executeSoapCommand } from '@/lib/soap';
import { RowDataPacket } from 'mysql2';
import { safeInt, isValidId } from '@/lib/sanitize';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = safeInt(searchParams.get('accountId'));

    if (!isValidId(accountId)) {
      return NextResponse.json({ error: 'ID de cuenta inválido' }, { status: 400 });
    }

    if (!authPool) {
      return NextResponse.json({ error: 'DB connection error' }, { status: 500 });
    }

    // Get pending rewards
    const [rows] = await authPool.query<any[]>(`
      SELECT acc.id, acc.claimed, cc.code, cc.rewards, cc.min_level
      FROM auth.account_creator_codes acc
      JOIN auth.creator_codes cc ON acc.code_id = cc.id
      WHERE acc.account_id = ?
    `, [accountId]);

    // Enhance rewards with item icons from Wowhead
    const enhancedRewards = await Promise.all(rows.map(async (row) => {
      const rewardItems = row.rewards.split(',').map((r: string) => r.trim()).filter(Boolean);
      const itemsWithIcons = await Promise.all(rewardItems.map(async (itemStr: string) => {
        const [itemId, qty] = itemStr.split(':');
        let icon = 'inv_misc_questionmark';
        
        try {
          const res = await fetch(`https://www.wowhead.com/wotlk/item=${itemId}&xml`, { next: { revalidate: 86400 } });
          const xml = await res.text();
          const iconMatch = xml.match(/<icon[^>]*>([^<]+)<\/icon>/);
          if (iconMatch && iconMatch[1]) {
            icon = iconMatch[1];
          }
        } catch (e) {
          console.error(`Error fetching icon for item ${itemId}:`, e);
        }

        return {
          id: itemId,
          qty: qty || "1",
          icon: icon
        };
      }));

      return {
        ...row,
        items: itemsWithIcons
      };
    }));

    return NextResponse.json({ rewards: enhancedRewards });
  } catch (error) {
    console.error('Error fetching creator rewards:', error);
    return NextResponse.json({ error: 'Error al obtener recompensas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accountId = safeInt(body?.accountId);
    const charGuid = safeInt(body?.charGuid);
    const rewardId = safeInt(body?.rewardId); // ID from account_creator_codes

    if (!isValidId(accountId) || !isValidId(charGuid) || !isValidId(rewardId)) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    if (!authPool || !pool) {
      return NextResponse.json({ error: 'DB connection error' }, { status: 500 });
    }

    // 1. Verify reward exists and is not claimed
    const [rewardRows] = await authPool.query<any[]>(`
      SELECT acc.claimed, cc.rewards, cc.code, cc.min_level
      FROM auth.account_creator_codes acc
      JOIN auth.creator_codes cc ON acc.code_id = cc.id
      WHERE acc.id = ? AND acc.account_id = ?
      LIMIT 1
    `, [rewardId, accountId]);

    if (!rewardRows || rewardRows.length === 0) {
      return NextResponse.json({ error: 'Recompensa no encontrada' }, { status: 404 });
    }

    if (rewardRows[0].claimed === 1) {
      return NextResponse.json({ error: 'Esta recompensa ya ha sido reclamada' }, { status: 400 });
    }

    // 2. Verify character level >= 40
    const [charRows] = await pool.query<any[]>(`
      SELECT name, level FROM characters.characters 
      WHERE guid = ? AND account = ? LIMIT 1
    `, [charGuid, accountId]);

    if (!charRows || charRows.length === 0) {
      return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 });
    }

    const character = charRows[0];
    const minLevel = Number(rewardRows[0].min_level) || 40;
    if (character.level < minLevel) {
      return NextResponse.json({ error: `El personaje debe ser nivel ${minLevel} o superior para reclamar esta recompensa.` }, { status: 400 });
    }

    // 3. Deliver items via SOAP
    const rewardsArray = rewardRows[0].rewards.split(',').map((r: string) => r.trim()).filter(Boolean);
    const charName = character.name;

    for (const reward of rewardsArray) {
      try {
        await executeSoapCommand(`.send items ${charName} "Recompensa Creador" "¡Felicidades por llegar a nivel 40! Aquí tienes tu premio por usar el código ${rewardRows[0].code}." ${reward}`);
      } catch (e) {
        console.error("Error enviando reward via SOAP", reward, e);
      }
    }

    // 4. Mark as claimed
    await authPool.query(
      'UPDATE auth.account_creator_codes SET claimed = 1 WHERE id = ?',
      [rewardId]
    );

    return NextResponse.json({ 
      success: true, 
      message: `¡Felicidades! Las recompensas han sido enviadas al correo de ${charName}.` 
    });

  } catch (error) {
    console.error('Error claiming creator rewards:', error);
    return NextResponse.json({ error: 'Error al reclamar recompensas' }, { status: 500 });
  }
}
