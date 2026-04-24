import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { safeToken } from '@/lib/sanitize';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = safeToken(searchParams.get('token'));

    if (!token) {
      return NextResponse.json({ error: 'Token invalido' }, { status: 400 });
    }

    const connection = await authPool.getConnection();
    try {
      const [rows]: any = await connection.query(
        `SELECT friend_email, friend_name, recruiter_username, status
         FROM recruit_a_friend_referrals
         WHERE invite_token = ?
         LIMIT 1`,
        [token]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: 'Invitacion no encontrada' }, { status: 404 });
      }

      const invite = rows[0];
      if (invite.status !== 'invited') {
        return NextResponse.json({ error: 'Esta invitacion ya ha sido procesada' }, { status: 400 });
      }

      return NextResponse.json({
        email: invite.friend_email,
        name: invite.friend_name,
        recruiter: invite.recruiter_username
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al obtener informacion de la invitacion' }, { status: 500 });
  }
}
