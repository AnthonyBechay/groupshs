import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin" && session.role !== "super_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const submissions = await prisma.recruitmentSubmission.findMany({
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(submissions);
    } catch (error) {
        console.error("Error fetching submissions:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
