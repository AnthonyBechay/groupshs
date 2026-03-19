import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const ENDPOINT = process.env.R2_ENDPOINT || `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const BUCKET = process.env.R2_BUCKET_NAME || "";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

const r2 = new S3Client({
    region: "auto",
    endpoint: ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

export async function uploadToR2(file: Buffer, filename: string, contentType: string, folder: string = "activities"): Promise<string> {
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${folder}/${Date.now()}-${sanitized}`;

    await r2.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: file,
            ContentType: contentType,
        })
    );

    // Endpoint has /groupshs path, so R2 stores at groupshs/{key}
    // Public URL must match: pub-xxx.r2.dev/groupshs/{key}
    return `${PUBLIC_URL}/${BUCKET}/${key}`;
}

export async function deleteFromR2(url: string): Promise<void> {
    const prefix = `${PUBLIC_URL}/${BUCKET}/`;
    if (!url.startsWith(prefix)) return;
    // Extract just the folder/file part (the key we used in PutObject)
    const key = url.slice(prefix.length);

    await r2.send(
        new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: key,
        })
    );
}
