import { NextResponse } from 'next/server';
import { grantLevelToRecruiter } from '@/lib/recruitAFriend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recruitAccountId, referralId, recruitCharGuid, recruiterCharGuid, count } = body;

    if (!recruitAccountId || !referralId || !recruitCharGuid || !recruiterCharGuid) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos.' }, { status: 400 });
    }

    const result = await grantLevelToRecruiter({
      recruitAccountId: Number(recruitAccountId),
      referralId: Number(referralId),
      recruitCharGuid: Number(recruitCharGuid),
      recruiterCharGuid: Number(recruiterCharGuid),
      count: Number(count || 1)
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error('API grant-level error:', error);
    return NextResponse.json({ error: 'Error interno en el servidor.' }, { status: 500 });
  }
}
