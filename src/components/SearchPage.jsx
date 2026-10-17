import { useMemo } from 'react';
import { ArrowLeft, ChevronRight, LayoutGrid, PenLine, Plus, SearchX } from 'lucide-react';
import MediaCard from './MediaCard';
import CoverArt from './ui/CoverArt';
import { useLibrary } from '../context/LibraryContext';
import { useAddEntry } from '../hooks/useEntryActions';
import { useMediaSearch } from '../hooks/useMediaSearch';
import { CATEGORIES, getCategory, statusLabel } from '../lib/categories';
import { STATUS_BY_ID } from '../lib/constants';
import { entryFromMedia } from '../lib/entries';
import { matchesCategory, searchLibrary } from '../lib/filters';
import { isSearchable, resultFacts } from '../lib/search';
import { cn } from '../lib/cn';

const SEARCHABLE = CATEGORIES.filter((c) => isSearchable(c.id));
const TABS = [{ id: 'all', label: 'Everything', icon: LayoutGrid }, ...SEARCHABLE];
const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
const ROW = 'no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0';
const ROW_ITEM = 'w-32 shrink-0 sm:w-36';

/**
 * Full results for a submitted search (Enter or the search button): matches in
 * your library first, then every database at once (`scope` 'all') or one
 * category's database as a grid.
 */
export default function SearchPage({ query, scope, onScope, onBack, onOpen, onAddManual }) {
  const { entries } = useLibrary();
  const owned = useMemo(() => searchLibrary(entries, query).filter((e) => matchesCategory(e, scope)), [entries, query, scope]);

  return (
    <section aria-labelledby="search-page-title" className="pt-5">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Library
      </button>
      <h1 id="search-page-title" className="mt-2 text-2xl font-extrabold tracking-tight">
        Results for <span className="text-accent-300">“{query}”</span>
      </h1>

      <nav aria-label="Search in" className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = id === scope;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onScope(id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95',
                active ? 'bg-white text-zinc-950 shadow-lg shadow-white/10' : 'bg-white/5 text-zinc-300 hover:bg-white/10',
              )}
            >
              <Icon size={15} aria-hidden="true" className={active ? 'text-accent-600' : 'text-zinc-400'} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-4 space-y-8">
        {owned.length > 0 && (
          <Section title="In your library" count={owned.length}>
            <div className={ROW}>
              {owned.map((entry) => (
                <div key={entry.id} className={ROW_ITEM}>
                  <MediaCard entry={entry} onOpen={onOpen} showCategory={scope === 'all'} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {scope === 'all' ? (
          SEARCHABLE.map((c) => <CategoryRow key={c.id} category={c.id} query={query} onOpen={onOpen} onSeeAll={() => onScope(c.id)} />)
        ) : (
          <CategoryGrid key={scope} category={scope} query={query} onOpen={onOpen} />
        )}

        <button
          type="button"
          onClick={() => onAddManual(scope === 'all' ? undefined : scope, query)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 px-4 py-4 text-sm text-zinc-400 transition hover:border-white/30 hover:text-zinc-100"
        >
          <PenLine size={16} aria-hidden="true" />
          Can't find it? <span className="font-semibold text-accent-300">Add “{query}” by hand</span>
        </button>
      </div>
    </section>
  );
}

function Section({ title, icon: Icon, count, action, children }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-300">
          {Icon && <Icon size={15} aria-hidden="true" className="text-accent-300" />}
          {title}
        </h2>
        {count > 0 && <span className="text-xs tabular-nums text-zinc-500">{count}</span>}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** One database's top results as a scrolling row (the Everything tab). */
function CategoryRow({ category, query, onOpen, onSeeAll }) {
  const { results, loading, error } = useMediaSearch(query, category, 0);
  const info = getCategory(category);
  const seeAll = results.length > 0 && (
    <button type="button" onClick={onSeeAll} className="flex items-center gap-0.5 text-xs font-semibold text-accent-300 hover:text-accent-200">
      See all <ChevronRight size={14} aria-hidden="true" />
    </button>
  );

  return (
    <Section title={info.label} icon={info.icon} count={results.length} action={seeAll}>
      {loading ? (
        <div className={ROW} aria-busy="true" aria-label={`Searching ${info.search.plural}`}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={ROW_ITEM}>
              <Skeleton />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-zinc-500">No {info.search.plural} found.</p>
      ) : (
        <div className={ROW}>
          {results.map((media) => (
            <div key={media.id} className={ROW_ITEM}>
              <ResultCard media={media} onOpen={onOpen} />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/** Every result from one database (a category tab). */
function CategoryGrid({ category, query, onOpen }) {
  const { results, loading, error } = useMediaSearch(query, category, 0);
  const info = getCategory(category);

  if (error) return <p className="py-10 text-center text-sm text-rose-300">{error}</p>;
  if (!loading && results.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center text-zinc-400">
        <SearchX size={28} className="mb-3 text-zinc-500" aria-hidden="true" />
        <p className="text-sm">No {info.search.plural} found for “{query}”.</p>
      </div>
    );
  }
  return (
    <Section title={info.label} icon={info.icon} count={loading ? 0 : results.length}>
      <div className={GRID} aria-busy={loading}>
        {loading
          ? Array.from({ length: 12 }, (_, i) => <Skeleton key={i} />)
          : results.map((media) => <ResultCard key={media.id} media={media} onOpen={onOpen} />)}
      </div>
    </Section>
  );
}

/** A search result: tap to preview it, or + to add it straight to Planned (with Undo). */
function ResultCard({ media, onOpen }) {
  const { getEntry } = useLibrary();
  const addEntry = useAddEntry();
  const entry = getEntry(media.id);
  const status = entry && STATUS_BY_ID[entry.status];
  const planned = statusLabel(STATUS_BY_ID.plan, media.category);

  return (
    <article className="group relative">
      <button
        type="button"
        onClick={() => onOpen(entry || media)}
        className="block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-black/60 group-hover:ring-white/25">
          <CoverArt
            entry={{ category: media.category, coverUrl: media.cover, metadata: { color: media.color } }}
            iconSize={32}
            className="h-full w-full transition duration-500 group-hover:scale-105"
          />
          {status && (
            <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-200 backdrop-blur">
              <span className={`size-1.5 rounded-full ${status.dot}`} />
              {statusLabel(status, entry.category)}
            </span>
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-tight text-zinc-100">{media.title}</h3>
        <p className="mt-0.5 truncate text-xs text-zinc-500">{resultFacts(media)}</p>
      </button>
      {!entry && (
        <button
          type="button"
          onClick={() => addEntry(entryFromMedia(media), { message: `Added ${media.title} to ${planned}` })}
          aria-label={`Add ${media.title} to ${planned}`}
          title={`Add to ${planned}`}
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/90 text-zinc-950 shadow-lg transition hover:bg-white active:scale-90 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      )}
    </article>
  );
}

function Skeleton() {
  return (
    <div aria-hidden="true">
      <div className="aspect-[2/3] animate-pulse rounded-2xl bg-white/5" />
      <div className="mt-2 h-3.5 w-3/4 animate-pulse rounded bg-white/5" />
      <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-white/5" />
    </div>
  );
}
