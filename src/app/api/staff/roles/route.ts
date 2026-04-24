import { NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const [rows] = await authPool.query<RowDataPacket[]>(
      'SELECT * FROM site_staff_roles WHERE is_active = 1 ORDER BY order_index ASC'
    );

    // Parse JSON fields
    const roles = rows.map(r => ({
      ...r,
      requirements: typeof r.requirements === 'string' ? JSON.parse(r.requirements) : r.requirements,
      questions: typeof r.questions === 'string' ? JSON.parse(r.questions) : r.questions,
    }));

    return NextResponse.json({ roles });
  } catch (error: any) {
    // If table doesn't exist yet, return empty array
    return NextResponse.json({ roles: [] });
  }
}
