import { authPool } from './db';
import { RowDataPacket } from 'mysql2';

let accountAccessSchema: { idCol: string, gmCol: string } | null = null;
let schemaPromise: Promise<void> | null = null;

export function resetAccountAccessSchema() {
  accountAccessSchema = null;
  schemaPromise = null;
}

export async function getAccountAccessSchema() {
  if (accountAccessSchema) return accountAccessSchema;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      // Valores estándar de AzerothCore/TrinityCore
      let idCol = 'AccountID'; 
      let gmCol = 'SecurityLevel';
      
      try {
        const dbName = process.env.DB_AUTH || 'auth';
        const [cols] = await authPool.query<RowDataPacket[]>(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'account_access'`,
          [dbName]
        );
        
        if (cols && cols.length > 0) {
          const names = cols.map(c => String(c.COLUMN_NAME).toLowerCase());
          if (names.includes('id')) idCol = 'id';
          else if (names.includes('accountid')) idCol = 'AccountID';
          
          if (names.includes('gmlevel')) gmCol = 'gmlevel';
          else if (names.includes('securitylevel')) gmCol = 'SecurityLevel';
          else {
            const possible = names.find(n => n.includes('level') || n.includes('security') || n.includes('gm'));
            if (possible) gmCol = cols.find(c => String(c.COLUMN_NAME).toLowerCase() === possible)?.COLUMN_NAME || gmCol;
          }
        }
      } catch(e) {
        console.error('[gmLevel] Error detectando esquema, usando fallbacks estándar:', e);
      }
      
      accountAccessSchema = { idCol, gmCol };
      console.log(`[gmLevel] Schema asignado: idCol=${idCol}, gmCol=${gmCol}`);
    })();
  }
  await schemaPromise;
  return accountAccessSchema!;
}

export async function getGMLevel(userId: number): Promise<number> {
  try {
    const schema = await getAccountAccessSchema();
    const [rows] = await authPool.query<RowDataPacket[]>(
      `SELECT MAX(\`${schema.gmCol}\`) AS lv FROM auth.account_access WHERE \`${schema.idCol}\` = ?`,
      [userId]
    );
    return Number(rows?.[0]?.lv ?? 0);
  } catch (e: any) {
    // Si falla por columna inexistente, intentar el otro estándar
    try {
       const schema = await getAccountAccessSchema();
       const altGmCol = (schema.gmCol === 'gmlevel') ? 'SecurityLevel' : 'gmlevel';
       const altIdCol = (schema.idCol === 'id') ? 'AccountID' : 'id';
       const [rows] = await authPool.query<RowDataPacket[]>(
         `SELECT MAX(\`${altGmCol}\`) AS lv FROM auth.account_access WHERE \`${altIdCol}\` = ?`,
         [userId]
       );
       return Number(rows?.[0]?.lv ?? 0);
    } catch(e2) {
       return 0;
    }
  }
}
