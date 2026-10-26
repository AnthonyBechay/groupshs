import { prisma } from "@/db";
import type { Prisma } from "@/generated/prisma/client";
import { canAccessUnit, type SessionUser } from "@/lib/auth";
import { VISIBLE_UNITS_WHERE, unitHoldsMembers } from "@/lib/scout-config";
import { dayKey, plannedSessionDays, sanitizeProgramme } from "@/lib/activity-schedule";

type Tx = Prisma.TransactionClient;

/** Set by the sync itself, so it can tell its own cancellations from a leader's. */
const OUT_OF_SCHEDULE = "No longer in the schedule";

/**
 * Bring an activity's sessions in line with its schedule.
 *
 *   - a session for every planned day is created if missing;
 *   - a one-off whose date moved keeps its single session and just moves it,
 *     so the attendance taken on it is not lost;
 *   - a session that falls outside the schedule (the series was shortened) is
 *     deleted only if nothing was recorded on it. One with attendance or a
 *     programme is kept, marked cancelled, because that is real history.
 */
export async function syncActivitySessions(tx: Tx, activityId: string) {
    const activity = await tx.activity.findUniqueOrThrow({
        where: { id: activityId },
        select: { startDate: true, recurrence: true, recurrenceUntil: true },
    });
    const planned = plannedSessionDays(activity.startDate, activity.recurrence, activity.recurrenceUntil);
    const existing = await tx.activitySession.findMany({
        where: { activityId },
        select: { id: true, date: true, status: true, cancelReason: true, programme: true, notes: true, _count: { select: { attendance: true } } },
        orderBy: { date: "asc" },
    });

    if (!activity.recurrence && existing.length === 1 && planned.length === 1) {
        const only = existing[0];
        if (dayKey(only.date) !== dayKey(planned[0])) {
            await tx.activitySession.update({ where: { id: only.id }, data: { date: planned[0] } });
        }
        return;
    }

    const plannedKeys = new Set(planned.map(dayKey));
    const existingKeys = new Set(existing.map(s => dayKey(s.date)));

    const missing = planned.filter(d => !existingKeys.has(dayKey(d)));
    if (missing.length) {
        await tx.activitySession.createMany({
            data: missing.map(date => ({ activityId, date })),
            skipDuplicates: true,
        });
    }

    for (const s of existing) {
        if (plannedKeys.has(dayKey(s.date))) {
            // Back inside the schedule after being trimmed out: bring it back.
            // A week a leader cancelled on purpose keeps its own reason and stays.
            if (s.status === "CANCELLED" && s.cancelReason === OUT_OF_SCHEDULE) {
                await tx.activitySession.update({ where: { id: s.id }, data: { status: "SCHEDULED", cancelReason: null } });
            }
            continue;
        }
        const hasData = s._count.attendance > 0 || sanitizeProgramme(s.programme).length > 0 || !!s.notes;
        if (hasData) {
            if (s.status !== "CANCELLED") {
                await tx.activitySession.update({
                    where: { id: s.id },
                    data: { status: "CANCELLED", cancelReason: OUT_OF_SCHEDULE },
                });
            }
        } else {
            await tx.activitySession.delete({ where: { id: s.id } });
        }
    }
}

// ─── Access ──────────────────────────────────────────────────────────────────
//
// An activity belongs to one unit. Group-wide ones belong to the "All units"
// pseudo-unit, which no restricted user lists in allowedUnitIds — yet a CT must
// still see the group's camp and take attendance for HIS members there. So:
//
//   view          → their unit, or any group-wide activity
//   edit / delete → their unit only (a group-wide one needs unrestricted access)
//   attendance    → per member: only members of units they can access

type ActivityScope = { unitId: string; unit: { unitType: string } };

export function canViewActivity(session: SessionUser | null, a: ActivityScope): boolean {
    return canAccessUnit(session, a.unitId) || a.unit.unitType === "ALL";
}

export function canEditActivity(session: SessionUser | null, a: { unitId: string }): boolean {
    return canAccessUnit(session, a.unitId);
}

/** Prisma filter for the activities a user may list. */
export function viewableActivitiesWhere(session: SessionUser | null): Prisma.ActivityWhereInput {
    if (!session) return { id: "__none__" };
    if (session.isSuperAdmin || session.allowedUnitIds.length === 0) return {};
    return { OR: [{ unitId: { in: session.allowedUnitIds } }, { unit: { unitType: "ALL" } }] };
}

/**
 * Who is expected at an activity:
 *   unit activity  → the unit's members, plus the maîtrise who run it
 *   group-wide     → every active member of every real unit
 * then narrowed to the members this user may see.
 */
export async function activityRoster(session: SessionUser | null, a: ActivityScope) {
    const where: Prisma.MemberWhereInput = a.unit.unitType === "ALL"
        ? { status: "ACTIVE", unit: VISIBLE_UNITS_WHERE }
        : { status: "ACTIVE", OR: [{ unitId: a.unitId }, { servesUnitId: a.unitId }] };

    const members = await prisma.member.findMany({
        where,
        select: {
            id: true, firstName: true, lastName: true, role: true, extraRoles: true, photoUrl: true,
            unitId: true, servesUnitId: true,
            unit: { select: { id: true, name: true, unitType: true } },
            subgroup: { select: { id: true, name: true } },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return members.filter(m =>
        unitHoldsMembers(m.unit.unitType)
        && (canAccessUnit(session, m.unitId) || (!!m.servesUnitId && canAccessUnit(session, m.servesUnitId))));
}

export type RosterMember = Awaited<ReturnType<typeof activityRoster>>[number];

/** Load an activity with what the access checks need, or null. */
export function findActivityScope(id: string) {
    return prisma.activity.findUnique({
        where: { id },
        include: { unit: { select: { id: true, name: true, unitType: true, imageUrl: true } } },
    });
}

// ─── Summaries for lists ────────────────────────────────────────────────────

/** Per session: how many records exist and how many were present. */
export async function attendanceTotals(sessionIds: string[]) {
    const rows = sessionIds.length
        ? await prisma.activityAttendance.groupBy({
            by: ["sessionId", "attended"],
            where: { sessionId: { in: sessionIds } },
            _count: { _all: true },
        })
        : [];
    const totals = new Map<string, { recorded: number; present: number }>();
    for (const r of rows) {
        const t = totals.get(r.sessionId) ?? { recorded: 0, present: 0 };
        if (r.attended) t.recorded += r._count._all;
        if (r.attended === "FULLY" || r.attended === "PARTIAL") t.present += r._count._all;
        totals.set(r.sessionId, t);
    }
    return totals;
}

/**
 * How many people each unit's activities expect: its members plus the maîtrise
 * serving it. Group-wide activities expect everyone.
 */
export async function expectedHeadcounts() {
    const [home, serving, all] = await Promise.all([
        prisma.member.groupBy({ by: ["unitId"], where: { status: "ACTIVE" }, _count: { _all: true } }),
        prisma.member.groupBy({ by: ["servesUnitId"], where: { status: "ACTIVE", servesUnitId: { not: null } }, _count: { _all: true } }),
        prisma.member.count({ where: { status: "ACTIVE", unit: { ...VISIBLE_UNITS_WHERE, unitType: { notIn: ["ALL"] } } } }),
    ]);
    const byUnit = new Map<string, number>();
    for (const h of home) byUnit.set(h.unitId, (byUnit.get(h.unitId) ?? 0) + h._count._all);
    for (const s of serving) if (s.servesUnitId) byUnit.set(s.servesUnitId, (byUnit.get(s.servesUnitId) ?? 0) + s._count._all);
    return (unitId: string, unitType: string) => (unitType === "ALL" ? all : byUnit.get(unitId) ?? 0);
}
