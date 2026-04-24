import mysql from 'mysql2/promise';
import { Client } from 'ssh2';
import net from 'net';

// ── Configuración base ────────────────────────────────────────────────────────
const DB_HOST = process.env.DB_HOST;
const DB_PORT_INITIAL = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASSWORD || process.env.DB_PASS;

interface TunnelConfig {
  dbPort: number;
  soapPort: number;
}

const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
  authPool: mysql.Pool | undefined;
  worldPool: mysql.Pool | undefined;
  sharedSshPool: mysql.Pool | undefined;
  sshTunnel: Promise<TunnelConfig> | undefined;
};

/**
 * Crea un servidor proxy local que tuneliza tráfico hacia el VPS remoto.
 */
function createProxy(ssh: Client, remoteHost: string, remotePort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((sock) => {
      ssh.forwardOut(
        '127.0.0.1', 0,
        remoteHost, remotePort,
        (err, stream) => {
          if (err) {
            sock.end();
            return;
          }
          sock.pipe(stream).pipe(sock);
        }
      );
    });

    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      resolve(port);
    });

    server.on('error', reject);
  });
}

/**
 * Gestiona el túnel SSH y devuelve los puertos locales asignados.
 */
async function getSshTunnel(): Promise<TunnelConfig> {
  if (process.env.SSH_ENABLED !== 'true') {
    return { dbPort: DB_PORT_INITIAL, soapPort: 7878 };
  }
  if (globalForDb.sshTunnel) return globalForDb.sshTunnel;

  globalForDb.sshTunnel = new Promise((resolve, reject) => {
    const ssh = new Client();

    ssh.on('ready', async () => {

      try {
        // Detectar dinámicamente dónde está escuchando el SOAP (7878)
        let soapIp = '127.0.0.1';
        try {
          const soapDetectCmd = "netstat -tpln | grep :7878 | awk '{print $4}' | cut -d: -f1 | head -n1";
          const execPromise = () => new Promise<string>((res) => {
            ssh.exec(soapDetectCmd, (err, stream) => {
              if (err) return res('127.0.0.1');
              let out = '';
              stream.on('data', d => out += d).on('close', () => res(out.trim() || '127.0.0.1')).resume();
            });
          });
          const detected = await execPromise();
          if (detected && detected !== '0.0.0.0' && detected !== '::') {
             soapIp = detected;
          }
        } catch { /* ignore detection errors, fallback to 127.0.0.1 */ }

        const [dbPort, soapPort] = await Promise.all([
          createProxy(ssh, '127.0.0.1', 3306),
          createProxy(ssh, soapIp, 7878),
        ]);

        // Limpiar conexiones inactivas en el VPS
        const setupCmd = `
          mysql -u ${process.env.DB_USER} -p'${process.env.DB_PASSWORD}' -e "SET GLOBAL max_connections = 200;" 2>/dev/null;
          mysql -u ${process.env.DB_USER} -p'${process.env.DB_PASSWORD}' -e "SELECT concat('KILL ', id, ';') FROM information_schema.processlist WHERE command = 'Sleep' AND time > 10;" | grep KILL | mysql -u ${process.env.DB_USER} -p'${process.env.DB_PASSWORD}' 2>/dev/null;
        `;
        ssh.exec(setupCmd, (err, stream) => {
          if (!err) {
            stream.resume();
          }
        });

        resolve({ dbPort, soapPort });
      } catch (err) {
        globalForDb.sshTunnel = undefined;
        reject(err);
      }
    });

    ssh.on('error', (err) => {
      globalForDb.sshTunnel = undefined;
      reject(err);
    });

    ssh.connect({
      host: process.env.SSH_HOST,
      port: Number(process.env.SSH_PORT || 22),
      username: process.env.SSH_USER,
      password: process.env.SSH_PASSWORD,
      keepaliveInterval: 10000,
      readyTimeout: 30000,
    });
  });

  return globalForDb.sshTunnel;
}

/**
 * Crea un Proxy para el Pool de MySQL que asegura que el túnel esté listo
 * antes de crear el pool real, y que reutiliza instancias globales en desarrollo.
 */
function createSshProxiedPool(database: string, globalKey: keyof typeof globalForDb) {
  async function getTargetPool() {
    const isSsh = process.env.SSH_ENABLED === 'true';
    // En modo SSH, compartimos un único pool para TODAS las bases de datos para ahorrar conexiones
    const globalKeyToUse = isSsh ? 'sharedSshPool' : globalKey;

    if (globalForDb[globalKeyToUse as keyof typeof globalForDb]) {
      return globalForDb[globalKeyToUse as keyof typeof globalForDb] as mysql.Pool;
    }

    const tunnel = await getSshTunnel();
    
    const pool = mysql.createPool({
      host: isSsh ? '127.0.0.1' : DB_HOST,
      port: isSsh ? tunnel.dbPort : DB_PORT_INITIAL,
      user: DB_USER,
      password: DB_PASS,
      database: isSsh ? undefined : database, // En SSH no fijamos DB en el pool para poder reusarlo
      waitForConnections: true,
      connectionLimit: isSsh ? 5 : 20, // Aumentado para evitar bloqueos
      queueLimit: 100,
      connectTimeout: 30000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 30000,
      maxIdle: 0,
      idleTimeout: isSsh ? 5000 : 60000,
    });

    (globalForDb as any)[globalKeyToUse] = pool;

    return pool;
  }

  return new Proxy({} as mysql.Pool, {
    get(target, prop) {
      if (['query', 'execute', 'getConnection'].includes(prop as string)) {
        return async (...args: any[]) => {
          const poolObj = await getTargetPool();
          const isSsh = process.env.SSH_ENABLED === 'true';
          
          const rewriteQuery = (sql: string) => {
            if (!isSsh || typeof sql !== 'string') return sql;
            let s = sql;
            const db = database;

            // Skip rewriting if the query already has an explicit DB prefix.
            const lowerSql = s.toLowerCase();
            const prefix = `${db.toLowerCase()}.`;
            const quotedPrefix = `\`${db.toLowerCase()}\`.`;
            if (lowerSql.includes(` ${prefix}`) || lowerSql.includes(quotedPrefix)) {
              return s;
            }

            // ── Safe keyword rewrites ─────────────────────────────────────────────
            // Negative lookahead (?![a-zA-Z0-9_]|\s*\.) prevents double-qualifying already-dotted names
            // and ensures we don't backtrack into partial words.

            // FROM tableName (SELECT/DELETE)
            s = s.replace(/\bFROM\s+([a-zA-Z0-9_]+)(?![a-zA-Z0-9_]|\s*\.)/gi, `FROM ${db}.$1`);

            // INTO tableName (INSERT)
            s = s.replace(/\bINTO\s+([a-zA-Z0-9_]+)(?![a-zA-Z0-9_]|\s*\.)/gi, `INTO ${db}.$1`);

            // JOIN tableName
            s = s.replace(/\bJOIN\s+([a-zA-Z0-9_]+)(?![a-zA-Z0-9_]|\s*\.)/gi, `JOIN ${db}.$1`);

            // Standalone UPDATE tableName — ONLY at the very start of the statement.
            // This intentionally does NOT match "ON DUPLICATE KEY UPDATE" or
            // "ON UPDATE CURRENT_TIMESTAMP" because those never appear at position 0.
            s = s.replace(/^\s*UPDATE\s+([a-zA-Z0-9_]+)(?![a-zA-Z0-9_]|\s*\.)/i, `UPDATE ${db}.$1`);

            // TABLE IF NOT EXISTS tableName (CREATE TABLE IF NOT EXISTS)
            s = s.replace(/\bTABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)(?![a-zA-Z0-9_]|\s*\.)/gi, `TABLE IF NOT EXISTS ${db}.$1`);

            // CREATE TABLE tableName (without IF NOT EXISTS guard)
            s = s.replace(/\bCREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS\s)([a-zA-Z0-9_]+)(?![a-zA-Z0-9_]|\s*\.)/gi, `CREATE TABLE ${db}.$1`);

            // ALTER TABLE tableName
            s = s.replace(/\bALTER\s+TABLE\s+([a-zA-Z0-9_]+)(?![a-zA-Z0-9_]|\s*\.)/gi, `ALTER TABLE ${db}.$1`);

            // DESCRIBE tableName
            s = s.replace(/\bDESCRIBE\s+([a-zA-Z0-9_]+)(?![a-zA-Z0-9_]|\s*\.)/gi, `DESCRIBE ${db}.$1`);

            return s;
          };

          if (prop === 'getConnection') {
            const rawConn = await poolObj.getConnection();
            if (!isSsh) return rawConn;
            
            return new Proxy(rawConn, {
              get(cTarget, cProp) {
                if (['query', 'execute'].includes(cProp as string)) {
                  return (...cArgs: any[]) => {
                    if (typeof cArgs[0] === 'string') {
                      cArgs[0] = rewriteQuery(cArgs[0]);
                    }
                    return (cTarget as any)[cProp](...cArgs);
                  };
                }
                const val = (cTarget as any)[cProp];
                return typeof val === 'function' ? val.bind(cTarget) : val;
              }
            });
          }

          if (isSsh && (prop === 'query' || prop === 'execute') && typeof args[0] === 'string') {
            args[0] = rewriteQuery(args[0]);
          }
          
          return (poolObj as any)[prop](...args);
        };
      }
      return undefined;
    },
  });
}

/**
 * Helper para obtener la URL de SOAP tunelizada si es necesario.
 */
export async function getSoapUrl() {
  if (process.env.SSH_ENABLED === 'true') {
    try {
      const tunnel = await getSshTunnel();
      return `http://127.0.0.1:${tunnel.soapPort}`;
    } catch (err) {
      return process.env.ACORE_SOAP_URL || 'http://127.0.0.1:7878';
    }
  }
  return process.env.ACORE_SOAP_URL || 'http://127.0.0.1:7878';
}

// ── Pools de conexión (Pure Next.js — sin BlizzCMS) ───────────────────────────
// pool       → acore_characters (personajes, inventario, skills, etc.)
// authPool   → acore_auth       (cuentas, marketplace_listings, shop_items, etc.)
// worldPool  → acore_world      (item_template, creature_template, etc.)
export const pool      = createSshProxiedPool(process.env.DB_CHARACTERS || 'characters', 'pool');
export const authPool  = createSshProxiedPool(process.env.DB_AUTH       || 'auth', 'authPool');
export const worldPool = createSshProxiedPool(process.env.DB_WORLD      || 'world', 'worldPool');

export default pool;
