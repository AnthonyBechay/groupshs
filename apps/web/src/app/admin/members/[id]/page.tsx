"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MemberForm, type MemberFormData } from "../member-form";
import { FamilyLinkPanel } from "../family-link-panel";
import { MemberChangeHistory } from "../member-change-history";

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
    if (error || !data) {
        // Reached by Back after a delete, or by an old link: say so plainly and
        // offer the way out, rather than a bare error string.
        return (
            <div className="text-center py-20 border border-dashed rounded-2xl bg-muted/20">
                <p className="font-semibold mb-1">This member is no longer available</p>
                <p className="text-sm text-muted-foreground mb-4">
                    They may have been deleted, or you may not have access to their unit.
                </p>
                <Link href="/admin/members" className="text-sm text-primary underline underline-offset-4">
                    Back to members
                </Link>
            </div>
        );
    }

    return (
        <>
        <MemberForm
            initialData={data}
            units={units}
            subgroups={subgroups}
            // A former member's family has nothing left to fill in.
            belowHeader={data.id && (data as { status?: string }).status !== "LEFT"
                ? <FamilyLinkPanel memberId={data.id} firstName={data.firstName ?? ""} />
                : null}
        />
        {data.id && <MemberChangeHistory memberId={data.id} />}
        </>
    );
}
