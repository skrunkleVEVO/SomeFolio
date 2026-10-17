import { useCallback } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../context/ToastContext';
import { progressOf } from '../lib/categories';
import { progressPatch } from '../lib/entries';

/** "+1 episode / chapter / hour" from a card or list row, with a confirmation toast. */
export function useQuickProgress() {
  const { updateEntry } = useLibrary();
  const toast = useToast();
  return useCallback(
    (entry) => {
      const { patch, completed, changed, value } = progressPatch(entry, 1);
      if (!changed) return;
      updateEntry(entry.id, patch);
      const { spec } = progressOf(entry);
      const unit = spec.unit[0].toUpperCase() + spec.unit.slice(1);
      toast(completed ? `🎉 Finished ${entry.title}!` : spec.short === 'h' ? `${entry.title} · ${value}h played` : `${entry.title} · ${unit} ${value}`);
    },
    [updateEntry, toast],
  );
}
