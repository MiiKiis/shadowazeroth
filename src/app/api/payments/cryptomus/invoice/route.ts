import crypto from 'crypto';
import { NextResponse } from 'next/server';

const CRYPTOMUS_ENDPOINT = 'https://api.cryptomus.com/v1/payment';

function getCryptomusConfig() {
  const testMode = process.env.CRYPTOMUS_TEST_MODE === 'true';

  const testMerchant = process.env.CRYPTOMUS_TEST_MERCHANT_ID || '';
  const testKey = process.env.CRYPTOMUS_TEST_API_KEY || '';
  const prodMerchant = process.env.CRYPTOMUS_MERCHANT_ID || process.env.CRYPTOMUS_MERCHANT || '';
  const prodKey = process.env.CRYPTOMUS_API_KEY || process.env.CRYPTOMUS_SECRET_KEY || '';

  // Si test mode está activo pero no hay credenciales de test, usa las de producción
  const merchantId = testMode && testMerchant ? testMerchant : prodMerchant;
  const apiKey = testMode && testKey ? testKey : prodKey;

  return { merchantId, apiKey, testMode };
}

function buildSign(payload: unknown, apiKey: string) {
  const data = JSON.stringify(payload);
  const base64 = Buffer.from(data).toString('base64');
  return crypto.createHash('md5').update(base64 + apiKey).digest('hex');
}

export async function POST(request: Request) {
  try {
    const { merchantId, apiKey, testMode } = getCryptomusConfig();
    if (!merchantId || !apiKey) {
      return NextResponse.json({ error: 'Cryptomus no configurado en variables de entorno' }, { status: 500 });
    }

    const body = await request.json();
    const amount = Number(body?.amount);
    const currency = String(body?.currency || 'USD').toUpperCase();
    const userId = Number(body?.userId || 0);
    const donationPoints = Number(body?.donationPoints || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Monto invalido' }, { status: 400 });
    }

    const orderId = `don_${userId || 'guest'}_${Date.now()}`;
    const origin = new URL(request.url).origin;

    const payload: Record<string, unknown> = {
      amount: amount.toFixed(2),
      currency,
      order_id: orderId,
      url_return: `${origin}/donate`,
      url_success: `${origin}/donate?crypto=success`,
      lifetime: 3600,
      additional_data: JSON.stringify({
        source: 'shadow-azeroth-web',
        userId,
        donationPoints,
        test: testMode,
      }).slice(0, 255),
    };

    // Cryptomus test mode flag
    if (testMode) {
      payload.is_payment_multiple = false;
    }

    const sign = buildSign(payload, apiKey);

    const response = await fetch(CRYPTOMUS_ENDPOINT, {
      method: 'POST',
      headers: {
        merchant: merchantId,
        sign,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok || data?.state === 1 || !data?.result?.url) {
      return NextResponse.json(
        { error: data?.message || 'No se pudo crear la factura de pago. Intenta de nuevo.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        provider: 'cryptomus',
        testMode,
        orderId,
        paymentUrl: data.result.url,
        invoiceUuid: data.result.uuid,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Cryptomus invoice API error:', error);
    return NextResponse.json(
      { error: 'Error al generar la factura de pago. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
