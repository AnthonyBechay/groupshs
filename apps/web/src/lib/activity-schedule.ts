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

export const MEALS = [
    { value: "BREAKFAST", label: "Breakfast" },
    { value: "LUNCH", label: "Lunch" },
    { value: "GOUTER", label: "Goûter" },
    { value: "DINNER", label: "Dinner" },
] as const;
export type Meal = (typeof MEALS)[number]["value"];

export type ProgrammeItem = {
    /** Stable, so a later module (meals: menu, cost, ingredients) can point at it. */
    id: string;
    day: string;      // "YYYY-MM-DD" — a camp's programme spans several days
    time: string;     // start, "HH:MM"
    endTime: string;  // end, "HH:MM", may be empty
    title: string;
    details: string;  // notes, material
    by: string;       // who leads it
    kind: "ACTIVITY" | "MEAL";
    meal: Meal | "";  // set when kind is MEAL
};

/**
 * The usual moments of a scout day, offered as one-click additions. Times are
 * only a starting point; meals are typed so they can be planned and costed.
 */
export const PROGRAMME_PRESETS: { title: string; time: string; endTime: string; meal?: Meal }[] = [
    { title: "Wake up", time: "07:00", endTime: "07:30" },
    { title: "Breakfast", time: "07:30", endTime: "08:15", meal: "BREAKFAST" },
    { title: "Flag ceremony", time: "08:15", endTime: "08:30" },
    { title: "Lunch", time: "12:30", endTime: "13:30", meal: "LUNCH" },
    { title: "Rest", time: "13:30", endTime: "14:30" },
    { title: "Goûter", time: "16:30", endTime: "17:00", meal: "GOUTER" },
    { title: "Mass / prayer", time: "18:00", endTime: "18:45" },
    { title: "Dinner", time: "19:30", endTime: "20:30", meal: "DINNER" },
    { title: "Veillée", time: "20:30", endTime: "22:00" },
    { title: "Lights out", time: "22:30", endTime: "" },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Chronological within a day, untimed moments last. */
export function compareProgramme(a: ProgrammeItem, b: ProgrammeItem): number {
    return a.day.localeCompare(b.day) || (a.time || "99").localeCompare(b.time || "99");
}

/**
 * Clean whatever came over the wire (or an older stored programme) into
 * programme items; drops empty rows. Older items had no day, end or id: they
 * belong to `defaultDay` and get an id from their position.
 */
export function sanitizeProgramme(input: unknown, defaultDay = ""): ProgrammeItem[] {
    if (!Array.isArray(input)) return [];
    const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const time = (v: unknown) => { const t = str(v, 5); return TIME_RE.test(t) ? t : ""; };
    const mealValues: readonly string[] = MEALS.map(m => m.value);
    return input
        .slice(0, 200)
        .map((row, i): ProgrammeItem => {
            const r = (row ?? {}) as Record<string, unknown>;
            const meal = mealValues.includes(str(r.meal, 20)) ? (str(r.meal, 20) as Meal) : "";
            const day = str(r.day, 10);
            return {
                id: str(r.id, 64) || `item-${i}`,
                day: DAY_RE.test(day) ? day : defaultDay,
                time: time(r.time),
                endTime: time(r.endTime),
                title: str(r.title, 200),
                details: str(r.details, 2000),
                by: str(r.by, 120),
                kind: meal ? "MEAL" : "ACTIVITY",
                meal,
            };
        })
        .filter(r => r.title || r.details)
        .sort(compareProgramme);
}

/**
 * The days a session's programme covers: a weekly session is one day; a camp
 * runs from its start to its end date (or further, if days were added).
 */
export function programmeDays(sessionDay: string, endDay: string | null, items: ProgrammeItem[] = []): string[] {
    const days: string[] = [];
    const last = endDay && endDay > sessionDay ? endDay : sessionDay;
    for (let d = sessionDay; d <= last && days.length < 31; d = addDayKey(d, 1)) days.push(d);
    for (const i of items) if (i.day && !days.includes(i.day)) days.push(i.day);
    return days.sort();
}

export function addDayKey(day: string, n: number): string {
    const d = new Date(`${day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

/** Moments that start before the activity does or end after it ends. */
export function outsideHours(
    item: ProgrammeItem, firstDay: string, lastDay: string, start: string | null, end: string | null
): string | null {
    if (item.time && item.endTime && item.endTime < item.time) return "ends before it starts";
    if (start && item.day === firstDay && item.time && item.time < start) return `before the ${start} start`;
    const finish = item.endTime || item.time;
    if (end && item.day === lastDay && finish && finish > end) return `after the ${end} end`;
    return null;
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
