import { prisma } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.activity.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canAccessUnit(session, existing.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const body = await request.json();
        if ("unitId" in body && body.unitId && !canAccessUnit(session, body.unitId)) {
            return NextResponse.json({ error: "Forbidden: target unit not allowed" }, { status: 403 });
        }
        const data: Prisma.ActivityUpdateInput = {};

        if ("title" in body) data.title = body.title;
        if ("description" in body) data.description = body.description;
        if ("whatToBring" in body) data.whatToBring = body.whatToBring || null;
        if ("activityType" in body) data.activityType = body.activityType || "OTHER";
        if ("startDate" in body && body.startDate) data.startDate = new Date(body.startDate);
        if ("endDate" in body) data.endDate = body.endDate ? new Date(body.endDate) : null;
        if ("pickupTime" in body) data.pickupTime = body.pickupTime || null;
        if ("dropoffTime" in body) data.dropoffTime = body.dropoffTime || null;
        if ("pickupLocation" in body) data.pickupLocation = body.pickupLocation || null;
        if ("dropoffLocation" in body) data.dropoffLocation = body.dropoffLocation || null;
        if ("location" in body) data.location = body.location || null;
        if ("pickupLocationUrl" in body) data.pickupLocationUrl = body.pickupLocationUrl || null;
        if ("dropoffLocationUrl" in body) data.dropoffLocationUrl = body.dropoffLocationUrl || null;
        if ("locationUrl" in body) data.locationUrl = body.locationUrl || null;
        if ("imageUrl" in body) data.imageUrl = body.imageUrl ?? null;
        if ("hidden" in body) data.hidden = body.hidden;
        if ("year" in body && body.year != null) data.year = body.year;
        if ("totalDays" in body) data.totalDays = typeof body.totalDays === "number" ? body.totalDays : null;
        if ("unitId" in body && body.unitId) data.unit = { connect: { id: body.unitId } };

        const updated = await prisma.activity.update({ where: { id }, data });

        revalidatePath("/activities");
        revalidatePath("/");
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating activity:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { id } = await params;
        const existing = await prisma.activity.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canAccessUnit(session, existing.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        await prisma.activity.delete({ where: { id } });
        revalidatePath("/activities");
        revalidatePath("/");
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting activity:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
