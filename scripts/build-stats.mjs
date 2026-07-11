// Generates assets/stats-dark.svg and assets/stats-light.svg — a neofetch-style
// GitHub stats card built entirely from the GitHub API. No third-party services.
// Usage: GITHUB_TOKEN=<token> node scripts/build-stats.mjs

const USER = 'JesseWebDotCom';
const token = process.env.GITHUB_TOKEN;
if (!token) { console.error('GITHUB_TOKEN required'); process.exit(1); }

const gh = async (path) => {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': USER },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
};

const LANG_COLORS = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5', PHP: '#4F5D95',
  Shell: '#89e051', HTML: '#e34c26', SCSS: '#c6538c', CSS: '#563d7c',
  Batchfile: '#C1F12E', Dockerfile: '#384d54', PowerShell: '#012456', 'C#': '#178600',
  'C++': '#f34b7d', C: '#555555', Vue: '#41b883', Svelte: '#ff3e00', Go: '#00ADD8',
};
const colorOf = (lang) => LANG_COLORS[lang] ?? '#8b949e';

const user = await gh(`/users/${USER}`);
const repos = (await gh(`/users/${USER}/repos?per_page=100&type=owner`)).filter((r) => !r.fork);
const stars = repos.reduce((n, r) => n + r.stargazers_count, 0);

const langBytes = {};
for (const r of repos) {
  const langs = await gh(`/repos/${USER}/${r.name}/languages`);
  for (const [lang, bytes] of Object.entries(langs)) langBytes[lang] = (langBytes[lang] ?? 0) + bytes;
}
const totalBytes = Object.values(langBytes).reduce((a, b) => a + b, 0) || 1;
const topLangs = Object.entries(langBytes).sort((a, b) => b[1] - a[1]).slice(0, 6)
  .map(([lang, bytes]) => ({ lang, pct: (bytes / totalBytes) * 100 }));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function card(theme) {
  const t = theme === 'dark'
    ? { bg: '#0d1117', border: '#30363d', chrome: '#21262d', text: '#e6edf3', dim: '#8b949e', green: '#7ee787', blue: '#79c0ff', title: '#8b949e' }
    : { bg: '#ffffff', border: '#d0d7de', chrome: '#eaeef2', text: '#1f2328', dim: '#57606a', green: '#1a7f37', blue: '#0969da', title: '#57606a' };

  const W = 880, PAD = 28, LH = 24;
  const rows = [
    ['host', `github.com/${USER}`],
    ['repos', `${repos.length} public (originals, no forks)`],
    ['stars earned', `${stars}`],
    ['followers', `${user.followers}`],
    ['books shipped', '5 (Windows Admin Scripting series + C# 2005)'],
    ['uptime', '25+ years in enterprise tech'],
  ];

  // ~9px per char at 15px mono; key column padded to align values
  const keyW = Math.max(...rows.map(([k]) => k.length));
  const textRows = rows.map(([k, v], i) => {
    const y = 96 + i * LH;
    return `<text x="248" y="${y}"><tspan fill="${t.green}">${esc(k.padEnd(keyW))}</tspan><tspan fill="${t.dim}"> : </tspan><tspan fill="${t.text}">${esc(v)}</tspan></text>`;
  }).join('\n    ');

  // stacked language bar + legend
  const barX = 248, barY = 96 + rows.length * LH + 2, barW = W - barX - PAD, barH = 10;
  const legendRows = Math.ceil(topLangs.length / 3);
  const H = barY + barH + 30 + (legendRows - 1) * 22 + 26;
  let x = barX;
  const segs = topLangs.map(({ lang, pct }) => {
    const w = Math.max(3, (pct / 100) * barW);
    const seg = `<rect x="${x.toFixed(1)}" y="${barY}" width="${w.toFixed(1)}" height="${barH}" fill="${colorOf(lang)}"/>`;
    x += w;
    return seg;
  }).join('');
  const legend = topLangs.map(({ lang, pct }, i) => {
    const lx = barX + (i % 3) * 210, ly = barY + 30 + Math.floor(i / 3) * 22;
    return `<circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${colorOf(lang)}"/><text x="${lx + 18}" y="${ly}"><tspan fill="${t.text}">${esc(lang)}</tspan><tspan fill="${t.dim}"> ${pct.toFixed(1)}%</tspan></text>`;
  }).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub stats for ${USER}">
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="${t.bg}" stroke="${t.border}"/>
  <line x1="1" y1="44" x2="${W - 1}" y2="44" stroke="${t.chrome}"/>
  <circle cx="26" cy="22" r="6.5" fill="#ff5f57"/><circle cx="48" cy="22" r="6.5" fill="#febc2e"/><circle cx="70" cy="22" r="6.5" fill="#28c840"/>
  <text x="${W / 2}" y="27" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="12" fill="${t.title}">jesse@github — gh stats</text>
  <text x="120" y="${((44 + H) / 2 + 40).toFixed(0)}" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="120" font-weight="700" fill="${t.green}">❯</text>
  <g font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="15" xml:space="preserve">
    <text x="248" y="72"><tspan fill="${t.green}" font-weight="600">jesse</tspan><tspan fill="${t.dim}">@</tspan><tspan fill="${t.blue}" font-weight="600">github</tspan><tspan fill="${t.dim}">  ${'─'.repeat(24)}</tspan></text>
    ${textRows}
    ${segs}
    ${legend}
  </g>
</svg>
`;
}

import { writeFileSync } from 'node:fs';
writeFileSync('assets/stats-dark.svg', card('dark'));
writeFileSync('assets/stats-light.svg', card('light'));
console.log(`stats built: ${repos.length} repos, ${stars} stars, top langs: ${topLangs.map((l) => l.lang).join(', ')}`);
