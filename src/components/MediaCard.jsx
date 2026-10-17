import { Heart, Plus, Star } from 'lucide-react';
import { useQuickProgress } from '../hooks/useQuickProgress';
import { STATUS_BY_ID } from '../lib/constants';

export default function MediaCard({ entry, onOpen, compact = false }) {
  const addEpisode = useQuickProgress();
  const status = STATUS_BY_ID[entry.status];
  const pct = entry.episodes ? Math.min(100, (entry.progress / entry.episodes) * 100) : 0;
  const showProgress = entry.status === 'watching' || entry.status === 'hold';

  const plusOne = (e) => {
    e.stopPropagation();
    addEpisode(entry);
  };

  return (
    <article className="group relative">
      <button
        type="button"
        onClick={() => onOpen(entry)}
        className="block w-full overflow-hidden rounded-2xl bg-zinc-900 text-left ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60 hover:ring-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 active:scale-[0.98]"
      >
        <div className="relative aspect-[2/3]">
          <img
            src={entry.cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            style={{ backgroundColor: entry.color || '#27272a' }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/30 to-transparent opacity-90" />

          <div className="absolute left-2 top-2 flex items-center gap-1.5">
            <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-200 backdrop-blur">
              <span className={`size-1.5 rounded-full ${status?.dot}`} />
              {!compact && status?.label}
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
              <span className="tabular-nums">
                {entry.episodes ? `Ep ${entry.progress}/${entry.episodes}` : entry.progress ? `Ep ${entry.progress}` : entry.format || '—'}
              </span>
              {entry.rating > 0 && (
                <span className="flex items-center gap-0.5 text-amber-300">
                  <Star size={11} className="fill-amber-300" /> {entry.rating}
                </span>
              )}
            </div>
            {showProgress && entry.episodes && (
              <div className="h-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-linear-to-r from-accent-500 to-accent2-400" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        </div>
      </button>

      {entry.status === 'watching' && (
        <button
          type="button"
          onClick={plusOne}
          aria-label={`Add one episode to ${entry.title}`}
          className="absolute right-2 top-2 flex h-8 items-center gap-0.5 rounded-full bg-white/90 px-2.5 text-xs font-bold text-zinc-950 shadow-lg transition hover:bg-white active:scale-90 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        >
          <Plus size={14} strokeWidth={3} />1
        </button>
      )}
    </article>
  );
}
