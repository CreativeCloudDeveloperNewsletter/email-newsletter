import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_VIEWPORT = { width: 1200, height: 900 };
const DEFAULT_CLIP = { x: 0, y: 0, width: 1200, height: 700 };

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    outDir: 'thumbnails',
    clip: { ...DEFAULT_CLIP },
    viewport: { ...DEFAULT_VIEWPORT },
    timeoutMs: 60_000,
    include: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--root') args.root = path.resolve(argv[++i] ?? '');
    else if (token === '--outDir') args.outDir = argv[++i] ?? args.outDir;
    else if (token === '--timeoutMs') args.timeoutMs = Number(argv[++i] ?? args.timeoutMs);
    else if (token === '--viewport') {
      const [w, h] = (argv[++i] ?? '').split('x').map((n) => Number(n));
      if (Number.isFinite(w) && Number.isFinite(h)) args.viewport = { width: w, height: h };
    } else if (token === '--clip') {
      const [w, h] = (argv[++i] ?? '').split('x').map((n) => Number(n));
      if (Number.isFinite(w) && Number.isFinite(h)) args.clip = { ...args.clip, width: w, height: h };
    } else if (token === '--include') {
      args.include = (argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    } else if (token === '--help' || token === '-h') {
      return { ...args, help: true };
    }
  }

  return args;
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml; charset=utf-8';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.woff') return 'font/woff';
  if (ext === '.woff2') return 'font/woff2';
  if (ext === '.ttf') return 'font/ttf';
  return 'application/octet-stream';
}

async function listHtmlFiles(rootDir, includeList) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => name.toLowerCase().endsWith('.html'))
    .filter((name) => name.toLowerCase() !== 'index.html');

  const filtered = includeList?.length
    ? files.filter((f) => includeList.includes(f))
    : files;

  return filtered.sort((a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }));
}

async function extractTitle(rootDir, htmlFilename) {
  try {
    const full = path.join(rootDir, htmlFilename);
    const html = await fs.readFile(full, 'utf8');
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (m?.[1]) return m[1].trim();
  } catch {
    // ignore
  }
  return htmlFilename.replace(/\.html$/i, '');
}

function startStaticServer(rootDir) {
  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url ?? '/', 'http://localhost');
      const pathname = decodeURIComponent(reqUrl.pathname);

      // Prevent traversal; serve strictly within rootDir.
      const rel = pathname.replace(/^\//, '');
      const requested = path.resolve(rootDir, rel);
      if (!requested.startsWith(path.resolve(rootDir))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      // Default doc if someone hits "/"
      const filePath = rel === '' ? path.join(rootDir, 'index.html') : requested;

      const stat = await fs.stat(filePath).catch(() => null);
      if (!stat || !stat.isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const buf = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': contentTypeFor(filePath), 'Cache-Control': 'no-store' });
      res.end(buf);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err?.message ?? err));
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') return reject(new Error('Failed to bind server'));
      resolve({ server, port: addr.port });
    });
  });
}

function usage() {
  return `
Generate hero thumbnails for each newsletter HTML file.

Usage:
  npm run thumbs
  node ${path.relative(process.cwd(), path.join(__dirname, 'generate-thumbnails.mjs'))} [options]

Options:
  --root <dir>           Root directory containing HTML files (default: cwd)
  --outDir <dir>         Output directory (default: thumbnails)
  --viewport <WxH>       Viewport (default: 1200x900)
  --clip <WxH>           Screenshot clip size starting from 0,0 (default: 1200x700)
  --timeoutMs <ms>       Per-page timeout (default: 60000)
  --include <a,b,c.html> Only render these exact filenames
  --help                 Show help
`.trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    // eslint-disable-next-line no-console
    console.log(usage());
    return;
  }

  const rootDir = args.root;
  const outDir = path.join(rootDir, args.outDir);
  await fs.mkdir(outDir, { recursive: true });

  const htmlFiles = await listHtmlFiles(rootDir, args.include);
  if (htmlFiles.length === 0) {
    // eslint-disable-next-line no-console
    console.log('No HTML files found.');
    return;
  }

  const { server, port } = await startStaticServer(rootDir);
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: args.viewport });
  const page = await context.newPage();

  const manifest = [];

  try {
    for (const file of htmlFiles) {
      const url = `${baseUrl}/${encodeURIComponent(file)}`;
      const basename = file.replace(/\.html$/i, '');
      const thumbRel = path.posix.join(args.outDir, `${basename}.png`);
      const thumbAbs = path.join(rootDir, thumbRel);

      // eslint-disable-next-line no-console
      console.log(`Rendering ${file} -> ${thumbRel}`);

      await page.goto(url, { waitUntil: 'networkidle', timeout: args.timeoutMs }).catch(async () => {
        await page.goto(url, { waitUntil: 'load', timeout: args.timeoutMs });
      });

      // Make thumbnails more consistent across years (still faithful to the content).
      await page.addStyleTag({
        content: `
          * { animation: none !important; transition: none !important; }
          html, body { background: #ffffff !important; }
        `
      });

      await page.waitForTimeout(350);

      await page.screenshot({
        path: thumbAbs,
        clip: args.clip
      });

      const title = await extractTitle(rootDir, file);
      manifest.push({
        file,
        title,
        thumbnail: thumbRel
      });
    }
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  // Generate a simple GitHub Pages index gallery at repo root (reads the manifest at runtime).
  const indexPath = path.join(rootDir, 'index.html');
  const manifestUrl = `${args.outDir.replace(/\\/g, '/')}/manifest.json`;
  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Creative Cloud Developer Newsletter Archive</title>
    <style>
      :root { color-scheme: light dark; }
      body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #0b0c10; color: #f7f7f7; }
      header { padding: 24px 20px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); }
      h1 { margin: 0 0 8px; font-size: 20px; font-weight: 650; }
      p { margin: 0; opacity: 0.85; }
      main { padding: 18px 16px 40px; max-width: 1200px; margin: 0 auto; }
      .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
      .card { display: block; text-decoration: none; color: inherit; border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; }
      .card:hover { border-color: rgba(255,255,255,0.22); background: rgba(255,255,255,0.08); }
      img { width: 100%; height: auto; display: block; background: #fff; }
      .meta { padding: 10px 12px 12px; }
      .title { font-size: 13px; font-weight: 600; line-height: 1.25; }
      .file { font-size: 12px; opacity: 0.75; margin-top: 4px; word-break: break-word; }
      @media (prefers-color-scheme: light) {
        body { background: #f6f7fb; color: #12131a; }
        header { border-bottom-color: rgba(0,0,0,0.08); }
        .card { border-color: rgba(0,0,0,0.10); background: rgba(0,0,0,0.03); }
        .card:hover { border-color: rgba(0,0,0,0.20); background: rgba(0,0,0,0.05); }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Creative Cloud Developer Newsletter Archive</h1>
      <p>Thumbnails are auto-generated from the top of each HTML newsletter.</p>
    </header>
    <main>
      <div id="status" style="margin: 0 0 14px; opacity: 0.85;"></div>
      <div id="grid" class="grid"></div>
    </main>
    <script>
      const statusEl = document.getElementById('status');
      const gridEl = document.getElementById('grid');

      function escapeHtml(s) {
        return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
      }

      async function run() {
        statusEl.textContent = 'Loading manifest...';
        try {
          const res = await fetch('${manifestUrl}', { cache: 'no-store' });
          if (!res.ok) throw new Error('Failed to load manifest: ' + res.status);
          const manifest = await res.json();
          if (!Array.isArray(manifest) || manifest.length === 0) {
            statusEl.innerHTML = 'No entries yet. Generate thumbnails to populate <code>thumbnails/manifest.json</code>.';
            return;
          }

          statusEl.textContent = manifest.length + ' issues';
          const frag = document.createDocumentFragment();
          for (const m of manifest) {
            const a = document.createElement('a');
            a.className = 'card';
            a.href = m.file;

            const img = document.createElement('img');
            img.loading = 'lazy';
            img.src = m.thumbnail;
            img.alt = m.title || m.file;

            const meta = document.createElement('div');
            meta.className = 'meta';

            const title = document.createElement('div');
            title.className = 'title';
            title.textContent = m.title || m.file;

            const file = document.createElement('div');
            file.className = 'file';
            file.textContent = m.file;

            meta.appendChild(title);
            meta.appendChild(file);

            a.appendChild(img);
            a.appendChild(meta);
            frag.appendChild(a);
          }
          gridEl.appendChild(frag);
        } catch (err) {
          statusEl.innerHTML = 'Error: <code>' + escapeHtml(err?.message || String(err)) + '</code>';
        }
      }

      run();
    </script>
  </body>
</html>
`;

  await fs.writeFile(indexPath, indexHtml, 'utf8');

  // eslint-disable-next-line no-console
  console.log(`\nWrote ${manifestPath}`);
  // eslint-disable-next-line no-console
  console.log(`Wrote ${indexPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});


