// Recent search queries, newest first, kept in LocalStorage on this device only
// (they aren't part of the library, so they don't sync or export).

const STORAGE_KEY = 'somefolio:search-history:v1';
const MAX_ITEMS = 8;

const listeners = new Set();
let items = read();

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(raw) ? raw.filter((q) => typeof q === 'string' && q.trim()).slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

function write(next) {
  items = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode or full storage: history still works for this session */
  }
  listeners.forEach((fn) => fn());
}

// Keep other open tabs in step.
function onStorage(e) {
  if (e.key !== STORAGE_KEY && e.key !== null) return;
  items = read();
  listeners.forEach((fn) => fn());
}

export function subscribe(listener) {
  if (!listeners.size) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener('storage', onStorage);
  };
}

export const getHistory = () => items;

/** Move `query` to the top, dropping case-insensitive duplicates. */
export function addSearch(query) {
  const q = query.trim().replace(/\s+/g, ' ');
  if (q.length < 2) return;
  const lower = q.toLowerCase();
  write([q, ...items.filter((x) => x.toLowerCase() !== lower)].slice(0, MAX_ITEMS));
}

export function removeSearch(query) {
  write(items.filter((x) => x !== query));
}

export function clearHistory() {
  write([]);
}
