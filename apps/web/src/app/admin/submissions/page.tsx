import { redirect } from "next/navigation";

// Recruitment moved to /admin/recruitment and sits under "Group" in the nav.
// Kept so existing bookmarks keep working.
export default function SubmissionsRedirect() {
    redirect("/admin/recruitment");
}
