import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canSeeInventory, canUseStock, isStorekeeper, seesAllRequests } from "@/lib/stock-access";
import { StockApp } from "./stock-app";

export const dynamic = "force-dynamic";

/**
 * Stock & requests. What each person sees follows their role: the storekeeper
 * runs everything, a unit's quartermaster its own gear, and every leader can
 * request uniforms and badges for the scouts of their unit.
 */
export default async function StockPage() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canUseStock(session)) redirect("/admin");
    return (
        <StockApp
            storekeeper={isStorekeeper(session)}
            inventory={canSeeInventory(session)}
            canRequest={canUseStock(session)}
            seesAll={seesAllRequests(session)}
        />
    );
}
