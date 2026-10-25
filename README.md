# FORMARCHIVE

AI Design Reference & Trend Archive — a reference archive that translates visual ideas into design language and finds related works from a curated local database.

## Deploy to Cloudflare Workers

This repository is configured for the Worker at `formarchive.dan-1113.workers.dev`.

1. Connect this repository to the existing `formarchive` Worker in Cloudflare, or deploy from the project root with `npx wrangler deploy`.
2. In the Worker settings, add `GEMINI_API_KEY` as an encrypted secret. The key is read only by the Worker and is never sent to the browser.
3. Optional: set `GEMINI_MODEL` to choose another model. The default is `gemini-3.5-flash-lite`.
4. Redeploy the Worker after adding or changing secrets.

The Worker serves the static archive and handles `POST /api/search`. Search requests are limited to 240 characters and rate-limited per client IP. The AI only classifies the user's request into the archive's supported tags; the browser then ranks the real records already present in `index.html`. It does not invent projects or source links.

## Search behavior

When Gemini is available, the search panel shows the AI-interpreted design tags and a short explanation, then filters and ranks the archive. If Gemini is unavailable, the page clearly falls back to local keyword matching.

Never put a Gemini API key in `index.html`, browser JavaScript, or a committed file. Store it as a Cloudflare Worker secret named `GEMINI_API_KEY`.

## Project files

- `index.html` — responsive archive, search, filters, bookmarks, style glossary, timeline, and reference details.
- `src/index.js` — Cloudflare Worker API endpoint that securely calls Gemini.
- `wrangler.jsonc` — Worker and static asset configuration.
- `.assetsignore` — prevents source and configuration files from being served as public assets.
- `.gitignore` — excludes local secrets and development files from commits.
