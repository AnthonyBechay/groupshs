"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
    Download, Trash2, ChevronDown, Search, UserPlus, CheckCircle2, ArrowRight,
    Loader2, AlertTriangle, Info, Undo2, ExternalLink,
} from "lucide-react";
import { unitTypeLabel, unitAcceptsGender } from "@/lib/scout-config";

// The recruitment pipeline, in the order an applicant moves through it.
const STATUSES = [
    { value: "PENDING", label: "New", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
    { value: "CONTACTED", label: "Contacted", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
    { value: "WAITING_LIST", label: "Waiting List", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
    { value: "RECRUITED", label: "Enrolled", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
    { value: "REJECTED", label: "Declined", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
];

function genderLabel(g: string | null): string {
    if (g === "MALE") return "Boy";
    if (g === "FEMALE") return "Girl";
    return "";
}

type Submission = {
    id: string;
    fullName: string;
    gender: string | null;
    dateOfBirth: string;
    schoolLevel: string;
    memberPhone: string | null;
    parentWereScouts: boolean;
    parentScoutGroup: string | null;
    parentContactInfo: string | null;
    parentName: string | null;
    parentPhone: string | null;
    siblingsInGroup: boolean;
    siblingNames: string | null;
    otherComments: string | null;
    status: string;
    statusNote: string | null;
    memberId: string | null;
    enrolledAt: string | null;
    createdAt: string;
    // Where they were placed. Null if the member record was since deleted, in
    // which case the application is treated as not enrolled.
    member: {
        id: string; firstName: string; lastName: string;
        role: string | null; status: string;
        unit: { id: string; name: string; unitType: string } | null;
        subgroup: { name: string } | null;
    } | null;
};

type Unit = { id: string; name: string; unitType: string; _count: { members: number } };
type Subgroup = { id: string; name: string; unitId: string };

type Placement = {
    suggestion: { unitType: string; unitTypeLabel: string; ageReached: number; hasUnits: boolean } | null;
    missing: { gender: boolean; dateOfBirth: boolean };
    suggestedUnits: Unit[];
    allUnits: Unit[];
    subgroups: Subgroup[];
};

export default function AdminRecruitmentPage() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [enrollingId, setEnrollingId] = useState<string | null>(null);

    const fetchSubmissions = useCallback(async () => {
        const res = await fetch("/api/admin/submissions");
        if (res.ok) setSubmissions(await res.json());
        setLoading(false);
    }, []);

    // Initial load. The setState happens after an await, not synchronously, but
    // the lint rule cannot see through the callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

    async function updateStatus(id: string, status: string) {
        // Note: only `status` is sent. The API leaves statusNote untouched when
        // it is absent, so changing status never discards an existing note.
        const res = await fetch(`/api/admin/submissions/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.error || "Could not update the status");
        }
        fetchSubmissions();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this application permanently?")) return;
        const res = await fetch(`/api/admin/submissions/${id}`, { method: "DELETE" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.error || "Could not delete the application");
            return;
        }
        fetchSubmissions();
    }

    async function undoEnrollment(s: Submission) {
        if (!confirm(
            `Undo the enrollment of ${s.fullName}?\n\n` +
            `Their member record will be removed and the application goes back to Contacted. ` +
            `This only works while the member has no activity recorded.`
        )) return;
        const res = await fetch(`/api/admin/recruitment/${s.id}/enroll`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) { alert(data.error || "Could not undo the enrollment"); return; }
        fetchSubmissions();
    }

    const filtered = useMemo(() => submissions
        .filter(s => filter === "ALL" || s.status === filter)
        .filter(s => {
            const q = search.trim().toLowerCase();
            if (!q) return true;
            return s.fullName.toLowerCase().includes(q)
                || (s.parentName || s.parentContactInfo || "").toLowerCase().includes(q);
        }), [submissions, filter, search]);

    function exportCSV() {
        const headers = ["Full Name", "Gender", "Date of Birth", "School Level", "Member Phone", "Parent Name", "Parent Phone", "Parent Were Scouts", "Parent Scout Group", "Siblings in Group", "Sibling Names", "Comments", "Status", "Enrolled", "Submitted"];
        const rows = filtered.map(s => [
            s.fullName, genderLabel(s.gender), s.dateOfBirth, s.schoolLevel, s.memberPhone || "",
            s.parentName || "", s.parentPhone || "",
            s.parentWereScouts ? "Yes" : "No", s.parentScoutGroup || "", s.siblingsInGroup ? "Yes" : "No",
            s.siblingNames || "", s.otherComments || "", s.status,
            s.enrolledAt ? new Date(s.enrolledAt).toLocaleDateString() : "",
            new Date(s.createdAt).toLocaleDateString(),
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recruitment-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    const statusCounts = submissions.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Applications marked recruited but never actually placed in a unit.
    const awaitingEnrollment = submissions.filter(s => !s.member && s.status !== "REJECTED").length;

    if (loading) return <p className="text-muted-foreground">Loading…</p>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Recruitment</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {submissions.length} application{submissions.length !== 1 ? "s" : ""}
                        {awaitingEnrollment > 0 && ` · ${awaitingEnrollment} not yet placed in a unit`}
                    </p>
                </div>
                <Button onClick={exportCSV} variant="outline" className="gap-2" disabled={filtered.length === 0}>
                    <Download className="w-4 h-4" /> Export CSV
                </Button>
            </div>

            {/* How the pipeline ends */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-2.5 mb-6">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                    An application is only finished once the applicant is <strong className="text-foreground">placed in a unit</strong>.
                    Use <strong className="text-foreground">Enroll into a unit</strong> on an application to create their member
                    record — the branch is suggested automatically from their age and gender.
                </p>
            </div>

            {/* Status filter pills */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => setFilter("ALL")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === "ALL" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                    All ({submissions.length})
                </button>
                {STATUSES.map(st => (
                    <button
                        key={st.value}
                        onClick={() => setFilter(st.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === st.value ? "bg-primary text-primary-foreground" : `${st.color} hover:opacity-80`}`}
                    >
                        {st.label} ({statusCounts[st.value] || 0})
                    </button>
                ))}
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search by applicant or parent name…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {filtered.length === 0 ? (
                <div className="border border-dashed rounded-2xl p-12 text-center">
                    <p className="text-sm text-muted-foreground">No applications match.</p>
                </div>
            ) : (
                <div className="border rounded-xl overflow-hidden bg-card divide-y">
                    {filtered.map(s => {
                        const isExpanded = expandedId === s.id;
                        const statusInfo = STATUSES.find(st => st.value === s.status) ?? STATUSES[0];
                        // Only treat as enrolled when the member still exists — a deleted
                        // member leaves memberId null via the foreign key.
                        const enrolled = !!s.memberId && !!s.member;

                        return (
                            <div key={s.id}>
                                <div
                                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                                >
                                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold truncate">{s.fullName}</span>
                                            {s.gender && (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                                    s.gender === "FEMALE"
                                                        ? "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
                                                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                                }`}>
                                                    {genderLabel(s.gender)}
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                            {enrolled && s.member?.unit && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 inline-flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    {s.member.unit.name.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                            {s.schoolLevel} · {s.parentName || s.parentContactInfo || "-"}
                                            {s.parentPhone ? ` · ${s.parentPhone}` : ""} · {new Date(s.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                        {!enrolled && s.status !== "REJECTED" && (
                                            <Button
                                                size="sm"
                                                className="gap-1.5 hidden sm:inline-flex"
                                                onClick={() => { setEnrollingId(s.id); setExpandedId(s.id); }}
                                            >
                                                <UserPlus className="w-3.5 h-3.5" /> Enroll
                                            </Button>
                                        )}
                                        <select
                                            value={s.status}
                                            onChange={e => updateStatus(s.id, e.target.value)}
                                            disabled={enrolled}
                                            title={enrolled ? "This applicant is already in a unit" : undefined}
                                            className="text-xs border rounded-md px-2 py-1 bg-background disabled:opacity-50"
                                        >
                                            {STATUSES.map(st => (
                                                <option key={st.value} value={st.value}>{st.label}</option>
                                            ))}
                                        </select>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-destructive hover:text-destructive h-8 w-8 p-0">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 border-t bg-muted/10">
                                        <div className="grid md:grid-cols-2 gap-3 text-sm pt-4">
                                            <div><strong>Gender:</strong> {genderLabel(s.gender) || "-"}</div>
                                            <div><strong>Date of Birth:</strong> {s.dateOfBirth}</div>
                                            <div><strong>School Level:</strong> {s.schoolLevel}</div>
                                            <div><strong>Member Phone:</strong> {s.memberPhone || "-"}</div>
                                            <div><strong>Parent Name:</strong> {s.parentName || s.parentContactInfo || "-"}</div>
                                            <div><strong>Parent Phone:</strong> {s.parentPhone || "-"}</div>
                                            <div><strong>Parent were Scouts:</strong> {s.parentWereScouts ? "Yes" : "No"}{s.parentScoutGroup ? ` (${s.parentScoutGroup})` : ""}</div>
                                            <div><strong>Siblings in Group:</strong> {s.siblingsInGroup ? "Yes" : "No"}{s.siblingNames ? ` (${s.siblingNames})` : ""}</div>
                                            {s.otherComments && (
                                                <div className="md:col-span-2"><strong>Comments:</strong> {s.otherComments}</div>
                                            )}
                                        </div>

                                        {enrolled ? (
                                            <div className="mt-4 rounded-xl border border-emerald-300 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-4 flex flex-wrap items-center gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                                <div className="text-sm text-emerald-900 dark:text-emerald-300 flex-1">
                                                    <p className="font-semibold">
                                                        {s.member?.unit
                                                            ? <>Placed in {s.member.unit.name} ({unitTypeLabel(s.member.unit.unitType)})</>
                                                            : <>Enrolled as a member</>}
                                                    </p>
                                                    <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80 mt-0.5">
                                                        {s.member?.subgroup && `${s.member.subgroup.name} · `}
                                                        {s.member?.role && `${s.member.role} · `}
                                                        {s.enrolledAt
                                                            ? `enrolled ${new Date(s.enrolledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                                                            : "enrolled"}
                                                    </p>
                                                </div>
                                                <Link href={`/admin/members/${s.memberId}`}>
                                                    <Button variant="outline" size="sm" className="gap-1.5">
                                                        Open member <ExternalLink className="w-3.5 h-3.5" />
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={() => undoEnrollment(s)}>
                                                    <Undo2 className="w-3.5 h-3.5" /> Undo
                                                </Button>
                                            </div>
                                        ) : enrollingId === s.id ? (
                                            <EnrollPanel
                                                submission={s}
                                                onCancel={() => setEnrollingId(null)}
                                                onDone={() => { setEnrollingId(null); fetchSubmissions(); }}
                                            />
                                        ) : s.status !== "REJECTED" && (
                                            <div className="mt-4">
                                                <Button className="gap-2" onClick={() => setEnrollingId(s.id)}>
                                                    <UserPlus className="w-4 h-4" /> Enroll into a unit
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Enrollment panel ──────────────────────────────────────────────────────────

function EnrollPanel({ submission, onCancel, onDone }: {
    submission: Submission;
    onCancel: () => void;
    onDone: () => void;
}) {
    const [placement, setPlacement] = useState<Placement | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAllUnits, setShowAllUnits] = useState(false);

    const [unitId, setUnitId] = useState("");
    const [subgroupId, setSubgroupId] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        (async () => {
            const res = await fetch(`/api/admin/recruitment/${submission.id}/placement`);
            if (res.ok) {
                const data: Placement = await res.json();
                setPlacement(data);
                if (data.suggestedUnits.length > 0) setUnitId(data.suggestedUnits[0].id);
                else setShowAllUnits(true);
            }
            // Pre-split the name so it can be corrected before creating the member.
            const parts = submission.fullName.trim().split(/\s+/);
            setFirstName(parts[0] ?? "");
            setLastName(parts.slice(1).join(" ") || "-");
            setLoading(false);
        })();
    }, [submission.id, submission.fullName]);

    // ── Unit choices, narrowed by the applicant's gender and age ─────────────
    //
    // The branch a recruit belongs in is determined by gender AND age, so the
    // picker leads with that instead of listing every unit and letting the
    // server reject the wrong ones.
    const allUnits = placement?.allUnits ?? [];
    const genderWord = submission.gender === "FEMALE" ? "girl" : submission.gender === "MALE" ? "boy" : "member";

    const recommended = placement?.suggestedUnits ?? [];
    const recommendedIds = new Set(recommended.map(u => u.id));

    // Units this applicant *could* join (gender matches the branch), minus the
    // recommended ones and minus GROUP, which is the leadership team.
    const otherSameGender = allUnits.filter(u =>
        !recommendedIds.has(u.id)
        && u.unitType !== "GROUP"
        && unitAcceptsGender(u.unitType, submission.gender)
    );

    const wrongGender = allUnits.filter(u =>
        !recommendedIds.has(u.id)
        && u.unitType !== "GROUP"
        && !unitAcceptsGender(u.unitType, submission.gender)
    );

    const units = allUnits;   // kept for the "no units at all" message

    const recommendedLabel = placement?.suggestion
        ? `Recommended — ${placement.suggestion.unitTypeLabel} (turns ${placement.suggestion.ageReached})`
        : "Recommended";

    // Warn when the chosen unit is not the age-appropriate branch.
    const chosen = allUnits.find(u => u.id === unitId);
    const offBranchWarning =
        chosen && placement?.suggestion && chosen.unitType !== placement.suggestion.unitType
            ? `${chosen.name} is ${unitTypeLabel(chosen.unitType)}, not the ${placement.suggestion.unitTypeLabel} `
              + `branch their age suggests. Enroll them there only if you mean to.`
            : null;

    const unitSubgroups = (placement?.subgroups ?? []).filter(sg => sg.unitId === unitId);

    async function submit() {
        setSaving(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/recruitment/${submission.id}/enroll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    unitId,
                    subgroupId: subgroupId || null,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Could not enroll this applicant"); return; }
            onDone();
        } catch {
            setError("Could not enroll this applicant");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Working out where they fit…
            </p>
        );
    }

    return (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" /> Enroll {submission.fullName}
            </h3>

            {/* Suggestion */}
            {placement?.suggestion ? (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                    Turns <strong className="text-foreground">{placement.suggestion.ageReached}</strong> this fiscal year →
                    suggested branch <strong className="text-foreground">{placement.suggestion.unitTypeLabel}</strong>.
                    {!placement.suggestion.hasUnits && " No unit of that branch exists yet."}
                </p>
            ) : (
                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Cannot suggest a branch — this application is missing{" "}
                    {[placement?.missing.gender && "gender", placement?.missing.dateOfBirth && "date of birth"]
                        .filter(Boolean).join(" and ")}. Pick a unit manually.
                </p>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium">First name</label>
                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium">Last name</label>
                    <Input value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
            </div>

            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">Unit</label>
                    {recommended.length > 0 && otherSameGender.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowAllUnits(v => !v)}
                            className="text-[11px] text-primary underline underline-offset-2"
                        >
                            {showAllUnits ? "Show recommended only" : "Show other units"}
                        </button>
                    )}
                </div>
                <select
                    value={unitId}
                    onChange={e => { setUnitId(e.target.value); setSubgroupId(""); }}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                    <option value="">Select a unit…</option>

                    {recommended.length > 0 && (
                        <optgroup label={recommendedLabel}>
                            {recommended.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.name} — {u._count.members} members
                                </option>
                            ))}
                        </optgroup>
                    )}

                    {/* Right gender, wrong age band — allowed, but flagged below. */}
                    {showAllUnits && otherSameGender.length > 0 && (
                        <optgroup label="Other units (different age group)">
                            {otherSameGender.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({unitTypeLabel(u.unitType)}) — {u._count.members} members
                                </option>
                            ))}
                        </optgroup>
                    )}

                    {/* Wrong branch for this applicant's gender: shown so the list
                        is not mysteriously short, but disabled — the server would
                        reject them anyway. */}
                    {showAllUnits && wrongGender.length > 0 && (
                        <optgroup label={`Not possible for a ${genderWord}`}>
                            {wrongGender.map(u => (
                                <option key={u.id} value={u.id} disabled>
                                    {u.name} ({unitTypeLabel(u.unitType)})
                                </option>
                            ))}
                        </optgroup>
                    )}
                </select>

                {units.length === 0 && (
                    <p className="text-xs text-destructive">
                        No units available. Create one in Units first.
                    </p>
                )}
                {recommended.length === 0 && placement?.suggestion && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                        No {placement.suggestion.unitTypeLabel} unit exists yet — pick another unit
                        or create one first.
                    </p>
                )}
                {offBranchWarning && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        {offBranchWarning}
                    </p>
                )}
            </div>

            {unitSubgroups.length > 0 && (
                <div className="space-y-1.5">
                    <label className="text-xs font-medium">Sub-group (optional)</label>
                    <select
                        value={subgroupId}
                        onChange={e => setSubgroupId(e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                        <option value="">Unassigned</option>
                        {unitSubgroups.map(sg => <option key={sg.id} value={sg.id}>{sg.name}</option>)}
                    </select>
                </div>
            )}

            <p className="text-xs text-muted-foreground border-t pt-3">
                Their date of birth, phone and parent contact are copied across automatically.
                You can complete the rest of their file afterward.
            </p>

            {error && <p className="text-xs text-destructive font-medium">{error}</p>}

            <div className="flex gap-2">
                <Button onClick={submit} disabled={saving || !unitId || !firstName.trim() || !lastName.trim()} className="gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {saving ? "Enrolling…" : "Create member"}
                </Button>
                <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
            </div>
        </div>
    );
}
