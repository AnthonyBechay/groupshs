/**
 * Server glue for circulars: load what a circular reads from the database,
 * check who may touch it, allocate reference numbers.
 */

import { prisma } from "@/db";
import { canAccessUnit, hasPermission, type SessionUser } from "@/lib/auth";
import type { Circular } from "@/generated/prisma/client";
import type { CircularContext, CircularMeta } from "./types";
import { normalizeContent } from "./types";
import { scoutYearOf } from "./format";
import { referenceOf } from "./tokens";

/** Used until the group fills in Settings → Circulars. */
export const CIRCULAR_DEFAULTS = { groupName: "Groupe Sagesse High School", city: "Ain Saadeh" };

/**
 * Circulars belong to an activity, so they follow the activity's rule: the
 * activities permission, plus access to the activity's unit.
 */
export function canManageCircularsOf(session: SessionUser | null, unitId: string): boolean {
    return hasPermission(session, "canManageActivities") && canAccessUnit(session, unitId);
}

export async function loadCircularContext(activityId: string): Promise<CircularContext | null> {
    const [activity, settings] = await Promise.all([
        prisma.activity.findUnique({
            where: { id: activityId },
            include: {
                unit: {
                    include: {
                        contacts: {
                            orderBy: { sortOrder: "asc" },
                            include: { member: { select: { firstName: true, lastName: true, phone: true, role: true, status: true } } },
                        },
                    },
                },
            },
        }),
        prisma.siteSettings.findUnique({ where: { id: "default" } }),
    ]);
    if (!activity) return null;

    const { unit } = activity;
    const contacts = unit.contacts
        // A contact person who has since left the group must not be printed
        // as the one to call.
        .filter(c => c.member.status === "ACTIVE")
        .map(c => ({
            role: c.role?.trim() || c.member.role || "",
            name: `${c.member.firstName} ${c.member.lastName}`.trim(),
            phone: c.member.phone ?? "",
        }));
    // Units created before contact persons existed only have these two fields.
    if (contacts.length === 0 && unit.contactName) {
        contacts.push({ role: "", name: unit.contactName, phone: unit.contactPhone ?? "" });
    }

    return {
        activity: {
            id: activity.id,
            title: activity.title,
            activityType: activity.activityType,
            startDate: activity.startDate.toISOString(),
            endDate: activity.endDate?.toISOString() ?? null,
            location: activity.location,
            // The schema names these from the family's point of view: they DROP
            // OFF at the start and PICK UP at the end.
            startTime: activity.dropoffTime,
            startPlace: activity.dropoffLocation,
            endTime: activity.pickupTime,
            endPlace: activity.pickupLocation,
            theme: activity.theme,
            fee: activity.fee,
            whatToBring: activity.whatToBring,
        },
        unit: { id: unit.id, name: unit.name, unitType: unit.unitType, logoUrl: unit.imageUrl, contacts },
        group: {
            name: settings?.circularGroupName?.trim() || CIRCULAR_DEFAULTS.groupName,
            city: settings?.circularCity?.trim() || CIRCULAR_DEFAULTS.city,
            motto: settings?.circularMotto?.trim() || "",
            logoUrl: settings?.logoUrl ?? null,
            associationLogoUrl: settings?.associationLogoUrl ?? null,
            stampUrl: settings?.circularStampUrl ?? null,
            fiscalYearStartMonth: settings?.fiscalYearStartMonth ?? 9,
        },
    };
}

export const metaOf = (c: Pick<Circular, "seq" | "issueDate" | "referenceOverride">): CircularMeta => ({
    seq: c.seq,
    issueDate: c.issueDate.toISOString(),
    referenceOverride: c.referenceOverride,
});

/** A circular as the admin UI receives it. */
export function serializeCircular(c: Circular, ctx: CircularContext) {
    return {
        id: c.id,
        activityId: c.activityId,
        seq: c.seq,
        scoutYear: c.scoutYear,
        referenceOverride: c.referenceOverride,
        reference: referenceOf(ctx, metaOf(c)),
        template: c.template,
        title: c.title,
        issueDate: c.issueDate.toISOString(),
        content: normalizeContent(c.content),
        updatedAt: c.updatedAt.toISOString(),
    };
}

/** "2025-07-03" → midnight UTC of that day, or null if it is not a real date. */
export function parseDay(value: unknown): Date | null {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
    const d = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** The next free number in a scout year. Numbers are shared by the whole group. */
export async function nextSeq(scoutYear: number): Promise<number> {
    const { _max } = await prisma.circular.aggregate({ where: { scoutYear }, _max: { seq: true } });
    return (_max.seq ?? 0) + 1;
}

export function isUniqueViolation(error: unknown): boolean {
    return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

export { scoutYearOf };
