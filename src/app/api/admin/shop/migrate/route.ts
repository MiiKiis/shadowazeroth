import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const sqlPath = path.join(process.cwd(), 'scripts', 'migrations', 'shop_robust_migration.sql');
    if (!fs.existsSync(sqlPath)) {
      return NextResponse.json({ error: 'Migration SQL file not found' }, { status: 404 });
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await authPool.query(statement);
    }

    return NextResponse.json({ success: true, message: 'Migración completada con éxito' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
