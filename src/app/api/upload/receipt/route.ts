import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const orderId = formData.get("orderId") as string | null;

    if (!file || !orderId) {
      return NextResponse.json(
        { error: "Missing file or orderId" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split("/")[1] ?? "jpg";
    const key = `receipts/${orderId}/receipt.${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: file.type || "image/jpeg",
      }),
    );

    const url = `${process.env.R2_PUBLIC_URL}/${key}`;

    // Update the order server-side — bypasses Firestore client security rules
    // Also promotes status from "awaiting_payment" → "pending" so admin sees it
    await adminDb()
      .collection("orders")
      .doc(orderId)
      .update({
        paymentReceiptUrl: url,
        status: "pending",
        statusHistory: FieldValue.arrayUnion({
          status: "pending",
          timestamp: new Date(),
        }),
      });

    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("R2 receipt upload error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
