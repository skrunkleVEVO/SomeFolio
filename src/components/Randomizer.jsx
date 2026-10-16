import { useEffect, useMemo, useRef, useState } from 'react';
import { Dices, Play, RotateCcw, X } from 'lucide-react';
import Sheet from './ui/Sheet';
import Pill from './ui/Pill';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../context/ToastContext';
import { genresIn, matchesTags } from '../lib/filters';
import { cn } from '../lib/cn';

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default function Randomizer({ open, onClose, onOpenEntry }) {
  return (
    <Sheet open={open} onClose={onClose} label="What should I watch next?">
      {({ close }) => <RandomizerBody close={close} onOpenEntry={onOpenEntry} />}
    </Sheet>
  );
}

function RandomizerBody({ close, onOpenEntry }) {
  const { entries, vibes, updateEntry } = useLibrary();
  const toast = useToast();
  const [tags, setTags] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | spinning | done
  const [current, setCurrent] = useState(null);
  const [tick, setTick] = useState(0);
  const timer = useRef(null);

  const pool = useMemo(() => entries.filter((e) => e.status === 'plan'), [entries]);
  const vibeOptions = useMemo(() => vibes.filter((v) => pool.some((e) => e.vibes?.includes(v))), [vibes, pool]);
  const genreOptions = useMemo(() => genresIn(pool), [pool]);
  const candidates = useMemo(() => pool.filter((e) => matchesTags(e, tags, false)), [pool, tags]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const toggle = (tag) => {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
    setPhase('idle');
  };

  const spin = () => {
    if (!candidates.length || phase === 'spinning') return;
    clearTimeout(timer.current);
    const winner = pick(candidates);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || candidates.length === 1) {
      setCurrent(winner);
      setPhase('done');
      return;
    }
    setPhase('spinning');
    let delay = 45;
    let steps = 18 + Math.floor(Math.random() * 5);
    const step = () => {
      steps -= 1;
      if (steps <= 0) {
        setCurrent(winner);
        setTick((t) => t + 1);
        setPhase('done');
        navigator.vibrate?.(30);
        return;
      }
      setCurrent(pick(candidates));
      setTick((t) => t + 1);
      delay *= 1.13;
      timer.current = setTimeout(step, delay);
    };
    step();
  };

  const startWatching = () => {
    updateEntry(current.id, { status: 'watching' });
    toast(`Enjoy ${current.title}! Moved to Watching.`);
    close();
  };

  return (
    <div className="relative px-5 pb-4 pt-8 md:px-7 md:pt-7">
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/5 text-zinc-300 hover:bg-white/10"
      >
        <X size={18} />
      </button>
      <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
        <Dices className="text-accent-400" /> What should I watch next?
      </h2>
      <p className="mt-1 text-sm text-zinc-400">Picks from your Plan to Watch list. Narrow it down by mood first.</p>

      {pool.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-400">
          Your Plan to Watch list is empty. Add a few shows there and come back to spin.
        </p>
      ) : (
        <>
          {(vibeOptions.length > 0 || genreOptions.length > 0) && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {vibeOptions.map((v) => (
                <Pill key={v} tone="vibe" active={tags.includes(v)} onClick={() => toggle(v)}>
                  {v}
                </Pill>
              ))}
              {genreOptions.map((g) => (
                <Pill key={g} active={tags.includes(g)} onClick={() => toggle(g)}>
                  {g}
                </Pill>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-col items-center">
            <div
              className={cn(
                'relative aspect-[2/3] w-44 overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 md:w-52',
                phase === 'done' && 'animate-winner shadow-[0_0_60px_-10px] shadow-accent-500/70 ring-2 ring-accent-400',
              )}
            >
              {current && phase !== 'idle' ? (
                <img key={tick} src={current.cover} alt="" className="h-full w-full animate-flicker object-cover" />
              ) : (
                <div className="grid h-full place-items-center bg-linear-to-br from-accent-500/10 to-accent2-500/10">
                  <span className="text-5xl font-black text-white/20">?</span>
                </div>
              )}
            </div>

            <div className="mt-4 min-h-14 text-center" aria-live="polite">
              {phase === 'done' && current ? (
                <>
                  <p className="text-lg font-bold">{current.title}</p>
                  <p className="text-xs text-zinc-400">
                    {[current.studio, current.episodes && `${current.episodes} eps`, ...current.genres.slice(0, 2)].filter(Boolean).join(' · ')}
                  </p>
                </>
              ) : (
                <p className="text-sm text-zinc-500">
                  {candidates.length} {candidates.length === 1 ? 'show' : 'shows'} in the hat
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {phase === 'done' && current ? (
              <>
                <button
                  type="button"
                  onClick={startWatching}
                  className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-accent-500 to-accent2-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent-500/25 active:scale-[0.98]"
                >
                  <Play size={16} className="fill-white" /> Start watching
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={spin} className="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-semibold hover:bg-white/10">
                    <RotateCcw size={15} /> Spin again
                  </button>
                  <button type="button" onClick={() => onOpenEntry(current)} className="rounded-xl bg-white/5 py-3 text-sm font-semibold hover:bg-white/10">
                    Details
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={spin}
                disabled={!candidates.length || phase === 'spinning'}
                className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-accent-500 to-accent2-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent-500/25 active:scale-[0.98] disabled:opacity-50"
              >
                <Dices size={18} className={phase === 'spinning' ? 'animate-spin' : ''} />
                {phase === 'spinning' ? 'Spinning…' : candidates.length ? 'Spin!' : 'No shows match those tags'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
