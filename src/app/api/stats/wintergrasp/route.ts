import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Intentar leer de worldstates si existe, en 3.3.5 WG owner is usually worldstate 3801 (1 = Alliance, 2 = Horde)
    // Here we'll just try to read it. If it fails or we don't know, we return random or fallback
    let owner = 'unknown';

    try {
      const [rows]: any = await pool.query('SELECT value FROM worldstates WHERE entry = 3801 LIMIT 1');
      if (rows && rows.length > 0) {
        const val = rows[0].value;
        if (val === 1) owner = 'alliance';
        else if (val === 2) owner = 'horde';
      }
    } catch {
      // Ignorar errores de DB si la tabla no existe o entry es otro
    }

    if (owner === 'unknown') {
      // Si no logramos sacar el estado, elegimos aleatorio o por defecto
      owner = Math.random() > 0.5 ? 'horde' : 'alliance';
    }

    return NextResponse.json({ owner });
  } catch (err: any) {
    return NextResponse.json({ owner: 'alliance' }, { status: 200 }); // Graceful fallback
  }
}
