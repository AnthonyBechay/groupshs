import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isStorekeeper } from "@/lib/stock-access";
import { StorageSettings } from "./storage-settings";

export const dynamic = "force-dynamic";

export default async function StoragePage() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!isStorekeeper(session)) redirect("/admin/stock");
    return <StorageSettings />;
}
