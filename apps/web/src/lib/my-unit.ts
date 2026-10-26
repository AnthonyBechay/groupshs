import { prisma } from "@/db";
import { canAccessUnit, hasPermission, type SessionUser } from "@/lib/auth";
import { toDay } from "@/lib/activity-schedule";
import { attendanceTotals } from "@/lib/activity-sessions";
import { leadershipRolesOf, isCouncilRole } from "@/lib/scout-config";

export type MyUnit = {
    member: { id: string; firstName: string; lastName: string };
    unit: { id: string; name: string; unitType: string };
    /** The leadership role they hold there (CM, ACT…), or their youth role. */
    role: string | null;
    /** False when the account is linked but not allowed into that unit. */
    accessible: boolean;
};

/**
 * The unit the signed-in user is responsible for, read from the member their
 * account is linked to:
 *
 *   - unit maîtrise (CM, CT, CC…)  → the unit they SERVE
 *   - anyone else in a branch       → their home unit
 *   - the conseil (CG, ACG…)        → none: they look after the whole group,
 *                                     which is what the rest of the dashboard is
 *
 * Purely descriptive. Whether they may see that unit's data is still decided by
 * their permissions and allowedUnitIds — `accessible` reports it so the UI can
 * say "ask for access" rather than show an empty card.
 */
export async function getMyUnit(session: SessionUser | null): Promise<MyUnit | null> {
    if (!session?.memberId) return null;

    const member = await prisma.member.findFirst({
        where: { id: session.memberId, status: "ACTIVE" },
        select: {
            id: true, firstName: true, lastName: true, role: true, extraRoles: true,
            unit: { select: { id: true, name: true, unitType: true } },
            servesUnit: { select: { id: true, name: true, unitType: true } },
        },
    });
    if (!member) return null;

    const roles = leadershipRolesOf(member, member.unit.unitType);
    if (!member.servesUnit && roles.some(isCouncilRole)) return null;

    const unit = member.servesUnit ?? member.unit;
    if (unit.unitType === "GROUP") return null;

    return {
        member: { id: member.id, firstName: member.firstName, lastName: member.lastName },
        unit,
        role: roles.find(r => !isCouncilRole(r)) ?? member.role,
        accessible: canAccessUnit(session, unit.id),
    };
}

// ─── Overview ────────────────────────────────────────────────────────────────

/** Fields a leader needs on file before taking a child on an activity. */
const ESSENTIAL_FIELDS = [
    ["dateOfBirth", "date of birth"],
    ["emergencyContactPhone", "emergency contact"],
    ["bloodType", "blood type"],
    ["doctorPhone", "family doctor"],
] as const;

/**
 * Everything the "My unit" page shows, each part only when the user holds the
 * permission behind it — the page is a summary, never a way around access.
 */
export async function getMyUnitOverview(session: SessionUser, unitId: string) {
    const canMembers = hasPermission(session, "canManageMembers");
    const canActivities = hasPermission(session, "canManageActivities");
    const today = toDay(new Date());

    const members = canMembers
        ? await prisma.member.findMany({
            where: { status: "ACTIVE", OR: [{ unitId }, { servesUnitId: unitId }] },
            select: {
                id: true, firstName: true, lastName: true, role: true, extraRoles: true, photoUrl: true,
                unitId: true, servesUnitId: true, dateOfBirth: true, emergencyContactPhone: true, bloodType: true, doctorPhone: true,
                unit: { select: { unitType: true, name: true } },
                subgroup: { select: { name: true } },
            },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        })
        : [];
    const maitrise = members.filter(m => m.servesUnitId === unitId);
    const youth = members.filter(m => m.unitId === unitId && m.servesUnitId !== unitId);

    const incomplete = youth
        .map(m => ({ m, missing: ESSENTIAL_FIELDS.filter(([k]) => !m[k]).map(([, label]) => label) }))
        .filter(x => x.missing.length > 0);

    const month = today.getUTCMonth() + 1;
    const birthdays = youth
        .filter(m => m.dateOfBirth && Number(m.dateOfBirth.slice(5, 7)) === month)
        .sort((a, b) => a.dateOfBirth!.slice(8, 10).localeCompare(b.dateOfBirth!.slice(8, 10)));

    const pendingUpdates = canMembers
        // The unit's own members only: those are the files this leader can review.
        ? await prisma.memberUpdateRequest.count({ where: { status: "SUBMITTED", member: { unitId, status: "ACTIVE" } } })
        : 0;

    let upcoming: { id: string; date: Date; status: string; activity: { id: string; title: string; activityType: string } }[] = [];
    let recent: { id: string; date: Date; activityId: string; title: string; present: number; recorded: number }[] = [];
    if (canActivities) {
        const scope = { OR: [{ unitId }, { unit: { unitType: "ALL" } }] };
        const [next, past] = await Promise.all([
            prisma.activitySession.findMany({
                where: { date: { gte: today }, activity: scope },
                include: { activity: { select: { id: true, title: true, activityType: true } } },
                orderBy: { date: "asc" }, take: 5,
            }),
            prisma.activitySession.findMany({
                where: { date: { lt: today }, status: "SCHEDULED", activity: { unitId } },
                include: { activity: { select: { id: true, title: true } } },
                orderBy: { date: "desc" }, take: 6,
            }),
        ]);
        upcoming = next;
        const totals = await attendanceTotals(past.map(s => s.id));
        recent = past.map(s => ({
            id: s.id, date: s.date, activityId: s.activity.id, title: s.activity.title,
            ...(totals.get(s.id) ?? { recorded: 0, present: 0 }),
        }));
    }

    return { canMembers, canActivities, youth, maitrise, incomplete, birthdays, pendingUpdates, upcoming, recent };
}
