import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageSettings")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const sections = await prisma.aboutSection.findMany({
            orderBy: [{ sortOrder: "asc" }, { year: "asc" }],
        });
        return NextResponse.json(sections);
    } catch (error) {
        console.error("Error fetching about sections:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageSettings")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { year, dateLabel, title, description, imageUrl } = body;

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const last = await prisma.aboutSection.findFirst({ orderBy: { sortOrder: "desc" } });
        const sortOrder = (last?.sortOrder ?? -1) + 1;

        const section = await prisma.aboutSection.create({
            data: {
                year: typeof year === "number" ? year : null,
                dateLabel: dateLabel || null,
                title,
                description: description || null,
                imageUrl: imageUrl || null,
                sortOrder,
            },
        });

        return NextResponse.json(section);
    } catch (error) {
        console.error("Error creating about section:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
