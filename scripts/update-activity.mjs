// Rewrites the "$ tail -n 5 activity.log" section of README.md with my most
// recent commits across repos (commit search API — the public events API no
// longer includes commit messages). No third-party services.
// Usage: GITHUB_TOKEN=<token> node scripts/update-activity.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const USER = 'JesseWebDotCom';
const token = process.env.GITHUB_TOKEN;
if (!token) { console.error('GITHUB_TOKEN required'); process.exit(1); }

const res = await fetch(
  `https://api.github.com/search/commits?q=${encodeURIComponent(`author:${USER}`)}&sort=committer-date&order=desc&per_page=50`,
  { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': USER } }
);
if (!res.ok) throw new Error(`search/commits -> ${res.status}`);
const { items } = await res.json();

const rows = [];
for (const item of items) {
  const repo = item.repository.name;
  if (repo === USER) continue; // skip this profile repo's own housekeeping
  rows.push({
    date: item.commit.author.date.slice(0, 10),
    repo,
    msg: item.commit.message.split('\n')[0],
  });
  if (rows.length === 5) break;
}

const repoW = Math.max(...rows.map((r) => r.repo.length));
const lines = rows.map((r) => `${r.date}  commit  ${r.repo.padEnd(repoW)}  ${r.msg}`.slice(0, 108));
const block = '```text\n' + lines.join('\n') + '\n```';

const readme = readFileSync('README.md', 'utf8');
const updated = readme.replace(
  /<!--ACTIVITY:START-->[\s\S]*<!--ACTIVITY:END-->/,
  `<!--ACTIVITY:START-->\n${block}\n<!--ACTIVITY:END-->`
);
writeFileSync('README.md', updated);
console.log(`activity updated: ${rows.length} entries`);
