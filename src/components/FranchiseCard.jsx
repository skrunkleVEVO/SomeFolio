import { Heart, Layers } from 'lucide-react';
import CoverArt from './ui/CoverArt';
import { CoverChip, CoverScrim, RatingText } from './EntryBadge';
import { franchiseStats, partLabel } from '../lib/franchises';

/**
 * Grid card for a franchise hub: the poster of the part in progress (or the
 * latest one touched), with the other parts' posters stacked behind it.
 * The footprint matches MediaCard so grid rows stay aligned.
 */
export default function FranchiseCard({ group, onOpen, compact = false }) {
  const stats = franchiseStats(group);
  const latest = [...group.entries].sort((a, b) => b.updatedAt - a.updatedAt);
  const front = stats.inProgress[0] || latest[0];
  const behind = latest.filter((e) => e.id !== front.id).slice(0, 2);
  const pct = (stats.completed / stats.total) * 100;
  const subline = stats.inProgress.length
    ? `In progress · ${partLabel(stats.inProgress[0], group.name)}`
    : `${stats.completed}/${stats.total} completed`;

  return (
    <article className="group relative">
      <button
        type="button"
        onClick={() => onOpen(group)}
        aria-label={`${group.name}: franchise with ${stats.total} entries, ${stats.completed} completed`}
        className="flex aspect-[2/3] w-full flex-col rounded-2xl text-left transition duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 active:scale-[0.98]"
      >
        {/* The stack: thin slices of the posters behind the front one. */}
        {[1, 0].map((layer) => {
          const entry = behind[layer];
          return (
            <span
              key={layer}
              aria-hidden="true"
              className={`block h-1.5 shrink-0 rounded-t-xl bg-zinc-800 bg-cover bg-center ring-1 ring-white/10 brightness-75 ${layer ? 'mx-4' : 'mx-2'}`}
              style={entry ? { backgroundColor: entry.metadata.color || undefined, backgroundImage: entry.coverUrl ? `url("${entry.coverUrl}")` : undefined } : undefined}
            />
          );
        })}

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-accent-400/30 transition group-hover:shadow-2xl group-hover:shadow-black/60 group-hover:ring-accent-400/60">
          <CoverArt entry={front} iconSize={compact ? 24 : 36} className="h-full w-full transition duration-300 group-hover:scale-105" />
          <CoverScrim />

          <CoverChip>
            <Layers size={12} aria-hidden="true" className="text-accent-300" />
            {stats.total}
            {stats.favorite && <Heart size={12} className="fill-rose-500 text-rose-500" aria-hidden="true" />}
          </CoverChip>

          <div className={compact ? 'absolute inset-x-0 bottom-0 space-y-1 p-2' : 'absolute inset-x-0 bottom-0 space-y-1.5 p-3'}>
            <h3 className={`line-clamp-2 font-bold leading-tight text-white drop-shadow ${compact ? 'text-xs' : 'text-sm'}`}>{group.name}</h3>
            <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-zinc-300">
              <span className="truncate">{subline}</span>
              {stats.avgRating > 0 && <RatingText value={stats.avgRating} />}
            </div>
            {pct > 0 && pct < 100 && (
              <div className="h-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-linear-to-r from-accent-500 to-accent2-400" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        </div>
      </button>
    </article>
  );
}
