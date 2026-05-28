import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageHistory")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { date, title, description, longDescription, challenges, motivations, unitCount, memberCount, imageUrls } = body;

        if (!date || !title) {
            return NextResponse.json({ error: "Date and title are required" }, { status: 400 });
        }

        // date comes in as "YYYY-MM" from the month input
        const parsedDate = new Date(`${date}-01T00:00:00.000Z`);

        const milestone = await prisma.historyMilestone.update({
            where: { id },
            data: {
                date: parsedDate,
                title,
                description: description || null,
                longDescription: longDescription || null,
                challenges: challenges || null,
                motivations: motivations || null,
                unitCount: unitCount != null && unitCount !== "" ? parseInt(unitCount) : null,
                memberCount: memberCount != null && memberCount !== "" ? parseInt(memberCount) : null,
                imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
            },
        });

        return NextResponse.json(milestone);
    } catch (error) {
        console.error("Error updating history milestone:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageHistory")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await prisma.historyMilestone.delete({ where: { id } });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error deleting history milestone:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
