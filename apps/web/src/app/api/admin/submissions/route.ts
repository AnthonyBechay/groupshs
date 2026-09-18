import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canViewSubmissions")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const submissions = await prisma.recruitmentSubmission.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                // Where they ended up, so the list can show it rather than just
                // saying "enrolled". Null once the member is deleted.
                member: {
                    select: {
                        id: true, firstName: true, lastName: true, role: true, status: true,
                        unit: { select: { id: true, name: true, unitType: true } },
                        subgroup: { select: { name: true } },
                    },
                },
            },
        });

        return NextResponse.json(submissions);
    } catch (error) {
        console.error("Error fetching submissions:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
