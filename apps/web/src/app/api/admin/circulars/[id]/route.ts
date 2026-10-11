import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import {
    canManageCircularsOf, isUniqueViolation, loadCircularContext, parseDay, scoutYearOf, serializeCircular,
} from "@/lib/circular/service";
import { normalizeContent } from "@/lib/circular/types";
import { scoutYearLabel } from "@/lib/circular/format";

type Params = { params: Promise<{ id: string }> };

/** Load a circular with its context, or the response explaining why not. */
async function authorize(id: string) {
    const session = await getSession();
    const circular = await prisma.circular.findUnique({ where: { id } });
    if (!circular) return { error: NextResponse.json({ error: "Circular not found" }, { status: 404 }) };
    const ctx = await loadCircularContext(circular.activityId);
    if (!ctx) return { error: NextResponse.json({ error: "Activity not found" }, { status: 404 }) };
    if (!canManageCircularsOf(session, ctx.unit.id)) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { circular, ctx };
}

export async function GET(_: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const found = await authorize(id);
        if (found.error) return found.error;
        return NextResponse.json({ context: found.ctx, circular: serializeCircular(found.circular, found.ctx) });
    } catch (error) {
        console.error("Error loading circular:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const found = await authorize(id);
        if (found.error) return found.error;
        const { circular, ctx } = found;

        const body = await request.json().catch(() => ({}));
        const data: Prisma.CircularUpdateInput = {};

        if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 200);
        if ("content" in body) data.content = normalizeContent(body.content) as unknown as Prisma.InputJsonValue;
        if ("referenceOverride" in body) {
            data.referenceOverride = typeof body.referenceOverride === "string" && body.referenceOverride.trim()
                ? body.referenceOverride.trim().slice(0, 80)
                : null;
        }

        let issueDate = circular.issueDate;
        if ("issueDate" in body) {
            const parsed = parseDay(body.issueDate);
            if (!parsed) return NextResponse.json({ error: "The letter date is not a valid date" }, { status: 400 });
            issueDate = parsed;
            data.issueDate = parsed;
        }
        let seq = circular.seq;
        if ("seq" in body) {
            if (!Number.isInteger(body.seq) || body.seq < 1 || body.seq > 9999) {
                return NextResponse.json({ error: "The number must be between 1 and 9999" }, { status: 400 });
            }
            seq = body.seq;
            data.seq = seq;
        }
        // The scout year follows the letter date, so moving the date across
        // September moves the circular into the other year's numbering.
        const month = ctx.group.fiscalYearStartMonth;
        const scoutYear = scoutYearOf(issueDate, month);
        data.scoutYear = scoutYear;

        const taken = () => NextResponse.json(
            { error: `Number ${String(seq).padStart(2, "0")} is already used by another circular in ${scoutYearLabel(scoutYear, month)}. Choose a different number.` },
            { status: 409 }
        );
        if (seq !== circular.seq || scoutYear !== circular.scoutYear) {
            const clash = await prisma.circular.findFirst({ where: { scoutYear, seq, NOT: { id } }, select: { id: true } });
            if (clash) return taken();
        }

        try {
            const updated = await prisma.circular.update({ where: { id }, data });
            return NextResponse.json({ context: ctx, circular: serializeCircular(updated, ctx) });
        } catch (error) {
            // Lost a race with another save for the same number.
            if (isUniqueViolation(error)) return taken();
            throw error;
        }
    } catch (error) {
        console.error("Error updating circular:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const found = await authorize(id);
        if (found.error) return found.error;
        await prisma.circular.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting circular:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
