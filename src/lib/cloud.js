// Cloud sync on Firestore.
//
// Layout (see firebase/firestore.rules):
//   users/{uid}/entries/{entryId}  one doc per title (or tombstone) + server `syncedAt`
//   users/{uid}/meta/library       { vibes, vibesUpdatedAt, prefs, prefsUpdatedAt }
//
// One doc per title keeps every doc far below Firestore's 1 MiB limit. Pulls only
// fetch docs changed since the last cursor, so a sync usually costs a few reads.

import { cloudEnabled, getFirebase } from './firebase';

export { cloudEnabled };

const BATCH_LIMIT = 450; // Firestore allows 500 writes per batch
const CURSOR_MARGIN_MS = 5000; // re-read a few seconds of overlap; merging is idempotent

const fsModule = () => import('firebase/firestore');
const authModule = () => import('firebase/auth');

/* ---------- auth (email + password) ---------- */

/** Subscribe to sign-in changes. Resolves with an unsubscribe function. */
export async function onAuthChange(callback) {
  const [{ auth }, { onAuthStateChanged }] = await Promise.all([getFirebase(), authModule()]);
  return onAuthStateChanged(auth, callback);
}

export async function signIn(email, password) {
  const [{ auth }, { signInWithEmailAndPassword }] = await Promise.all([getFirebase(), authModule()]);
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email, password) {
  const [{ auth }, { createUserWithEmailAndPassword }] = await Promise.all([getFirebase(), authModule()]);
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function resetPassword(email) {
  const [{ auth }, { sendPasswordResetEmail }] = await Promise.all([getFirebase(), authModule()]);
  await sendPasswordResetEmail(auth, email);
}

export async function signOut() {
  const [{ auth }, { signOut: fbSignOut }] = await Promise.all([getFirebase(), authModule()]);
  await fbSignOut(auth);
}

export function authErrorMessage(err) {
  switch (err?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/email-already-in-use':
      return 'That email already has an account — sign in instead.';
    case 'auth/weak-password':
      return 'Use at least 6 characters for your password.';
    case 'auth/invalid-email':
      return 'That email address looks wrong.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.';
    case 'auth/network-request-failed':
      return 'No connection. Check your internet and try again.';
    case 'auth/operation-not-allowed':
      return 'Enable Email/Password sign-in in the Firebase console.';
    case 'permission-denied':
      return 'Firestore rules blocked sync. Publish firebase/firestore.rules.';
    default:
      return err?.message || 'Something went wrong.';
  }
}

/* ---------- data ---------- */

export async function pullMeta(uid) {
  const [{ db }, fs] = await Promise.all([getFirebase(), fsModule()]);
  const snap = await fs.getDoc(fs.doc(db, 'users', uid, 'meta', 'library'));
  return snap.exists() ? snap.data() : null;
}

export async function pushMeta(uid, meta) {
  const [{ db }, fs] = await Promise.all([getFirebase(), fsModule()]);
  await fs.setDoc(fs.doc(db, 'users', uid, 'meta', 'library'), { ...meta, syncedAt: fs.serverTimestamp() });
}

/** Entries changed on the server since `since` (ms). Returns `{ entries, cursor }`. */
export async function pullEntries(uid, since = 0) {
  const [{ db }, fs] = await Promise.all([getFirebase(), fsModule()]);
  const col = fs.collection(db, 'users', uid, 'entries');
  const q = since
    ? fs.query(col, fs.where('syncedAt', '>', fs.Timestamp.fromMillis(Math.max(0, since - CURSOR_MARGIN_MS))))
    : col;
  const snap = await fs.getDocs(q);
  let cursor = since;
  const entries = snap.docs.map((d) => {
    const { syncedAt, ...entry } = d.data();
    if (syncedAt) cursor = Math.max(cursor, syncedAt.toMillis());
    return entry;
  });
  return { entries, cursor };
}

export async function pushEntries(uid, entries) {
  const [{ db }, fs] = await Promise.all([getFirebase(), fsModule()]);
  for (let i = 0; i < entries.length; i += BATCH_LIMIT) {
    const batch = fs.writeBatch(db);
    for (const entry of entries.slice(i, i + BATCH_LIMIT)) {
      batch.set(fs.doc(db, 'users', uid, 'entries', encodeURIComponent(entry.id)), {
        ...entry,
        syncedAt: fs.serverTimestamp(),
      });
    }
    await batch.commit();
  }
}
