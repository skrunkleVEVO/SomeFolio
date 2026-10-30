import { useState } from 'react';
import { ArrowUpDown, ChevronDown, Layers, Sparkles, X } from 'lucide-react';
import Pill from './ui/Pill';
import { SORTS } from '../lib/constants';
import { cn } from '../lib/cn';

/**
 * One row of tools. Vibes and genres fold away behind a disclosure, and any
 * selected ones stay visible as removable chips while it's closed.
 */
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
  const [open, setOpen] = useState(false);
  const extraSelected = selected.filter((t) => !vibes.includes(t) && !genres.includes(t));
  const otherTags = [...genres, ...extraSelected];
  const hasTags = vibes.length + otherTags.length > 0;
  const countText = `${resultCount} ${resultCount === 1 ? 'title' : 'titles'}`;

  return (
    <section aria-label="Filters" className="space-y-2 pb-3">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        {hasTags && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? 'filter-tags' : undefined}
            onClick={() => setOpen(!open)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
              open || selected.length ? 'border-accent-400/40 bg-accent-400/10 text-accent-200' : 'border-white/10 text-zinc-300 hover:text-white',
            )}
          >
            <Sparkles size={14} aria-hidden="true" />
            Vibes<span className="hidden sm:inline"> & genres</span>
            {selected.length > 0 && <span className="tabular-nums">{selected.length}</span>}
            <ChevronDown size={14} aria-hidden="true" className={cn('transition-transform duration-200', open && 'rotate-180')} />
          </button>
        )}
        <span className="hidden tabular-nums sm:inline">{countText}</span>

        <div className="ml-auto flex items-center gap-2">
          {onStacked && (
            <button
              type="button"
              aria-pressed={stacked}
              aria-label="Stack franchises"
              onClick={() => onStacked(!stacked)}
              title={stacked ? 'Show every season and part separately' : 'Stack seasons and parts of a franchise'}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                stacked ? 'border-white/15 bg-white/10 text-zinc-100' : 'border-white/10 text-zinc-400 hover:text-zinc-200',
              )}
            >
              <Layers size={14} aria-hidden="true" /> <span className="hidden sm:inline">Stack franchises</span>
            </button>
          )}
          {/* A native select at 16px so iOS won't zoom, invisible over its small label. */}
          <div className="relative flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors focus-within:border-accent-400/60 hover:text-white">
            <ArrowUpDown size={14} aria-hidden="true" />
            <span aria-hidden="true">{SORTS.find((s) => s.id === sort)?.short}</span>
            <label className="sr-only" htmlFor="sort">
              Sort by
            </label>
            <select id="sort" value={sort} onChange={(e) => onSort(e.target.value)} className="absolute inset-0 cursor-pointer bg-zinc-900 text-base text-zinc-200 opacity-0">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {open && hasTags && (
        <div id="filter-tags" className="max-h-52 animate-fade-in space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          {vibes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {vibes.map((v) => (
                <Pill key={v} tone="vibe" active={selected.includes(v)} onClick={() => onToggle(v)}>
                  {v}
                </Pill>
              ))}
            </div>
          )}
          {otherTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {otherTags.map((g) => (
                <Pill key={g} active={selected.includes(g)} onClick={() => onToggle(g)}>
                  {g}
                </Pill>
              ))}
            </div>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          {!open && (
            <div className="no-scrollbar -ml-4 flex min-w-0 flex-1 gap-1.5 overflow-x-auto pl-4 sm:ml-0 sm:pl-0">
              {selected.map((tag) => (
                <Pill key={tag} tone={vibes.includes(tag) ? 'vibe' : 'genre'} active onClick={() => onToggle(tag)} aria-label={`Remove ${tag}`} className="flex items-center gap-1">
                  {tag} <X size={12} aria-hidden="true" />
                </Pill>
              ))}
            </div>
          )}
          <div className={cn('flex shrink-0 items-center gap-3', open && 'w-full')}>
            <span className="tabular-nums sm:hidden">{countText}</span>
            {selected.length > 1 && (
              <div role="group" aria-label="Tag matching" className="flex rounded-lg border border-white/10 p-0.5">
                {[
                  [false, 'Any'],
                  [true, 'All'],
                ].map(([val, label]) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={matchAll === val}
                    onClick={() => onMatchAll(val)}
                    className={cn('rounded-md px-2 py-0.5 font-medium', matchAll === val ? 'bg-white/15 text-white' : 'text-zinc-400')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={onClear} className={cn('font-medium text-zinc-300 hover:text-white', open && 'ml-auto')}>
              Clear
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
