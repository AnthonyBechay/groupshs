import { prisma } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIp, resetRateLimit } from "@/lib/rate-limit";
import { FAMILY_FIELD_KEYS, changeCount, diffSubmission } from "@/lib/member-update";
import { findFamilyRequest, toMedications, toSiblings } from "@/lib/member-update-service";

/**
 * Public: the family side of an update link. No session — the token IS the
 * credential, so every call re-checks it, and opening the file additionally
 * asks for the child's date of birth when the group has one on file. A link
 * forwarded to the wrong chat then shows a name, never medical details.
 *
 * POST { action: "open", dob }                      → the current file
 * POST { action: "submit", dob, submittedBy, fields, medications, consent }
 *
 * A submission changes nothing on the member: it waits for a leader's review.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;
        const rlKey = `family:${clientIp(request)}`;
        const rl = checkRateLimit(rlKey, { limit: 20, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
        }

        // Per link as well as per address: a date of birth has only a few
        // hundred plausible values, so guesses must not be spread over IPs.
        const tokenKey = `family-token:${token.slice(0, 64)}`;
        const perLink = checkRateLimit(tokenKey, { limit: 10, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 });
        if (!perLink.allowed) {
            return NextResponse.json({ error: "Too many attempts on this link. Try again in an hour." }, { status: 429, headers: { "Retry-After": String(perLink.retryAfter) } });
        }

        const found = await findFamilyRequest(token);
        if (found.state !== "OPEN" || !found.request) {
            return NextResponse.json({ error: "This link can no longer be used", state: found.state }, { status: 410 });
        }
        const { request: r } = found;
        const m = r.member;

        const body = await request.json().catch(() => ({}));
        if (m.dateOfBirth && String(body.dob ?? "").slice(0, 10) !== m.dateOfBirth.slice(0, 10)) {
            return NextResponse.json({ error: "That date of birth does not match our records.", needsDob: true }, { status: 403 });
        }
        resetRateLimit(rlKey);
        resetRateLimit(tokenKey);

        const current = Object.fromEntries(FAMILY_FIELD_KEYS.map(k => [k, (m as Record<string, unknown>)[k] ?? null]));
        const currentMeds = toMedications(m.medications);
        const currentSiblings = toSiblings(m.groupSiblings);

        if (body.action === "open") {
            if (!r.openedAt) await prisma.memberUpdateRequest.update({ where: { id: r.id }, data: { openedAt: new Date() } });
            return NextResponse.json({ fields: current, medications: currentMeds, siblings: currentSiblings });
        }

        if (body.action === "submit") {
            const submittedBy = typeof body.submittedBy === "string" ? body.submittedBy.trim().slice(0, 120) : "";
            if (!submittedBy) return NextResponse.json({ error: "Please write your name" }, { status: 400 });

            const changes = diffSubmission(current, currentMeds, body, currentSiblings);
            if (changeCount(changes) === 0) {
                return NextResponse.json({ error: "Nothing was changed. If everything is correct, you can simply close this page." }, { status: 400 });
            }
            // updateMany with the status in the filter: two tabs submitting at
            // once cannot both succeed.
            const res = await prisma.memberUpdateRequest.updateMany({
                where: { id: r.id, status: "OPEN" },
                data: { status: "SUBMITTED", submittedAt: new Date(), submittedBy, changes: JSON.parse(JSON.stringify(changes)) },
            });
            if (res.count === 0) return NextResponse.json({ error: "This link was already used" }, { status: 409 });
            return NextResponse.json({ ok: true, changeCount: changeCount(changes) });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error) {
        console.error("Error in family update:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
