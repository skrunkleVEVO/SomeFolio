// Whether this device has seen the welcome tour. Device-only like search
// history: it isn't library data, so it doesn't sync or export.

const STORAGE_KEY = 'somefolio:tour-seen:v1';

export function hasSeenTour() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTourSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* private mode: the tour may show again next visit */
  }
}
