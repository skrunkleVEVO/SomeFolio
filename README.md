# SomeFolio — Anime & Media Tracker

A mobile-first, dark-mode anime tracker built with **React 19 + Vite + Tailwind CSS v4**. Installable as a PWA, deployable to GitHub Pages, with optional Firebase cloud sync on the free Spark plan.

- **Live search**: AniList GraphQL as you type, with Jikan/MyAnimeList as a fallback. Picking a result fills in the poster, title, studio, episodes, genres and synopsis.
- **Library**: a poster grid with tabs for Watching / Completed / Plan to Watch / On Hold / Favorites, sort options, and vibe + genre pill filters (Any/All matching).
- **Detail sheet**: a bottom-sheet drawer on phones (drag to dismiss) and a modal on desktop, with +1 Episode, a status dropdown, favorite, half-star 1–10 rating, custom vibe tags and auto-saving notes.
- **Spin**: "What should I watch next?" picks at random from Plan to Watch, filtered by vibes/genres.
- **Themes**: 8 accent palettes, 4 dark backgrounds (Midnight, AMOLED, Navy, Plum) and 3 card sizes, set under Settings → Appearance.
- **Data**: LocalStorage by default, JSON export/import (merge or replace), and optional Firestore sync with per-title last-write-wins merging.

## Run locally

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:5173
```

Production build: `npm run build && npm run preview`. To test on your phone over the same Wi-Fi, run `npm run dev -- --host` and open the "Network" URL it prints.

## Deploy to GitHub Pages

1. Create a GitHub repository (e.g. `SomeFolio`) and push this folder to `main`:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/SomeFolio.git
   git push -u origin main
   ```
2. On GitHub, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` deploys on every push to `main`, to `https://<you>.github.io/SomeFolio/`. Repo names are case-sensitive in Pages URLs.

**Add to your home screen.** iPhone: open the site in Safari → Share → **Add to Home Screen**. Android: open it in Chrome → ⋮ → **Install app**.

## Cloud sync with Firebase (free Spark plan)

Sync uses only **Authentication (Email/Password)** and **Cloud Firestore**. Both are included in the free Spark plan, so you don't need Blaze or a payment card. Without this setup the app still works fully, but only on the device you use it on.

In the [Firebase console](https://console.firebase.google.com), for your project:

1. **Register a web app.** Go to Project settings (gear icon) → General → *Your apps* → **</>** Web. Use any nickname and skip Firebase Hosting. Copy `apiKey`, `authDomain`, `projectId` and `appId` from the config it shows.
2. **Turn on sign-in.** Go to Build → Authentication → Get started → Sign-in method → **Email/Password** → Enable (leave "Email link" off) → Save.
3. **Allow your site.** Go to Authentication → Settings → **Authorized domains** → Add `<you>.github.io`. `localhost` is already listed.
4. **Create the database.** Go to Build → Firestore Database → **Create database**. Pick a location near you (it can't be changed later) and choose **production mode**.
5. **Set the security rules.** Go to Firestore → **Rules**, replace everything with the contents of [`firebase/firestore.rules`](firebase/firestore.rules), and **Publish**. With the Firebase CLI you can instead run `firebase deploy --only firestore:rules`.
6. **Add the config to the app.**
   - Locally: copy `.env.example` to `.env.local`, fill in the four values, then restart `npm run dev`.
   - GitHub: go to repo **Settings → Secrets and variables → Actions → New repository secret** and add `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID`. Then re-run the deploy workflow (Actions → Deploy → Run workflow).
7. In the app, open **Settings → Cloud sync → Create account**. Sign in with the same email on your other devices.

The web `apiKey` is meant to be public. The Firestore rules are what keep each account's data private.

**How sync works.** Each title is its own Firestore document (`users/{uid}/entries/{id}`). Vibes and appearance settings live in `users/{uid}/meta/library`. A sync runs on sign-in, about 1.5 s after any edit, and whenever the app comes back to the foreground. It pulls only the documents changed since the last sync, merges them per title (newest wins, and deletions are kept as tombstones), then writes only the titles that changed. Normal use is a small fraction of the free quota (50K reads and 20K writes per day).

## Project structure

```
src/
├── App.jsx                     # Layout, tab/filter/sort state, sheet routing, theme
├── main.jsx                    # Providers + service worker registration
├── index.css                   # Tailwind theme, accent/background palettes, animations
├── components/
│   ├── Header.jsx              # Logo, search, spin + settings buttons
│   ├── SearchBar.jsx           # Debounced live search with keyboard navigation
│   ├── LibraryTabs.jsx         # Status tabs with counts
│   ├── FilterBar.jsx           # Vibe/genre pills, Any/All, sort
│   ├── MediaGrid.jsx           # Responsive poster grid (3 densities) + empty states
│   ├── MediaCard.jsx           # Poster card with quick +1
│   ├── DetailSheet.jsx         # Add / track / rate / tag / annotate
│   ├── Randomizer.jsx          # "What should I watch next?" spinner
│   ├── SettingsSheet.jsx       # Appearance, cloud sync, backup, vibe editor
│   └── ui/                     # Sheet (bottom sheet / modal), Pill, StarRating
├── context/                    # LibraryContext (state + actions), ToastContext
├── hooks/
│   ├── useAnimeSearch.js       # Debounce + abort
│   ├── useCloudSync.js         # Pull → merge → push loop
│   └── useApplyTheme.js        # Applies accent/background to <html>
└── lib/
    ├── anilist.js              # AniList + Jikan clients, normalisation
    ├── storage.js              # LocalStorage, validation, merge
    ├── firebase.js             # Lazy Firebase init (Auth + Firestore)
    ├── cloud.js                # Auth helpers + Firestore reads/writes
    ├── entries.js, filters.js, constants.js, cn.js
public/                         # manifest, icons, service worker
firebase/firestore.rules        # + firebase.json for the Firebase CLI
.github/workflows/deploy.yml
```

## Customising

- **Themes:** add an accent to `ACCENTS` in `src/lib/constants.js` and a matching `html[data-accent="…"]` block in `src/index.css`. Backgrounds work the same way, using `SURFACES` and `data-surface`.
- **Default vibes and statuses:** `DEFAULT_VIBES` / `STATUSES` in `src/lib/constants.js`.
- **Offline cache:** bump `VERSION` in `public/sw.js` if you change the caching rules.
