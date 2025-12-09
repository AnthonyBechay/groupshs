import { Navbar } from "@/components/navbar";

export default function AboutPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto py-12 px-4">
                <h1 className="text-3xl font-bold mb-6">About Us</h1>
                <div className="prose max-w-none">
                    <p className="text-lg text-muted-foreground mb-4">
                        Scout du Liban - Sagesse High School (Ain Saade) is dedicated to fostering the physical, mental, and spiritual development of young people.
                    </p>
                    <p className="text-lg text-muted-foreground">
                        Our mission is to contribute to the education of young people, through a value system based on the Scout Promise and Law, to help build a better world where people are self-fulfilled as individuals and play a constructive role in society.
                    </p>
                </div>
            </main>
        </div>
    );
}
