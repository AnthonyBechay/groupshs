import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { OrderForm } from "./order-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Order uniform & badges — Group SHS",
    description: "Order your child's scout uniform items and badges. The unit's leaders confirm every order.",
    robots: { index: false, follow: false },
};

export default function OrderPage() {
    return (
        <div className="min-h-screen bg-muted/20">
            <Navbar />
            <main className="container mx-auto px-4 py-10 max-w-3xl">
                <OrderForm />
            </main>
        </div>
    );
}
