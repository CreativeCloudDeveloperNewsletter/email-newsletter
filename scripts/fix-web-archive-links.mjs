#!/usr/bin/env node
/**
 * Prepare newsletter HTML for static web viewing:
 * - Strip Adobe Campaign editing attributes from <body> (contenteditable, data-contenteditable,
 *   is-html-mode class).
 * - Remove contenteditable="true" / data-contenteditable="true" from any element (td/strong
 *   wrappers otherwise swallow clicks).
 * - Trim leading whitespace in href after the opening quote (e.g. href=" https://...").
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SKIP = new Set(
  ['index.html', 'adobe-apo-template.html', 'exchange-footer.html', 'operational-template.html'].map((s) =>
    s.toLowerCase()
  )
);

function fixBodyOpenTag(html) {
  return html.replace(/<body\b([^>]*)>/i, (full, attrs) => {
    let a = attrs
      .replace(/\s+contenteditable\s*=\s*["']true["']/gi, '')
      .replace(/\s+contenteditable\s*=\s*["']false["']/gi, '')
      .replace(/\s+data-contenteditable\s*=\s*["']true["']/gi, '')
      .replace(/\s+data-contenteditable\s*=\s*["']false["']/gi, '');

    const stripClass = (quote, inner) => {
      const parts = inner
        .trim()
        .split(/\s+/)
        .filter((p) => p && !['is-html-mode', 'x_is-html-mode'].includes(p.toLowerCase()));
      if (parts.length === 0) return '';
      return ` class=${quote}${parts.join(' ')}${quote}`;
    };

    a = a.replace(/\s+class\s*=\s*"([^"]*)"/gi, (_, inner) => stripClass('"', inner));
    a = a.replace(/\s+class\s*=\s*'([^']*)'/gi, (_, inner) => stripClass("'", inner));
    a = a.replace(/\s{2,}/g, ' ').replace(/^\s+|\s+$/g, '');
    return a.length ? `<body ${a}>` : '<body>';
  });
}

function stripGlobalEditableAttrs(html) {
  let out = html;
  out = out.replace(/\s+data-contenteditable\s*=\s*["']true["']/gi, '');
  out = out.replace(/\s+contenteditable\s*=\s*["']true["']/gi, '');
  out = out.replace(/\s+class\s*=\s*["']x_is-html-mode["']/gi, '');
  return out;
}

function fixHrefLeadingSpace(html) {
  return html.replace(/href=(["'])\s+(https?:\/\/)/gi, 'href=$1$2');
}

async function main() {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.html'))
    .map((e) => e.name)
    .filter((name) => !SKIP.has(name.toLowerCase()));

  let updated = 0;
  const touched = [];

  for (const name of files) {
    const fp = path.join(root, name);
    const before = await fs.readFile(fp, 'utf8');
    let after = fixBodyOpenTag(before);
    after = stripGlobalEditableAttrs(after);
    after = fixHrefLeadingSpace(after);
    if (after !== before) {
      await fs.writeFile(fp, after, 'utf8');
      updated += 1;
      touched.push(name);
    }
  }

  console.log(`Updated ${updated} / ${files.length} newsletter HTML files.`);
  if (touched.length && touched.length <= 35) {
    console.log(touched.join('\n'));
  } else if (touched.length) {
    console.log(touched.slice(0, 30).join('\n'));
    console.log(`… and ${touched.length - 30} more`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
