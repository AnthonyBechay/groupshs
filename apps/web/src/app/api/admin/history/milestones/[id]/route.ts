import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { deleteFromR2 } from "@/lib/r2";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageHistory")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { type, date, title, description, longDescription, challenges, motivations, unitCount, memberCount, imageUrls } = body;

        if (!date || !title) {
            return NextResponse.json({ error: "Date and title are required" }, { status: 400 });
        }

        // Fetch old record so we can detect which images were removed
        const old = await prisma.historyMilestone.findUnique({ where: { id }, select: { imageUrls: true } });

        // date comes in as "YYYY-MM-DD" from the date input
        const parsedDate = new Date(`${date}T00:00:00.000Z`);
        const newUrls: string[] = Array.isArray(imageUrls) ? imageUrls : [];

        const milestone = await prisma.historyMilestone.update({
            where: { id },
            data: {
                type: type === "achievement" ? "achievement" : "milestone",
                date: parsedDate,
                title,
                description: description || null,
                longDescription: longDescription || null,
                challenges: challenges || null,
                motivations: motivations || null,
                unitCount: unitCount != null && unitCount !== "" ? parseInt(unitCount) : null,
                memberCount: memberCount != null && memberCount !== "" ? parseInt(memberCount) : null,
                imageUrls: newUrls,
            },
        });

        // Delete orphaned images from R2 (were in old but not in new)
        if (old?.imageUrls?.length) {
            const kept = new Set(newUrls);
            const removed = old.imageUrls.filter(u => !kept.has(u));
            await Promise.all(removed.map(u => deleteFromR2(u).catch(() => {})));
        }

        revalidateTag("history");
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

        // Fetch images before deleting so we can clean up R2
        const record = await prisma.historyMilestone.findUnique({ where: { id }, select: { imageUrls: true } });
        await prisma.historyMilestone.delete({ where: { id } });

        // Delete all associated images from R2
        if (record?.imageUrls?.length) {
            await Promise.all(record.imageUrls.map(u => deleteFromR2(u).catch(() => {})));
        }

        revalidateTag("history");
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error deleting history milestone:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
