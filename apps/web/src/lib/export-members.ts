"use client";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SUBGROUP_LABEL_BY_UNIT_TYPE, UNIT_CONTAINER_NAME } from "./scout-config";

type ExportMember = {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string | null;
    phone?: string | null;
    email?: string | null;
    bloodType?: string | null;
    role?: string | null;
    progression?: string | null;
    subgroup?: { name: string } | null;
    city?: string | null;
    fatherName?: string | null;
    fatherPhone?: string | null;
    motherName?: string | null;
    motherPhone?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    doctorName?: string | null;
    doctorPhone?: string | null;
    chronicIllnesses?: string | null;
    joinedAt?: string;
};

type Subgroup = { id: string; name: string };
type Unit = { id: string; name: string; unitType: string };

export function exportMembersToExcel(unit: Unit, members: ExportMember[]) {
    const rows = members.map(m => ({
        "First Name": m.firstName,
        "Last Name": m.lastName,
        "Date of Birth": m.dateOfBirth || "",
        "Role": m.role || "",
        "Progression": m.progression || "",
        "Sub-group": m.subgroup?.name || "",
        "Phone": m.phone || "",
        "Email": m.email || "",
        "Blood Type": m.bloodType || "",
        "City": m.city || "",
        "Father Name": m.fatherName || "",
        "Father Phone": m.fatherPhone || "",
        "Mother Name": m.motherName || "",
        "Mother Phone": m.motherPhone || "",
        "Emergency Contact": m.emergencyContactName || "",
        "Emergency Phone": m.emergencyContactPhone || "",
        "Family Doctor": m.doctorName || "",
        "Doctor Phone": m.doctorPhone || "",
        "Chronic Illnesses": m.chronicIllnesses || "",
        "Joined": m.joinedAt ? new Date(m.joinedAt).toLocaleDateString("en-GB") : "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-size columns
    const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length, 14) }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, unit.name.slice(0, 31));

    const safeName = unit.name.replace(/[^a-z0-9]+/gi, "_");
    XLSX.writeFile(wb, `members_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportMembersToPDF(unit: Unit, subgroups: Subgroup[], members: ExportMember[]) {
    const labels = SUBGROUP_LABEL_BY_UNIT_TYPE[unit.unitType] || SUBGROUP_LABEL_BY_UNIT_TYPE.GROUP;
    const container = UNIT_CONTAINER_NAME[unit.unitType] || "Unit";

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(unit.name, pageWidth / 2, 50, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`${container} • ${members.length} members • ${subgroups.length} ${labels.plural}`, pageWidth / 2, 70, { align: "center" });
    doc.setTextColor(0);

    let y = 100;

    // Group by subgroup
    const bySubgroup = new Map<string | null, ExportMember[]>();
    for (const m of members) {
        const key = m.subgroup?.name || null;
        const existing = bySubgroup.get(key) || [];
        existing.push(m);
        bySubgroup.set(key, existing);
    }

    // Sort: subgroups by name, unassigned last
    const sortedKeys = Array.from(bySubgroup.keys()).sort((a, b) => {
        if (a === null) return 1;
        if (b === null) return -1;
        return a.localeCompare(b);
    });

    for (const key of sortedKeys) {
        const list = bySubgroup.get(key)!;
        const title = key ? `${labels.singular}: ${key}` : "Unassigned";

        // Sort within: lead, assistant, then alphabetical
        const sorted = [...list].sort((a, b) => {
            const score = (r: string | null | undefined) => {
                if (r === labels.lead) return 0;
                if (r === labels.assistant) return 1;
                return 2;
            };
            const s = score(a.role) - score(b.role);
            if (s !== 0) return s;
            return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
        });

        autoTable(doc, {
            startY: y,
            head: [[title, "", "", "", ""]],
            body: [
                ["Name", "Role", "Progression", "DOB", "Phone"],
                ...sorted.map(m => [
                    `${m.firstName} ${m.lastName}`,
                    m.role || "-",
                    m.progression || "-",
                    m.dateOfBirth || "-",
                    m.phone || "-",
                ]),
            ],
            theme: "grid",
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [16, 122, 78], textColor: [255, 255, 255], fontStyle: "bold" },
            didParseCell: (data) => {
                if (data.section === "body" && data.row.index === 0) {
                    data.cell.styles.fillColor = [240, 244, 240];
                    data.cell.styles.fontStyle = "bold";
                }
            },
            margin: { left: 40, right: 40 },
        });

        // @ts-expect-error autoTable adds lastAutoTable to doc
        y = (doc.lastAutoTable?.finalY || y) + 20;
    }

    // Footer
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Generated ${new Date().toLocaleDateString("en-GB")} • Page ${i} of ${pages}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 20,
            { align: "center" }
        );
    }

    const safeName = unit.name.replace(/[^a-z0-9]+/gi, "_");
    doc.save(`members_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
