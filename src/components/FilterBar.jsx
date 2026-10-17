import { Layers, Sparkles, X } from 'lucide-react';
import Pill from './ui/Pill';
import { SORTS } from '../lib/constants';
import { cn } from '../lib/cn';

export default function FilterBar({
  vibes,
  genres,
  selected,
  onToggle,
  onClear,
  matchAll,
  onMatchAll,
  sort,
  onSort,
  resultCount,
  stacked,
  onStacked, // omitted when the library has no franchises to stack
}) {
  const extraSelected = selected.filter((t) => !vibes.includes(t) && !genres.includes(t));

  return (
    <section aria-label="Filters" className="space-y-3 pb-4">
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <span className="flex shrink-0 items-center gap-1 pr-1 text-xs font-semibold uppercase tracking-wider text-accent-300/80">
          <Sparkles size={13} /> Vibes
        </span>
        {vibes.map((v) => (
          <Pill key={v} tone="vibe" active={selected.includes(v)} onClick={() => onToggle(v)}>
            {v}
          </Pill>
        ))}
        {genres.length > 0 && <span className="mx-1 h-5 w-px shrink-0 bg-white/10" aria-hidden="true" />}
        {[...genres, ...extraSelected].map((g) => (
          <Pill key={g} active={selected.includes(g)} onClick={() => onToggle(g)}>
            {g}
          </Pill>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="tabular-nums">
            {resultCount} {resultCount === 1 ? 'title' : 'titles'}
          </span>
          {selected.length > 0 && (
            <button type="button" onClick={onClear} className="flex items-center gap-1 text-zinc-300 hover:text-white">
              <X size={14} /> Clear filters
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 1 && (
            <div role="group" aria-label="Tag matching" className="flex rounded-lg border border-white/10 p-0.5 text-xs">
              {[
                [false, 'Any'],
                [true, 'All'],
              ].map(([val, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={matchAll === val}
                  onClick={() => onMatchAll(val)}
                  className={cn('rounded-md px-2.5 py-1 font-medium', matchAll === val ? 'bg-white/15 text-white' : 'text-zinc-400')}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {onStacked && (
            <button
              type="button"
              aria-pressed={stacked}
              onClick={() => onStacked(!stacked)}
              title={stacked ? 'Show every season and part separately' : 'Stack seasons and parts of a franchise'}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                stacked ? 'border-accent-400/40 bg-accent-400/10 text-accent-200' : 'border-white/10 text-zinc-400 hover:text-zinc-200',
              )}
            >
              <Layers size={14} aria-hidden="true" /> Stack franchises
            </button>
          )}
          <label className="sr-only" htmlFor="sort">
            Sort by
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => onSort(e.target.value)}
            className="rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-base text-zinc-200 outline-none focus:border-accent-400/60 md:text-xs"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
