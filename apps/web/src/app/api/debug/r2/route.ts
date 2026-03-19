import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountId = process.env.R2_ACCOUNT_ID || "(not set)";
    const endpoint = process.env.R2_ENDPOINT || `(derived from account_id: https://${accountId}.r2.cloudflarestorage.com)`;
    const bucket = process.env.R2_BUCKET_NAME || "(not set)";
    const publicUrl = process.env.R2_PUBLIC_URL || "(not set)";
    const hasAccessKey = !!process.env.R2_ACCESS_KEY_ID;
    const hasSecretKey = !!process.env.R2_SECRET_ACCESS_KEY;

    return NextResponse.json({
        r2_account_id: accountId,
        r2_endpoint: endpoint,
        r2_bucket: bucket,
        r2_public_url: publicUrl,
        has_access_key: hasAccessKey,
        has_secret_key: hasSecretKey,
    });
}
