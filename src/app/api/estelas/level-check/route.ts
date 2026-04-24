import { NextResponse } from 'next/server';
import { awardLevelRewardsForAccount, getLevelRewardsStatus } from '@/lib/estelasLevelRewards';

/**
 * POST /api/estelas/level-check
 * Escanea los personajes de una cuenta y otorga Estelas por niveles hito.
 * Body: { accountId: number }
 *
 * Retorna las recompensas otorgadas (si las hay).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accountId = Number(body?.accountId);

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ error: 'accountId inválido' }, { status: 400 });
    }
    const result = await awardLevelRewardsForAccount(accountId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Level-check error:', error);
    return NextResponse.json(
      { error: 'Error al verificar recompensas. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/estelas/level-check?accountId=X
 * Consulta el estado de recompensas de una cuenta (sin otorgar nada).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = Number(searchParams.get('accountId'));

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ error: 'accountId inválido' }, { status: 400 });
    }
    const result = await getLevelRewardsStatus(accountId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Level-check GET error:', error);
    return NextResponse.json(
      { error: 'Error al consultar recompensas. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
