import { NextResponse } from 'next/server';
import { summonFriend } from '@/lib/recruitAFriend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requesterAccountId, referralId, sourceCharGuid, targetCharGuid } = body;

    if (!requesterAccountId || !referralId || !sourceCharGuid || !targetCharGuid) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos.' }, { status: 400 });
    }

    const result = await summonFriend({
      requesterAccountId: Number(requesterAccountId),
      referralId: Number(referralId),
      sourceCharGuid: Number(sourceCharGuid),
      targetCharGuid: Number(targetCharGuid),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error('API summon error:', error);
    return NextResponse.json({ error: 'Error interno en el servidor.' }, { status: 500 });
  }
}
