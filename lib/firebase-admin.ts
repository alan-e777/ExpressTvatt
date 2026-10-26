import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  let serviceAccount: admin.ServiceAccount;

  // Try env var first (Vercel/production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Fall back to local file (development)
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(
        'firebase-service-account.json not found. ' +
        'Download it from Firebase Console → Project Settings → Service Accounts'
      );
    }

    serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, 'utf8')
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: (serviceAccount as Record<string, any>).project_id,
    // Needed by `admin.database()` — account deletion has to remove the
    // customer's chat thread, and the Admin SDK cannot find the RTDB instance
    // without being told where it lives.
    databaseURL:
      process.env.FIREBASE_DATABASE_URL ??
      'https://amostailor-c759c-default-rtdb.europe-west1.firebasedatabase.app',
  });
}

export const db = admin.firestore();
export const auth = admin.auth();

// Lazy on purpose: every route in the app imports this module, and resolving
// the Realtime Database eagerly would open a connection on each cold start for
// the one route that actually needs it.
export const rtdb = () => admin.database();
export default admin;
