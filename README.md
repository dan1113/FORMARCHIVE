# FORMARCHIVE

AI Design Reference & Trend Archive — a reference archive that translates visual ideas into design language and finds related works from a curated local database.

## Deploy to Cloudflare Workers

This repository is configured for the Worker at `formarchive.dan-1113.workers.dev`.

1. From the repository root, deploy the project with `npx wrangler deploy` (or enable a Cloudflare Git deployment for this repository).
2. Add the Gemini key to the existing `formarchive` Worker as an encrypted secret with `npx wrangler secret put GEMINI_API_KEY`. Enter the replacement key at Wrangler's hidden prompt; never put it in a source file or chat.
3. Redeploy after the secret is added or changed: `npx wrangler deploy`.
4. Optional: set `GEMINI_MODEL` to choose another supported model. The default is `gemini-3.5-flash-lite`.

The Worker serves the static archive and handles `POST /api/search`. Search requests are limited to 240 characters and rate-limited per client IP. Gemini receives only the eight curated archive records and returns allowlisted record IDs, tags, and short match reasons. The interface displays only those existing records; it does not accept generated projects or source links.

## Search behavior

When Gemini is available, the search panel shows the interpreted tags and ranks only selected archive records. If Gemini is unavailable, the page clearly falls back to local keyword matching against the archive.

Never put a Gemini API key in `index.html`, browser JavaScript, or a committed file. Store it as a Cloudflare Worker secret named `GEMINI_API_KEY`.

## Project files

- `index.html` — responsive archive, search, filters, bookmarks, style glossary, timeline, and reference details.
- `src/index.js` — Cloudflare Worker API endpoint that securely calls Gemini.
- `wrangler.jsonc` — Worker and static asset configuration.
- `.assetsignore` — prevents source and configuration files from being served as public assets.
- `.gitignore` — excludes local secrets and development files from commits.
