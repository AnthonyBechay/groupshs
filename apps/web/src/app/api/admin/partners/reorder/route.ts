import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { ids } = body as { ids: string[] };

        if (!Array.isArray(ids)) {
            return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
        }

        await prisma.$transaction(
            ids.map((id, index) =>
                prisma.partner.update({ where: { id }, data: { sortOrder: index } })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error reordering partners:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
