import { FilterX, Plus, Shapes } from 'lucide-react';
import MediaCard from './MediaCard';
import FranchiseCard from './FranchiseCard';

const GRID = {
  compact: 'grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8',
  comfortable: 'grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  large: 'grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
};

/** `items` come from lib/franchises `stackEntries`: `{ kind: 'entry', entry }` or `{ kind: 'franchise', group }`. */
export default function MediaGrid({ items, onOpen, onOpenFranchise, isLibraryEmpty, onClearFilters, onAdd, density = 'comfortable', showCategory = false }) {
  if (isLibraryEmpty) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <span className="mb-5 grid size-16 place-items-center rounded-2xl bg-linear-to-br from-accent-500/20 to-accent2-500/20 ring-1 ring-accent-400/20">
          <Shapes size={28} className="text-accent-300" />
        </span>
        <h2 className="text-xl font-bold">Your shelf is empty</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Search for an anime above and the details fill in automatically, or add a manga, game, movie, book or anything else by hand.
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 flex items-center gap-2 rounded-xl bg-linear-to-r from-accent-500 to-accent2-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/25 transition hover:brightness-110 active:scale-95"
        >
          <Plus size={18} /> Add entry
        </button>
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
