import { prisma } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const upcoming = searchParams.get("upcoming");
        const year = searchParams.get("year");
        const unitId = searchParams.get("unitId");

        const where: Record<string, unknown> = {};
        if (upcoming === "true") where.isUpcoming = true;
        if (upcoming === "false") where.isUpcoming = false;
        if (year) where.year = parseInt(year);
        if (unitId) where.unitId = unitId;

        const activities = await prisma.activity.findMany({
            where,
            include: { unit: { select: { name: true, unitType: true } } },
            orderBy: { startDate: "desc" },
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
        const {
            title, description, unitId, activityType,
            startDate, endDate, pickupTime, dropoffTime,
            pickupLocation, dropoffLocation, location,
            imageUrl, isUpcoming, year,
        } = body;

        if (!title || !description || !unitId || !startDate || !year) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newActivity = await prisma.activity.create({
            data: {
                title,
                description,
                unitId,
                activityType: activityType || "OTHER",
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                pickupTime: pickupTime || null,
                dropoffTime: dropoffTime || null,
                pickupLocation: pickupLocation || null,
                dropoffLocation: dropoffLocation || null,
                location: location || null,
                imageUrl: imageUrl || null,
                isUpcoming: isUpcoming ?? true,
                year,
            },
        });

        return NextResponse.json(newActivity);
    } catch (error) {
        console.error("Error creating activity:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
