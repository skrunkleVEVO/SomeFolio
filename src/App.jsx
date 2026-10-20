import { lazy, Suspense, useMemo, useState } from 'react';
import { Dices } from 'lucide-react';
import Header from './components/Header';
import CategoryBar from './components/CategoryBar';
import StatusFilter from './components/StatusFilter';
import FilterBar from './components/FilterBar';
import MediaGrid from './components/MediaGrid';
import DetailSheet from './components/DetailSheet';
import FranchiseHub from './components/FranchiseHub';
import Randomizer from './components/Randomizer';
import SettingsSheet from './components/SettingsSheet';
import AddEntryModal from './components/AddEntryModal';
import WelcomeTour from './components/WelcomeTour';
import SearchPage from './components/SearchPage';
import { useLibrary } from './context/LibraryContext';
import { useApplyTheme } from './hooks/useApplyTheme';
import { useRadarPage } from './hooks/useRadarPage';
import { useSearchPage } from './hooks/useSearchPage';
import { useServiceWorker } from './hooks/useServiceWorker';
import { categoryCounts, filterEntries, genresIn, matchesCategory, matchesTab, tabCounts } from './lib/filters';
import { stackEntries } from './lib/franchises';
import { hasSeenTour, markTourSeen } from './lib/onboarding';
import { focusSearch } from './lib/search';

// Loaded on first open, so Framer Motion stays out of the library's bundle.
const ReleaseRadar = lazy(() => import('./components/ReleaseRadar'));

export default function App() {
  const { entries, franchises, vibes, prefs, setPrefs } = useLibrary();
  useApplyTheme(prefs);
  useServiceWorker();
  const [category, setCategory] = useState('all');
  const [tab, setTab] = useState('all');
  const [tags, setTags] = useState([]);
  const [matchAll, setMatchAll] = useState(false);
  const [sort, setSort] = useState('updated');
  const [detail, setDetail] = useState(null);
  const [panel, setPanel] = useState(null); // 'random' | 'settings' | 'add' | null
  const [addDraft, setAddDraft] = useState({}); // { category, title } prefilled in the Add form
  const [tourOpen, setTourOpen] = useState(() => entries.length === 0 && !hasSeenTour()); // first visit only
  const [hubId, setHubId] = useState(null); // open franchise hub
  const [returnToHub, setReturnToHub] = useState(null); // hub to reopen when the detail sheet closes
  const { search, openSearch, closeSearch } = useSearchPage(); // full results page, replaces the library view
  const { radarOpen, openRadar, closeRadar } = useRadarPage(); // release calendar + news, replaces the library view

  const inCategory = useMemo(() => entries.filter((e) => matchesCategory(e, category)), [entries, category]);
  const categoryTotals = useMemo(() => categoryCounts(entries), [entries]);
  const counts = useMemo(() => tabCounts(inCategory), [inCategory]);
  const genres = useMemo(() => genresIn(inCategory.filter((e) => matchesTab(e, tab))), [inCategory, tab]);
  const visible = useMemo(() => filterEntries(inCategory, { tab, tags, matchAll, sort }), [inCategory, tab, tags, matchAll, sort]);
  const stacked = prefs.stackFranchises !== false;
  const items = useMemo(
    () => (stacked ? stackEntries(visible, franchises) : visible.map((entry) => ({ kind: 'entry', key: entry.id, entry }))),
    [stacked, visible, franchises],
  );

  const toggleTag = (tag) => setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  const addTag = (tag) => {
    closeSearch();
    setTags((t) => (t.includes(tag) ? t : [...t, tag]));
  };
  const clearFilters = () => {
    setTags([]);
    setTab('all');
    setCategory('all');
  };
  const openAdd = (draft = {}) => {
    setAddDraft(draft);
    setPanel('add');
  };

  return (
    <div className="min-h-dvh">
      <Header
        category={category}
        search={search}
        onSelectMedia={setDetail}
        onSearch={(query) => openSearch({ query, scope: 'all' })}
        onFilterTag={addTag}
        onAdd={() => openAdd()}
        onAddManual={(scope, title) => openAdd({ category: scope, title })}
        onRandomize={() => setPanel('random')}
        onRadar={radarOpen ? closeRadar : openRadar}
        radarOpen={radarOpen && !search}
        onSettings={() => setPanel('settings')}
      />

      <main className="mx-auto max-w-7xl px-4 pb-32 sm:px-6 md:pb-16">
        {search ? (
          <SearchPage
            query={search.query}
            scope={search.scope}
            onScope={(scope) => openSearch({ ...search, scope })}
            onBack={closeSearch}
            onOpen={setDetail}
            onAddManual={(scope, title) => openAdd({ category: scope, title })}
          />
        ) : radarOpen ? (
          <Suspense fallback={null}>
            <ReleaseRadar onBack={closeRadar} onOpen={setDetail} />
          </Suspense>
        ) : (
          <>
            {entries.length > 0 && (
              <>
                <CategoryBar value={category} onChange={setCategory} counts={categoryTotals} />
                <StatusFilter value={tab} onChange={setTab} counts={counts} category={category} />
                <FilterBar
                  vibes={vibes}
                  genres={genres}
                  selected={tags}
                  onToggle={toggleTag}
                  onClear={() => setTags([])}
                  matchAll={matchAll}
                  onMatchAll={setMatchAll}
                  sort={sort}
                  onSort={setSort}
                  resultCount={visible.length}
                  stacked={stacked}
                  onStacked={franchises.groups.size ? (value) => setPrefs({ stackFranchises: value }) : undefined}
                />
              </>
            )}
            <MediaGrid
              items={items}
              onOpen={setDetail}
              onOpenFranchise={(group) => setHubId(group.id)}
              isLibraryEmpty={entries.length === 0}
              emptyCategory={category !== 'all' && inCategory.length === 0 ? category : null}
              onClearFilters={clearFilters}
              onAdd={(cat) => openAdd({ category: cat })}
              onShowTour={() => setTourOpen(true)}
              density={prefs.density}
              showCategory={category === 'all'}
            />
          </>
        )}
      </main>

      <button
        type="button"
        onClick={() => setPanel('random')}
        aria-label="What's next?"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-5 z-20 grid size-14 place-items-center rounded-2xl bg-linear-to-br from-accent-500 to-accent2-600 text-white shadow-xl shadow-accent-500/40 transition active:scale-90 md:hidden"
      >
        <Dices size={26} />
      </button>

      <DetailSheet
        media={detail}
        onClose={() => {
          setDetail(null);
          if (returnToHub) setHubId(returnToHub);
          setReturnToHub(null);
        }}
      />
      <FranchiseHub
        group={hubId ? franchises.groups.get(hubId) : null}
        onClose={() => setHubId(null)}
        onGroupIdChange={setHubId}
        onOpenEntry={(entry) => {
          setReturnToHub(hubId);
          setHubId(null);
          setDetail(entry);
        }}
      />
      <Randomizer
        open={panel === 'random'}
        category={category}
        onClose={() => setPanel(null)}
        onOpenEntry={(entry) => {
          setPanel(null);
          setDetail(entry);
        }}
      />
      <SettingsSheet
        open={panel === 'settings'}
        onClose={() => setPanel(null)}
        onShowTour={() => {
          setPanel(null);
          setTourOpen(true);
        }}
      />
      <AddEntryModal
        open={panel === 'add'}
        onClose={() => setPanel(null)}
        defaultCategory={addDraft.category || category}
        defaultTitle={addDraft.title}
        onOpenEntry={setDetail}
      />
      <WelcomeTour
        open={tourOpen}
        onClose={() => {
          setTourOpen(false);
          markTourSeen();
        }}
        onStart={() => focusSearch(category)}
      />
    </div>
  );
}
