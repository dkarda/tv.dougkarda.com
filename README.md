# tv.dougkarda.com

Personal TV site: search and filter TMDB shows, plus your ratings, stats, and unwatched list from your catalog JSON.

## Stack

Vite, React, TypeScript, Tailwind CSS. The TMDB key lives in a Vite env file and is **included in the browser bundle**. `.env` is gitignored; anyone can still extract the key from built JavaScript.

## Setup

1. Create a [TMDB API](https://www.themoviedb.org/settings/api) application (or reuse the movies site credentials).
2. Copy `.env.example` to `.env` and fill in:

```
VITE_TMDB_API_KEY=
VITE_TMDB_ACCESS_TOKEN=
VITE_TMDB_ACCOUNT_ID=
```

- **API key** or **API Read Access Token** is enough for Browse, Home, Ratings, and show pages.
- This app is read-only.

3. Install and run:

```
npm install
npm run dev
```

Restart the dev server after changing `.env`.

## Caching

TanStack Query keeps responses for about 30 minutes and persists them in `localStorage` for up to a day so repeat visits skip extra TMDB calls.

## Production (hosting.com)

Shared hosting does not run `npm`. Build locally, then upload the **contents of `dist/`** to the `tv.dougkarda.com` document root (including `.htaccess` copied from `public/` for Apache SPA routes).

```
npm run build
```

Do not upload `.env` as a public file; values are already baked into `dist/assets/*.js` at build time. Rebuild whenever credentials change.

## Git

Commit source (not `.env`, not `node_modules`, not `dist`). When you are ready, we can initialize the repo and push.

TMDB [API terms](https://www.themoviedb.org/api-terms-of-use) apply; this site uses their data and images.
