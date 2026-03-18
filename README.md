# Creative Cloud Developer Newsletter Archive

A browsable archive of Adobe Creative Cloud Developer newsletters. The repo contains one HTML file per issue and an index page that shows auto-generated thumbnails with search.

## What’s in the repo

- **Newsletter HTML files** – One `.html` file per issue (e.g. `74Aug2024.html`, `89Sept2025.html`). These are the source of truth.
- **index.html** – Gallery page that lists all newsletters with thumbnails and a search box. It loads the list from `thumbnails/manifest.json`.
- **thumbnails/** – Generated PNG thumbnails and `manifest.json`. Produced by the thumbnail script (see below).
- **scripts/generate-thumbnails.mjs** – Script that builds the thumbnails and rewrites `index.html` and `thumbnails/manifest.json`.

## Preview locally

From the repo root:

```bash
# Option A: Python
python3 -m http.server 8000
# Then open http://localhost:8000

# Option B: Node
npx serve
# Then open the URL printed (e.g. http://localhost:3000)
```

Open `index.html` to see the gallery, or open any newsletter HTML directly.

---

## Building / regenerating thumbnails

Thumbnails are screenshots of the **top 1200×700 px** of each newsletter HTML. The script:

1. Starts a local static server and loads each newsletter in a headless browser (Playwright/Chromium).
2. Injects CSS to hide the shared “Adobe Creative Cloud Developer Newsletter” header graphic so each thumbnail shows that issue’s content instead of the same banner.
3. Takes a screenshot, writes `thumbnails/<basename>.png`, and builds `thumbnails/manifest.json`.
4. **Overwrites `index.html`** with a fresh copy that references the new manifest.

**Requirements:** Node.js (v18+), npm, and Playwright’s Chromium browser.

### Steps for a human or an AI

1. **Install dependencies** (from repo root):
   ```bash
   npm install
   ```

2. **Install Playwright’s browser** (required once per machine/CI):
   ```bash
   npx playwright install chromium
   ```
   On Linux CI you may need:
   ```bash
   npx playwright install --with-deps chromium
   ```

3. **Generate thumbnails and update the index**:
   ```bash
   npm run thumbs
   ```
   This will:
   - Find every `.html` in the repo root except `index.html`.
   - For each file: serve it, open it in Chromium, hide the newsletter header graphic, screenshot the top 1200×700, and save to `thumbnails/<filename-without-.html>.png`.
   - Write `thumbnails/manifest.json` with `{ file, title, thumbnail }` per newsletter.
   - Replace `index.html` with the built gallery that loads this manifest.

4. **Commit the changes** (if desired):
   - `thumbnails/*.png`
   - `thumbnails/manifest.json`
   - `index.html`

### Script options

Run with `--help` for full usage:

```bash
node scripts/generate-thumbnails.mjs --help
```

Useful options:

- `--root <dir>` – Directory containing the newsletter HTML files (default: current directory).
- `--outDir <dir>` – Where to write PNGs and `manifest.json` (default: `thumbnails`).
- `--include <a.html,b.html>` – Only process these filenames (comma-separated).
- `--viewport <WxH>` – Browser viewport (default: `1200x900`).
- `--clip <WxH>` – Screenshot clip from top-left (default: `1200x700`).

Example: regenerate thumbnails for only two issues:

```bash
node scripts/generate-thumbnails.mjs --include 89Sept2025.html,88July2025.html
```

### CI (GitHub Actions)

The workflow in `.github/workflows/thumbnails.yml` runs on push to `main` when any `**/*.html` changes. It installs Node and Playwright, runs `npm run thumbs`, then commits and pushes updates to `thumbnails/` and `index.html` (with `[skip ci]` to avoid loops).

---

## Summary for an AI assistant

To **regenerate thumbnails and update the index** in this repo:

1. Run `npm install`.
2. Run `npx playwright install chromium` (or `npx playwright install --with-deps chromium` on Linux).
3. Run `npm run thumbs`.
4. The script updates `thumbnails/*.png`, `thumbnails/manifest.json`, and overwrites `index.html`. Commit those changes if the user wants them in version control.
