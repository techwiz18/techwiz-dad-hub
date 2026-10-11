// Build-time forum integration: pulls the live RetroBB sitemap and writes
// src/data/forum.json (boards + topics) for the home "From the forum" section.
// Safe offline: on any failure it writes empty lists and the section hides.
// Override source: FORUM_URL=https://forum.techwiz.dad
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outPath = path.join(root, 'src/data/forum.json');
const site = (process.env.FORUM_URL ?? 'https://forum.techwiz.dad').replace(/\/$/, '');

const pretty = (slug) =>
  slug
    .split('.')[0]
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

const out = { fetchedAt: new Date().toISOString(), source: site, boards: [], topics: [] };

try {
  const res = await fetch(`${site}/sitemap.xml`, { headers: { 'User-Agent': 'techwiz-hub' } });
  if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  for (const loc of locs) {
    const m = loc.match(/\/(forum|topic)\/([^/]+)$/);
    if (!m) continue;
    const item = { title: pretty(m[2]), url: loc };
    if (m[1] === 'topic') out.topics.push(item);
    else out.boards.push(item);
  }
  // Sitemap carries no timestamps yet; keep sitemap order, cap the lists.
  out.topics = out.topics.slice(0, 8);
  out.boards = out.boards.slice(0, 12);
  console.log(`[forum] ${out.topics.length} topics, ${out.boards.length} boards from ${site}`);
} catch (e) {
  console.warn(`[forum] ${e.message} — shipping without forum data`);
}

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(out, null, 2));
console.log('[forum] wrote src/data/forum.json');
