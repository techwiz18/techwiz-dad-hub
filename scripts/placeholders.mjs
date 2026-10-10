import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('public/screenshots', { recursive: true });
const combos = [
  ['classic', 'light', '#3d639b', '#6f97c8', '#dfe6f0', '#1e2430'],
  ['classic', 'dark', '#2b456e', '#4a6ea0', '#141b2c', '#dbe3f0'],
  ['midnight', 'light', '#2f5794', '#5b8bd0', '#ffffff', '#1e2430'],
  ['midnight', 'dark', '#274b85', '#3f7ad0', '#0d1526', '#d6e0f2'],
  ['silver', 'light', '#7e8ba0', '#b9c3d4', '#f7f8fb', '#232a36'],
  ['silver', 'dark', '#5b667c', '#8e9cb5', '#1a1f29', '#d3dae6'],
];
for (const [skin, theme, to, from, panel, text] of combos) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1020" height="560" viewBox="0 0 1020 560"><rect width="1020" height="560" fill="${panel}"/><rect x="0" y="0" width="1020" height="64" fill="#1c2b4a"/><text x="24" y="40" font-family="Verdana" font-size="28" font-weight="bold" fill="#f5e9b8">RetroBB</text><text x="640" y="40" font-family="Verdana" font-size="14" fill="#f5e9b8">Skin ${skin} Theme ${theme}</text><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect x="24" y="96" width="972" height="44" rx="3" fill="url(#g)"/><rect x="24" y="156" width="972" height="120" fill="${panel}" stroke="${to}" stroke-width="2"/><rect x="24" y="292" width="972" height="120" fill="${panel}" stroke="${to}" stroke-width="2"/><text x="40" y="220" font-family="Verdana" font-size="15" fill="${text}">General - Say hello and read the ground rules.</text><text x="40" y="360" font-family="Verdana" font-size="15" fill="${text}">News</text><text x="24" y="470" font-family="Verdana" font-size="13" fill="${text}">PLACEHOLDER - replace with retrobb-${skin}-${theme}.png</text></svg>`;
  writeFileSync(`public/screenshots/retrobb-${skin}-${theme}.svg`, svg);
}
console.log('placeholders done');
