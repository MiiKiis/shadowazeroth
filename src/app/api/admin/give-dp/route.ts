import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  try {
    const { targetUsername, amount, currency = 'dp', operation = 'add' } = await request.json();

    if (!targetUsername || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Faltan parámetros o la cantidad es inválida' }, { status: 400 });
    }

    if (currency !== 'dp' && currency !== 'vp') {
      return NextResponse.json({ error: 'Moneda inválida. Usa dp o vp.' }, { status: 400 });
    }

    if (operation !== 'add' && operation !== 'remove') {
      return NextResponse.json({ error: 'Operación inválida. Usa add o remove.' }, { status: 400 });
    }

    if (!authPool) {
      return NextResponse.json({ error: 'Database pool not available' }, { status: 500 });
    }

    const cleanUsername = String(targetUsername).trim().toUpperCase();
    const finalAmount = Number(amount);

    // Buscar si la cuenta existe
    const [rows] = await authPool.query<RowDataPacket[]>(
      'SELECT id, username, dp, vp FROM account WHERE UPPER(username) = ?',
      [cleanUsername]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'La cuenta no existe' }, { status: 404 });
    }

    const currentDp = Number(rows[0]?.dp || 0);
    const currentVp = Number(rows[0]?.vp || 0);
    const current = currency === 'dp' ? currentDp : currentVp;

    if (operation === 'remove' && current < finalAmount) {
      return NextResponse.json(
        { error: `Saldo insuficiente. La cuenta tiene ${current} ${currency.toUpperCase()}.` },
        { status: 400 },
      );
    }

    const signedAmount = operation === 'remove' ? -finalAmount : finalAmount;
    const column = currency === 'dp' ? 'dp' : 'vp';
    await authPool.query(
      `UPDATE account SET ${column} = ${column} + ? WHERE UPPER(username) = ?`,
      [signedAmount, cleanUsername]
    );

    const currencyName = currency === 'dp' ? 'Donation Points' : 'Estelas';
    const verb = operation === 'remove' ? 'descontaron' : 'añadieron';

    return NextResponse.json({ 
      success: true, 
      message: `Se ${verb} ${finalAmount} ${currencyName} correctamente a la cuenta ${rows[0].username}` 
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error del servidor';
    console.error('Error in give-currency API:', error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
