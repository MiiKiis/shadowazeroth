import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { executeSoapCommand } from '@/lib/soap';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_API = 'https://api-m.paypal.com';

async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(req: Request) {
  try {
    const { orderID, userId, points } = await req.json();

    // Validación preventiva: Credenciales idénticas en .env.local
    if (PAYPAL_CLIENT_ID === PAYPAL_CLIENT_SECRET) {
      return NextResponse.json({ 
        error: 'Error de configuración en el servidor (PayPal Credentials)',
        details: 'El Client ID y el Secret son idénticos. Por favor corrige la línea 50 de .env.local.'
      }, { status: 500 });
    }

    if (!orderID || !userId || !points) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (orderID, userId o points)' }, { status: 400 });
    }

    const [accountRows]: any = await authPool.query(
      'SELECT id, username FROM account WHERE id = ? LIMIT 1',
      [Number(userId)]
    );

    if (!accountRows || accountRows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado en la base de datos' }, { status: 404 });
    }

    const username = String(accountRows[0].username || 'Jugador');

    const accessToken = await getAccessToken();

    const captureResponse = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const captureData = await captureResponse.json();

    if (captureData.status === 'COMPLETED') {
        const transactionId = captureData.purchase_units[0].payments.captures[0].id;

      // 2. Actualizar créditos en la base de datos acore_auth.account
      const [result]: any = await authPool.query(
        'UPDATE account SET dp = dp + ? WHERE id = ?',
        [Number(points), Number(userId)]
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'No se pudieron acreditar los creditos al usuario.' }, { status: 500 });
      }

      // 4. Ejecutar notificación SOAP
      try {
        const announceCmd = `.announce ¡La cuenta ${username} ha realizado una donación y ha recibido ${points} Créditos (DP)! ¡Gracias por el apoyo a Shadow Azeroth!`;
        await executeSoapCommand(announceCmd);
      } catch (soapError: any) {
        // No log for notification fail
      }

      return NextResponse.json({ 
        success: true, 
        message: '¡Pago recibido con éxito! Tus créditos han sido añadidos.',
        pointsAdded: points,
        transactionId
      });
    } else {
      return NextResponse.json({ error: 'El pago no ha podido ser completado. Por favor intenta de nuevo.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ Error crítico en captura PayPal:', error);
    return NextResponse.json({ error: 'Error al procesar el pago. Por favor intenta de nuevo.' }, { status: 500 });
  }
}
