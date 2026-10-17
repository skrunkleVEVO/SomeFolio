import { CornerDownLeft, PenLine, Search } from 'lucide-react';
import CoverArt from './ui/CoverArt';
import { useLibrary } from '../context/LibraryContext';
import { getCategory } from '../lib/categories';
import { STATUS_BY_ID } from '../lib/constants';
import { resultFacts } from '../lib/search';
import { cn } from '../lib/cn';

/**
 * Live results for the current query from the chosen category's database (see
 * lib/search.js), under a "See all results" row that opens the full results page.
 */
export default function SearchResults({ query, category, results, loading, error, active, listId, optionId, onHover, onChoose, onAddManual, onSeeAll }) {
  const { getEntry } = useLibrary();
  const { noun } = getCategory(category);
  const manual = onAddManual && (
    <button
      type="button"
      onClick={onAddManual}
      className="mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm text-zinc-400 transition hover:bg-white/[0.07] hover:text-zinc-100"
    >
      <PenLine size={15} className="shrink-0" aria-hidden="true" />
      Can't find it? <span className="font-semibold text-accent-300">Add “{query.trim()}” by hand</span>
    </button>
  );

  const seeAll = (
    <button
      type="button"
      onClick={onSeeAll}
      className="mb-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm text-zinc-300 transition hover:bg-white/[0.07] hover:text-white"
    >
      <Search size={15} className="shrink-0 text-accent-300" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">
        See all results for <span className="font-semibold text-zinc-100">“{query.trim()}”</span>
      </span>
      <kbd className="hidden items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 text-[11px] text-zinc-500 md:inline-flex">
        <CornerDownLeft size={11} aria-hidden="true" /> Enter
      </kbd>
    </button>
  );

  if (error) return <p className="px-3 py-6 text-center text-sm text-rose-300">{error}</p>;
  if (!loading && results.length === 0) {
    return (
      <>
        {seeAll}
        <p className="px-3 py-6 text-center text-sm text-zinc-400">
          No {noun} found for “{query.trim()}”.
        </p>
        {manual}
      </>
    );
  }

  return (
    <>
      {seeAll}
      <div id={listId} role="listbox" aria-label="Search results" aria-busy={loading}>
        {results.map((media, i) => {
          const inLibrary = getEntry(media.id);
          return (
            <div
              key={media.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => onHover(i)}
              onClick={() => onChoose(media)}
              className={cn('flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition', i === active && 'bg-white/[0.07]')}
            >
              <CoverArt
                entry={{ category: media.category, coverUrl: media.cover, metadata: { color: media.color } }}
                iconSize={18}
                className="h-16 w-11 shrink-0 rounded-md ring-1 ring-white/10"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-100">{media.title}</span>
                <span className="block truncate text-xs text-zinc-400">{resultFacts(media)}</span>
                <span className="mt-0.5 block truncate text-xs text-zinc-500">{media.genres.slice(0, 3).join(', ')}</span>
              </span>
              {inLibrary && (
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                  {STATUS_BY_ID[inLibrary.status]?.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {!loading && manual}
    </>
  );
}
