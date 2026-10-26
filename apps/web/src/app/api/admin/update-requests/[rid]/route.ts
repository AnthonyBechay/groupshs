import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { FAMILY_FIELD_KEYS, linkState, type SubmittedChanges } from "@/lib/member-update";
import { applyReview, linkUrl, toMedications, toSiblings } from "@/lib/member-update-service";

type Params = { params: Promise<{ rid: string }> };

async function load(params: Params["params"]) {
    const session = await getSession();
    if (!session || !hasPermission(session, "canManageMembers")) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    const { rid } = await params;
    const r = await prisma.memberUpdateRequest.findUnique({
        where: { id: rid },
        include: {
            member: {
                select: {
                    id: true, firstName: true, lastName: true, unitId: true, consentSignedAt: true,
                    unit: { select: { id: true, name: true, unitType: true } },
                    medications: { orderBy: { createdAt: "asc" } },
                    groupSiblings: { orderBy: { createdAt: "asc" } },
                    ...Object.fromEntries(FAMILY_FIELD_KEYS.map(k => [k, true])),
                },
            },
        },
    });
    if (!r) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
    if (!canAccessUnit(session, r.member.unitId)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    return { session, r };
}

/** GET — the submission next to what the file says today. */
export async function GET(_: NextRequest, { params }: Params) {
    try {
        const g = await load(params);
        if (g.error) return g.error;
        const { r } = g;
        const { medications, groupSiblings, ...member } = r.member;
        return NextResponse.json({
            ...r,
            token: undefined,
            url: linkUrl(r.token),
            state: linkState(r),
            changes: r.changes as unknown as SubmittedChanges,
            member,
            currentMedications: toMedications(medications),
            currentSiblings: toSiblings(groupSiblings),
        });
    } catch (error) {
        console.error("Error loading update request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * POST { action: "apply", fields: [...], medications, consent, note }
 *    | { action: "reject", note }
 *    | { action: "revoke" }
 */
export async function POST(request: NextRequest, { params }: Params) {
    try {
        const g = await load(params);
        if (g.error) return g.error;
        const { r, session } = g;
        const body = await request.json().catch(() => ({}));
        const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 1000) : null;

        if (body.action === "revoke") {
            if (r.status !== "OPEN") return NextResponse.json({ error: "Only an unused link can be revoked" }, { status: 400 });
            await prisma.memberUpdateRequest.update({ where: { id: r.id }, data: { status: "REVOKED" } });
            return NextResponse.json({ ok: true });
        }

        if (r.status !== "SUBMITTED") return NextResponse.json({ error: "There is nothing to review on this link" }, { status: 400 });

        if (body.action === "reject") {
            await prisma.memberUpdateRequest.update({
                where: { id: r.id },
                data: { status: "REJECTED", reviewedById: session.userId, reviewedByName: session.name, reviewedAt: new Date(), reviewNote: note },
            });
            return NextResponse.json({ ok: true });
        }
        if (body.action === "apply") {
            const updated = await applyReview(r.id, {
                fields: Array.isArray(body.fields) ? body.fields.filter((k: unknown) => typeof k === "string") : [],
                medications: body.medications === true,
                siblings: body.siblings === true,
                consent: body.consent === true,
                note,
            }, session);
            return NextResponse.json({ ok: true, status: updated.status, applied: updated.appliedFields });
        }
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error) {
        console.error("Error reviewing update request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
