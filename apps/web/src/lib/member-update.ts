/**
 * Family update links — what a family may fill in, and how a submission
 * becomes changes on the member.
 *
 * Kept free of database imports so both the public form and the review screen
 * can use the field list, and so the diff can be tested from a script.
 */

export type FieldType = "text" | "textarea" | "date" | "email" | "tel" | "blood";
export type FieldDef = { key: string; label: string; type: FieldType; hint?: string };
export type FieldGroup = { title: string; fields: FieldDef[] };

/**
 * The ONLY member fields a family can propose. Identity and scouting data —
 * name, unit, role, progressions — are the group's to set, never the family's.
 */
export const FAMILY_FIELD_GROUPS: FieldGroup[] = [
    {
        title: "The scout",
        fields: [
            { key: "dateOfBirth", label: "Date of birth", type: "date" },
            { key: "placeOfBirth", label: "Place of birth", type: "text" },
            { key: "phone", label: "Scout's mobile", type: "tel" },
            { key: "email", label: "Scout's email", type: "email" },
        ],
    },
    {
        title: "Address",
        fields: [
            { key: "city", label: "City", type: "text" },
            { key: "street", label: "Street", type: "text" },
            { key: "building", label: "Building", type: "text" },
            { key: "floor", label: "Floor", type: "text" },
            { key: "homePhone", label: "Home phone", type: "tel" },
        ],
    },
    {
        title: "Father",
        fields: [
            { key: "fatherName", label: "Name and surname", type: "text" },
            { key: "fatherPhone", label: "Phone", type: "tel" },
            { key: "fatherEmail", label: "Email", type: "email" },
            { key: "fatherProfession", label: "Profession", type: "text" },
        ],
    },
    {
        title: "Mother",
        fields: [
            { key: "motherName", label: "Name and surname", type: "text" },
            { key: "motherPhone", label: "Phone", type: "tel" },
            { key: "motherEmail", label: "Email", type: "email" },
            { key: "motherProfession", label: "Profession", type: "text" },
        ],
    },
    {
        title: "Emergency contact",
        fields: [
            { key: "emergencyContactName", label: "Name", type: "text", hint: "Someone other than the parents, if possible" },
            { key: "emergencyContactRelation", label: "Relation", type: "text", hint: "e.g. Aunt, Grandfather" },
            { key: "emergencyContactPhone", label: "Phone", type: "tel" },
        ],
    },
    {
        title: "Family doctor",
        fields: [
            { key: "doctorName", label: "Name", type: "text" },
            { key: "doctorPhone", label: "Phone", type: "tel" },
            { key: "doctorClinicAddress", label: "Clinic address", type: "text" },
        ],
    },
    {
        title: "Medical",
        fields: [
            { key: "bloodType", label: "Blood type", type: "blood" },
            { key: "allergySeasonal", label: "Seasonal allergies", type: "textarea" },
            { key: "allergyMedication", label: "Medication allergies", type: "textarea" },
            { key: "allergyFood", label: "Food allergies", type: "textarea" },
            { key: "allergyAnimals", label: "Animal & insect allergies", type: "textarea" },
            { key: "chronicIllnesses", label: "Chronic or recurrent illnesses", type: "textarea" },
            { key: "sportsToAvoid", label: "Physical activities to avoid (and why)", type: "textarea" },
            { key: "previousSurgeries", label: "Previous surgeries", type: "textarea" },
            { key: "antiTetanusDate", label: "Anti-tetanus vaccine date(s)", type: "text" },
        ],
    },
    {
        title: "Authorization",
        fields: [
            { key: "legalGuardianName", label: "Legal guardian's name", type: "text" },
        ],
    },
];

export const FAMILY_FIELDS: FieldDef[] = FAMILY_FIELD_GROUPS.flatMap(g => g.fields);
export const FAMILY_FIELD_KEYS = FAMILY_FIELDS.map(f => f.key);
export const fieldLabel = (key: string) => FAMILY_FIELDS.find(f => f.key === key)?.label ?? key;

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/** How long a link may stay open, in days. */
export const LINK_VALIDITY_DAYS = [7, 30, 60] as const;
export const DEFAULT_VALIDITY_DAYS = 60;

export type Medication = { name: string; dosage: string; timeToTake: string; startDate: string; endDate: string };

export type SubmittedChanges = {
    /** Only the fields that differ from the file at submission time. */
    fields: Record<string, string | null>;
    /** The full proposed treatment list, when it differs; absent = unchanged. */
    medications?: Medication[];
    /** The family ticked the consent box. */
    consent?: boolean;
};

const clean = (v: unknown, max = 2000): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim().slice(0, max);
    return t ? t : null;
};

export function sanitizeMedications(input: unknown): Medication[] {
    if (!Array.isArray(input)) return [];
    return input.slice(0, 20).map(row => {
        const r = (row ?? {}) as Record<string, unknown>;
        return {
            name: clean(r.name, 200) ?? "",
            dosage: clean(r.dosage, 200) ?? "",
            timeToTake: clean(r.timeToTake, 60) ?? "",
            startDate: clean(r.startDate, 10) ?? "",
            endDate: clean(r.endDate, 10) ?? "",
        };
    }).filter(m => m.name);
}

const medKey = (list: Medication[]) =>
    JSON.stringify(list.map(m => [m.name, m.dosage, m.timeToTake, m.startDate, m.endDate]));

/**
 * What the family actually changed. Fields they left as they were are dropped,
 * so a reviewer only reads real changes. Emptying a field counts as a change
 * (an allergy that is gone), and is shown as such.
 */
export function diffSubmission(
    current: Record<string, unknown>,
    currentMeds: Medication[],
    submitted: { fields?: unknown; medications?: unknown; consent?: unknown }
): SubmittedChanges {
    const input = (submitted.fields ?? {}) as Record<string, unknown>;
    const fields: Record<string, string | null> = {};
    for (const f of FAMILY_FIELDS) {
        if (!(f.key in input)) continue;
        const next = clean(input[f.key], f.type === "textarea" ? 2000 : 300);
        // A malformed value is ignored, never read as "clear this field".
        if (f.type === "blood" && next && !BLOOD_TYPES.includes(next)) continue;
        if (f.type === "date" && next && !/^\d{4}-\d{2}-\d{2}$/.test(next)) continue;
        const before = clean(current[f.key] as string | null, 2000);
        if (next !== before) fields[f.key] = next;
    }
    const out: SubmittedChanges = { fields };
    if (submitted.medications !== undefined) {
        const meds = sanitizeMedications(submitted.medications);
        if (medKey(meds) !== medKey(currentMeds)) out.medications = meds;
    }
    if (submitted.consent === true) out.consent = true;
    return out;
}

export function changeCount(c: SubmittedChanges): number {
    return Object.keys(c.fields ?? {}).length + (c.medications ? 1 : 0) + (c.consent ? 1 : 0);
}

/** OPEN links past their date are expired, whatever the stored status says. */
export function linkState(r: { status: string; expiresAt: Date | string }): string {
    if (r.status === "OPEN" && new Date(r.expiresAt) < new Date()) return "EXPIRED";
    return r.status;
}
