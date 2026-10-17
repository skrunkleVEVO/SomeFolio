import { DEFAULT_PREFS, DEFAULT_VIBES } from './constants';
import { normalizeEntry } from './entries';

const STORAGE_KEY = 'somefolio:library:v1';
const LEGACY_KEYS = ['thingsbook:library:v1']; // read once so pre-rebrand data carries over

/**
 * Library shape:
 * {
 *   version: 1,
 *   entries: { [id]: Entry | { id, deleted: true, updatedAt } },   Entry: see lib/entries.js
 *   vibes: string[],          vibesUpdatedAt: number,
 *   prefs: { accent, surface, density, stackFranchises },  prefsUpdatedAt: number,
 * }
 * Deleted entries are kept as tombstones so a removal on one device
 * propagates through cloud sync instead of being resurrected by a merge.
 */
export function emptyLibrary() {
  return { version: 1, entries: {}, vibes: [...DEFAULT_VIBES], vibesUpdatedAt: 0, prefs: { ...DEFAULT_PREFS }, prefsUpdatedAt: 0 };
}

/** Upgrade every entry to the current shape (pre-category entries become anime), dropping unusable ones. */
function normalizeEntries(entries) {
  const out = {};
  for (const raw of Object.values(entries)) {
    const entry = normalizeEntry(raw);
    if (entry) out[entry.id] = entry;
  }
  return out;
}

/** Validate and coerce anything that looks like a library (import, cloud, storage). */
export function normalizeLibrary(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('This file is not a SomeFolio backup.');
  let entries = raw.entries;
  if (Array.isArray(entries)) {
    entries = Object.fromEntries(entries.filter((e) => e && e.id).map((e) => [e.id, e]));
  }
  if (!entries || typeof entries !== 'object') throw new Error('Backup has no entries.');
  return {
    version: 1,
    entries: normalizeEntries(entries),
    vibes: Array.isArray(raw.vibes) ? raw.vibes.filter((v) => typeof v === 'string') : [...DEFAULT_VIBES],
    vibesUpdatedAt: Number(raw.vibesUpdatedAt) || 0,
    prefs: { ...DEFAULT_PREFS, ...(raw.prefs && typeof raw.prefs === 'object' ? raw.prefs : {}) },
    prefsUpdatedAt: Number(raw.prefsUpdatedAt) || 0,
  };
}

export function loadLibrary() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean);
    return raw ? normalizeLibrary(JSON.parse(raw)) : emptyLibrary();
  } catch {
    return emptyLibrary();
  }
}

export function saveLibrary(library) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch (err) {
    console.warn('Could not save library to LocalStorage', err);
  }
}

/** Per-entry last-write-wins merge; vibes and prefs each merge as a whole. */
export function mergeLibraries(local, remote) {
  const entries = { ...local.entries };
  for (const entry of Object.values(normalizeEntries(remote.entries || {}))) {
    const current = entries[entry.id];
    if (!current || (entry.updatedAt || 0) > (current.updatedAt || 0)) entries[entry.id] = entry;
  }
  const remoteVibesNewer = (remote.vibesUpdatedAt || 0) > (local.vibesUpdatedAt || 0);
  const remotePrefsNewer = (remote.prefsUpdatedAt || 0) > (local.prefsUpdatedAt || 0);
  return {
    version: 1,
    entries,
    vibes: remoteVibesNewer ? remote.vibes : local.vibes,
    vibesUpdatedAt: Math.max(local.vibesUpdatedAt || 0, remote.vibesUpdatedAt || 0),
    prefs: remotePrefsNewer ? { ...DEFAULT_PREFS, ...remote.prefs } : local.prefs,
    prefsUpdatedAt: Math.max(local.prefsUpdatedAt || 0, remote.prefsUpdatedAt || 0),
  };
}

/** Cheap fingerprint used to tell whether anything changed since the last sync. */
export function librarySignature(library) {
  let sum = (library.vibesUpdatedAt || 0) + (library.prefsUpdatedAt || 0);
  let count = 0;
  for (const entry of Object.values(library.entries)) {
    sum += entry.updatedAt || 0;
    count += 1;
  }
  return `${count}:${sum}`;
}
