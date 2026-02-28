import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth().createUser({
      email,
      password,
      displayName: name,
    });

    // Add to admins collection
    await adminDb()
      .collection("admins")
      .doc(userRecord.uid)
      .set({
        uid: userRecord.uid,
        name,
        email,
        phone: phone ?? "",
        role,
        active: true,
        createdAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ uid: userRecord.uid }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { uid, ...updates } = await req.json();
    if (!uid)
      return NextResponse.json({ error: "Missing uid." }, { status: 400 });

    await adminDb()
      .collection("admins")
      .doc(uid)
      .update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
