# SomeFolio — Media Tracker

A mobile-first, dark-mode tracker for anime, manga, games, movies/TV, books and anything else, built with **React 19 + Vite + Tailwind CSS v4**. Installable as a PWA, deployable to GitHub Pages, with optional Firebase cloud sync on the free Spark plan.

- **Live search** in every category, picked from a dropdown in the search bar that follows the category you're viewing: anime and manga from AniList (Jikan/MyAnimeList as a fallback), books from Open Library (Google Books as a fallback), movies and TV from TVmaze + Wikipedia, and games from Wikipedia. None of these need an API key. Optionally set `VITE_TMDB_KEY` ([TMDB](https://www.themoviedb.org/settings/api)) and/or `VITE_RAWG_KEY` ([RAWG](https://rawg.io/apidocs)) in `.env.local` or as repo secrets for richer movie/TV and game results. Picking a result fills in the poster, title, counts, genres and synopsis; "Can't find it?" opens the manual form with the title filled in.
- **Full results page**: press Enter or the search button to open a page with every match: titles already in your library, then results from every database at once (*Everything*) or one category's database as a grid. The query lives in the URL (`#search?q=…`), so the browser's Back button returns to your library. Each result can be previewed, or added to Planned with one tap.
- **Undo and remove**: every add shows an **Undo** toast, and each title's detail sheet has a remove button next to Close (tap twice; removing also offers Undo).
- **First-visit tour** that walks through searching, tracking and the dice, plus step-by-step empty states. Replay it from Settings → *How SomeFolio works*. Focusing the empty search box shows your recent searches (arrow keys, Enter, Delete to remove one, Clear history) and your library's most-used vibes and genres as one-tap filters.
- **Franchise stacking**: split series such as JoJo's Bizarre Adventure or Fate collapse into one hub card with stacked posters. The hub lists every part in release order with quick +1, rename and ungroup. Grouping is detected from titles, and each title's detail sheet can set a franchise name or keep that title separate. Turn stacking on or off with **Stack franchises** next to the sort menu.
- **Library**: a poster grid with category tabs (All, Anime, Manga, Games, Movies/TV, Books, Custom), status filters (In Progress / Completed / Backlog / Planned / On Hold / Favorites, labelled per category, e.g. "Reading" or "Plan to Play"), sort options, and vibe + genre pill filters (Any/All matching).
- **Detail sheet**: a bottom-sheet drawer on phones (drag to dismiss) and a side drawer on desktop, with +1 episode/chapter/hour, a status dropdown, favorite, half-star 1–10 rating, a details editor, custom vibe tags and auto-saving notes.
- **Spin**: "What's next?" picks at random from your Planned and Backlog titles in the current category, filtered by vibes/genres.
- **Themes**: 8 accent palettes, 4 dark backgrounds (Midnight, AMOLED, Navy, Plum) and 3 card sizes, set under Settings → Appearance.
- **Data**: LocalStorage by default, JSON export/import (merge or replace), and optional Firestore sync with per-title last-write-wins merging.
- **Offline**: installable PWA. A Workbox service worker precaches the whole build and caches poster art, so your library opens with no connection. Edits made offline sync when you reconnect.

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
├── main.jsx                    # Providers
├── index.css                   # Tailwind theme, accent/background palettes, animations
├── components/
│   ├── Header.jsx              # Logo, search, spin + add + settings buttons
│   ├── SearchBar.jsx           # Search combobox: live results or suggestions, Enter opens the results page
│   ├── SearchResults.jsx       # Live results listbox + "See all results"
│   ├── SearchSuggestions.jsx   # Recent searches + quick filter tags
│   ├── SearchPage.jsx          # Full results page: library matches + every database
│   ├── CategoryBar.jsx         # Category tabs with counts
│   ├── StatusFilter.jsx        # Status tabs with counts
│   ├── FilterBar.jsx           # Vibe/genre pills, Any/All, sort
│   ├── MediaGrid.jsx           # Responsive poster grid (3 densities) + empty states
│   ├── MediaCard.jsx           # Poster card with quick +1
│   ├── EntryBadge.jsx          # Per-category card badge + progress bar
│   ├── FranchiseCard.jsx       # Stacked hub card for a franchise
│   ├── FranchiseHub.jsx        # Franchise drawer: parts in release order, rename, ungroup
│   ├── DetailSheet.jsx         # Add / track / rate / tag / annotate / remove
│   ├── AddEntryModal.jsx       # Manual "Add entry" form
│   ├── MetadataFields.jsx      # Category-specific inputs for the form and details editor
│   ├── WelcomeTour.jsx         # First-visit walkthrough
│   ├── Randomizer.jsx          # "What's next?" spinner
│   ├── SettingsSheet.jsx       # Appearance, cloud sync, backup, vibe editor
│   └── ui/                     # Sheet (bottom sheet / modal), Pill, StarRating, CoverArt
├── context/                    # LibraryContext (state + actions), ToastContext
├── hooks/
│   ├── useMediaSearch.js       # Debounce + abort, per category
│   ├── useSearchPage.js        # Results page state, kept in the URL hash
│   ├── useEntryActions.js      # Add / remove with an Undo toast
│   ├── useCloudSync.js         # Pull → merge → push loop (pauses while offline)
│   ├── useServiceWorker.js     # Registers the service worker, offline-ready + update toasts
│   ├── useOnlineStatus.js      # navigator.onLine as React state
│   ├── useSearchHistory.js     # Recent searches (LocalStorage, synced across tabs)
│   ├── useQuickProgress.js     # Shared "+1 episode" with toast
│   └── useApplyTheme.js        # Applies accent/background to <html>
└── lib/
    ├── categories.js           # Category registry: labels, fields, progress counters
    ├── search.js               # Per-category search sources (books, movies/TV, games), normalisation
    ├── anilist.js              # AniList + Jikan clients for anime and manga
    ├── onboarding.js           # "Tour seen" flag (this device only)
    ├── storage.js              # LocalStorage, validation, merge
    ├── franchises.js           # Franchise detection, grouping and stats
    ├── searchHistory.js        # Recent-search store
    ├── firebase.js             # Lazy Firebase init (Auth + Firestore)
    ├── cloud.js                # Auth helpers + Firestore reads/writes
    ├── entries.js, filters.js, constants.js, cn.js
public/                         # manifest, icons (the service worker is generated at build time)
firebase/firestore.rules        # + firebase.json for the Firebase CLI
.github/workflows/deploy.yml
```

## Customising

- **Themes:** add an accent to `ACCENTS` in `src/lib/constants.js` and a matching `html[data-accent="…"]` block in `src/index.css`. Backgrounds work the same way, using `SURFACES` and `data-surface`.
- **Default vibes and statuses:** `DEFAULT_VIBES` / `STATUSES` in `src/lib/constants.js`.
- **Categories:** each category's labels, fields and progress counter are one object in `CATEGORIES` in `src/lib/categories.js`; its search source is registered in `SEARCHERS` in `src/lib/search.js`.
- **Franchise detection:** the title rules (subtitles, "Season 2", "Part 3", roman numerals, `Fate/…`) are in `SUFFIXES` and `baseTitle()` in `src/lib/franchises.js`. An entry's `franchise` field overrides them: `null` means auto-detect, a name groups it by that name, and `''` keeps it separate. It syncs like any other field.
- **Offline cache:** caching rules live in the `VitePWA` block of `vite.config.js`. Every build generates a new `sw.js` that precaches all of `dist/`. Open users get a "new version available" toast with a Reload button. The service worker only runs in production builds, so test offline with `npm run build && npm run preview`, then DevTools → Network → Offline.
