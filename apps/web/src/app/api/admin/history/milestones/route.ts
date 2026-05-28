import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageHistory")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const milestones = await prisma.historyMilestone.findMany({
            orderBy: [{ sortOrder: "asc" }, { date: "asc" }],
        });
        return NextResponse.json(milestones);
    } catch (error) {
        console.error("Error fetching history milestones:", error);
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
        const { type, date, title, description, longDescription, challenges, motivations, unitCount, memberCount, imageUrls } = body;

        if (!date || !title) {
            return NextResponse.json({ error: "Date and title are required" }, { status: 400 });
        }

        // date comes in as "YYYY-MM-DD" from the date input
        const parsedDate = new Date(`${date}T00:00:00.000Z`);

        const last = await prisma.historyMilestone.findFirst({ orderBy: { sortOrder: "desc" } });
        const sortOrder = (last?.sortOrder ?? -1) + 1;

        const milestone = await prisma.historyMilestone.create({
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
                imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
                sortOrder,
            },
        });

        return NextResponse.json(milestone);
    } catch (error) {
        console.error("Error creating history milestone:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
