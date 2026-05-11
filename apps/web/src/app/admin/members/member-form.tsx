"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Trash2, Plus, ChevronDown, History, Upload, X } from "lucide-react";
import Link from "next/link";
import { ROLES_BY_UNIT_TYPE, PROGRESSION_BY_UNIT_TYPE } from "@/lib/scout-config";

type Unit = { id: string; name: string; unitType: string };
type Subgroup = { id: string; name: string; unitId: string };
type GroupSibling = { id: string; name: string; schoolClass: string | null; unitName: string | null };
type Medication = { id: string; name: string; dosage: string | null; startDate: string | null; endDate: string | null; timeToTake: string | null };
type Move = {
    id: string;
    fromUnitId: string | null; toUnitId: string | null;
    fromSubgroupId: string | null; toSubgroupId: string | null;
    fromRole: string | null; toRole: string | null;
    fromProgression: string | null; toProgression: string | null;
    moveDate: string;
    notes: string | null;
};

export type MemberFormData = {
    id?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string | null;
    placeOfBirth?: string | null;
    phone?: string | null;
    email?: string | null;
    bloodType?: string | null;
    role?: string | null;
    progression?: string | null;
    unitId?: string;
    subgroupId?: string | null;
    photoUrl?: string | null;
    city?: string | null;
    street?: string | null;
    building?: string | null;
    floor?: string | null;
    homePhone?: string | null;
    numberOfBrothers?: number | null;
    numberOfSisters?: number | null;
    doctorName?: string | null;
    doctorPhone?: string | null;
    doctorClinicAddress?: string | null;
    emergencyContactName?: string | null;
    emergencyContactRelation?: string | null;
    emergencyContactPhone?: string | null;
    fatherName?: string | null;
    fatherPhone?: string | null;
    fatherProfession?: string | null;
    fatherEmail?: string | null;
    fatherOldScout?: string | null;
    motherName?: string | null;
    motherPhone?: string | null;
    motherProfession?: string | null;
    motherEmail?: string | null;
    motherOldScout?: string | null;
    allergySeasonal?: string | null;
    allergyMedication?: string | null;
    allergyFood?: string | null;
    allergyAnimals?: string | null;
    chronicIllnesses?: string | null;
    sportsToAvoid?: string | null;
    previousSurgeries?: string | null;
    antiTetanusDate?: string | null;
    legalGuardianName?: string | null;
    consentSignedAt?: string | null;
    groupSiblings?: GroupSibling[];
    medications?: Medication[];
    moves?: Move[];
};

export function MemberForm({ initialData, units, subgroups }: { initialData: MemberFormData; units: Unit[]; subgroups: Subgroup[] }) {
    const router = useRouter();
    const [data, setData] = useState<MemberFormData>(initialData);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Sub-resource state
    const [siblings, setSiblings] = useState<GroupSibling[]>(initialData.groupSiblings || []);
    const [medications, setMedications] = useState<Medication[]>(initialData.medications || []);
    const moves = initialData.moves || [];

    const [photoUploading, setPhotoUploading] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    const isEditing = !!initialData.id;
    const currentUnit = units.find(u => u.id === data.unitId);
    const roles = ROLES_BY_UNIT_TYPE[currentUnit?.unitType || ""] || [];
    const progressions = PROGRESSION_BY_UNIT_TYPE[currentUnit?.unitType || ""] || [];
    const unitSubgroups = subgroups.filter(s => s.unitId === data.unitId);

    function set<K extends keyof MemberFormData>(key: K, val: MemberFormData[K]) {
        setData(prev => ({ ...prev, [key]: val }));
    }

    async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoUploading(true);
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const json = await res.json();
            if (res.ok) set("photoUrl", json.url);
            else alert(json.error || "Upload failed");
        } finally {
            setPhotoUploading(false);
            if (photoInputRef.current) photoInputRef.current.value = "";
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!data.firstName || !data.lastName || !data.unitId) {
            setError("First name, last name, and unit are required");
            return;
        }
        setError("");
        setSaving(true);
        const url = isEditing ? `/api/admin/members/${data.id}` : "/api/admin/members";
        const method = isEditing ? "PUT" : "POST";

        const body = {
            ...data,
            numberOfBrothers: data.numberOfBrothers ?? null,
            numberOfSisters: data.numberOfSisters ?? null,
        };

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const j = await res.json();
            setError(j.error || "Failed to save");
            setSaving(false);
            return;
        }

        const saved = await res.json();
        if (!isEditing) {
            router.replace(`/admin/members/${saved.id}`);
        } else {
            router.refresh();
            setSaving(false);
        }
    }

    async function addSibling(form: { name: string; schoolClass: string; unitName: string }) {
        if (!data.id) return;
        const res = await fetch(`/api/admin/members/${data.id}/siblings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        if (res.ok) {
            const s = await res.json();
            setSiblings([...siblings, s]);
        }
    }

    async function deleteSibling(sid: string) {
        if (!data.id) return;
        await fetch(`/api/admin/members/${data.id}/siblings/${sid}`, { method: "DELETE" });
        setSiblings(siblings.filter(s => s.id !== sid));
    }

    async function addMedication(form: { name: string; dosage: string; startDate: string; endDate: string; timeToTake: string }) {
        if (!data.id) return;
        const res = await fetch(`/api/admin/members/${data.id}/medications`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        if (res.ok) {
            const m = await res.json();
            setMedications([...medications, m]);
        }
    }

    async function deleteMedication(mid: string) {
        if (!data.id) return;
        await fetch(`/api/admin/members/${data.id}/medications/${mid}`, { method: "DELETE" });
        setMedications(medications.filter(m => m.id !== mid));
    }

    async function deleteMember() {
        if (!data.id) return;
        if (!confirm("Delete this member? This cannot be undone.")) return;
        const res = await fetch(`/api/admin/members/${data.id}`, { method: "DELETE" });
        if (res.ok) router.push("/admin/members");
    }

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/members" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">
                            {isEditing ? `${data.firstName} ${data.lastName}` : "New Member"}
                        </h1>
                        {isEditing && currentUnit && (
                            <p className="text-sm text-muted-foreground">{currentUnit.name}{data.role ? ` • ${data.role}` : ""}</p>
                        )}
                    </div>
                </div>
                {isEditing && (
                    <Button variant="outline" onClick={deleteMember} className="text-destructive border-destructive/30 hover:bg-destructive/5 gap-2">
                        <Trash2 className="w-4 h-4" /> Delete
                    </Button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── Identity ── */}
                <Section title="Personal facts" description="Required fields are marked with *">
                    <div className="flex items-start gap-6 mb-4">
                        <div className="w-24 h-32 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted/30 shrink-0">
                            {data.photoUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={data.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs text-muted-foreground text-center px-2">3.5 × 4.5 cm photo</span>
                            )}
                        </div>
                        <div className="space-y-2">
                            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()} disabled={photoUploading} className="gap-2">
                                    <Upload className="w-3.5 h-3.5" /> {photoUploading ? "Uploading..." : "Upload photo"}
                                </Button>
                                {data.photoUrl && (
                                    <Button type="button" variant="ghost" size="sm" onClick={() => set("photoUrl", null)} className="text-destructive">
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <Grid>
                        <Field label="First Name *">
                            <Input value={data.firstName || ""} onChange={e => set("firstName", e.target.value)} required />
                        </Field>
                        <Field label="Last Name *">
                            <Input value={data.lastName || ""} onChange={e => set("lastName", e.target.value)} required />
                        </Field>
                        <Field label="Date of Birth">
                            <Input type="date" value={data.dateOfBirth || ""} onChange={e => set("dateOfBirth", e.target.value || null)} />
                        </Field>
                        <Field label="Place of Birth">
                            <Input value={data.placeOfBirth || ""} onChange={e => set("placeOfBirth", e.target.value || null)} />
                        </Field>
                        <Field label="Telephone">
                            <Input value={data.phone || ""} onChange={e => set("phone", e.target.value || null)} />
                        </Field>
                        <Field label="Email">
                            <Input type="email" value={data.email || ""} onChange={e => set("email", e.target.value || null)} />
                        </Field>
                        <Field label="Blood Type">
                            <Input value={data.bloodType || ""} onChange={e => set("bloodType", e.target.value || null)} placeholder="e.g. O+" />
                        </Field>
                        <Field label="Number of Brothers">
                            <Input type="number" min="0" value={data.numberOfBrothers ?? ""} onChange={e => set("numberOfBrothers", e.target.value === "" ? null : parseInt(e.target.value))} />
                        </Field>
                        <Field label="Number of Sisters">
                            <Input type="number" min="0" value={data.numberOfSisters ?? ""} onChange={e => set("numberOfSisters", e.target.value === "" ? null : parseInt(e.target.value))} />
                        </Field>
                    </Grid>
                </Section>

                {/* ── Group assignment ── */}
                <Section title="Group assignment">
                    <Grid>
                        <Field label="Unit *">
                            <select
                                value={data.unitId || ""}
                                onChange={e => { set("unitId", e.target.value); set("subgroupId", null); }}
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Select...</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Sub-group (Sizaine / Patrouille / Equipe)">
                            <select
                                value={data.subgroupId || ""}
                                onChange={e => set("subgroupId", e.target.value || null)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Unassigned</option>
                                {unitSubgroups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Role">
                            <select
                                value={data.role || ""}
                                onChange={e => set("role", e.target.value || null)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">None</option>
                                {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </Field>
                        {progressions.length > 0 && (
                            <Field label="Progression">
                                <select
                                    value={data.progression || ""}
                                    onChange={e => set("progression", e.target.value || null)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">None</option>
                                    {progressions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            </Field>
                        )}
                    </Grid>
                    {isEditing && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Changing the unit, sub-group, role, or progression here will record an automatic move in the history below.
                        </p>
                    )}
                </Section>

                {/* ── Address ── */}
                <Section title="Address" collapsible>
                    <Grid>
                        <Field label="City"><Input value={data.city || ""} onChange={e => set("city", e.target.value || null)} /></Field>
                        <Field label="Street"><Input value={data.street || ""} onChange={e => set("street", e.target.value || null)} /></Field>
                        <Field label="Building"><Input value={data.building || ""} onChange={e => set("building", e.target.value || null)} /></Field>
                        <Field label="Floor"><Input value={data.floor || ""} onChange={e => set("floor", e.target.value || null)} /></Field>
                        <Field label="Home Telephone"><Input value={data.homePhone || ""} onChange={e => set("homePhone", e.target.value || null)} /></Field>
                    </Grid>
                </Section>

                {/* ── Family doctor ── */}
                <Section title="Family doctor" collapsible>
                    <Grid>
                        <Field label="Name"><Input value={data.doctorName || ""} onChange={e => set("doctorName", e.target.value || null)} /></Field>
                        <Field label="Phone Number"><Input value={data.doctorPhone || ""} onChange={e => set("doctorPhone", e.target.value || null)} /></Field>
                        <Field label="Clinic Address"><Input value={data.doctorClinicAddress || ""} onChange={e => set("doctorClinicAddress", e.target.value || null)} /></Field>
                    </Grid>
                </Section>

                {/* ── Emergency ── */}
                <Section title="Emergency contact" collapsible>
                    <Grid>
                        <Field label="Name"><Input value={data.emergencyContactName || ""} onChange={e => set("emergencyContactName", e.target.value || null)} /></Field>
                        <Field label="Parental or Social Link"><Input value={data.emergencyContactRelation || ""} onChange={e => set("emergencyContactRelation", e.target.value || null)} placeholder="e.g. Aunt, Uncle" /></Field>
                        <Field label="Phone Number"><Input value={data.emergencyContactPhone || ""} onChange={e => set("emergencyContactPhone", e.target.value || null)} /></Field>
                    </Grid>
                </Section>

                {/* ── Father ── */}
                <Section title="Father's information" collapsible>
                    <Grid>
                        <Field label="Name and Surname"><Input value={data.fatherName || ""} onChange={e => set("fatherName", e.target.value || null)} /></Field>
                        <Field label="Telephone Number"><Input value={data.fatherPhone || ""} onChange={e => set("fatherPhone", e.target.value || null)} /></Field>
                        <Field label="Profession"><Input value={data.fatherProfession || ""} onChange={e => set("fatherProfession", e.target.value || null)} /></Field>
                        <Field label="Email"><Input type="email" value={data.fatherEmail || ""} onChange={e => set("fatherEmail", e.target.value || null)} /></Field>
                        <Field label="Old Scout Member (group if yes)"><Input value={data.fatherOldScout || ""} onChange={e => set("fatherOldScout", e.target.value || null)} /></Field>
                    </Grid>
                </Section>

                {/* ── Mother ── */}
                <Section title="Mother's information" collapsible>
                    <Grid>
                        <Field label="Name and Surname"><Input value={data.motherName || ""} onChange={e => set("motherName", e.target.value || null)} /></Field>
                        <Field label="Telephone Number"><Input value={data.motherPhone || ""} onChange={e => set("motherPhone", e.target.value || null)} /></Field>
                        <Field label="Profession"><Input value={data.motherProfession || ""} onChange={e => set("motherProfession", e.target.value || null)} /></Field>
                        <Field label="Email"><Input type="email" value={data.motherEmail || ""} onChange={e => set("motherEmail", e.target.value || null)} /></Field>
                        <Field label="Old Scout Member (group if yes)"><Input value={data.motherOldScout || ""} onChange={e => set("motherOldScout", e.target.value || null)} /></Field>
                    </Grid>
                </Section>

                {/* ── Brothers/Sisters in group ── */}
                {isEditing && (
                    <Section title="Brothers / Sisters in the group" collapsible>
                        <SiblingsEditor siblings={siblings} onAdd={addSibling} onDelete={deleteSibling} />
                    </Section>
                )}

                {/* ── Medical ── */}
                <Section title="Medical — Allergies" collapsible>
                    <div className="space-y-3">
                        <Field label="Seasonal allergies"><textarea value={data.allergySeasonal || ""} onChange={e => set("allergySeasonal", e.target.value || null)} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                        <Field label="Medication allergies"><textarea value={data.allergyMedication || ""} onChange={e => set("allergyMedication", e.target.value || null)} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                        <Field label="Food allergies"><textarea value={data.allergyFood || ""} onChange={e => set("allergyFood", e.target.value || null)} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                        <Field label="Animals & insect stings"><textarea value={data.allergyAnimals || ""} onChange={e => set("allergyAnimals", e.target.value || null)} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                    </div>
                </Section>

                {/* ── Current treatment ── */}
                {isEditing && (
                    <Section title="Current treatment" description="Medications to take during scouts activities" collapsible>
                        <MedicationsEditor medications={medications} onAdd={addMedication} onDelete={deleteMedication} />
                    </Section>
                )}

                {/* ── Other medical ── */}
                <Section title="Other medical info" collapsible>
                    <div className="space-y-3">
                        <Field label="Chronic / recurrent illnesses"><textarea value={data.chronicIllnesses || ""} onChange={e => set("chronicIllnesses", e.target.value || null)} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                        <Field label="Sports activities to avoid (and why)"><textarea value={data.sportsToAvoid || ""} onChange={e => set("sportsToAvoid", e.target.value || null)} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                        <Field label="Previous surgeries"><textarea value={data.previousSurgeries || ""} onChange={e => set("previousSurgeries", e.target.value || null)} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                        <Field label="Anti-tetanus vaccine dates"><Input value={data.antiTetanusDate || ""} onChange={e => set("antiTetanusDate", e.target.value || null)} /></Field>
                    </div>
                </Section>

                {/* ── Authorization ── */}
                <Section title="Legal guardian authorization" collapsible>
                    <Grid>
                        <Field label="Legal guardian name"><Input value={data.legalGuardianName || ""} onChange={e => set("legalGuardianName", e.target.value || null)} /></Field>
                        <Field label="Consent signed on"><Input type="date" value={data.consentSignedAt ? data.consentSignedAt.slice(0, 10) : ""} onChange={e => set("consentSignedAt", e.target.value || null)} /></Field>
                    </Grid>
                </Section>

                {/* ── Move history ── */}
                {isEditing && moves.length > 0 && (
                    <Section title="Move history" icon={<History className="w-4 h-4" />}>
                        <MoveHistory moves={moves} units={units} subgroups={subgroups} />
                    </Section>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="sticky bottom-4 z-10 flex justify-end">
                    <Button type="submit" disabled={saving} className="gap-2 shadow-lg">
                        <Save className="w-4 h-4" /> {saving ? "Saving..." : isEditing ? "Save changes" : "Create member"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, description, icon, children, collapsible = false }: { title: string; description?: string; icon?: React.ReactNode; children: React.ReactNode; collapsible?: boolean }) {
    const [open, setOpen] = useState(!collapsible);
    return (
        <div className="border rounded-2xl bg-card overflow-hidden">
            <button
                type="button"
                onClick={() => collapsible && setOpen(!open)}
                className={`w-full flex items-center justify-between p-5 ${collapsible ? "cursor-pointer hover:bg-muted/30" : "cursor-default"} transition-colors`}
            >
                <div className="text-left">
                    <h3 className="text-base font-bold flex items-center gap-2">{icon}{title}</h3>
                    {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                </div>
                {collapsible && <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />}
            </button>
            {open && <div className="px-5 pb-5">{children}</div>}
        </div>
    );
}

function Grid({ children }: { children: React.ReactNode }) {
    return <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
        </div>
    );
}

function SiblingsEditor({ siblings, onAdd, onDelete }: { siblings: GroupSibling[]; onAdd: (s: { name: string; schoolClass: string; unitName: string }) => void; onDelete: (id: string) => void }) {
    const [name, setName] = useState("");
    const [schoolClass, setSchoolClass] = useState("");
    const [unitName, setUnitName] = useState("");

    function add() {
        if (!name.trim()) return;
        onAdd({ name, schoolClass, unitName });
        setName(""); setSchoolClass(""); setUnitName("");
    }

    return (
        <div className="space-y-3">
            {siblings.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="text-left p-2 font-medium">Name</th>
                                <th className="text-left p-2 font-medium">School / Class</th>
                                <th className="text-left p-2 font-medium">Unit</th>
                                <th className="text-right p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {siblings.map(s => (
                                <tr key={s.id} className="border-t">
                                    <td className="p-2">{s.name}</td>
                                    <td className="p-2 text-muted-foreground">{s.schoolClass || "-"}</td>
                                    <td className="p-2 text-muted-foreground">{s.unitName || "-"}</td>
                                    <td className="p-2 text-right">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(s.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="grid md:grid-cols-4 gap-2 items-end">
                <Field label="Brother/Sister"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" /></Field>
                <Field label="School / Class"><Input value={schoolClass} onChange={e => setSchoolClass(e.target.value)} /></Field>
                <Field label="Unit"><Input value={unitName} onChange={e => setUnitName(e.target.value)} placeholder="Meute Hathi, Clan, ..." /></Field>
                <Button type="button" onClick={add} variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Add</Button>
            </div>
        </div>
    );
}

function MedicationsEditor({ medications, onAdd, onDelete }: { medications: Medication[]; onAdd: (m: { name: string; dosage: string; startDate: string; endDate: string; timeToTake: string }) => void; onDelete: (id: string) => void }) {
    const [name, setName] = useState("");
    const [dosage, setDosage] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [timeToTake, setTimeToTake] = useState("");

    function add() {
        if (!name.trim()) return;
        onAdd({ name, dosage, startDate, endDate, timeToTake });
        setName(""); setDosage(""); setStartDate(""); setEndDate(""); setTimeToTake("");
    }

    return (
        <div className="space-y-3">
            {medications.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="text-left p-2 font-medium">Medication</th>
                                <th className="text-left p-2 font-medium">Dosage</th>
                                <th className="text-left p-2 font-medium">Period</th>
                                <th className="text-left p-2 font-medium">Time</th>
                                <th className="text-right p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {medications.map(m => (
                                <tr key={m.id} className="border-t">
                                    <td className="p-2 font-medium">{m.name}</td>
                                    <td className="p-2 text-muted-foreground">{m.dosage || "-"}</td>
                                    <td className="p-2 text-muted-foreground">{m.startDate || "-"} → {m.endDate || "-"}</td>
                                    <td className="p-2 text-muted-foreground">{m.timeToTake || "-"}</td>
                                    <td className="p-2 text-right">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(m.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="grid md:grid-cols-6 gap-2 items-end">
                <Field label="Medication"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
                <Field label="Dosage"><Input value={dosage} onChange={e => setDosage(e.target.value)} /></Field>
                <Field label="Start"><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></Field>
                <Field label="End"><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></Field>
                <Field label="Time (am/pm)"><Input value={timeToTake} onChange={e => setTimeToTake(e.target.value)} placeholder="08:00 am" /></Field>
                <Button type="button" onClick={add} variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Add</Button>
            </div>
        </div>
    );
}

function MoveHistory({ moves, units, subgroups }: { moves: Move[]; units: Unit[]; subgroups: Subgroup[] }) {
    const unitName = (id: string | null) => units.find(u => u.id === id)?.name || "-";
    const sgName = (id: string | null) => subgroups.find(s => s.id === id)?.name || "-";

    return (
        <div className="space-y-3">
            {moves.map(m => (
                <div key={m.id} className="flex gap-3 border-l-2 border-primary/30 pl-4 py-1">
                    <div className="text-xs font-mono text-muted-foreground shrink-0 w-24">
                        {new Date(m.moveDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                    <div className="text-sm space-y-0.5">
                        {m.fromUnitId !== m.toUnitId && (m.fromUnitId || m.toUnitId) && (
                            <div><span className="text-muted-foreground">Unit:</span> <strong>{unitName(m.fromUnitId)}</strong> → <strong className="text-primary">{unitName(m.toUnitId)}</strong></div>
                        )}
                        {(m.fromSubgroupId || m.toSubgroupId) && m.fromSubgroupId !== m.toSubgroupId && (
                            <div><span className="text-muted-foreground">Group:</span> <strong>{sgName(m.fromSubgroupId)}</strong> → <strong className="text-primary">{sgName(m.toSubgroupId)}</strong></div>
                        )}
                        {(m.fromRole || m.toRole) && m.fromRole !== m.toRole && (
                            <div><span className="text-muted-foreground">Role:</span> <strong>{m.fromRole || "-"}</strong> → <strong className="text-primary">{m.toRole || "-"}</strong></div>
                        )}
                        {(m.fromProgression || m.toProgression) && m.fromProgression !== m.toProgression && (
                            <div><span className="text-muted-foreground">Progression:</span> <strong>{m.fromProgression || "-"}</strong> → <strong className="text-primary">{m.toProgression || "-"}</strong></div>
                        )}
                        {m.notes && <div className="text-xs text-muted-foreground italic">{m.notes}</div>}
                    </div>
                </div>
            ))}
        </div>
    );
}
