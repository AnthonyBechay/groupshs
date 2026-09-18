import { prisma } from "@/db";
import { getSession, hashPassword, type SessionUser, PERMISSION_KEYS } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** Every permission column, for a Prisma `select`. */
const permissionSelect = Object.fromEntries(PERMISSION_KEYS.map(k => [k, true]));

function requireSuperAdmin(session: SessionUser | null) {
    return session?.isSuperAdmin === true;
}

export async function GET() {
    try {
        const session = await getSession();
        if (!requireSuperAdmin(session)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                ...permissionSelect,
                allowedUnitIds: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!requireSuperAdmin(session)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            name, email, password, role, allowedUnitIds,
        } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: "Email already in use" }, { status: 400 });
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || "admin",
                // Driven by PERMISSION_KEYS so a new permission cannot be
                // forgotten here the way canManageHistory was.
                ...Object.fromEntries(PERMISSION_KEYS.map(k => [k, body[k] === true])),
                allowedUnitIds: Array.isArray(allowedUnitIds) ? allowedUnitIds : [],
            },
            select: { id: true, name: true, email: true, role: true },
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
