import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/db";

const SECRET = new TextEncoder().encode(
    process.env.AUTH_SECRET || "default-secret-change-me-in-production-32chars!"
);

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
    | "canManageSettings";

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
