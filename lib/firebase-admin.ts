import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountJson = process.env.FIREBASE_ADMIN_SDK_JSON;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_ADMIN_SDK_JSON environment variable is not set");
  }

  const serviceAccount = JSON.parse(
    Buffer.from(serviceAccountJson, "base64").toString("utf-8")
  );

  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });

  return adminApp;
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}
