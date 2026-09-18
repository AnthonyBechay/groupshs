import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { buildUnitTransitionPreview } from "@/lib/transition-service";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/transitions/preview?unitId=...
 * Dry-run: who in this unit is due to move up this fiscal year, and where to.
 * Read-only — never mutates.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageTransitions")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const unitId = new URL(request.url).searchParams.get("unitId");
        if (!unitId) {
            return NextResponse.json({ error: "unitId is required" }, { status: 400 });
        }
        if (!canAccessUnit(session, unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const preview = await buildUnitTransitionPreview(unitId);
        if (!preview) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

        return NextResponse.json(preview);
    } catch (error) {
        console.error("Error building transition preview:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
