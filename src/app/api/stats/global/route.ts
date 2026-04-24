import { NextResponse } from 'next/server';
import pool, { authPool } from '@/lib/db';

type GlobalStats = {
  totalAccounts: number;
  totalCharacters: number;
  updatedAt: string;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cachedStats: GlobalStats | null = null;
let cacheExpiresAt = 0;

export async function GET() {
  try {
    const now = Date.now();

    if (cachedStats && now < cacheExpiresAt) {
      return NextResponse.json({
        source: 'cache',
        stats: cachedStats,
      });
    }

    const [accountRows]: any = await authPool.query('SELECT COUNT(id) AS totalAccounts FROM account');
    const [characterRows]: any = await pool.query('SELECT COUNT(guid) AS totalCharacters FROM characters');

    const stats: GlobalStats = {
      totalAccounts: Number(accountRows?.[0]?.totalAccounts || 0),
      totalCharacters: Number(characterRows?.[0]?.totalCharacters || 0),
      updatedAt: new Date().toISOString(),
    };

    cachedStats = stats;
    cacheExpiresAt = now + CACHE_TTL_MS;

    return NextResponse.json({
      source: 'database',
      stats,
    });
  } catch (error: any) {
    if (cachedStats) {
      return NextResponse.json({
        source: 'stale-cache',
        stats: cachedStats,
        warning: 'Database unavailable, serving stale cached stats.',
      });
    }

    return NextResponse.json(
      {
        error: 'Database error fetching global stats',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
