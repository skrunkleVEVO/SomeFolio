import { useRef, useState } from 'react';
import { Check, Cloud, CloudOff, Download, Loader2, LogOut, Palette, RefreshCw, Smartphone, Tags, Trash2, Upload, X } from 'lucide-react';
import Sheet from './ui/Sheet';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../context/ToastContext';
import { timeAgo } from '../lib/filters';
import { authErrorMessage } from '../lib/cloud';
import { ACCENTS, DENSITIES, SURFACES } from '../lib/constants';
import { cn } from '../lib/cn';

export default function SettingsSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} label="Settings">
      {({ close }) => (
        <div className="relative space-y-8 px-5 pb-4 pt-8 md:px-7 md:pt-7">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/5 text-zinc-300 hover:bg-white/10"
          >
            <X size={18} />
          </button>
          <h2 className="text-xl font-extrabold tracking-tight">Settings</h2>
          <AppearanceSection />
          <CloudSection />
          <BackupSection />
          <VibeSection />
          <InstallSection />
          <DangerSection close={close} />
        </div>
      )}
    </Sheet>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        <Icon size={14} /> {title}
      </h3>
      {children}
    </section>
  );
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-400/60 md:text-sm';
const buttonClass =
  'flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-50';
const primaryClass =
  'flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-accent-500 to-accent2-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50';

function AppearanceSection() {
  const { prefs, setPrefs } = useLibrary();
  return (
    <Section icon={Palette} title="Appearance">
      <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">Accent</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {ACCENTS.map((a) => {
              const active = prefs.accent === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPrefs({ accent: a.id })}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-[11px] font-medium text-zinc-400 transition hover:text-zinc-200"
                >
                  <span
                    className={cn('grid size-10 place-items-center rounded-full transition', active && 'ring-2 ring-white ring-offset-2 ring-offset-zinc-950')}
                    style={{ backgroundImage: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
                  >
                    {active && <Check size={16} className="text-white drop-shadow" strokeWidth={3} />}
                  </span>
                  <span className={active ? 'text-zinc-100' : ''}>{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">Background</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SURFACES.map((s) => {
              const active = prefs.surface === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPrefs({ surface: s.id })}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border p-2 text-sm font-medium transition',
                    active ? 'border-accent-400 text-zinc-100' : 'border-white/10 text-zinc-400 hover:border-white/25',
                  )}
                >
                  <span className="relative size-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/15" style={{ background: s.bg }}>
                    <span className="absolute bottom-1 right-1 size-3.5 rounded" style={{ background: s.card }} />
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">Card size</p>
          <div role="group" aria-label="Card size" className="grid grid-cols-3 rounded-xl border border-white/10 p-1">
            {DENSITIES.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={prefs.density === d.id}
                onClick={() => setPrefs({ density: d.id })}
                className={cn(
                  'rounded-lg py-2 text-sm font-medium transition',
                  prefs.density === d.id ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-zinc-500">Appearance syncs to your other devices when you're signed in.</p>
      </div>
    </Section>
  );
}

function CloudSection() {
  const { cloud } = useLibrary();
  const [mode, setMode] = useState('signin'); // signin | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  if (!cloud.enabled) {
    return (
      <Section icon={CloudOff} title="Cloud sync">
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-zinc-400">
          Your library is saved on this device. To sync between phone and desktop, add your Firebase web config (
          <code className="text-accent-300">VITE_FIREBASE_*</code>, see README). Until then, use JSON export/import below.
        </p>
      </Section>
    );
  }

  const run = async (fn, success) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      if (success) setMessage({ text: success });
    } catch (err) {
      setMessage({ error: true, text: authErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  if (cloud.user) {
    const statusText = {
      idle: 'Ready',
      syncing: 'Syncing…',
      synced: cloud.lastSynced ? `Synced ${timeAgo(cloud.lastSynced)}` : 'Synced',
      error: `Sync failed: ${cloud.error}`,
    }[cloud.status];
    return (
      <Section icon={Cloud} title="Cloud sync">
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm">
            Signed in as <span className="font-semibold">{cloud.user.email}</span>
          </p>
          <p className={cn('flex items-center gap-2 text-xs', cloud.status === 'error' ? 'text-rose-300' : 'text-zinc-400')}>
            <span className={cn('size-2 rounded-full', cloud.status === 'error' ? 'bg-rose-400' : cloud.status === 'syncing' ? 'bg-amber-400' : 'bg-emerald-400')} />
            {statusText}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={cloud.syncNow} disabled={cloud.status === 'syncing'} className={buttonClass}>
              <RefreshCw size={15} className={cloud.status === 'syncing' ? 'animate-spin' : ''} /> Sync now
            </button>
            <button type="button" onClick={cloud.signOut} className={buttonClass}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </Section>
    );
  }

  const isSignup = mode === 'signup';
  return (
    <Section icon={Cloud} title="Cloud sync">
      <form
        className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => (isSignup ? cloud.signUp : cloud.signIn)(email.trim(), password));
        }}
      >
        <p className="pb-1 text-sm text-zinc-400">
          {isSignup ? 'Create an account' : 'Sign in'} to sync this library between your phone and desktop. Use the same
          account on every device.
        </p>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={inputClass} />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isSignup ? 'Choose a password (6+ characters)' : 'Password'}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          className={inputClass}
        />
        <button type="submit" disabled={busy} className={cn(primaryClass, 'w-full')}>
          {busy && <Loader2 size={15} className="animate-spin" />} {isSignup ? 'Create account' : 'Sign in'}
        </button>
        <div className="flex items-center justify-between pt-1 text-xs">
          <button type="button" onClick={() => { setMode(isSignup ? 'signin' : 'signup'); setMessage(null); }} className="text-zinc-400 hover:text-zinc-200">
            {isSignup ? 'Have an account? Sign in' : 'New here? Create an account'}
          </button>
          {!isSignup && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                email.trim()
                  ? run(() => cloud.resetPassword(email.trim()), `Password reset email sent to ${email.trim()}.`)
                  : setMessage({ error: true, text: 'Enter your email first.' })
              }
              className="text-zinc-400 hover:text-zinc-200"
            >
              Forgot password?
            </button>
          )}
        </div>
        {message && <p className={cn('text-xs', message.error ? 'text-rose-300' : 'text-emerald-300')}>{message.text}</p>}
      </form>
    </Section>
  );
}

function BackupSection() {
  const { exportLibrary, importLibrary } = useLibrary();
  const toast = useToast();
  const fileRef = useRef(null);
  const modeRef = useRef('merge');

  const download = () => {
    const data = exportLibrary();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `somefolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${Object.keys(data.entries).length} titles`);
  };

  const choose = (mode) => {
    modeRef.current = mode;
    fileRef.current?.click();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (modeRef.current === 'replace' && !window.confirm('Replace your whole library with this backup?')) return;
      const count = importLibrary(data, modeRef.current);
      toast(`${modeRef.current === 'replace' ? 'Restored' : 'Merged'} ${count} titles`);
    } catch (err) {
      toast(err instanceof SyntaxError ? 'That file is not valid JSON.' : err.message);
    }
  };

  return (
    <Section icon={Download} title="Backup">
      <div className="grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={download} className={buttonClass}>
          <Download size={15} /> Export JSON
        </button>
        <button type="button" onClick={() => choose('merge')} className={buttonClass}>
          <Upload size={15} /> Import &amp; merge
        </button>
        <button type="button" onClick={() => choose('replace')} className={buttonClass}>
          <Upload size={15} /> Import &amp; replace
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
    </Section>
  );
}

function VibeSection() {
  const { vibes, addVibe, renameVibe, removeVibe } = useLibrary();
  const [draft, setDraft] = useState('');
  return (
    <Section icon={Tags} title="Vibe tags">
      <ul className="space-y-1.5">
        {vibes.map((v) => (
          <li key={v} className="flex items-center gap-2">
            <input
              defaultValue={v}
              aria-label={`Rename ${v}`}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== v) renameVibe(v, next);
                else e.target.value = v;
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => removeVibe(v)}
              aria-label={`Delete ${v}`}
              className="grid size-10 shrink-0 place-items-center rounded-xl text-zinc-500 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addVibe(draft);
          setDraft('');
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="New vibe, e.g. Rainy Day" maxLength={28} className={inputClass} />
        <button type="submit" disabled={!draft.trim()} className={cn(buttonClass, 'shrink-0')}>
          Add
        </button>
      </form>
    </Section>
  );
}

function InstallSection() {
  return (
    <Section icon={Smartphone} title="Install on your phone">
      <ul className="space-y-1 text-sm text-zinc-400">
        <li>
          <span className="font-semibold text-zinc-200">iPhone (Safari):</span> Share → Add to Home Screen
        </li>
        <li>
          <span className="font-semibold text-zinc-200">Android (Chrome):</span> ⋮ menu → Install app
        </li>
      </ul>
    </Section>
  );
}

function DangerSection({ close }) {
  const { clearLibrary, entries } = useLibrary();
  const toast = useToast();
  return (
    <Section icon={Trash2} title="Danger zone">
      <button
        type="button"
        disabled={!entries.length}
        onClick={() => {
          if (!window.confirm(`Delete all ${entries.length} titles? Export a backup first if you might want them back.`)) return;
          clearLibrary();
          close();
          toast('Library cleared');
        }}
        className="rounded-xl border border-rose-500/30 px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-40"
      >
        Clear entire library
      </button>
    </Section>
  );
}
