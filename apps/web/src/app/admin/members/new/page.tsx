"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MemberForm } from "../member-form";

type Unit = { id: string; name: string; unitType: string };
type Subgroup = { id: string; name: string; unitId: string };

export default function NewMemberPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
    const [loading, setLoading] = useState(true);
    // "Add member" on a unit's tab passes that unit along, so it is pre-selected.
    const presetUnitId = useSearchParams().get("unit");

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

    const unitId = presetUnitId && units.some(u => u.id === presetUnitId) ? presetUnitId : undefined;
    return <MemberForm initialData={unitId ? { unitId } : {}} units={units} subgroups={subgroups} />;
}
