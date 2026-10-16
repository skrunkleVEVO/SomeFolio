import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { createEntry } from '../lib/entries';
import { loadLibrary, mergeLibraries, normalizeLibrary, saveLibrary } from '../lib/storage';
import { useCloudSync } from '../hooks/useCloudSync';

const LibraryContext = createContext(null);

function mapEntries(entries, fn) {
  return Object.fromEntries(Object.entries(entries).map(([id, e]) => [id, e.deleted ? e : fn(e)]));
}

function tombstone(id, now) {
  return { id, deleted: true, updatedAt: now };
}

function reducer(state, action) {
  const now = Date.now();
  switch (action.type) {
    case 'add':
      return { ...state, entries: { ...state.entries, [action.entry.id]: action.entry } };

    case 'update': {
      const entry = state.entries[action.id];
      if (!entry || entry.deleted) return state;
      return { ...state, entries: { ...state.entries, [action.id]: { ...entry, ...action.patch, updatedAt: now } } };
    }

    case 'remove':
      return { ...state, entries: { ...state.entries, [action.id]: tombstone(action.id, now) } };

    case 'addVibe': {
      const name = action.name.trim();
      if (!name || state.vibes.some((v) => v.toLowerCase() === name.toLowerCase())) return state;
      return { ...state, vibes: [...state.vibes, name], vibesUpdatedAt: now };
    }

    case 'renameVibe': {
      const { from, to } = action;
      const name = to.trim();
      if (!name || name === from || state.vibes.includes(name)) return state;
      return {
        ...state,
        vibes: state.vibes.map((v) => (v === from ? name : v)),
        vibesUpdatedAt: now,
        entries: mapEntries(state.entries, (e) =>
          e.vibes?.includes(from) ? { ...e, vibes: e.vibes.map((v) => (v === from ? name : v)), updatedAt: now } : e,
        ),
      };
    }

    case 'removeVibe':
      return {
        ...state,
        vibes: state.vibes.filter((v) => v !== action.name),
        vibesUpdatedAt: now,
        entries: mapEntries(state.entries, (e) =>
          e.vibes?.includes(action.name) ? { ...e, vibes: e.vibes.filter((v) => v !== action.name), updatedAt: now } : e,
        ),
      };

    case 'setPrefs':
      return { ...state, prefs: { ...state.prefs, ...action.prefs }, prefsUpdatedAt: now };

    case 'merge':
      return mergeLibraries(state, action.library);

    case 'replace': {
      // Tombstone everything local, then stamp imported entries as newest so
      // the replacement also wins on other synced devices.
      const entries = Object.fromEntries(Object.keys(state.entries).map((id) => [id, tombstone(id, now)]));
      for (const [id, e] of Object.entries(action.library.entries)) entries[id] = { ...e, updatedAt: now };
      return { version: 1, entries, vibes: action.library.vibes, vibesUpdatedAt: now, prefs: action.library.prefs, prefsUpdatedAt: now };
    }

    case 'clear':
      return {
        ...state,
        entries: Object.fromEntries(Object.keys(state.entries).map((id) => [id, tombstone(id, now)])),
      };

    default:
      return state;
  }
}

export function LibraryProvider({ children }) {
  const [library, dispatch] = useReducer(reducer, undefined, loadLibrary);
  const libraryRef = useRef(library);

  useEffect(() => {
    libraryRef.current = library;
    saveLibrary(library);
  }, [library]);

  const cloud = useCloudSync(library, dispatch);

  const entries = useMemo(() => Object.values(library.entries).filter((e) => !e.deleted), [library.entries]);

  const getEntry = useCallback(
    (id) => {
      const entry = library.entries[id];
      return entry && !entry.deleted ? entry : null;
    },
    [library.entries],
  );

  const actions = useMemo(
    () => ({
      addEntry(media, status = 'plan') {
        const entry = createEntry(media, status);
        dispatch({ type: 'add', entry });
        return entry;
      },
      restoreEntry(entry) {
        dispatch({ type: 'add', entry: { ...entry, updatedAt: Date.now() } });
      },
      updateEntry: (id, patch) => dispatch({ type: 'update', id, patch }),
      removeEntry: (id) => dispatch({ type: 'remove', id }),
      addVibe: (name) => dispatch({ type: 'addVibe', name }),
      renameVibe: (from, to) => dispatch({ type: 'renameVibe', from, to }),
      removeVibe: (name) => dispatch({ type: 'removeVibe', name }),
      clearLibrary: () => dispatch({ type: 'clear' }),
      setPrefs: (prefs) => dispatch({ type: 'setPrefs', prefs }),
      importLibrary(raw, mode = 'merge') {
        const imported = normalizeLibrary(raw);
        dispatch({ type: mode === 'replace' ? 'replace' : 'merge', library: imported });
        return Object.values(imported.entries).filter((e) => !e.deleted).length;
      },
      exportLibrary() {
        const { entries: all, ...rest } = libraryRef.current;
        const live = Object.fromEntries(Object.entries(all).filter(([, e]) => !e.deleted));
        return { ...rest, entries: live, exportedAt: new Date().toISOString(), app: 'somefolio' };
      },
    }),
    [],
  );

  const value = useMemo(
    () => ({ entries, vibes: library.vibes, prefs: library.prefs, getEntry, cloud, ...actions }),
    [entries, library.vibes, library.prefs, getEntry, cloud, actions],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
