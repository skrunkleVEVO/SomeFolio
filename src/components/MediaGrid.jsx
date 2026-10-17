import { CircleHelp, FilterX, PenLine, Plus, Search, Shapes } from 'lucide-react';
import MediaCard from './MediaCard';
import FranchiseCard from './FranchiseCard';
import { CATEGORIES, getCategory } from '../lib/categories';
import { focusSearch, isSearchable } from '../lib/search';

const SEARCHABLE = CATEGORIES.filter((c) => isSearchable(c.id));

const primaryClass =
  'flex items-center gap-2 rounded-xl bg-linear-to-r from-accent-500 to-accent2-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/25 transition hover:brightness-110 active:scale-95';
const secondaryClass = 'flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/10';

const STEPS = [
  ['Pick a category', 'in the search bar: anime, manga, games, movies/TV or books.'],
  ['Search a title', 'and tap a result, or press Enter for every match. Covers and details fill in for you.'],
  ['Track it', 'with a status, +1 progress taps, ratings and vibes.'],
];

const GRID = {
  compact: 'grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8',
  comfortable: 'grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  large: 'grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
};

/** `items` come from lib/franchises `stackEntries`: `{ kind: 'entry', entry }` or `{ kind: 'franchise', group }`. */
export default function MediaGrid({
  items,
  onOpen,
  onOpenFranchise,
  isLibraryEmpty,
  emptyCategory,
  onClearFilters,
  onAdd,
  onShowTour,
  density = 'comfortable',
  showCategory = false,
}) {
  if (isLibraryEmpty) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center py-14 text-center md:py-20">
        <span className="mb-5 grid size-16 place-items-center rounded-2xl bg-linear-to-br from-accent-500/20 to-accent2-500/20 ring-1 ring-accent-400/20">
          <Shapes size={28} className="text-accent-300" />
        </span>
        <h2 className="text-xl font-bold">Your shelf is empty</h2>
        <p className="mt-2 text-sm text-zinc-400">Here's how to fill it:</p>

        <ol className="mt-5 w-full space-y-2 text-left">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-400/15 text-sm font-bold text-accent-200">{i + 1}</span>
              <p className="pt-0.5 text-sm text-zinc-400">
                <span className="font-semibold text-zinc-100">{title}</span> {text}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Start with</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {SEARCHABLE.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => focusSearch(id)}
              className="flex items-center gap-1.5 rounded-full border border-accent-400/30 bg-accent-400/10 px-3.5 py-2 text-sm font-semibold text-accent-100 transition hover:bg-accent-400/20 active:scale-95"
            >
              <Icon size={15} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => onAdd()} className={secondaryClass}>
            <PenLine size={16} /> Add by hand
          </button>
          {onShowTour && (
            <button type="button" onClick={onShowTour} className={secondaryClass}>
              <CircleHelp size={16} /> Take the tour
            </button>
          )}
        </div>
      </div>
    );
  }

  if (items.length === 0 && emptyCategory) {
    const category = getCategory(emptyCategory);
    const Icon = category.icon;
    const searchable = isSearchable(category.id);
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
        <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
          <Icon size={24} className="text-accent-300" />
        </span>
        <h2 className="text-lg font-bold">No {category.label.toLowerCase()} yet</h2>
        <p className="mt-1.5 text-sm text-zinc-400">
          {searchable
            ? `Search for ${category.search.plural} and tap a result to add it, or add one by hand.`
            : 'Track anything else here: board games, podcasts, vinyl… Add one by hand and give it your own tags.'}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {searchable && (
            <button type="button" onClick={() => focusSearch(category.id)} className={primaryClass}>
              <Search size={17} /> Search {category.search.plural}
            </button>
          )}
          <button type="button" onClick={() => onAdd(category.id)} className={searchable ? secondaryClass : primaryClass}>
            <Plus size={17} /> Add by hand
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center text-zinc-400">
        <FilterX size={28} className="mb-3 text-zinc-500" />
        <p className="text-sm">Nothing here matches.</p>
        <button type="button" onClick={onClearFilters} className="mt-3 text-sm font-semibold text-accent-300 hover:text-accent-200">
          Show everything
        </button>
      </div>
    );
  }

  return (
    <div className={`grid ${GRID[density] || GRID.comfortable}`}>
      {items.map((item) =>
        item.kind === 'franchise' ? (
          <FranchiseCard key={item.key} group={item.group} onOpen={onOpenFranchise} compact={density === 'compact'} />
        ) : (
          <MediaCard key={item.key} entry={item.entry} onOpen={onOpen} compact={density === 'compact'} showCategory={showCategory} />
        ),
      )}
    </div>
  );
}
