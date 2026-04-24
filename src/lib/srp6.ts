import crypto from 'crypto';

/**
 * AzerothCore SRP6 Password Hashing (WotLK 3.3.5a)
 * 
 * The account table in acore_auth stores:
 * - salt: 32 random bytes (little-endian)
 * - verifier: 32 bytes calculated from username, password and salt (little-endian)
 * 
 * Formula:
 * - uppercase_user_pass = UPPER(username) + ":" + UPPER(password)
 * - I_P = SHA1(uppercase_user_pass)
 * - x = SHA1(salt + I_P)
 * - v = 7^x mod N
 * 
 * Where N is the SRP6 prime (32 bytes)
 */

// SRP6 Prime (N) - Standard for WoW 3.3.5a (little-endian representation)
const SRP6_N = Buffer.from(
    '894B645E89E1535BBDAD5B8B290650530801B18EBFBF5E8F' +
    'AB3C82872A3E9BB7',
    'hex'
);

const SRP6_G = BigInt(7);

/**
 * Convert a Buffer to a BigInt (treating it as little-endian)
 */
function bufferToLittleEndianBigInt(buffer: Buffer): bigint {
    // Never mutate source buffers (especially SRP6_N constant).
    return BigInt('0x' + Buffer.from(buffer).reverse().toString('hex'));
}

/**
 * Convert a Buffer to a BigInt (treating it as big-endian)
 */
function bufferToBigEndianBigInt(buffer: Buffer): bigint {
    return BigInt('0x' + Buffer.from(buffer).toString('hex'));
}

/**
 * Convert a BigInt to a Buffer (representing as little-endian)
 */
function bigIntToLittleEndianBuffer(value: bigint, length: number = 32): Buffer {
    let hex = value.toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    
    const buf = Buffer.from(hex, 'hex');
    const result = Buffer.alloc(length, 0);
    
    // Fill from the right for little-endian
    const copyLength = Math.min(buf.length, length);
    buf.copy(result, 0, Math.max(0, buf.length - length));
    
    return result.reverse();
}

/**
 * Modular exponentiation: (base^exp) % mod
 */
function modExpBig(base: bigint, exp: bigint, mod: bigint): bigint {
    if (mod === BigInt(1)) return BigInt(0);
    
    let result = BigInt(1);
    base = base % mod;
    
    while (exp > BigInt(0)) {
        if (exp % BigInt(2) === BigInt(1)) {
            result = (result * base) % mod;
        }
        exp = exp >> BigInt(1);
        base = (base * base) % mod;
    }
    
    return result;
}

export function calculateVerifier(username: string, password: string, salt: Buffer): Buffer {
    if (salt.length !== 32) {
        throw new Error('Salt must be exactly 32 bytes');
    }

    const uppercaseUsername = username.toUpperCase();
    const uppercasePassword = password.toUpperCase();
    
    // Step 1: I_P = SHA1(UPPER(username) + ":" + UPPER(password))
    const userPassString = `${uppercaseUsername}:${uppercasePassword}`;
    const I_P = crypto.createHash('sha1').update(userPassString).digest();
    
    // Step 2: x = SHA1(salt + I_P)
    const xHash = crypto.createHash('sha1')
        .update(salt)
        .update(I_P)
        .digest();
    
    // AzerothCore expects x in LE from SHA1 bytes and N as BE from constant bytes.
    const x = bufferToLittleEndianBigInt(xHash);
    const N = bufferToBigEndianBigInt(SRP6_N);
    
    // Step 3: v = 7^x mod N
    const verifierBigInt = modExpBig(SRP6_G, x, N);
    
    // Convert verifier back to Buffer (32 bytes, little-endian)
    const verifierBuffer = bigIntToLittleEndianBuffer(verifierBigInt, 32);
    
    return verifierBuffer;
}

// Legacy variant kept only for backward compatibility with old web-generated accounts.
export function calculateVerifierLegacy(username: string, password: string, salt: Buffer): Buffer {
    if (salt.length !== 32) {
        throw new Error('Salt must be exactly 32 bytes');
    }

    const uppercaseUsername = username.toUpperCase();
    const uppercasePassword = password.toUpperCase();

    const userPassString = `${uppercaseUsername}:${uppercasePassword}`;
    const I_P = crypto.createHash('sha1').update(userPassString).digest();

    const xHash = crypto.createHash('sha1')
        .update(salt)
        .update(I_P)
        .digest();

    const x = bufferToLittleEndianBigInt(xHash);
    const N = bufferToLittleEndianBigInt(SRP6_N);

    const verifierBigInt = modExpBig(SRP6_G, x, N);

    return bigIntToLittleEndianBuffer(verifierBigInt, 32);
}

export function generateSrp6Data(username: string, password: string) {
    const salt = crypto.randomBytes(32);
    const verifier = calculateVerifier(username, password, salt);
    
    return {
        salt: salt,
        verifier: verifier
    };
}
