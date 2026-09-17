import { prisma } from "@/db";
import { verifyPassword, createToken, buildSessionCookie } from "@/lib/auth";
import { checkRateLimit, resetRateLimit, clientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/**
 * A bcrypt hash of a random value. Compared against when the email is unknown so
 * that a wrong email and a wrong password take the same time, which stops the
 * endpoint being used to discover which addresses have accounts.
 */
const DUMMY_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

// 10 attempts per 15 minutes, then a 15-minute lockout.
const LIMIT = { limit: 10, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 };

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password required" }, { status: 400 });
        }

        // Limit by IP and by account, so neither spraying one account nor
        // trying many accounts from one host goes unchecked.
        const ip = clientIp(request);
        const normalizedEmail = String(email).trim().toLowerCase();
        for (const key of [`login:ip:${ip}`, `login:email:${normalizedEmail}`]) {
            const rl = checkRateLimit(key, LIMIT);
            if (!rl.allowed) {
                return NextResponse.json(
                    { error: `Too many attempts. Try again in ${Math.ceil(rl.retryAfter / 60)} minute(s).` },
                    { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
                );
            }
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // Always run a comparison, even for an unknown email, to keep the
        // response time uniform.
        const valid = await verifyPassword(password, user?.password ?? DUMMY_HASH);
        if (!user || !valid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        resetRateLimit(`login:ip:${ip}`);
        resetRateLimit(`login:email:${normalizedEmail}`);

        const token = await createToken(user.id, user.role);
        const cookie = buildSessionCookie(token);

        const response = NextResponse.json({
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });

        response.cookies.set(cookie.name, cookie.value, {
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite,
            maxAge: cookie.maxAge,
            path: cookie.path,
        });

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
