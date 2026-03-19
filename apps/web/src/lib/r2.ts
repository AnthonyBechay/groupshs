import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const RAW_ENDPOINT = process.env.R2_ENDPOINT || `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const BUCKET = process.env.R2_BUCKET_NAME || "";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

// Strip any trailing path from the endpoint (e.g. /groupshs) - S3 endpoints should be just the host
const ENDPOINT = RAW_ENDPOINT.replace(/\/[^/]+$/, "").replace(/\/$/, "") || RAW_ENDPOINT;

// Check if the raw endpoint had a path prefix (e.g. /groupshs) - if so, include it in keys
const endpointUrl = (() => { try { return new URL(RAW_ENDPOINT); } catch { return null; } })();
const PATH_PREFIX = endpointUrl?.pathname && endpointUrl.pathname !== "/"
    ? endpointUrl.pathname.replace(/^\//, "").replace(/\/$/, "")
    : "";

const r2 = new S3Client({
    region: "auto",
    endpoint: ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

export async function uploadToR2(file: Buffer, filename: string, contentType: string, folder: string = "activities"): Promise<string> {
    // Sanitize filename: replace spaces and special chars with underscores
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${folder}/${Date.now()}-${sanitized}`;

    try {
        await r2.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: file,
                ContentType: contentType,
            })
        );
    } catch (error) {
        console.error("R2 upload failed:", { key, endpoint: ENDPOINT, bucket: BUCKET, error });
        throw error;
    }

    // The actual key in R2 may have a prefix if the endpoint had a path
    // e.g. endpoint .../groupshs means objects are stored at groupshs/{key}
    const publicKey = PATH_PREFIX ? `${PATH_PREFIX}/${key}` : key;
    const url = `${PUBLIC_URL}/${publicKey}`;
    console.log("R2 upload success:", { key, publicKey, url, pathPrefix: PATH_PREFIX });
    return url;
}

export async function deleteFromR2(url: string): Promise<void> {
    const prefix = `${PUBLIC_URL}/`;
    if (!url.startsWith(prefix)) return;
    const fullKey = url.slice(prefix.length);

    // If path prefix exists, the S3 key is without the prefix (R2 adds it via endpoint path)
    const key = PATH_PREFIX && fullKey.startsWith(`${PATH_PREFIX}/`)
        ? fullKey.slice(PATH_PREFIX.length + 1)
        : fullKey;

    try {
        await r2.send(
            new DeleteObjectCommand({
                Bucket: BUCKET,
                Key: key,
            })
        );
        console.log("R2 delete success:", { key });
    } catch (error) {
        console.error("R2 delete failed:", { key, error });
        throw error;
    }
}
