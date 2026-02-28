import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { createHash } from "crypto";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, and GIF images are allowed." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Content-based hash → deterministic key → deduplication
    const hash = createHash("sha256").update(buffer).digest("hex");
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const key = `menu_items/${hash}.${ext}`;

    // Check if file already exists in R2
    try {
      await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
      // File already exists — return existing URL without re-uploading
      return NextResponse.json({
        url: `${PUBLIC_URL}/${key}`,
        duplicate: true,
      });
    } catch {
      // HeadObject throws NotFound when the object doesn't exist — proceed to upload
    }

    // Upload to R2
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return NextResponse.json(
      { url: `${PUBLIC_URL}/${key}`, duplicate: false },
      { status: 201 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
