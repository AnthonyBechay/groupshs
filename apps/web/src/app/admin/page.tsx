import Link from "next/link";
import { Users, Calendar, FileText } from "lucide-react";

export default function AdminPage() {
    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
            <div className="grid md:grid-cols-3 gap-6">
                <Link href="/admin/activities" className="border rounded-xl p-6 hover:shadow-md transition-all group">
                    <Calendar className="w-8 h-8 text-primary mb-4" />
                    <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">Activities</h2>
                    <p className="text-sm text-muted-foreground">Manage upcoming and past activities</p>
                </Link>
                <Link href="/admin/users" className="border rounded-xl p-6 hover:shadow-md transition-all group">
                    <Users className="w-8 h-8 text-primary mb-4" />
                    <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">Users</h2>
                    <p className="text-sm text-muted-foreground">Manage admin user accounts</p>
                </Link>
                <Link href="/admin/submissions" className="border rounded-xl p-6 hover:shadow-md transition-all group">
                    <FileText className="w-8 h-8 text-primary mb-4" />
                    <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">Submissions</h2>
                    <p className="text-sm text-muted-foreground">View recruitment form submissions</p>
                </Link>
            </div>
        </div>
    );
}
