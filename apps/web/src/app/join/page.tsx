"use client";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function JoinPage() {
    const [parentWereScouts, setParentWereScouts] = useState<string>("");
    const [siblingsInGroup, setSiblingsInGroup] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        const form = e.currentTarget;
        const formData = new FormData(form);

        const data = {
            fullName: formData.get("fullName") as string,
            dateOfBirth: formData.get("dateOfBirth") as string,
            schoolLevel: formData.get("schoolLevel") as string,
            memberPhone: formData.get("memberPhone") as string || null,
            parentWereScouts: parentWereScouts === "yes",
            parentScoutGroup: formData.get("parentScoutGroup") as string || null,
            parentContactInfo: formData.get("parentContactInfo") as string,
            siblingsInGroup: siblingsInGroup === "yes",
            siblingNames: formData.get("siblingNames") as string || null,
            otherComments: formData.get("otherComments") as string || null,
        };

        try {
            const res = await fetch("/api/recruitment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to submit");
            setSubmitted(true);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1 container mx-auto py-12 px-4 max-w-2xl flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-primary/10 p-4 mb-6">
                        <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h1 className="text-3xl font-bold mb-4">Thank You!</h1>
                    <p className="text-muted-foreground text-lg">Your application has been submitted successfully. We will contact you soon with further information about joining our scouts group.</p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto py-12 px-4 max-w-2xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-4">Scouts Recruitment</h1>
                    <h2 className="text-xl font-semibold text-primary mb-4">Group Sagesse High School</h2>
                    <p className="text-muted-foreground mb-4">
                        If you are a boy between 8 and 18 years old, Les Scouts du Liban of Group Sagesse High School - Ain Saade invite you to join their amazing adventures of being a scout!
                    </p>
                    <p className="text-muted-foreground mb-4">
                        Please complete this form in order to contact you for further information concerning meetings.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        For further information, please do not hesitate to contact:<br />
                        <strong>CG Johnny Saad</strong> — 71 297 333
                    </p>
                    <p className="text-sm text-muted-foreground mt-4"><span className="text-destructive">*</span> Indicates required question</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 border p-6 rounded-lg shadow-sm">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name of the Member <span className="text-destructive">*</span></Label>
                        <Input id="fullName" name="fullName" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth <span className="text-destructive">*</span></Label>
                        <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="schoolLevel">School Level (Grade & Section) <span className="text-destructive">*</span></Label>
                        <Input id="schoolLevel" name="schoolLevel" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="memberPhone">Member&apos;s phone number (if available)</Label>
                        <Input id="memberPhone" name="memberPhone" type="tel" />
                    </div>

                    <div className="space-y-3">
                        <Label>Parent/Guardian were Scouts members previously? <span className="text-destructive">*</span></Label>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="parentWereScouts" value="yes" required className="accent-primary" onChange={() => setParentWereScouts("yes")} />
                                Yes
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="parentWereScouts" value="no" className="accent-primary" onChange={() => setParentWereScouts("no")} />
                                No
                            </label>
                        </div>
                    </div>

                    {parentWereScouts === "yes" && (
                        <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                            <Label htmlFor="parentScoutGroup">If yes, please specify in which group:</Label>
                            <Input id="parentScoutGroup" name="parentScoutGroup" />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="parentContactInfo">Name and Phone Number of Parent/Guardian to be contacted <span className="text-destructive">*</span></Label>
                        <Input id="parentContactInfo" name="parentContactInfo" required />
                    </div>

                    <div className="space-y-3">
                        <Label>Any brothers/sisters who are already part of our Scouts Group? <span className="text-destructive">*</span></Label>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="siblingsInGroup" value="yes" required className="accent-primary" onChange={() => setSiblingsInGroup("yes")} />
                                Yes
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="siblingsInGroup" value="no" className="accent-primary" onChange={() => setSiblingsInGroup("no")} />
                                No
                            </label>
                        </div>
                    </div>

                    {siblingsInGroup === "yes" && (
                        <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                            <Label htmlFor="siblingNames">If yes, please specify their names:</Label>
                            <Input id="siblingNames" name="siblingNames" />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="otherComments">Other information/comments:</Label>
                        <textarea
                            id="otherComments"
                            name="otherComments"
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? "Submitting..." : "Submit Application"}
                    </Button>
                </form>
            </main>
        </div>
    );
}
