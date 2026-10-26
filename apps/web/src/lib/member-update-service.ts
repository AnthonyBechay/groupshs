import { randomBytes } from "crypto";
import { prisma } from "@/db";
import type { SessionUser } from "@/lib/auth";
import {
    DEFAULT_VALIDITY_DAYS, FAMILY_FIELD_KEYS, LINK_VALIDITY_DAYS, NUMBER_FIELDS, linkState,
    describeMedication, describeSibling, type Medication, type Sibling, type SubmittedChanges,
} from "@/lib/member-update";
import { recordChanges, recordListChange } from "@/lib/member-history";

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "https://groupshs.org").replace(/\/$/, "");

export const linkUrl = (token: string) => `${BASE_URL}/update/${token}`;

/** 24 random bytes: unguessable, and short enough to send on WhatsApp. */
const newToken = () => randomBytes(24).toString("base64url");

export function validityDays(v: unknown): number {
    const n = Number(v);
    return (LINK_VALIDITY_DAYS as readonly number[]).includes(n) ? n : DEFAULT_VALIDITY_DAYS;
}

/**
 * Open a link for a member. A member has at most one open link: creating a new
 * one revokes the previous, so an old message lying in a family chat stops
 * working once a fresh one is sent.
 */
export async function createUpdateLink(memberId: string, opts: { days: number; sentTo?: string | null }, session: SessionUser) {
    return prisma.$transaction(async (tx) => {
        await tx.memberUpdateRequest.updateMany({
            where: { memberId, status: "OPEN" },
            data: { status: "REVOKED" },
        });
        const r = await tx.memberUpdateRequest.create({
            data: {
                memberId,
                token: newToken(),
                expiresAt: new Date(Date.now() + opts.days * 24 * 60 * 60 * 1000),
                sentTo: opts.sentTo?.trim().slice(0, 120) || null,
                createdById: session.userId,
                createdByName: session.name,
            },
        });
        return { ...r, url: linkUrl(r.token) };
    });
}

export const familyMemberSelect = {
    id: true, firstName: true, lastName: true, dateOfBirth: true, unitId: true, status: true,
    unit: { select: { name: true } },
    medications: { select: { name: true, dosage: true, timeToTake: true, startDate: true, endDate: true }, orderBy: { createdAt: "asc" as const } },
    groupSiblings: { select: { name: true, schoolClass: true, unitName: true }, orderBy: { createdAt: "asc" as const } },
    ...Object.fromEntries(FAMILY_FIELD_KEYS.map(k => [k, true])),
} as const;

/**
 * Resolve a token for the public form. Returns why it cannot be used rather
 * than throwing, so the page can say "expired" or "already sent".
 */
export async function findFamilyRequest(token: string) {
    if (!token || token.length > 64) return { state: "INVALID" as const };
    const r = await prisma.memberUpdateRequest.findUnique({
        where: { token },
        include: { member: { select: familyMemberSelect } },
    });
    if (!r || r.member.status !== "ACTIVE") return { state: "INVALID" as const };
    return { state: linkState(r), request: r };
}

export const toMedications = (rows: { name: string; dosage: string | null; timeToTake: string | null; startDate: string | null; endDate: string | null }[]): Medication[] =>
    rows.map(m => ({ name: m.name, dosage: m.dosage ?? "", timeToTake: m.timeToTake ?? "", startDate: m.startDate ?? "", endDate: m.endDate ?? "" }));

export const toSiblings = (rows: { name: string; schoolClass: string | null; unitName: string | null }[]): Sibling[] =>
    rows.map(s => ({ name: s.name, schoolClass: s.schoolClass ?? "", unitName: s.unitName ?? "" }));

/**
 * Apply the parts of a submission the reviewer kept. Each field is written as
 * the family sent it; the treatment list, if kept, replaces the current one.
 */
export async function applyReview(
    requestId: string,
    decision: { fields: string[]; medications: boolean; siblings?: boolean; consent: boolean; note: string | null },
    session: SessionUser
) {
    return prisma.$transaction(async (tx) => {
        const r = await tx.memberUpdateRequest.findUniqueOrThrow({ where: { id: requestId } });
        const changes = r.changes as unknown as SubmittedChanges;
        const kept = decision.fields.filter(k => FAMILY_FIELD_KEYS.includes(k) && k in (changes.fields ?? {}));
        // The history says the family wrote it and who let it through.
        const actor = {
            source: "FAMILY" as const, id: session.userId, requestId: r.id,
            name: `${r.submittedBy ?? "Family"} (applied by ${session.name})`,
        };
        const before = await tx.member.findUniqueOrThrow({
            where: { id: r.memberId },
            include: { medications: { orderBy: { createdAt: "asc" } }, groupSiblings: { orderBy: { createdAt: "asc" } } },
        });

        const data: Record<string, unknown> = {};
        for (const k of kept) {
            const v = changes.fields[k];
            data[k] = NUMBER_FIELDS.includes(k) ? (v == null ? null : Number(v)) : v;
        }
        if (decision.consent && changes.consent) {
            data.consentSignedAt = r.submittedAt ?? new Date();
            kept.push("consent");
        }
        if (Object.keys(data).length) {
            await tx.member.update({ where: { id: r.memberId }, data });
            await recordChanges(tx, r.memberId, before as unknown as Record<string, unknown>, data, actor);
        }

        if (decision.siblings && changes.siblings) {
            await tx.groupSibling.deleteMany({ where: { memberId: r.memberId } });
            if (changes.siblings.length) {
                await tx.groupSibling.createMany({
                    data: changes.siblings.map(s => ({ memberId: r.memberId, name: s.name, schoolClass: s.schoolClass || null, unitName: s.unitName || null })),
                });
            }
            await recordListChange(tx, r.memberId, "siblings", {
                removed: before.groupSiblings.map(describeSibling).join("\n") || null,
                added: changes.siblings.map(describeSibling).join("\n") || null,
            }, actor);
            kept.push("siblings");
        }

        if (decision.medications && changes.medications) {
            await recordListChange(tx, r.memberId, "medications", {
                removed: before.medications.map(describeMedication).join("\n") || null,
                added: changes.medications.map(describeMedication).join("\n") || null,
            }, actor);
            await tx.memberMedication.deleteMany({ where: { memberId: r.memberId } });
            if (changes.medications.length) {
                await tx.memberMedication.createMany({
                    data: changes.medications.map(m => ({
                        memberId: r.memberId, name: m.name,
                        dosage: m.dosage || null, timeToTake: m.timeToTake || null,
                        startDate: m.startDate || null, endDate: m.endDate || null,
                    })),
                });
            }
            kept.push("medications");
        }

        return tx.memberUpdateRequest.update({
            where: { id: requestId },
            data: {
                status: kept.length ? "APPROVED" : "REJECTED",
                appliedFields: kept,
                reviewedById: session.userId,
                reviewedByName: session.name,
                reviewedAt: new Date(),
                reviewNote: decision.note,
            },
        });
    });
}
