import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error(
      "FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set. " +
        "Download your service account JSON from Firebase Console → Project Settings → Service Accounts.",
    );
  }

  adminApp = initializeApp({
    credential: cert(JSON.parse(serviceAccount)),
  });
  return adminApp;
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
