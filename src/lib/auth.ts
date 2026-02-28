import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const googleProvider = new GoogleAuthProvider();

// ─── Customer Auth ────────────────────────────────────────────────

export async function registerCustomer(
  name: string,
  email: string,
  phone: string,
  password: string,
) {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = credential.user;

  await updateProfile(user, { displayName: name });

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name,
    email,
    phone,
    createdAt: serverTimestamp(),
    savedAddresses: [],
  });

  return user;
}

export async function loginCustomer(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function loginWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  const user = credential.user;

  // Create user doc if it doesn't exist yet
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName ?? "",
      email: user.email ?? "",
      phone: user.phoneNumber ?? "",
      createdAt: serverTimestamp(),
      savedAddresses: [],
    });
  }

  return user;
}

// ─── Admin Auth ───────────────────────────────────────────────────

export async function loginAdmin(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Verify this user is in the admins collection
  const adminDoc = await getDoc(doc(db, "admins", user.uid));
  if (!adminDoc.exists()) {
    await auth.signOut();
    throw new Error("Access denied. You are not authorized as staff.");
  }

  return { user, role: adminDoc.data().role };
}

// ─── Password Reset ───────────────────────────────────────────────

export async function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}
