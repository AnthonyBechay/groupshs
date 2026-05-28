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
        const { name, lastRole, yearsActive, photoUrl, bio } = body;

        if (!name || !lastRole) {
            return NextResponse.json({ error: "Name and last role are required" }, { status: 400 });
        }

        const last = await prisma.ancien.findFirst({ orderBy: { sortOrder: "desc" } });
        const sortOrder = (last?.sortOrder ?? -1) + 1;

        const ancien = await prisma.ancien.create({
            data: {
                name,
                lastRole,
                yearsActive: yearsActive || null,
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
