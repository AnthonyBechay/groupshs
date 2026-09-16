import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

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

        // Anciens are members with status LEFT; ordering lives on the member.
        await prisma.$transaction(
            ids.map((id: string, index: number) =>
                prisma.member.update({
                    where: { id },
                    data: { ancienSortOrder: index },
                })
            )
        );

        revalidatePath("/history");

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error reordering anciens:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
