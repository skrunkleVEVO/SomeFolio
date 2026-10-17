import { useMemo, useState } from 'react';
import { Dices } from 'lucide-react';
import Header from './components/Header';
import LibraryTabs from './components/LibraryTabs';
import FilterBar from './components/FilterBar';
import MediaGrid from './components/MediaGrid';
import DetailSheet from './components/DetailSheet';
import FranchiseHub from './components/FranchiseHub';
import Randomizer from './components/Randomizer';
import SettingsSheet from './components/SettingsSheet';
import { useLibrary } from './context/LibraryContext';
import { useApplyTheme } from './hooks/useApplyTheme';
import { useServiceWorker } from './hooks/useServiceWorker';
import { filterEntries, genresIn, matchesTab, tabCounts } from './lib/filters';
import { stackEntries } from './lib/franchises';

export default function App() {
  const { entries, franchises, vibes, prefs, setPrefs } = useLibrary();
  useApplyTheme(prefs);
  useServiceWorker();
  const [tab, setTab] = useState('all');
  const [tags, setTags] = useState([]);
  const [matchAll, setMatchAll] = useState(false);
  const [sort, setSort] = useState('updated');
  const [detail, setDetail] = useState(null);
  const [panel, setPanel] = useState(null); // 'random' | 'settings' | null
  const [hubId, setHubId] = useState(null); // open franchise hub
  const [returnToHub, setReturnToHub] = useState(null); // hub to reopen when the detail sheet closes

  const counts = useMemo(() => tabCounts(entries), [entries]);
  const genres = useMemo(() => genresIn(entries.filter((e) => matchesTab(e, tab))), [entries, tab]);
  const visible = useMemo(() => filterEntries(entries, { tab, tags, matchAll, sort }), [entries, tab, tags, matchAll, sort]);
  const stacked = prefs.stackFranchises !== false;
  const items = useMemo(
    () => (stacked ? stackEntries(visible, franchises) : visible.map((entry) => ({ kind: 'entry', key: entry.id, entry }))),
    [stacked, visible, franchises],
  );

  const toggleTag = (tag) => setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  const addTag = (tag) => setTags((t) => (t.includes(tag) ? t : [...t, tag]));
  const clearFilters = () => {
    setTags([]);
    setTab('all');
  };

  return (
    <div className="min-h-dvh">
      <Header
        onSelectMedia={setDetail}
        onFilterTag={addTag}
        onRandomize={() => setPanel('random')}
        onSettings={() => setPanel('settings')}
      />

      <main className="mx-auto max-w-7xl px-4 pb-32 sm:px-6 md:pb-16">
        <LibraryTabs value={tab} onChange={setTab} counts={counts} />
        {entries.length > 0 && (
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
        )}
        <MediaGrid
          items={items}
          onOpen={setDetail}
          onOpenFranchise={(group) => setHubId(group.id)}
          isLibraryEmpty={entries.length === 0}
          onClearFilters={clearFilters}
          density={prefs.density}
        />
      </main>

      <button
        type="button"
        onClick={() => setPanel('random')}
        aria-label="What should I watch next?"
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
        onClose={() => setPanel(null)}
        onOpenEntry={(entry) => {
          setPanel(null);
          setDetail(entry);
        }}
      />
      <SettingsSheet open={panel === 'settings'} onClose={() => setPanel(null)} />
    </div>
  );
}
