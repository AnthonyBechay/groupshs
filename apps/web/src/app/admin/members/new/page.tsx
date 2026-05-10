"use client";

import { useEffect, useState } from "react";
import { MemberForm } from "../member-form";

type Unit = { id: string; name: string; unitType: string };
type Subgroup = { id: string; name: string; unitId: string };

export default function NewMemberPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/admin/units").then(r => r.json()),
            fetch("/api/admin/subgroups").then(r => r.json()),
        ]).then(([u, s]) => {
            setUnits(u);
            setSubgroups(s);
            setLoading(false);
        });
    }, []);

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return <MemberForm initialData={{}} units={units} subgroups={subgroups} />;
}
