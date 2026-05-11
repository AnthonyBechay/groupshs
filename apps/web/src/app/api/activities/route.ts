import { prisma } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const upcoming = searchParams.get("upcoming");
        const year = searchParams.get("year");
        const unitId = searchParams.get("unitId");
        const includeHidden = searchParams.get("includeHidden") === "true";

        const where: Record<string, unknown> = {};
        if (upcoming === "true") where.isUpcoming = true;
        if (upcoming === "false") where.isUpcoming = false;
        if (year) where.year = parseInt(year);
        if (unitId) where.unitId = unitId;

        if (!includeHidden) {
            where.hidden = false;
        } else {
            const session = await getSession();
            if (!isAdmin(session)) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

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
        if (!isAdmin(session)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            title, description, whatToBring, unitId, activityType,
            startDate, endDate, pickupTime, dropoffTime,
            pickupLocation, dropoffLocation, location,
            pickupLocationUrl, dropoffLocationUrl, locationUrl,
            imageUrl, hidden, year, totalDays,
        } = body;

        if (!title || !description || !unitId || !startDate || !year) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newActivity = await prisma.activity.create({
            data: {
                title,
                description,
                whatToBring: whatToBring || null,
                unitId,
                activityType: activityType || "OTHER",
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                pickupTime: pickupTime || null,
                dropoffTime: dropoffTime || null,
                pickupLocation: pickupLocation || null,
                dropoffLocation: dropoffLocation || null,
                location: location || null,
                pickupLocationUrl: pickupLocationUrl || null,
                dropoffLocationUrl: dropoffLocationUrl || null,
                locationUrl: locationUrl || null,
                imageUrl: imageUrl || null,
                hidden: hidden ?? false,
                year,
                totalDays: typeof totalDays === "number" ? totalDays : null,
            },
        });

        return NextResponse.json(newActivity);
    } catch (error) {
        console.error("Error creating activity:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
