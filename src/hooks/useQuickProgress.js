import { useCallback } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../context/ToastContext';
import { progressPatch } from '../lib/entries';

/** "+1 episode" from a card or list row, with a confirmation toast. */
export function useQuickProgress() {
  const { updateEntry } = useLibrary();
  const toast = useToast();
  return useCallback(
    (entry) => {
      const { patch, completed, changed } = progressPatch(entry, 1);
      if (!changed) return;
      updateEntry(entry.id, patch);
      toast(completed ? `🎉 Finished ${entry.title}!` : `${entry.title} · Episode ${patch.progress}`);
    },
    [updateEntry, toast],
  );
}
