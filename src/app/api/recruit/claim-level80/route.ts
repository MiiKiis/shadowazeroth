import { NextResponse } from 'next/server';
import { claimRecruitLevel80Rewards } from '@/lib/recruitAFriend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accountId = Number(body?.accountId || 0);
    const referralId = Number(body?.referralId || 0);

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ error: 'accountId invalido' }, { status: 400 });
    }

    const result = await claimRecruitLevel80Rewards({
      requesterAccountId: accountId,
      referralId: Number.isInteger(referralId) && referralId > 0 ? referralId : undefined,
    });

    if (!result.awarded) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Recruit claim-level80 POST error:', error);
    return NextResponse.json(
      { error: 'Error reclamando estelas de reclutamiento', details: error?.message || 'Error desconocido' },
      { status: 500 }
    );
  }
}
