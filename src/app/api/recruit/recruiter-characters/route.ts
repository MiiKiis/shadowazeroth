import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import pool from '@/lib/db';

export async function GET(request: Request) {
  let connection: any = null;
  try {
    const { searchParams } = new URL(request.url);
    const referralId = Number(searchParams.get('referralId') || 0);

    if (referralId <= 0) {
      return NextResponse.json({ error: 'referralId invalido' }, { status: 400 });
    }

    connection = await authPool.getConnection();
    
    // Validar el vinculo y obtener el account_id del reclutador
    const [rows]: any = await connection.query(
      'SELECT recruiter_account_id FROM auth.recruit_a_friend_referrals WHERE id = ?',
      [referralId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Vinculo no encontrado' }, { status: 404 });
    }

    const recruiterAccountId = rows[0].recruiter_account_id;

    // Obtener personajes del reclutador
    const [chars]: any = await pool.query(
      'SELECT guid, name, level, online FROM characters.characters WHERE account = ?',
      [recruiterAccountId]
    );

    return NextResponse.json({
      success: true,
      characters: chars || []
    });

  } catch (error: any) {
    console.error('Recruiter characters error:', error);
    return NextResponse.json({ error: 'Error al obtener personajes del reclutador' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
