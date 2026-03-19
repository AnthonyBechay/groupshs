import { prisma } from "@/db";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage() {
    const submissions = await prisma.recruitmentSubmission.findMany({
        orderBy: { createdAt: "desc" },
    });

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Recruitment Submissions</h1>

            {submissions.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">No submissions yet</p>
            ) : (
                <div className="space-y-4">
                    {submissions.map((s) => (
                        <div key={s.id} className="border rounded-lg p-6 bg-card">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-lg font-bold">{s.fullName}</h2>
                                <span className="text-xs text-muted-foreground">
                                    {new Date(s.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="grid md:grid-cols-2 gap-3 text-sm">
                                <div><strong>Date of Birth:</strong> {s.dateOfBirth}</div>
                                <div><strong>School Level:</strong> {s.schoolLevel}</div>
                                <div><strong>Member Phone:</strong> {s.memberPhone || "—"}</div>
                                <div><strong>Parent Contact:</strong> {s.parentContactInfo}</div>
                                <div><strong>Parent were Scouts:</strong> {s.parentWereScouts ? "Yes" : "No"}{s.parentScoutGroup ? ` (${s.parentScoutGroup})` : ""}</div>
                                <div><strong>Siblings in Group:</strong> {s.siblingsInGroup ? "Yes" : "No"}{s.siblingNames ? ` (${s.siblingNames})` : ""}</div>
                                {s.otherComments && (
                                    <div className="md:col-span-2"><strong>Comments:</strong> {s.otherComments}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
