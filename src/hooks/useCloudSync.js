import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  authErrorMessage,
  cloudEnabled,
  onAuthChange,
  pullEntries,
  pullMeta,
  pushEntries,
  pushMeta,
  resetPassword,
  signIn,
  signOut as cloudSignOut,
  signUp,
} from '../lib/cloud';
import { librarySignature, mergeLibraries } from '../lib/storage';

const PUSH_DEBOUNCE_MS = 1500;
const syncKey = (uid) => `somefolio:sync:${uid}`;

/**
 * Per-account sync bookkeeping kept on this device:
 * - cursor: server time of the newest entry doc pulled so far
 * - known:  { [entryId]: updatedAt } versions known to be on the server, so only
 *           genuinely changed entries are written (no reliance on device clocks)
 */
function loadSyncState(uid) {
  try {
    return { cursor: 0, known: {}, ...JSON.parse(localStorage.getItem(syncKey(uid)) || '{}') };
  } catch {
    return { cursor: 0, known: {} };
  }
}

function saveSyncState(uid, state) {
  try {
    localStorage.setItem(syncKey(uid), JSON.stringify(state));
  } catch {
    /* storage full — the next sync just does a little more work */
  }
}

/**
 * Keeps the local library in sync with Firestore: pull → merge → push on sign-in,
 * shortly after every local change, and whenever the app returns to the foreground.
 */
export function useCloudSync(library, dispatch) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | syncing | synced | error
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  const libraryRef = useRef(library);
  const syncedSig = useRef(null);
  const inFlight = useRef(false);
  const pending = useRef(false);
  const syncRef = useRef(null);

  useEffect(() => {
    libraryRef.current = library;
  });

  useEffect(() => {
    if (!cloudEnabled) return;
    let alive = true;
    let unsubscribe = null;
    onAuthChange((u) => alive && setUser(u ? { uid: u.uid, email: u.email } : null))
      .then((fn) => (alive ? (unsubscribe = fn) : fn()))
      .catch((err) => setError(authErrorMessage(err)));
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  const uid = user?.uid;

  const syncNow = useCallback(async () => {
    if (!uid) return;
    if (inFlight.current) {
      pending.current = true;
      return;
    }
    inFlight.current = true;
    setStatus('syncing');
    setError(null);
    try {
      const snapshot = libraryRef.current;
      const state = loadSyncState(uid);
      const known = { ...state.known };
      const [meta, pulled] = await Promise.all([pullMeta(uid), pullEntries(uid, state.cursor)]);

      const remote = {
        version: 1,
        entries: {},
        vibes: meta?.vibes ?? snapshot.vibes,
        vibesUpdatedAt: meta?.vibesUpdatedAt ?? 0,
        prefs: meta?.prefs ?? snapshot.prefs,
        prefsUpdatedAt: meta?.prefsUpdatedAt ?? 0,
      };
      for (const entry of pulled.entries) {
        remote.entries[entry.id] = entry;
        known[entry.id] = entry.updatedAt;
      }

      const merged = mergeLibraries(snapshot, remote);
      const dirty = Object.values(merged.entries).filter((e) => known[e.id] !== e.updatedAt);
      if (dirty.length) {
        await pushEntries(uid, dirty);
        for (const e of dirty) known[e.id] = e.updatedAt;
      }
      if (
        !meta ||
        merged.vibesUpdatedAt > (meta.vibesUpdatedAt || 0) ||
        merged.prefsUpdatedAt > (meta.prefsUpdatedAt || 0)
      ) {
        const { vibes, vibesUpdatedAt, prefs, prefsUpdatedAt } = merged;
        await pushMeta(uid, { vibes, vibesUpdatedAt, prefs, prefsUpdatedAt });
      }

      saveSyncState(uid, { cursor: pulled.cursor, known });
      syncedSig.current = librarySignature(merged);
      if (meta || pulled.entries.length) dispatch({ type: 'merge', library: remote });
      setLastSynced(new Date());
      setStatus('synced');
    } catch (err) {
      setError(authErrorMessage(err));
      setStatus('error');
    } finally {
      inFlight.current = false;
      if (pending.current) {
        pending.current = false;
        setTimeout(() => syncRef.current?.(), 0);
      }
    }
  }, [uid, dispatch]);

  useEffect(() => {
    syncRef.current = syncNow;
  }, [syncNow]);

  // Initial sync after signing in.
  useEffect(() => {
    if (uid) syncNow();
  }, [uid, syncNow]);

  // Push local edits shortly after they happen.
  const signature = useMemo(() => librarySignature(library), [library]);
  useEffect(() => {
    if (!uid || signature === syncedSig.current) return;
    const timer = setTimeout(() => {
      if (librarySignature(libraryRef.current) !== syncedSig.current) syncNow();
    }, PUSH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [signature, uid, syncNow]);

  // Pick up changes from other devices when the app is reopened.
  useEffect(() => {
    if (!uid) return;
    const onWake = () => document.visibilityState === 'visible' && syncNow();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
    };
  }, [uid, syncNow]);

  const signOut = useCallback(async () => {
    await cloudSignOut();
    setStatus('idle');
    setLastSynced(null);
    syncedSig.current = null;
  }, []);

  return useMemo(
    () => ({ enabled: cloudEnabled, user, status, error, lastSynced, syncNow, signIn, signUp, resetPassword, signOut }),
    [user, status, error, lastSynced, syncNow, signOut],
  );
}
