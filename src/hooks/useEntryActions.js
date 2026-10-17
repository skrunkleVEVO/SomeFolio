import { useCallback } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../context/ToastContext';

const UNDO_MS = 5000;

/**
 * Add an entry and confirm with a toast whose Undo removes it again, for
 * accidental taps. `open`, if given, adds an "Open" button for the new entry.
 */
export function useAddEntry() {
  const { addEntry, removeEntry } = useLibrary();
  const toast = useToast();
  return useCallback(
    (draft, { message, open } = {}) => {
      const entry = addEntry(draft);
      const undo = { label: 'Undo', onClick: () => removeEntry(entry.id) };
      toast(message || `Added ${entry.title}`, {
        action: open ? [undo, { label: 'Open', onClick: () => open(entry) }] : undo,
        duration: UNDO_MS,
      });
      return entry;
    },
    [addEntry, removeEntry, toast],
  );
}

/** Remove an entry, with an Undo toast that puts it back as it was. */
export function useRemoveEntry() {
  const { removeEntry, restoreEntry } = useLibrary();
  const toast = useToast();
  return useCallback(
    (entry) => {
      removeEntry(entry.id);
      toast(`Removed ${entry.title}`, { action: { label: 'Undo', onClick: () => restoreEntry(entry) }, duration: UNDO_MS });
    },
    [removeEntry, restoreEntry, toast],
  );
}
