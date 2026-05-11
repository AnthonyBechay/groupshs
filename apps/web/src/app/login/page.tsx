"use client";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";
import { Shield } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const submittingRef = useRef(false);

    useEffect(() => {
        // If already logged in, send them to admin
        fetch("/api/auth/me", { credentials: "same-origin" })
            .then(r => r.ok ? r.json() : { user: null })
            .then(d => {
                if (d.user && (d.user.role === "admin" || d.user.role === "super_admin")) {
                    window.location.href = "/admin";
                } else {
                    setChecking(false);
                }
            })
            .catch(() => setChecking(false));
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (submittingRef.current) return;
        submittingRef.current = true;
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
                credentials: "same-origin",
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error || "Invalid credentials");
                setLoading(false);
                submittingRef.current = false;
                return;
            }

            // Hard navigation guarantees the new cookie is picked up by the next request
            window.location.href = "/admin";
        } catch {
            setError("Something went wrong");
            setLoading(false);
            submittingRef.current = false;
        }
    }

    if (checking) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">Checking session...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                            <Shield className="w-7 h-7 text-primary" />
                        </div>
                        <h1 className="text-2xl font-black">Login</h1>
                        <p className="text-sm text-muted-foreground mt-1">Sign in to your scout account</p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-5 bg-card border rounded-2xl p-6 shadow-sm">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
                        </div>
                        {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                        <Button type="submit" size="lg" className="w-full font-bold" disabled={loading}>
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>
                    </form>
                </div>
            </main>
        </div>
    );
}
