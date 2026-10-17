import { useLibrary } from '../context/LibraryContext';
import { STATUS_BY_ID } from '../lib/constants';
import { cn } from '../lib/cn';

/** Live AniList/Jikan results for the current query. */
export default function SearchResults({ query, results, loading, error, active, listId, optionId, onHover, onChoose }) {
  const { getEntry } = useLibrary();

  if (error) return <p className="px-3 py-6 text-center text-sm text-rose-300">{error}</p>;
  if (!loading && results.length === 0) {
    return <p className="px-3 py-6 text-center text-sm text-zinc-400">No anime found for “{query.trim()}”.</p>;
  }

  return (
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
            <img
              src={media.cover}
              alt=""
              loading="lazy"
              className="h-16 w-11 shrink-0 rounded-md object-cover ring-1 ring-white/10"
              style={{ backgroundColor: media.color || '#27272a' }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-zinc-100">{media.title}</span>
              <span className="block truncate text-xs text-zinc-400">
                {[media.year, media.format, media.episodes && `${media.episodes} eps`, media.studio].filter(Boolean).join(' · ')}
              </span>
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
  );
}
