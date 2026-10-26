/**
 * The pure side of activity sessions — no database, so it can be exercised from
 * a throwaway script. Server glue lives in activity-sessions.ts.
 *
 * Every date here is a DAY, stored as UTC midnight, exactly like
 * Activity.startDate ("2026-10-03" → 2026-10-03T00:00:00Z). Weekly steps are
 * done in UTC milliseconds, so a daylight-saving change can never push a
 * session onto the previous day.
 */

export const RECURRENCES = ["WEEKLY"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

/** A weekly series is capped so a typo in the end date cannot create 5,000 rows. */
export const MAX_SESSIONS = 80;

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-10-03", or any Date/ISO string, as that day at UTC midnight. */
export function toDay(value: Date | string): Date {
    const iso = typeof value === "string" ? value : value.toISOString();
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

export function dayKey(value: Date | string): string {
    return toDay(value).toISOString().slice(0, 10);
}

export function isRecurrence(v: unknown): v is Recurrence {
    return typeof v === "string" && (RECURRENCES as readonly string[]).includes(v);
}

/**
 * Every day the activity takes place, in order.
 * One-off → its start day. Weekly → start, +7, +14… up to and including `until`.
 */
export function plannedSessionDays(
    start: Date | string,
    recurrence: string | null | undefined,
    until: Date | string | null | undefined
): Date[] {
    const first = toDay(start);
    if (!isRecurrence(recurrence) || !until) return [first];

    const last = toDay(until).getTime();
    const days: Date[] = [];
    for (let t = first.getTime(); t <= last && days.length < MAX_SESSIONS; t += 7 * DAY_MS) {
        days.push(new Date(t));
    }
    return days.length ? days : [first];
}

/** Why a requested schedule cannot be saved, or null when it is fine. */
export function scheduleError(
    start: Date | string,
    recurrence: string | null | undefined,
    until: Date | string | null | undefined
): string | null {
    if (!recurrence) return null;
    if (!isRecurrence(recurrence)) return "Unknown repeat rule";
    if (!until) return "A weekly activity needs a last date";
    const span = (toDay(until).getTime() - toDay(start).getTime()) / DAY_MS;
    if (span < 0) return "The last date is before the first one";
    if (span / 7 + 1 > MAX_SESSIONS) {
        return `That is more than ${MAX_SESSIONS} weeks — split it into one series per scout year`;
    }
    return null;
}

// ─── Programme ──────────────────────────────────────────────────────────────

export type ProgrammeItem = {
    time: string;     // "14:30", free text so "after lunch" also works
    title: string;    // what happens
    details: string;  // notes, material
    by: string;       // who leads it
};

/** Clean whatever came over the wire into a programme; drops empty rows. */
export function sanitizeProgramme(input: unknown): ProgrammeItem[] {
    if (!Array.isArray(input)) return [];
    const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    return input
        .slice(0, 50)
        .map(row => {
            const r = (row ?? {}) as Record<string, unknown>;
            return { time: str(r.time, 20), title: str(r.title, 200), details: str(r.details, 2000), by: str(r.by, 120) };
        })
        .filter(r => r.title || r.details);
}

// ─── Attendance ─────────────────────────────────────────────────────────────

/** Statuses a session can be in. */
export const SESSION_STATUSES = ["SCHEDULED", "CANCELLED"] as const;

/** Post-activity values; a weekly reunion only ever uses these. */
export const ATTENDED_VALUES = ["FULLY", "PARTIAL", "NOT_AT_ALL"] as const;

/** Present = came, fully or partly. */
export function isPresent(attended: string | null | undefined): boolean {
    return attended === "FULLY" || attended === "PARTIAL";
}
