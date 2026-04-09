"use client";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Compass, CheckCircle2, Phone } from "lucide-react";

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
            parentName: formData.get("parentName") as string,
            parentPhone: formData.get("parentPhone") as string,
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
                <main className="flex-1 container mx-auto py-20 px-4 max-w-2xl flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-primary/10 p-5 mb-6">
                        <CheckCircle2 className="w-14 h-14 text-primary" />
                    </div>
                    <h1 className="text-4xl font-black mb-4">Thank You!</h1>
                    <p className="text-muted-foreground text-lg max-w-md">Your application has been submitted successfully. We will contact you soon with further information about joining our scouts group.</p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
                {/* Header */}
                <section className="bg-gradient-to-br from-primary via-primary to-emerald-800 text-white py-16 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-scout-gold/30 blur-3xl" />
                    </div>
                    <div className="container mx-auto px-4 relative z-10 text-center">
                        <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-xl mb-6">
                            <Compass className="w-4 h-4 mr-2 text-scout-gold" />
                            <span className="text-white/90">Recruitment Form</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Join Our Group</h1>
                        <p className="text-white/80 max-w-lg mx-auto">
                            If you are a boy between 8 and 18 years old, Les Scouts du Liban of Group Sagesse High School &mdash; Ain Saade invite you to join their amazing adventures!
                        </p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0">
                        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                            <path d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,38 1440,30 L1440,60 L0,60 Z" className="fill-background" />
                        </svg>
                    </div>
                </section>

                {/* Contact info */}
                <div className="container mx-auto px-4 max-w-2xl mt-8 mb-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <Phone className="w-5 h-5 text-primary shrink-0" />
                        <p className="text-sm text-muted-foreground">
                            For further information: <strong className="text-foreground">CG Johnny Saad</strong> &mdash; 71 297 333
                        </p>
                    </div>
                </div>

                {/* Form */}
                <div className="container mx-auto px-4 max-w-2xl pb-20">
                    <p className="text-sm text-muted-foreground mb-6"><span className="text-destructive">*</span> Indicates required question</p>

                    <form onSubmit={handleSubmit} className="space-y-6 bg-card border rounded-2xl p-6 md:p-8 shadow-sm">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name of the Member <span className="text-destructive">*</span></Label>
                            <Input id="fullName" name="fullName" required className="h-11" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dateOfBirth">Date of Birth <span className="text-destructive">*</span></Label>
                            <Input id="dateOfBirth" name="dateOfBirth" type="date" required className="h-11" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="schoolLevel">School Level (Grade & Section) <span className="text-destructive">*</span></Label>
                            <Input id="schoolLevel" name="schoolLevel" required className="h-11" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="memberPhone">Member&apos;s phone number (if available)</Label>
                            <Input id="memberPhone" name="memberPhone" type="tel" className="h-11" />
                        </div>

                        <div className="space-y-3">
                            <Label>Parent/Guardian were Scouts members previously? <span className="text-destructive">*</span></Label>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="parentWereScouts" value="yes" required className="w-4 h-4 accent-primary" onChange={() => setParentWereScouts("yes")} />
                                    <span className="text-sm">Yes</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="parentWereScouts" value="no" className="w-4 h-4 accent-primary" onChange={() => setParentWereScouts("no")} />
                                    <span className="text-sm">No</span>
                                </label>
                            </div>
                        </div>

                        {parentWereScouts === "yes" && (
                            <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                                <Label htmlFor="parentScoutGroup">If yes, please specify in which group:</Label>
                                <Input id="parentScoutGroup" name="parentScoutGroup" className="h-11" />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="parentName">Name of Parent/Guardian <span className="text-destructive">*</span></Label>
                            <Input id="parentName" name="parentName" required className="h-11" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="parentPhone">Phone Number of Parent/Guardian <span className="text-destructive">*</span></Label>
                            <Input id="parentPhone" name="parentPhone" type="tel" required className="h-11" />
                        </div>

                        <div className="space-y-3">
                            <Label>Any brothers/sisters already in our Scouts Group? <span className="text-destructive">*</span></Label>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="siblingsInGroup" value="yes" required className="w-4 h-4 accent-primary" onChange={() => setSiblingsInGroup("yes")} />
                                    <span className="text-sm">Yes</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="siblingsInGroup" value="no" className="w-4 h-4 accent-primary" onChange={() => setSiblingsInGroup("no")} />
                                    <span className="text-sm">No</span>
                                </label>
                            </div>
                        </div>

                        {siblingsInGroup === "yes" && (
                            <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                                <Label htmlFor="siblingNames">If yes, please specify their names:</Label>
                                <Input id="siblingNames" name="siblingNames" className="h-11" />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="otherComments">Other information/comments:</Label>
                            <textarea
                                id="otherComments"
                                name="otherComments"
                                className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        {error && <p className="text-sm text-destructive font-medium">{error}</p>}

                        <Button type="submit" size="lg" className="w-full font-bold" disabled={submitting}>
                            {submitting ? "Submitting..." : "Submit Application"}
                        </Button>
                    </form>
                </div>
            </main>
        </div>
    );
}
