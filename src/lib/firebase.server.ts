import { getApps, initializeApp, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getFirebaseAdminApp() {
  if (typeof window !== "undefined") return null;

  if (getApps().length > 0) {
    return getApp();
  }

  const env = process.env;
  let credentialData: any = null;

  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      credentialData = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error("Erro ao fazer parse de FIREBASE_SERVICE_ACCOUNT_JSON:", e);
    }
  } else if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    credentialData = {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  if (!credentialData) {
    return null;
  }

  try {
    return initializeApp({
      credential: cert(credentialData),
    });
  } catch (error) {
    console.error("Erro ao inicializar Firebase Admin App:", error);
    return null;
  }
}

const app = getFirebaseAdminApp();
export const db = app ? getFirestore(app) : null;
