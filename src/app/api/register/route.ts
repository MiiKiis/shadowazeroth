import { NextRequest, NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { generateSrp6Data } from '@/lib/srp6';
import crypto from 'crypto';
import { sendPinReminderEmail } from '@/lib/email';
import { ensureRecruitTables } from '@/lib/recruitAFriend';
import { safeInt, safeStr, safeEmail, safePin, safeToken, safeCode, isValidId, LIMITS } from '@/lib/sanitize';

// Validation constants
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 16;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 16;
const ACCOUNT_PIN_REGEX = /^\d{4}$/;




const LOCAL_IPS = new Set(['127.0.0.1', '::1']);

function isLocalIp(ip: string): boolean {
    return LOCAL_IPS.has(ip);
}

function normalizeIpCandidate(value: string | null | undefined): string | null {
    if (!value) return null;
    let ip = value.trim();
    if (!ip) return null;

    // Remove optional wrapping quotes.
    if (ip.startsWith('"') && ip.endsWith('"')) {
        ip = ip.slice(1, -1);
    }

    // Strip IPv6-mapped IPv4 prefix.
    if (ip.startsWith('::ffff:')) {
        ip = ip.slice(7);
    }

    // Normalize bracketed IPv6 + optional port: [::1]:1234 -> ::1
    if (ip.startsWith('[')) {
        const endBracket = ip.indexOf(']');
        if (endBracket > 0) {
            ip = ip.slice(1, endBracket);
        }
    }

    // Strip port from IPv4 form like 1.2.3.4:1234.
    const ipv4WithPort = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d+)$/);
    if (ipv4WithPort) {
        ip = ipv4WithPort[1];
    }

    return ip || null;
}

function parseForwardedHeader(forwarded: string | null): string | null {
    if (!forwarded) return null;

    // RFC 7239 format example: Forwarded: for=1.2.3.4;proto=https;by=...
    const entries = forwarded.split(',');
    for (const entry of entries) {
        const parts = entry.split(';');
        for (const part of parts) {
            const [key, rawValue] = part.split('=', 2);
            if (!key || !rawValue) continue;
            if (key.trim().toLowerCase() !== 'for') continue;

            let candidate = rawValue.trim();
            if (candidate.startsWith('"') && candidate.endsWith('"')) {
                candidate = candidate.slice(1, -1);
            }

            // Remove brackets from IPv6 form: [2001:db8::1]:1234
            if (candidate.startsWith('[')) {
                const endBracket = candidate.indexOf(']');
                if (endBracket > 0) {
                    candidate = candidate.slice(1, endBracket);
                }
            }

            const normalized = normalizeIpCandidate(candidate);
            if (normalized && !isLocalIp(normalized) && normalized.toLowerCase() !== 'unknown') {
                return normalized;
            }
        }
    }

    return null;
}

function normalizeEmail(email: string): string {
    const [user = '', domain = ''] = String(email).toLowerCase().split('@');
    const cleanUser = user.split('+')[0];
    return `${cleanUser}@${domain}`;
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username: string): boolean {
    if (
        username.length < MIN_USERNAME_LENGTH ||
        username.length > MAX_USERNAME_LENGTH
    ) {
        return false;
    }
    return /^[a-zA-Z0-9]+$/.test(username);
}

function isValidPassword(password: string): boolean {
    if (
        password.length < MIN_PASSWORD_LENGTH ||
        password.length > MAX_PASSWORD_LENGTH
    ) {
        return false;
    }
    return true;
}

// ─── Get real client IP (behind proxy / Cloudflare / nginx) ──────────────────
function getClientIp(request: NextRequest): string | null {
    const headers = request.headers;

    // Priority: CF-Connecting-IP > Forwarded > X-Forwarded-For > X-Real-IP > connection/socket
    const candidates: Array<string | null> = [
        headers.get('cf-connecting-ip'),
        parseForwardedHeader(headers.get('forwarded')),
        headers.get('x-forwarded-for')?.split(',')[0] ?? null,
        headers.get('x-real-ip'),
        (request as any).ip ?? null,
        (request as any)?.connection?.remoteAddress ?? null,
        (request as any)?.socket?.remoteAddress ?? null,
    ];

    for (const candidate of candidates) {
        const normalized = normalizeIpCandidate(candidate);
        if (normalized && !isLocalIp(normalized)) {
            return normalized;
        }
    }

    return null;
}


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // ── Sanitize all inputs at the boundary ───────────────────────
        const username       = safeStr(body?.username, LIMITS.USERNAME.max);
        const password       = safeStr(body?.password, LIMITS.PASSWORD.max);
        const originalEmail  = safeStr(body?.email, LIMITS.EMAIL.max);
        const pin            = safePin(body?.pin);
        const inviteToken    = safeToken(body?.inviteToken);
        const creatorCode    = safeCode(body?.creatorCode);
        const normalizedEmail = normalizeEmail(originalEmail);



        // 1. Validate required fields
        if (!username || !password || !originalEmail || !pin) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Username, password, email and PIN are required'
                },
                { status: 400 }
            );
        }

        // 2. Validate username format
        if (!isValidUsername(username)) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Username must be between ${MIN_USERNAME_LENGTH} and ${MAX_USERNAME_LENGTH} characters and contain only letters and numbers`
                },
                { status: 400 }
            );
        }

        // 3. Validate password strength
        if (!isValidPassword(password)) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`
                },
                { status: 400 }
            );
        }

        if (!isValidEmail(originalEmail)) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Email format is invalid'
                },
                { status: 400 }
            );
        }

        const normalizedPin = String(pin).trim();
        if (!ACCOUNT_PIN_REGEX.test(normalizedPin)) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'PIN must be exactly 4 digits'
                },
                { status: 400 }
            );
        }

        // ── 3.5. Get real IP for anti-spam ───────────────────────
        const clientIp = getClientIp(request);

        // 4. Check if user already exists + IP anti-spam
        const connection = await authPool.getConnection();
        try {
            await ensureRecruitTables(connection);

            const cleanInviteToken = String(inviteToken || '').trim();
            let inviteRow: any = null;
            if (cleanInviteToken) {
                const [inviteRows]: any = await connection.query(
                    `SELECT id, friend_email, recruited_account_id, recruiter_account_id
                     FROM recruit_a_friend_referrals
                     WHERE invite_token = ?
                     LIMIT 1`,
                    [cleanInviteToken]
                );

                if (!inviteRows || inviteRows.length === 0) {
                    return NextResponse.json({ success: false, message: 'El enlace de reclutamiento no es valido.' }, { status: 400 });
                }

                inviteRow = inviteRows[0];
                if (inviteRow.recruited_account_id) {
                    return NextResponse.json({ success: false, message: 'Este enlace de reclutamiento ya fue usado.' }, { status: 409 });
                }

                const inviteEmail = normalizeEmail(String(inviteRow.friend_email || ''));
                if (inviteEmail && inviteEmail !== normalizedEmail) {
                    return NextResponse.json({ success: false, message: 'Debes registrar la cuenta con el correo del enlace de invitacion.' }, { status: 400 });
                }

                // CHECK RECRUITER SLOT LIMIT
                const [countRows]: any = await connection.query(
                    `SELECT COUNT(*) as total 
                     FROM recruit_a_friend_referrals 
                     WHERE recruiter_account_id = ? AND status IN ('registered', 'rewarded')`,
                    [Number(inviteRow.recruiter_account_id || 0)]
                );
                const totalAccepted = Number(countRows?.[0]?.total || 0);
                if (totalAccepted >= 5) {
                    return NextResponse.json({ 
                        success: false, 
                        message: 'Lo sentimos, este reclutador ya ha alcanzado el maximo de 5 amigos reclutados.' 
                    }, { status: 403 });
                }
            }

            // ── IP ANTI-SPAM: Max 1 account per IP per 24h ───────
            // Ensure last_ip column exists
            try {
                await connection.query('ALTER TABLE account ADD COLUMN last_ip VARCHAR(45) NULL');
            } catch { /* already exists */ }
            // Ensure reg_ip column exists (used specifically for registration tracking)
            try {
                await connection.query('ALTER TABLE account ADD COLUMN reg_ip VARCHAR(45) NULL');
            } catch { /* already exists */ }

            // Remove localhost artifacts from previous non-proxied setups.
            await connection.query(
                `UPDATE account
                 SET last_ip = NULL, reg_ip = NULL
                 WHERE last_ip IN ('127.0.0.1', '::1', '::ffff:127.0.0.1')
                    OR reg_ip IN ('127.0.0.1', '::1', '::ffff:127.0.0.1')
                    OR last_ip LIKE '127.0.0.1:%'
                    OR reg_ip LIKE '127.0.0.1:%'
                    OR last_ip LIKE '::ffff:127.0.0.1:%'
                    OR reg_ip LIKE '::ffff:127.0.0.1:%'
                    OR last_ip LIKE '[::1]:%'
                    OR reg_ip LIKE '[::1]:%'`
            );

            if (clientIp) {
                const [ipCheckRows]: any = await connection.query(
                    `SELECT COUNT(*) AS cnt FROM account
                     WHERE last_ip = ? AND joindate >= NOW() - INTERVAL 1 DAY`,
                    [clientIp]
                );
                const recentRegistrations = Number(ipCheckRows?.[0]?.cnt || 0);
                if (recentRegistrations >= 3) {
                    return NextResponse.json(
                        {
                            success: false,
                            message: 'Has alcanzado el límite de 3 cuentas por día para tu conexión (IP).'
                        },
                        { status: 429 }
                    );
                }
            }

            let existing: any[] = [];
            try {
                const [rows]: any = await connection.query(
                    'SELECT id FROM account WHERE UPPER(username) = UPPER(?) OR LOWER(email) = LOWER(?)',
                    [username, originalEmail]
                );
                existing = rows;

                const [emailCountRows]: any = await connection.query(
                    `SELECT COUNT(*) AS total
                     FROM account
                     WHERE LOWER(
                        CONCAT(
                            SUBSTRING_INDEX(SUBSTRING_INDEX(COALESCE(email, ''), '@', 1), '+', 1),
                            '@',
                            SUBSTRING_INDEX(COALESCE(email, ''), '@', -1)
                        )
                     ) = ?`,
                    [normalizedEmail]
                );

                const totalByBaseEmail = Number(emailCountRows?.[0]?.total || 0);
                if (totalByBaseEmail >= 3) {
                    return NextResponse.json(
                        {
                            success: false,
                            message: 'Solo se permiten 2 cuentas adicionales por correo principal'
                        },
                        { status: 409 }
                    );
                }
            } catch (checkError: any) {
                if (checkError.code !== 'ER_BAD_FIELD_ERROR') {
                    throw checkError;
                }

                const [rows]: any = await connection.query(
                    'SELECT id FROM account WHERE UPPER(username) = UPPER(?)',
                    [username]
                );
                existing = rows;
            }

            if (existing.length > 0) {
                // Determine if it was the username or email
                const [userMatch]: any = await connection.query(
                    'SELECT id FROM account WHERE UPPER(username) = UPPER(?) LIMIT 1',
                    [username]
                );
                
                if (userMatch && userMatch.length > 0) {
                    return NextResponse.json(
                        { success: false, message: 'El nombre de usuario ya está en uso. Por favor elige otro.' },
                        { status: 409 }
                    );
                }

                return NextResponse.json(
                    { success: false, message: 'El correo electrónico ya está registrado. Si perdiste tu cuenta, usa la recuperación.' },
                    { status: 409 }
                );
            }

            // 5. Generate SRP6 credentials
            const { salt, verifier } = generateSrp6Data(username, password);

            // 6. Insert into account table
            // ── NO INITIAL VP/DP — Estelas se ganan por niveles, DP por donación ──
            let accountId: number | null = null;
            try {
                const [insertResult]: any = await connection.query(
                    'INSERT INTO account (username, salt, verifier, email, expansion, dp, vp, reg_ip, last_ip, joindate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                    [
                        username.toUpperCase(),
                        salt,
                        verifier,
                        String(originalEmail).toLowerCase(),
                        2, // 2 = WotLK expansion (3.3.5a)
                        0,  // dp = 0 (only via real donations)
                        0,  // vp = 0 (earned by leveling up)
                        clientIp, // reg_ip
                        clientIp  // last_ip
                    ]
                );
                accountId = Number(insertResult?.insertId || 0) || null;
            } catch (insertError: any) {
                if (insertError.code !== 'ER_BAD_FIELD_ERROR') {
                    throw insertError;
                }

                const [insertResult]: any = await connection.query(
                    'INSERT INTO account (username, salt, verifier, expansion, dp, vp, joindate) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                    [
                        username.toUpperCase(),
                        salt,
                        verifier,
                        2,
                        0,  // dp = 0
                        0   // vp = 0
                    ]
                );
                accountId = Number(insertResult?.insertId || 0) || null;
            }

            if (!accountId) {
                throw new Error('Could not resolve new account ID');
            }

            // Update reg_ip (best effort, silently fail if column doesn't exist)
            try {
                await connection.query(
                    'UPDATE account SET reg_ip = ?, last_ip = ? WHERE id = ?',
                    [clientIp, clientIp, accountId]
                );
            } catch { /* column may not exist in some schemas */ }

            await connection.query(`
                CREATE TABLE IF NOT EXISTS account_security_pin (
                    account_id INT UNSIGNED NOT NULL,
                    pin_salt VARBINARY(32) NOT NULL,
                    pin_hash VARBINARY(32) NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (account_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);

            const pinSalt = crypto.randomBytes(32);
            const pinHash = crypto
                .createHash('sha256')
                .update(pinSalt)
                .update(normalizedPin)
                .digest();

            await connection.query(
                'INSERT INTO account_security_pin (account_id, pin_salt, pin_hash) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE pin_salt = VALUES(pin_salt), pin_hash = VALUES(pin_hash)',
                [accountId, pinSalt, pinHash]
            );

            if (inviteRow) {
                await connection.query(
                    `UPDATE recruit_a_friend_referrals
                     SET recruited_account_id = ?,
                         recruited_username = ?,
                         accepted_at = NOW(),
                         status = 'registered'
                     WHERE id = ?`,
                    [accountId, String(username).toUpperCase(), Number(inviteRow.id)]
                );
            }

            // ── Creator Code Processing ──────────────────────────────
            if (creatorCode && accountId) {
                try {
                    const [cRows]: any = await connection.query(
                        'SELECT id, rewards, max_uses, current_uses FROM auth.creator_codes WHERE code = ? LIMIT 1',
                        [creatorCode]
                    );

                    if (cRows && cRows.length > 0) {
                        const codeData = cRows[0];
                        if (codeData.current_uses < codeData.max_uses) {
                            // Ensure table exists
                            await connection.query(`
                                CREATE TABLE IF NOT EXISTS auth.account_creator_codes (
                                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                                    account_id INT UNSIGNED NOT NULL,
                                    code_id INT UNSIGNED NOT NULL,
                                    claimed TINYINT(1) NOT NULL DEFAULT 0,
                                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                    UNIQUE KEY uniq_acc_code (account_id, code_id)
                                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                            `);

                            // Increment uses
                            await connection.query(
                                'UPDATE auth.creator_codes SET current_uses = current_uses + 1 WHERE id = ?',
                                [codeData.id]
                            );

                            // Assign pending claim
                            await connection.query(
                                'INSERT IGNORE INTO auth.account_creator_codes (account_id, code_id, claimed) VALUES (?, ?, 0)',
                                [accountId, codeData.id]
                            );
                        }
                    }
                } catch (creatorCodeErr) {
                    console.error('Creator code processing error:', creatorCodeErr);
                }
            }

            try {
                await sendPinReminderEmail(
                    originalEmail,
                    String(username).toUpperCase(),
                    normalizedPin
                );
            } catch (mailError) {
                console.error('PIN reminder email error:', mailError);
            }

            // ── Discord Notification ─────────────────────────────────
            try {
                const joinWebhook = process.env.DISCORD_JOIN_WEBHOOK;
                if (joinWebhook) {
                    await fetch(joinWebhook, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            embeds: [
                                {
                                    title: "🎉 ¡Un nuevo aventurero ha llegado!",
                                    description: `El jugador **${String(username).toUpperCase()}** acaba de registrarse en Shadow Azeroth.`,
                                    color: 5814783, // Azul pálido/Mágico
                                    timestamp: new Date().toISOString()
                                }
                            ]
                        })
                    }).catch(console.error);
                }
            } catch (discordError) {
                console.error('Discord webhook error:', discordError);
            }

            return NextResponse.json(
                {
                    success: true,
                    message: 'Account created successfully! You can now login with your credentials.'
                },
                { status: 201 }
            );
        } finally {
            connection.release();
        }
    } catch (error: any) {
        console.error('Registration Error:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json(
                {
                    success: false,
                    message: 'El nombre de usuario o correo ya está en uso.'
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message: 'Ocurrió un error al crear la cuenta. Por favor inténtalo de nuevo.'
            },
            { status: 500 }
        );
    }
}
