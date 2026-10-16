import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { useAnimeSearch } from '../hooks/useAnimeSearch';
import { useLibrary } from '../context/LibraryContext';
import { STATUS_BY_ID } from '../lib/constants';
import { cn } from '../lib/cn';

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { results, loading, error } = useAnimeSearch(query);
  const { getEntry } = useLibrary();
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => setActive(0), [results]);

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

  const choose = (media) => {
    onSelect(media);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search anime to add…"
          aria-label="Search anime"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="search-results"
          autoComplete="off"
          enterKeyHint="search"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-base text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-accent-400/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-accent-500/10 md:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 size={18} className="animate-spin text-zinc-500" />
          ) : query ? (
            <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="text-zinc-500 hover:text-zinc-200">
              <X size={18} />
            </button>
          ) : (
            <kbd className="hidden rounded border border-white/10 px-1.5 text-[11px] text-zinc-500 md:inline">/</kbd>
          )}
        </span>
      </div>

      {showPanel && (
        <div
          id="search-results"
          role="listbox"
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-[65dvh] animate-pop-in overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          {error && <p className="px-3 py-6 text-center text-sm text-rose-300">{error}</p>}
          {!error && !loading && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-zinc-400">No anime found for “{query.trim()}”.</p>
          )}
          {results.map((media, i) => {
            const inLibrary = getEntry(media.id);
            return (
              <button
                key={media.id}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(media)}
                className={cn('flex w-full items-center gap-3 rounded-xl p-2 text-left transition', i === active && 'bg-white/[0.07]')}
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
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
