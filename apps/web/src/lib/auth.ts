import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/db";

/**
 * JWT signing key.
 *
 * In production a missing AUTH_SECRET must FAIL, not fall back. The old
 * fallback string lives in this repository, so running with it would let anyone
 * who can read the source forge a super-admin session. Failing closed at start-
 * up surfaces the misconfiguration immediately (the container healthcheck will
 * report it) instead of silently serving an unprotected admin area.
 */
function resolveAuthSecret(): string {
    const fromEnv = process.env.AUTH_SECRET?.trim();

    if (process.env.NODE_ENV === "production") {
        if (!fromEnv) {
            throw new Error(
                "AUTH_SECRET is not set. Refusing to start: without it, admin session " +
                "tokens would be signed with a publicly known key. Set AUTH_SECRET to a " +
                "random string of at least 32 characters."
            );
        }
        if (fromEnv.length < 32) {
            throw new Error(
                `AUTH_SECRET is too short (${fromEnv.length} characters). Refusing to start: ` +
                "use at least 32 random characters."
            );
        }
        return fromEnv;
    }

    // Local development only — never reached in a production build.
    return fromEnv || "dev-only-secret-not-for-production-use-32ch";
}

const SECRET = new TextEncoder().encode(resolveAuthSecret());

const COOKIE_NAME = "auth-token";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

export const SUPER_ADMIN_EMAIL = "cg@groupshs.org";

export type Permission =
    | "canManageUnits"
    | "canManageMembers"
    | "canManageActivities"
    | "canManageGallery"
    | "canManagePartners"
    | "canManageSocialLinks"
    | "canManageNews"
    | "canViewSubmissions"
    | "canManageSettings"
    | "canManageHistory";

export type SessionUser = {
    userId: string;
    role: string;
    email: string;
    name: string;
    permissions: Record<Permission, boolean>;
    allowedUnitIds: string[];
    isSuperAdmin: boolean;
};

export async function hashPassword(password: string) {
    return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
}

export async function createToken(userId: string, role: string) {
    return new SignJWT({ userId, role })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(SECRET);
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, SECRET);
        return payload as { userId: string; role: string };
    } catch {
        return null;
    }
}

export async function getSession(): Promise<SessionUser | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        if (!token) return null;
        const payload = await verifyToken(token);
        if (!payload) return null;

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                canManageUnits: true,
                canManageMembers: true,
                canManageActivities: true,
                canManageGallery: true,
                canManagePartners: true,
                canManageSocialLinks: true,
                canManageNews: true,
                canViewSubmissions: true,
                canManageSettings: true,
                canManageHistory: true,
                allowedUnitIds: true,
            },
        });
        if (!user) return null;

        const isSuperAdmin = user.role === "super_admin" || user.email === SUPER_ADMIN_EMAIL;

        return {
            userId: user.id,
            role: user.role,
            email: user.email,
            name: user.name,
            isSuperAdmin,
            allowedUnitIds: user.allowedUnitIds,
            permissions: {
                canManageUnits: isSuperAdmin || user.canManageUnits,
                canManageMembers: isSuperAdmin || user.canManageMembers,
                canManageActivities: isSuperAdmin || user.canManageActivities,
                canManageGallery: isSuperAdmin || user.canManageGallery,
                canManagePartners: isSuperAdmin || user.canManagePartners,
                canManageSocialLinks: isSuperAdmin || user.canManageSocialLinks,
                canManageNews: isSuperAdmin || user.canManageNews,
                canViewSubmissions: isSuperAdmin || user.canViewSubmissions,
                canManageSettings: isSuperAdmin || user.canManageSettings,
                canManageHistory: isSuperAdmin || user.canManageHistory,
            },
        };
    } catch {
        return null;
    }
}

export function isAdmin(session: SessionUser | null): boolean {
    if (!session) return false;
    return session.isSuperAdmin || session.role === "admin";
}

export function hasPermission(session: SessionUser | null, perm: Permission): boolean {
    if (!session) return false;
    if (session.isSuperAdmin) return true;
    return session.permissions[perm] === true;
}

export function canAccessUnit(session: SessionUser | null, unitId: string): boolean {
    if (!session) return false;
    if (session.isSuperAdmin) return true;
    if (session.allowedUnitIds.length === 0) return true; // empty = all
    return session.allowedUnitIds.includes(unitId);
}

export function buildSessionCookie(token: string) {
    return {
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: SEVEN_DAYS,
        path: "/",
    };
}
