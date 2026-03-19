import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || "",
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

const BUCKET = process.env.R2_BUCKET_NAME || "";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export async function uploadToR2(file: Buffer, filename: string, contentType: string, folder: string = "activities"): Promise<string> {
    // Sanitize filename: replace spaces and special chars with underscores
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

    // Public URL is simply PUBLIC_URL/key (no bucket name in path)
    return `${PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(url: string): Promise<void> {
    const prefix = `${PUBLIC_URL}/`;
    if (!url.startsWith(prefix)) return;
    const key = url.slice(prefix.length);

    await r2.send(
        new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: key,
        })
    );
}
