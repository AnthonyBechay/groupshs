"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MemberForm, type MemberFormData } from "../member-form";

type Unit = { id: string; name: string; unitType: string };
type Subgroup = { id: string; name: string; unitId: string };

export default function EditMemberPage() {
    const params = useParams<{ id: string }>();
    const [data, setData] = useState<MemberFormData | null>(null);
    const [units, setUnits] = useState<Unit[]>([]);
    const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!params?.id) return;
        Promise.all([
            fetch(`/api/admin/members/${params.id}`).then(r => {
                if (!r.ok) throw new Error("Failed to load member");
                return r.json();
            }),
            fetch("/api/admin/units").then(r => r.json()),
            fetch("/api/admin/subgroups").then(r => r.json()),
        ])
            .then(([m, u, s]) => {
                setData({
                    ...m,
                    consentSignedAt: m.consentSignedAt ? new Date(m.consentSignedAt).toISOString() : null,
                });
                setUnits(u);
                setSubgroups(s);
                setLoading(false);
            })
            .catch(e => { setError(e.message); setLoading(false); });
    }, [params?.id]);

    if (loading) return <p className="text-muted-foreground">Loading...</p>;
    if (error || !data) return <p className="text-destructive">{error || "Not found"}</p>;

    return <MemberForm initialData={data} units={units} subgroups={subgroups} />;
}
