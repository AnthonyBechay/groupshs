import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageHistory")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { ids } = await request.json();
        if (!Array.isArray(ids)) {
            return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
        }

        await Promise.all(
            ids.map((id: string, index: number) =>
                prisma.historyMilestone.update({
                    where: { id },
                    data: { sortOrder: index },
                })
            )
        );

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error reordering history milestones:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
