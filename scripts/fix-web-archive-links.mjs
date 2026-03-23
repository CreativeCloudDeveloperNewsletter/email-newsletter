#!/usr/bin/env node
/**
 * Prepare newsletter HTML for static web viewing:
 * - Strip Adobe Campaign editing attributes from <body> (contenteditable, data-contenteditable,
 *   is-html-mode class).
 * - Remove contenteditable="true" / data-contenteditable="true" from any element (td/strong
 *   wrappers otherwise swallow clicks).
 * - Trim leading whitespace in href after the opening quote (e.g. href=" https://...").
 * - Fix Gmail/client garbage like ` "="" class="` that breaks <a> parsing.
 * - Promote data-nl-lnkep-perso-attr-href into href when href is # or empty (Adobe Campaign
 *   personalization placeholders), then strip the data attribute.
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

function parseOpeningTagEnd(html, start) {
  let j = start;
  let inQ = null;
  const n = html.length;
  while (j < n) {
    const c = html[j];
    if (inQ) {
      if (c === inQ) inQ = null;
    } else if (c === '"' || c === "'") {
      inQ = c;
    } else if (c === '>') {
      return j + 1;
    }
    j += 1;
  }
  return null;
}

function findNextRealA(html, pos) {
  const n = html.length;
  while (pos < n) {
    const i = html.indexOf('<a', pos);
    if (i === -1) return -1;
    const nxt = i + 2;
    if (nxt >= n) return i;
    const c = html[nxt];
    if (' \t\n\r/>'.includes(c)) return i;
    if (
      html.startsWith('<abbr', i) ||
      html.startsWith('<address', i) ||
      html.startsWith('<article', i) ||
      html.startsWith('<aside', i)
    ) {
      pos = i + 2;
      continue;
    }
    pos = i + 1;
  }
  return -1;
}

function mapAOpenTags(html, fn) {
  let out = '';
  let i = 0;
  while (true) {
    const start = findNextRealA(html, i);
    if (start === -1) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, start);
    const end = parseOpeningTagEnd(html, start);
    if (end === null) {
      out += html.slice(start);
      break;
    }
    const tag = html.slice(start, end);
    out += fn(tag);
    i = end;
  }
  return out;
}

function fixPersoDataOnAOpenTag(tag) {
  const dataD = /data-nl-lnkep-perso-attr-href\s*=\s*"([^"]*)"/i;
  const dataS = /data-nl-lnkep-perso-attr-href\s*=\s*'([^']*)'/i;
  const dm = tag.match(dataD) || tag.match(dataS);
  let t = tag;
  if (dm) {
    const rawUrl = dm[1].trim();
    const decoded = rawUrl.replace(/&amp;/g, '&').trim();
    if (decoded && decoded !== '#') {
      if (/\bhref\s*=\s*"#"/i.test(t)) t = t.replace(/\bhref\s*=\s*"#"/i, `href="${rawUrl}"`);
      else if (/\bhref\s*=\s*'#'/i.test(t)) t = t.replace(/\bhref\s*=\s*'#'/i, `href="${rawUrl}"`);
      else if (/\bhref\s*=\s*""/i.test(t)) t = t.replace(/\bhref\s*=\s*""/i, `href="${rawUrl}"`);
      else if (/\bhref\s*=\s*''/i.test(t)) t = t.replace(/\bhref\s*=\s*''/i, `href="${rawUrl}"`);
    }
  }
  t = t.replace(/\s*data-nl-lnkep-perso-attr-href\s*=\s*"[^"]*"/gi, '');
  t = t.replace(/\s*data-nl-lnkep-perso-attr-href\s*=\s*'[^']*'/gi, '');
  t = t.replace(/\s{2,}/g, ' ');
  t = t.replace(/ </g, '<');
  return t;
}

function fixGmailGarbage(html) {
  return html
    .replace(/\s+"=""\s+class="/g, ' class="')
    .replace(/\s+"=""\s*>/g, '>')
    .replace(/\s+"=""\s+/g, ' ');
}

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
    after = fixGmailGarbage(after);
    after = mapAOpenTags(after, fixPersoDataOnAOpenTag);
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
