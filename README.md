# FORMARCHIVE

AI Design Reference & Trend Archive — a reference archive that translates visual ideas into design language and finds related works from a curated local database.

## Deploy to Cloudflare Workers

This repository is configured for the Worker at `formarchive.dan-1113.workers.dev`.

1. From the repository root, deploy the project with `npx wrangler deploy` (or enable a Cloudflare Git deployment for this repository).
2. Add the Gemini key to the existing `formarchive` Worker as an encrypted secret with `npx wrangler secret put GEMINI_API_KEY`. Enter the replacement key at Wrangler's hidden prompt; never put it in a source file or chat.
3. Redeploy after the secret is added or changed: `npx wrangler deploy`.
4. Optional: set `GEMINI_MODEL` to choose another supported model. The default is `gemini-3.5-flash-lite`.

The Worker serves the static archive and handles `POST /api/search`. Search requests are limited to 240 characters and rate-limited per client IP. The default `source: "archive"` path uses Gemini to select only from the eight curated records and returns allowlisted IDs, tags, and short match reasons. The optional `source: "pinterest"` path enables Gemini Google Search grounding with a Pinterest Pin-focused query; it returns the current grounded answer, citation links, and Google's required Search Suggestions for display to the user who submitted that query. Pinterest-grounded responses are not stored by the Worker or browser.

## Search behavior

The search interface separates `ALL REFERENCES` from `SEARCH PINTEREST`. Archive mode ranks only curated records and falls back to local keyword matching if Gemini is unavailable. Pinterest mode is a separate live web search and does not insert external results into the archive. It renders Google's grounded response and its associated Search Suggestions. Google Search grounding has separate per-query billing; check current Gemini API pricing before increasing usage. Pinterest API OAuth credentials are not required for this Google-grounded discovery path.

Never put a Gemini API key in `index.html`, browser JavaScript, or a committed file. Store it as a Cloudflare Worker secret named `GEMINI_API_KEY`.

## Project files

- `index.html` — responsive archive, search, filters, bookmarks, style glossary, timeline, and reference details.
- `src/index.js` — Cloudflare Worker API endpoint that securely calls Gemini.
- `wrangler.jsonc` — Worker and static asset configuration.
- `.assetsignore` — prevents source and configuration files from being served as public assets.
- `.gitignore` — excludes local secrets and development files from commits.
