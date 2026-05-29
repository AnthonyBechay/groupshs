import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageHistory")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const anciens = await prisma.ancien.findMany({
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        });
        return NextResponse.json(anciens);
    } catch (error) {
        console.error("Error fetching anciens:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageHistory")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            name, joinedYear, leftYear, progression, scoutRoles, professions,
            phone, email, photoUrl, bio,
        } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const last = await prisma.ancien.findFirst({ orderBy: { sortOrder: "desc" } });
        const sortOrder = (last?.sortOrder ?? -1) + 1;

        const ancien = await prisma.ancien.create({
            data: {
                name,
                joinedYear: joinedYear ?? null,
                leftYear: leftYear ?? null,
                progression: progression ?? [],
                scoutRoles: scoutRoles ?? [],
                professions: professions ?? [],
                phone: phone || null,
                email: email || null,
                photoUrl: photoUrl || null,
                bio: bio || null,
                sortOrder,
            },
        });

        return NextResponse.json(ancien);
    } catch (error) {
        console.error("Error creating ancien:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
