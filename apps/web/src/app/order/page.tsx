import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { OrderForm } from "./order-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Order uniform & badges — Group SHS",
    description: "Order your child's scout uniform items and badges. The unit's leaders confirm every order.",
    robots: { index: false, follow: false },
    // A page's openGraph replaces the layout's whole, so the image is repeated here.
    openGraph: {
        title: "Order uniform & badges — Group SHS",
        description: "Choose your child's unit and what they need. The leaders hand it to them at a meeting.",
        siteName: "Group SHS",
        type: "website",
        images: [{ url: "/og-logo.jpg", width: 600, height: 600, type: "image/jpeg", alt: "Group SHS logo" }],
    },
};

export default function OrderPage() {
    return (
        <div className="min-h-screen bg-muted/20">
            <Navbar />
            <main className="container mx-auto px-4 py-6 sm:py-10 max-w-3xl">
                <OrderForm />
            </main>
        </div>
    );
}
