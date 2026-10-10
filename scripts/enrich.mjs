// Build-time enrichment: merges curated projects.json with live GitHub stats.
// Writes src/data/enriched.json. Safe to run offline (falls back to curated only).
// Usage: node ./scripts/enrich.mjs [--no-fetch]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const curatedPath = path.join(root, 'src/data/projects.json');
const outPath = path.join(root, 'src/data/enriched.json');
const noFetch = process.argv.includes('--no-fetch');

const curated = JSON.parse(await readFile(curatedPath, 'utf8'));

async function fetchRepo(full) {
  const headers = { 'User-Agent': 'techwiz-hub', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/repos/${full}`, { headers });
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${full}`);
  const j = await res.json();
  return {
    stars: j.stargazers_count ?? 0,
    forks: j.forks_count ?? 0,
    openIssues: j.open_issues_count ?? 0,
    language: j.language ?? null,
    topics: j.topics ?? [],
    pushedAt: j.pushed_at ?? null,
    defaultBranch: j.default_branch ?? 'main',
    license: j.license?.spdx_id ?? null,
    ghDescription: j.description ?? null,
  };
}

const out = [];
for (const p of curated) {
  let live = {};
  if (!noFetch) {
    try {
      live = await fetchRepo(p.repo);
    } catch (e) {
      console.warn(`[enrich] ${p.repo}: ${e.message} — using curated only`);
    }
  }
  out.push({ ...p, live });
}

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(out, null, 2));
console.log(`[enrich] wrote ${out.length} projects -> src/data/enriched.json`);
