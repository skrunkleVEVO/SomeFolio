import { CATEGORY_BY_ID, DEFAULT_CATEGORY, progressOf } from './categories';
import { STATUS_BY_ID } from './constants';

/**
 * Entry shape:
 * {
 *   id, title, category, status, rating (0–10), coverUrl, notes, updatedAt,   core, every category
 *   addedAt, favorite, vibes: string[], franchise,                            your own organisation
 *   metadata: { … }                                                           everything else
 * }
 * `metadata` holds category details (episodes, chapters, platform, hoursPlayed,
 * customTags, …; see lib/categories.js) plus whatever a search source provides
 * (altTitle, synopsis, genres, studio, banner, color, url, …). Unknown keys are
 * kept, so data written by a newer version survives a round trip through an older one.
 */

const isText = (v) => typeof v === 'string';

/** Firestore rejects `undefined` values; drop them (use `null` to clear a field). */
function cleanMeta(meta) {
  const out = {};
  for (const [key, value] of Object.entries(meta || {})) if (value !== undefined && typeof value !== 'function') out[key] = value;
  return out;
}

/**
 * Coerce anything that looks like an entry (LocalStorage, Firestore, a backup
 * file) into the current shape. Entries saved before categories existed are
 * anime with flat fields (`cover`, `episodes`, `progress`, …): those fields
 * move into `metadata`. Idempotent, and returns null for unusable input.
 */
export function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id) return null;
  if (raw.deleted) return { id: String(raw.id), deleted: true, updatedAt: Number(raw.updatedAt) || 0 };

  const {
    id, title, category, status, rating, coverUrl, cover, notes, updatedAt, addedAt, favorite, vibes, franchise,
    metadata, deleted: _deleted, syncedAt: _syncedAt, ...legacy
  } = raw;
  const coverSrc = coverUrl ?? cover;

  return {
    id: String(id),
    title: isText(title) && title.trim() ? title : 'Untitled',
    category: CATEGORY_BY_ID[category] ? category : category ? 'custom' : DEFAULT_CATEGORY,
    status: STATUS_BY_ID[status] ? status : 'plan',
    rating: Math.max(0, Math.min(10, Number(rating) || 0)),
    coverUrl: isText(coverSrc) ? coverSrc : '',
    notes: isText(notes) ? notes : '',
    updatedAt: Number(updatedAt) || 0,
    addedAt: Number(addedAt) || Number(updatedAt) || 0,
    favorite: Boolean(favorite),
    vibes: Array.isArray(vibes) ? vibes.filter(isText) : [],
    franchise: isText(franchise) ? franchise : null, // null = auto-detect, '' = never group (see lib/franchises.js)
    metadata: cleanMeta({ ...legacy, ...(metadata && typeof metadata === 'object' ? metadata : {}) }),
  };
}

/** Apply an update; `patch.metadata` merges into the existing metadata instead of replacing it. */
export function applyPatch(entry, patch, now = Date.now()) {
  return {
    ...entry,
    ...patch,
    metadata: patch.metadata ? cleanMeta({ ...entry.metadata, ...patch.metadata }) : entry.metadata,
    updatedAt: now,
  };
}

function newId() {
  const rand = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `c-${rand}`;
}

/** Patch for changing status. Completing something with a known length fills its progress. */
export function statusPatch(entry, status) {
  const patch = { status };
  const p = progressOf(entry);
  if (status === 'completed' && p?.total) patch.metadata = { [p.spec.key]: p.total };
  return patch;
}

/** Build a new library entry from a draft (the Add modal) — only `title` is required. */
export function createEntry({ id, title, category = DEFAULT_CATEGORY, status = 'plan', rating = 0, coverUrl = '', notes = '', metadata = {} }) {
  const now = Date.now();
  const entry = normalizeEntry({
    id: id || newId(),
    title: title?.trim(),
    category,
    status,
    rating,
    coverUrl: coverUrl?.trim() || '',
    notes,
    metadata,
    addedAt: now,
    updatedAt: now,
  });
  return applyPatch(entry, statusPatch(entry, entry.status), now);
}

/** Entry for a search result (lib/search.js shape). Also used to preview a result before adding it. */
export function entryFromMedia(media, status = 'plan') {
  const { id, title, cover, category, ...details } = media;
  return createEntry({ id, title, category: category || 'anime', status, coverUrl: cover, metadata: { ...details, progress: 0 } });
}

/**
 * Patch for changing the entry's progress counter (episodes, chapters, hours).
 * Starting something moves it to In Progress; reaching its length marks it Completed.
 */
export function progressPatch(entry, delta) {
  const p = progressOf(entry);
  if (!p) return { patch: {}, completed: false, changed: false, value: 0 };
  const value = Math.max(0, Math.min(p.total || Infinity, p.value + delta));
  const patch = { metadata: { [p.spec.key]: value } };
  let completed = false;
  if (delta > 0 && ['plan', 'hold', 'backlog'].includes(entry.status)) patch.status = 'watching';
  if (delta > 0 && p.total && value >= p.total && entry.status !== 'completed') {
    patch.status = 'completed';
    completed = true;
  }
  return { patch, completed, changed: value !== p.value, value };
}
