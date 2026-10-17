import { Heart, Plus, Star } from 'lucide-react';
import CoverArt from './ui/CoverArt';
import EntryBadge, { ProgressBar } from './EntryBadge';
import { useQuickProgress } from '../hooks/useQuickProgress';
import { getCategory, statusLabel } from '../lib/categories';
import { STATUS_BY_ID } from '../lib/constants';

/** `showCategory` adds the category icon to the status badge (used in the All view). */
export default function MediaCard({ entry, onOpen, compact = false, showCategory = false }) {
  const addOne = useQuickProgress();
  const status = STATUS_BY_ID[entry.status];
  const category = getCategory(entry.category);
  const CategoryIcon = category.icon;
  const canStep = entry.status === 'watching' && category.progress;

  const plusOne = (e) => {
    e.stopPropagation();
    addOne(entry);
  };

  return (
    <article className="group relative">
      <button
        type="button"
        onClick={() => onOpen(entry)}
        className="block w-full overflow-hidden rounded-2xl bg-zinc-900 text-left ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60 hover:ring-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 active:scale-[0.98]"
      >
        <div className="relative aspect-[2/3]">
          <CoverArt entry={entry} iconSize={compact ? 24 : 36} className="h-full w-full transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/30 to-transparent opacity-90" />

          <div className="absolute left-2 top-2 flex items-center gap-1.5">
            <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-200 backdrop-blur">
              {showCategory && <CategoryIcon size={11} aria-label={category.label} />}
              <span className={`size-1.5 rounded-full ${status?.dot}`} />
              {!compact && statusLabel(status, entry.category)}
            </span>
            {entry.favorite && (
              <span className="grid size-6 place-items-center rounded-full bg-black/60 backdrop-blur">
                <Heart size={12} className="fill-rose-500 text-rose-500" />
              </span>
            )}
          </div>

          <div className={compact ? 'absolute inset-x-0 bottom-0 space-y-1 p-2' : 'absolute inset-x-0 bottom-0 space-y-1.5 p-3'}>
            <h3 className={`line-clamp-2 font-bold leading-tight text-white drop-shadow ${compact ? 'text-xs' : 'text-sm'}`}>{entry.title}</h3>
            <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-zinc-300">
              <EntryBadge entry={entry} compact={compact} />
              {entry.rating > 0 && (
                <span className="flex shrink-0 items-center gap-0.5 text-amber-300">
                  <Star size={11} className="fill-amber-300" /> {entry.rating}
                </span>
              )}
            </div>
            <ProgressBar entry={entry} />
          </div>
        </div>
      </button>

      {canStep && (
        <button
          type="button"
          onClick={plusOne}
          aria-label={`Add one ${category.progress.unit} to ${entry.title}`}
          className="absolute right-2 top-2 flex h-8 items-center gap-0.5 rounded-full bg-white/90 px-2.5 text-xs font-bold text-zinc-950 shadow-lg transition hover:bg-white active:scale-90 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        >
          <Plus size={14} strokeWidth={3} />
          {category.progress.short === 'h' ? '1h' : '1'}
        </button>
      )}
    </article>
  );
}
