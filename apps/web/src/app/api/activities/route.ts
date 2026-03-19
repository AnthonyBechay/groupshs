import { prisma } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const upcoming = searchParams.get("upcoming");
        const year = searchParams.get("year");

        const where: Record<string, unknown> = {};
        if (upcoming === "true") where.isUpcoming = true;
        if (year) where.year = parseInt(year);

        const activities = await prisma.activity.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(activities);
    } catch (error) {
        console.error("Error fetching activities:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { title, description, date: actDate, endDate, location, imageUrl, isUpcoming: upcoming, year: actYear } = body;

        if (!title || !description || !actDate || !actYear) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newActivity = await prisma.activity.create({
            data: {
                title,
                description,
                date: actDate,
                endDate: endDate || null,
                location: location || null,
                imageUrl: imageUrl || null,
                isUpcoming: upcoming ?? true,
                year: actYear,
            },
        });

        return NextResponse.json(newActivity);
    } catch (error) {
        console.error("Error creating activity:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
