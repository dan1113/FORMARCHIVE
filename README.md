# FORMARCHIVE

AI Design Reference & Trend Archive — a static prototype for discovering real design references through structured tags.

## Deploy to Cloudflare Pages

1. In Cloudflare, create a Pages project and connect this repository.
2. Select the `main` branch.
3. Choose **None** as the framework preset.
4. Leave the build command empty.
5. Set the build output directory to `.`.
6. Deploy.

The site is a single static page at the repository root. No build step or API key is needed for the current demo.

## Current search behavior

Search currently matches locally maintained design tags in the browser. It does not call Gemini or any other AI API. Adding a `GEMINI_API_KEY` secret in Cloudflare alone will not change the search behavior; Gemini needs a server-side Pages Function or Worker endpoint before the key can be used.

Never put a Gemini API key in `index.html`, other browser code, or a committed file. Store it as a Cloudflare secret when a server-side integration is added.

## Project files

- `index.html` — responsive archive, search preview, filters, bookmarks, style glossary, timeline, and reference details.
- `.gitignore` — excludes local secrets and development files from commits.
