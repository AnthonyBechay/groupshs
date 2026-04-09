"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Download, Trash2, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const STATUSES = [
    { value: "PENDING", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
    { value: "CONTACTED", label: "Contacted", color: "bg-blue-100 text-blue-800" },
    { value: "WAITING_LIST", label: "Waiting List", color: "bg-purple-100 text-purple-800" },
    { value: "RECRUITED", label: "Recruited", color: "bg-green-100 text-green-800" },
    { value: "REJECTED", label: "Rejected", color: "bg-red-100 text-red-800" },
];

type Submission = {
    id: string;
    fullName: string;
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
    createdAt: string;
};

export default function AdminSubmissionsPage() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    async function fetchSubmissions() {
        const res = await fetch("/api/admin/submissions");
        if (res.ok) setSubmissions(await res.json());
        setLoading(false);
    }

    useEffect(() => { fetchSubmissions(); }, []);

    async function updateStatus(id: string, status: string, statusNote?: string) {
        await fetch(`/api/admin/submissions/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, statusNote }),
        });
        fetchSubmissions();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this submission permanently?")) return;
        await fetch(`/api/admin/submissions/${id}`, { method: "DELETE" });
        fetchSubmissions();
    }

    function exportCSV() {
        const headers = ["Full Name", "Date of Birth", "School Level", "Member Phone", "Parent Name", "Parent Phone", "Parent Were Scouts", "Parent Scout Group", "Siblings in Group", "Sibling Names", "Comments", "Status", "Status Note", "Submitted"];
        const rows = filtered.map(s => [
            s.fullName, s.dateOfBirth, s.schoolLevel, s.memberPhone || "",
            s.parentName || "", s.parentPhone || "",
            s.parentWereScouts ? "Yes" : "No", s.parentScoutGroup || "", s.siblingsInGroup ? "Yes" : "No",
            s.siblingNames || "", s.otherComments || "", s.status, s.statusNote || "",
            new Date(s.createdAt).toLocaleDateString(),
        ]);

        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `submissions-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    const filtered = submissions
        .filter(s => filter === "ALL" || s.status === filter)
        .filter(s => !search || s.fullName.toLowerCase().includes(search.toLowerCase()) || (s.parentName || s.parentContactInfo || "").toLowerCase().includes(search.toLowerCase()));

    const statusCounts = submissions.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Recruitment Submissions</h1>
                    <p className="text-sm text-muted-foreground mt-1">{submissions.length} total submissions</p>
                </div>
                <Button onClick={exportCSV} variant="outline" className="gap-2" disabled={filtered.length === 0}>
                    <Download className="w-4 h-4" /> Export CSV
                </Button>
            </div>

            {/* Status filter pills */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => setFilter("ALL")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === "ALL" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                    All ({submissions.length})
                </button>
                {STATUSES.map(st => (
                    <button
                        key={st.value}
                        onClick={() => setFilter(st.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === st.value ? "bg-primary text-white" : `${st.color} hover:opacity-80`}`}
                    >
                        {st.label} ({statusCounts[st.value] || 0})
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or parent contact..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            {filtered.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">No submissions found</p>
            ) : (
                <div className="space-y-3">
                    {filtered.map((s) => {
                        const statusInfo = STATUSES.find(st => st.value === s.status) || STATUSES[0];
                        const isExpanded = expandedId === s.id;

                        return (
                            <div key={s.id} className="border rounded-lg bg-card overflow-hidden">
                                {/* Summary row */}
                                <div
                                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                                >
                                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold truncate">{s.fullName}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {s.schoolLevel} - {s.parentName || s.parentContactInfo || "-"}{s.parentPhone ? ` - ${s.parentPhone}` : ""} - {new Date(s.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                        <select
                                            value={s.status}
                                            onChange={e => updateStatus(s.id, e.target.value)}
                                            className="text-xs border rounded-md px-2 py-1 bg-background"
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

                                {/* Expanded details */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 border-t">
                                        <div className="grid md:grid-cols-2 gap-3 text-sm pt-4">
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
                                            {s.statusNote && (
                                                <div className="md:col-span-2"><strong>Status Note:</strong> {s.statusNote}</div>
                                            )}
                                        </div>
                                        <div className="mt-4">
                                            <Input
                                                placeholder="Add a note about this submission..."
                                                defaultValue={s.statusNote || ""}
                                                onBlur={e => {
                                                    if (e.target.value !== (s.statusNote || "")) {
                                                        updateStatus(s.id, s.status, e.target.value);
                                                    }
                                                }}
                                                className="text-sm"
                                            />
                                        </div>
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
