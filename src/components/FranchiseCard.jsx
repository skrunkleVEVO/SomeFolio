import { Heart, Layers } from 'lucide-react';
import CoverArt from './ui/CoverArt';
import { CoverScrim, RatingText } from './EntryBadge';
import { franchiseStats, partLabel, partsLabel } from '../lib/franchises';
import { spotlightMove } from '../lib/spotlight';

/**
 * Grid card for a franchise hub: the poster of the part in progress (or the
 * latest one touched). A glass chip ("3 Seasons", "Vol. 1–3") and an accent
 * border mark it as a multi-part series. Same footprint as MediaCard.
 */
export default function FranchiseCard({ group, onOpen, compact = false }) {
  const stats = franchiseStats(group);
  const latest = [...group.entries].sort((a, b) => b.updatedAt - a.updatedAt);
  const front = stats.inProgress[0] || latest[0];
  const pct = (stats.completed / stats.total) * 100;
  const label = partsLabel(group);
  const subline = stats.inProgress.length
    ? `In progress · ${partLabel(stats.inProgress[0], group.name)}`
    : `${stats.completed}/${stats.total} completed`;

  return (
    <article className="group relative">
      <button
        type="button"
        onClick={() => onOpen(group)}
        onPointerMove={spotlightMove}
        aria-label={`${group.name}: ${label}, ${stats.completed} of ${stats.total} completed`}
        className="card-lift spotlight relative block w-full overflow-hidden rounded-2xl bg-zinc-900 text-left ring-1 ring-accent-400/35 hover:ring-accent-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <div className="relative aspect-[2/3]">
          <CoverArt entry={front} iconSize={compact ? 24 : 36} className="card-zoom h-full w-full" />
          <CoverScrim />
          {/* Thin inner edge: reads as "more than one" without extra cards peeking out. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-[3px] rounded-[13px] ring-1 ring-white/10" />

          {/* The cover's one chip (top left, like CoverChip), in glass to mark the series. */}
          <span
            aria-hidden="true"
            className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-bold leading-none tabular-nums text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] backdrop-blur-md"
          >
            <Layers size={12} className="text-accent-200" />
            {compact ? stats.total : label}
            {stats.favorite && <Heart size={12} className="fill-rose-500 text-rose-500" />}
          </span>

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
