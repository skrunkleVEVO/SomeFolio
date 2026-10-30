# Product

<!-- impeccable:product-schema 1 -->

> Drafted from the repository without an interview, at the owner's request. Facts come from the code, README and manifest. Anything marked **(inferred)** has not been confirmed by the owner.

## Platform

web

## Users

People who follow several kinds of media at once (anime, manga, games, movies/TV, books) and want one personal library for all of it. **(inferred)** They mostly use it on a phone, often in short moments: logging an episode, checking what's next, or adding a title they just heard about.

## Product Purpose

SomeFolio is a media tracker. It lets someone add a title quickly, track progress and status, rate it, tag it and take notes, then decide what to watch, read or play next. **(inferred)** Success means the library stays up to date because logging takes almost no effort.

## Positioning

**(inferred)** One library across every medium, instead of a separate tracker for each. It needs no account and no API keys, and works offline. Vibe tags, franchise stacking, the Release Radar and the "What's next?" spin make it a personal collection rather than a catalogue database.

## Operating Context

- Installed to the home screen as a PWA, portrait orientation, and opened with or without a connection.
- Hash-based routes for search results (`#search?q=…`) and the radar (`#radar`), so the browser's Back button works.
- Deployed to GitHub Pages from `main`. Firebase sync is optional and stays on the free Spark plan.

## Capabilities and Constraints

- **Categories:** anime, manga, games, movies/TV, books and custom.
- **Statuses:** In Progress, Completed, Backlog, Planned and On Hold, labelled per category (for example "Reading" or "Plan to Play"), plus Favorites.
- **Search:** live search per category, a full results page, and a manual form when a title can't be found. Sources work without keys (AniList, Jikan, Open Library, Google Books, TVmaze, Wikipedia); TMDB and RAWG keys are optional.
- **Tracking:** quick +1, half-star 1–10 ratings, custom vibe tags, auto-saving notes, and Undo after adding or removing a title.
- **Discovery:** franchise stacking with hub cards, Release Radar (calendar, countdown, news feed), and the spin picker.
- **Personalisation:** 8 accents, 4 dark backgrounds (Midnight, AMOLED, Navy, Plum) and 3 card sizes.
- **Data:** LocalStorage by default, JSON export/import, and optional Firestore sync with per-title last-write-wins merging.
- **Constraints:** must stay fully usable offline and without an account or API keys. Must stay within free tiers. Must remain a static build for GitHub Pages.
- **Terminology:** "title", "vibes", "franchise", "Release Radar", "What's next?".
- **Undecided:** the audience beyond the owner, and any plans for public launch or monetisation.

## Brand Commitments

- Name: SomeFolio. Manifest name: "SomeFolio — Media Tracker".
- Described as dark-mode and mobile-first; all four backgrounds are dark.
- Assets: `public/favicon.svg`, app icons and `public/manifest.webmanifest`.

## Evidence on Hand

- Working app in `src/`, with feature descriptions in `README.md`.
- No testimonials, user numbers, press or case studies exist in the repository. Don't fabricate them.
- Poster art and metadata come from third-party sources and belong to their owners.

## Product Principles

**(inferred)** These are drawn from how the app is built, and the owner hasn't confirmed them.

1. Logging comes first: the most common action should take one tap.
2. The library belongs to the user: it works locally, exports freely, and sync is optional.
3. Always works: offline, with no keys and no account, nothing should break.
4. Mistakes are cheap: prefer Undo over confirmation.
5. Personal over comprehensive: vibes, notes and franchises reflect how the user thinks about their media.

## Accessibility & Inclusion

No formal standard has been set. The code already uses ARIA labelling and accounts for reduced motion, and future work should preserve both.
