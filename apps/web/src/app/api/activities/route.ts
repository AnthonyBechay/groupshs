import { prisma } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { PUBLIC_ACTIVITY_WHERE } from "@/lib/scout-config";
import { scheduleError, toDay } from "@/lib/activity-schedule";
import { syncActivitySessions, viewableActivitiesWhere } from "@/lib/activity-sessions";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const upcoming = searchParams.get("upcoming");
        const year = searchParams.get("year");
        const unitId = searchParams.get("unitId");
        const includeHidden = searchParams.get("includeHidden") === "true";

        const where: Prisma.ActivityWhereInput = {};
        if (upcoming === "true") where.isUpcoming = true;
        if (upcoming === "false") where.isUpcoming = false;
        if (year) where.year = parseInt(year);
        if (unitId) where.unitId = unitId;

        if (!includeHidden) {
            Object.assign(where, PUBLIC_ACTIVITY_WHERE);
        } else {
            // The granular permission, not the admin role: every admin has the
            // role, so it would hand a gallery editor every hidden activity.
            const session = await getSession();
            if (!hasPermission(session, "canManageActivities")) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            where.AND = [viewableActivitiesWhere(session)];
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
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            title, description, whatToBring, unitId, activityType,
            startDate, endDate, pickupTime, dropoffTime,
            pickupLocation, dropoffLocation, location,
            pickupLocationUrl, dropoffLocationUrl, locationUrl,
            imageUrl, hidden, year, totalDays, theme, fee,
        } = body;
        const recurrence = body.recurrence || null;
        const recurrenceUntil = recurrence && body.recurrenceUntil ? toDay(body.recurrenceUntil) : null;

        // The description is website copy and may be left for later.
        if (!title || !unitId || !startDate || !year) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        const badSchedule = scheduleError(startDate, recurrence, recurrenceUntil);
        if (badSchedule) return NextResponse.json({ error: badSchedule }, { status: 400 });

        if (!canAccessUnit(session, unitId)) {
            return NextResponse.json({ error: "Forbidden: cannot create activities for this unit" }, { status: 403 });
        }

        const newActivity = await prisma.$transaction(async (tx) => {
            const created = await tx.activity.create({
                data: {
                    title,
                    description: typeof description === "string" ? description : "",
                    whatToBring: whatToBring || null,
                    unitId,
                    activityType: activityType || "OTHER",
                    startDate: new Date(startDate),
                    // A series runs from its first to its last session; endDate
                    // is for a single activity spanning several days.
                    endDate: !recurrence && endDate ? new Date(endDate) : null,
                    recurrence,
                    recurrenceUntil,
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
                    theme: typeof theme === "string" && theme.trim() ? theme.trim() : null,
                    fee: typeof fee === "string" && fee.trim() ? fee.trim() : null,
                },
            });
            await syncActivitySessions(tx, created.id);
            return created;
        });

        revalidatePath("/activities");
        revalidatePath("/");
        return NextResponse.json(newActivity);
    } catch (error) {
        console.error("Error creating activity:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
