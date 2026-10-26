import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { findFamilyRequest } from "@/lib/member-update-service";
import { FamilyForm } from "./family-form";
import { Clock, CheckCircle2, LinkIcon } from "lucide-react";

export const dynamic = "force-dynamic";

// A private link: keep it out of search engines and link previews.
export const metadata: Metadata = {
    title: "Update your scout's file — Group SHS",
    robots: { index: false, follow: false },
};

const MESSAGES: Record<string, { icon: typeof Clock; title: string; body: string }> = {
    EXPIRED: { icon: Clock, title: "This link has expired", body: "Ask your child's leader for a new one." },
    SUBMITTED: { icon: CheckCircle2, title: "Thank you — we received your answers", body: "A leader will check them and update the file. You can close this page." },
    APPROVED: { icon: CheckCircle2, title: "Your answers were received and applied", body: "Thank you. If something changes, ask the leader for a new link." },
    REJECTED: { icon: LinkIcon, title: "This link has already been used", body: "If you need to change something, ask your child's leader for a new link." },
    REVOKED: { icon: LinkIcon, title: "This link was replaced", body: "A newer link was sent for this scout. Please use that one, or ask the leader." },
    INVALID: { icon: LinkIcon, title: "This link is not valid", body: "Check that you copied the whole link, or ask your child's leader for a new one." },
};

/**
 * What a family opens from the leader's message. Before the date of birth is
 * confirmed only the child's first name and unit are shown, so they know the
 * link is for the right child; the file itself is loaded after that check.
 */
export default async function FamilyUpdatePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const found = await findFamilyRequest(token);
    const msg = found.state !== "OPEN" ? MESSAGES[found.state] ?? MESSAGES.INVALID : null;

    return (
        <div className="min-h-screen bg-muted/20">
            <Navbar />
            <main className="container mx-auto px-4 py-10 max-w-2xl">
                {msg || !found.request ? (
                    <div className="text-center py-16">
                        {(() => { const Icon = (msg ?? MESSAGES.INVALID).icon; return <Icon className="w-12 h-12 text-primary/40 mx-auto mb-4" />; })()}
                        <h1 className="text-2xl font-bold">{(msg ?? MESSAGES.INVALID).title}</h1>
                        <p className="text-muted-foreground mt-2">{(msg ?? MESSAGES.INVALID).body}</p>
                    </div>
                ) : (
                    <FamilyForm
                        token={token}
                        firstName={found.request.member.firstName}
                        unitName={found.request.member.unit.name}
                        needsDob={!!found.request.member.dateOfBirth}
                        expiresAt={found.request.expiresAt.toISOString()}
                    />
                )}
            </main>
        </div>
    );
}
