import { Clock, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import Pill from './ui/Pill';
import { cn } from '../lib/cn';

/**
 * Shown when the search box is focused but empty: recent queries (arrow keys +
 * Enter, Delete removes one), then tags from your library to filter by, or
 * starter searches while the library is still empty.
 */
export default function SearchSuggestions({
  history,
  active,
  listId,
  optionId,
  onHover,
  onPick,
  onRemove,
  onClear,
  tags,
  vibes,
  onTag,
  starters,
}) {
  return (
    <div className="space-y-3 p-1.5">
      {history.length > 0 && (
        <section aria-labelledby={`${listId}-recent`}>
          <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
            <h3 id={`${listId}-recent`} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <Clock size={12} aria-hidden="true" /> Recent searches
            </h3>
            <button type="button" onClick={onClear} className="rounded-md px-1.5 py-0.5 text-xs font-medium text-zinc-400 hover:bg-white/10 hover:text-white">
              Clear history
            </button>
          </div>
          <div id={listId} role="listbox" aria-labelledby={`${listId}-recent`}>
            {history.map((q, i) => (
              <div
                key={q}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => onHover(i)}
                onClick={() => onPick(q)}
                className={cn(
                  'group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-zinc-200 transition',
                  i === active && 'bg-white/[0.07]',
                )}
              >
                <Search size={15} className="shrink-0 text-zinc-500" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{q}</span>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`Remove “${q}” from recent searches`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(q);
                  }}
                  className="grid size-6 shrink-0 place-items-center rounded-md text-zinc-500 opacity-100 transition hover:bg-white/10 hover:text-white md:opacity-0 md:group-hover:opacity-100 md:group-aria-selected:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tags.length > 0 ? (
        <section aria-labelledby={`${listId}-tags`} className="px-2 pb-1">
          <h3 id={`${listId}-tags`} className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            <Sparkles size={12} aria-hidden="true" /> Filter your library
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Pill key={tag} tone={vibes.includes(tag) ? 'vibe' : 'genre'} aria-pressed={undefined} onClick={() => onTag(tag)}>
                {tag}
              </Pill>
            ))}
          </div>
        </section>
      ) : (
        <section aria-labelledby={`${listId}-popular`} className="px-2 pb-1">
          <h3 id={`${listId}-popular`} className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            <TrendingUp size={12} aria-hidden="true" /> Popular searches
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {starters.map((q) => (
              <Pill key={q} aria-pressed={undefined} onClick={() => onPick(q)}>
                {q}
              </Pill>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
