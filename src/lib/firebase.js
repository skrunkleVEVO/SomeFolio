// Firebase Auth + Firestore for cloud sync. Both work on the free Spark plan.
// The SDK is loaded lazily so local-only builds stay small.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const cloudEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let servicesPromise = null;

/** Resolves `{ app, auth, db }`. */
export function getFirebase() {
  if (!cloudEnabled) return Promise.reject(new Error('Firebase is not configured.'));
  servicesPromise ??= (async () => {
    const [
      { initializeApp, getApps, getApp },
      { getAuth },
      { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager },
    ] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    let db;
    try {
      // IndexedDB cache shared by all open tabs: synced docs stay readable offline
      // and queued writes survive a reload. Firestore falls back to an in-memory
      // cache by itself where IndexedDB is unavailable (e.g. some private modes).
      db = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch {
      db = getFirestore(app); // already initialised (e.g. hot reload)
    }
    return { app, auth: getAuth(app), db };
  })().catch((err) => {
    servicesPromise = null; // allow a retry, e.g. after going back online
    throw err;
  });
  return servicesPromise;
}
