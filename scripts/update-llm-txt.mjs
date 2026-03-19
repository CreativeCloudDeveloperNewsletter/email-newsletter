#!/usr/bin/env node
/**
 * Generates llm.txt from thumbnails/manifest.json so the file stays in sync
 * with the newsletter list. Run after npm run thumbs or manually to refresh
 * the index. Edit the NOTABLE_TOPICS section in this file to add topic hints.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const MONTH_ABBREV = new Map([
  ['jan', 'January'], ['feb', 'February'], ['mar', 'March'], ['march', 'March'],
  ['apr', 'April'], ['april', 'April'], ['may', 'May'], ['jun', 'June'], ['june', 'June'],
  ['jul', 'July'], ['july', 'July'], ['aug', 'August'], ['sep', 'September'], ['sept', 'September'],
  ['oct', 'October'], ['nov', 'November'], ['dec', 'December']
]);
const MONTH_PATTERN = 'jan|feb|mar|march|apr|april|may|jun|june|jul|july|aug|sep|sept|oct|nov|dec';

function dateFromFilename(file) {
  const base = file.replace(/\.html$/i, '');
  const lower = base.toLowerCase();
  // Group 1,2: year then month (e.g. 2024dec); Group 3,4,5: optional digits, month, year (e.g. 78Dec2024)
  const match = lower.match(new RegExp(`(\\d{4})(${MONTH_PATTERN})|(\\d{1,3})?(${MONTH_PATTERN})(\\d{4})`));
  if (!match) return null;
  let year, monthKey;
  if (match[1] && match[2]) {
    year = match[1];
    monthKey = match[2];
  } else if (match[4] && match[5]) {
    monthKey = match[4];
    year = match[5];
  } else {
    return null;
  }
  const month = MONTH_ABBREV.get(monthKey) || monthKey;
  return `${month} ${year}`;
}

const NOTABLE_TOPICS = `## Notable topics (for quick answers)

- UXP in Photoshop / when did UXP come to Photoshop: October 2020 — 27Oct2020.html
- Adobe XD extensibility: October 2018 — 04Oct2018.html
- CEP 9, Exchange, XD updates: September 2018 — 03Sep2018.html
- UXP Developer Tool 2.0, Photoshop C++ SDK: October 2023 — 64Oct2023.html
- Adobe MAX announcements, Express Office Hours: October 2024 — 76Oct2024.html
- InDesign 20 C++, Express Office Hours: July 2024 — 73Jul2024.html
- UXP Validator, Office Hours, Add-ons: March 2024 — 69Mar2024.html
- Adobe Express Document APIs, Office Hours: February 2024 — 68Feb2024.html
- Pixel APIs in Photoshop, Exchange Manifest Validation: January 2023 — 54Jan2023.html
- Developer Roundtable, Express APIs, LinkedIn: December 2023 — 66Dec2023.html`;

async function main() {
  const manifestPath = path.join(ROOT, 'thumbnails', 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  const decodeEntities = (s) => String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  const indexLines = manifest.map(({ file, title }) => {
    const date = dateFromFilename(file) || '(see filename)';
    const titleClean = decodeEntities((title || file).replace(/\s+/g, ' ').trim());
    return `${date} | ${file} | ${titleClean}`;
  });

  const baseUrlNote = `Base URL: When this repo is hosted (e.g. GitHub Pages), replace the base URL below with the root URL (e.g. https://owner.github.io/Email-Newsletter/). Each newsletter link is base URL + filename.`;

  const llmContent = `# Creative Cloud Developer Newsletter Archive

This file is for AI agents and humans discovering Creative Cloud Developer news. Use it to answer questions like "When did UXP come to Photoshop?" or "Where can I read about Adobe MAX 2024?" — match the question to an edition below, then report the date and the link (base URL + filename) to the user.

${baseUrlNote}

Base URL (replace for your host): https://github.com/OWNER/REPO/blob/main/

---

${NOTABLE_TOPICS}

---

## Index of all editions (date | filename | title)

Newest first. Link = base URL + filename.

${indexLines.join('\n')}
`;

  const outPath = path.join(ROOT, 'llm.txt');
  await writeFile(outPath, llmContent, 'utf8');
  console.log('Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
