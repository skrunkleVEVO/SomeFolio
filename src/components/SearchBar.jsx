import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import SearchResults from './SearchResults';
import SearchSuggestions from './SearchSuggestions';
import { useMediaSearch } from '../hooks/useMediaSearch';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { useLibrary } from '../context/LibraryContext';
import { CATEGORIES, getCategory } from '../lib/categories';
import { topicsOf } from '../lib/filters';
import { isSearchable, onFocusSearch } from '../lib/search';

const MAX_TAGS = 8;
const SCOPES = CATEGORIES.filter((c) => isSearchable(c.id));
const scopeFor = (category, fallback = SCOPES[0].id) => (isSearchable(category) ? category : fallback);

/** Vibes, genres and custom tags used in the library, most used first. */
function popularTags(entries) {
  const counts = new Map();
  for (const e of entries) for (const t of [...e.vibes, ...topicsOf(e)]) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_TAGS)
    .map(([t]) => t);
}

/**
 * Combobox with two modes: live results once 2+ characters are typed, and
 * recent searches + quick filters while the box is focused but empty. The
 * picker on the left chooses which database to search; it follows the
 * category open in the grid (Custom and All keep the last one).
 */
export default function SearchBar({ category, onSelect, onFilterTag, onAddManual }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [scope, setScope] = useState(() => scopeFor(category));
  const { results, loading, error } = useMediaSearch(query, scope);
  const scopeInfo = getCategory(scope);
  const ScopeIcon = scopeInfo.icon;
  const { history, addSearch, removeSearch, clearHistory } = useSearchHistory();
  const { entries, vibes } = useLibrary();
  const tags = useMemo(() => popularTags(entries), [entries]);
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (i) => `${baseId}-opt-${i}`;

  const mode = query.trim().length >= 2 ? 'results' : 'suggestions';
  const options = mode === 'results' ? results : history;

  useEffect(() => setActive(results.length ? 0 : -1), [results]);

  useEffect(() => setScope((s) => scopeFor(category, s)), [category]);

  useEffect(
    () =>
      onFocusSearch((target) => {
        if (target) setScope((s) => scopeFor(target, s));
        setOpen(true);
        inputRef.current?.focus();
      }),
    [],
  );

  useEffect(() => {
    const onPointer = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    const onSlash = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onSlash);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onSlash);
    };
  }, []);

  const close = () => {
    setOpen(false);
    inputRef.current?.blur();
  };

  const choose = (media) => {
    addSearch(query);
    onSelect(media);
    setQuery('');
    close();
  };

  const searchFor = (q) => {
    setQuery(q);
    setActive(-1);
    setOpen(true);
    inputRef.current?.focus();
  };

  const filterBy = (tag) => {
    onFilterTag?.(tag);
    close();
  };

  const addManually = () => {
    close();
    onAddManual?.(scope, query.trim());
  };

  const changeScope = (next) => {
    setScope(next);
    setOpen(true);
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, mode === 'results' ? 0 : -1));
    } else if (e.key === 'Enter' && open && options[active]) {
      e.preventDefault();
      if (mode === 'results') choose(results[active]);
      else searchFor(history[active]);
    } else if (e.key === 'Delete' && mode === 'suggestions' && history[active]) {
      e.preventDefault();
      removeSearch(history[active]);
      setActive((i) => Math.min(i, history.length - 2));
    } else if (e.key === 'Escape') {
      close();
    }
  };

  const activeOption = open && active >= 0 && options[active] ? optionId(active) : undefined;

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-stretch rounded-xl border border-white/10 bg-white/5 transition focus-within:border-accent-400/60 focus-within:bg-white/[0.07] focus-within:ring-4 focus-within:ring-accent-500/10">
        <label className="relative flex shrink-0 items-center gap-1.5 border-r border-white/10 pl-3 text-accent-200" title="Choose what to search">
          <ScopeIcon size={16} aria-hidden="true" />
          <span className="sr-only">Search in</span>
          <select
            value={scope}
            onChange={(e) => changeScope(e.target.value)}
            className="h-full cursor-pointer appearance-none bg-transparent py-2.5 pr-7 text-base font-semibold text-zinc-100 outline-none md:text-sm"
          >
            {SCOPES.map((c) => (
              <option key={c.id} value={c.id} className="bg-zinc-900">
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2 text-zinc-400" />
        </label>
        <div className="relative min-w-0 flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (e.target.value.trim().length < 2) setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={`Search ${scopeInfo.search.plural} to add…`}
            aria-label={`Search ${scopeInfo.search.plural}`}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={activeOption}
            aria-autocomplete="list"
            aria-describedby={`${baseId}-hint`}
            autoComplete="off"
            enterKeyHint="search"
            className="w-full bg-transparent py-2.5 pl-9 pr-10 text-base text-zinc-100 placeholder:text-zinc-500 outline-none md:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          <span id={`${baseId}-hint`} className="sr-only">
            Use the arrow keys to move through suggestions. Press Delete to remove a recent search.
          </span>
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {loading ? (
              <Loader2 size={18} className="animate-spin text-zinc-500" aria-label="Searching" />
            ) : query ? (
              <button type="button" aria-label="Clear search" onClick={() => searchFor('')} className="text-zinc-500 hover:text-zinc-200">
                <X size={18} />
              </button>
            ) : (
              <kbd className="hidden rounded border border-white/10 px-1.5 text-[11px] text-zinc-500 md:inline">/</kbd>
            )}
          </span>
        </div>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-[65dvh] animate-pop-in overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
          {mode === 'results' ? (
            <SearchResults
              query={query}
              category={scope}
              onAddManual={onAddManual ? addManually : undefined}
              results={results}
              loading={loading}
              error={error}
              active={active}
              listId={listId}
              optionId={optionId}
              onHover={setActive}
              onChoose={choose}
            />
          ) : (
            <SearchSuggestions
              history={history}
              active={active}
              listId={listId}
              optionId={optionId}
              onHover={setActive}
              onPick={searchFor}
              onRemove={removeSearch}
              onClear={clearHistory}
              tags={onFilterTag ? tags : []}
              vibes={vibes}
              onTag={filterBy}
              starters={scopeInfo.search.starters}
            />
          )}
        </div>
      )}
    </div>
  );
}
