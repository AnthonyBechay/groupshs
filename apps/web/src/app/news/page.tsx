import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const newsItems = [
    {
        id: 1,
        title: "Summer Camp 2025 Registration Open",
        date: "2025-05-15",
        description: "Registration for our annual summer camp is now open! Join us for a week of adventure.",
    },
    {
        id: 2,
        title: "Community Service Day",
        date: "2025-04-22",
        description: "We will be cleaning up the local park this Saturday. All hands on deck!",
    },
    {
        id: 3,
        title: "New Badge System Launched",
        date: "2025-03-10",
        description: "We have updated our progression system with new badges for digital skills and environmental stewardship.",
    },
];

export default function NewsPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto py-12 px-4">
                <h1 className="text-3xl font-bold mb-8">Latest News</h1>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {newsItems.map((item) => (
                        <Card key={item.id}>
                            <CardHeader>
                                <CardTitle>{item.title}</CardTitle>
                                <CardDescription>{item.date}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p>{item.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>
        </div>
    );
}
