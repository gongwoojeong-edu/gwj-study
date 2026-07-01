const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BASE = path.join(ROOT, 'study', 'L08', '고1_2026_올림포스영어독해기본1');
const LESSONS = ['5강', '8강', '9강'];

function strip(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parse(p) {
  const h = fs.readFileSync(p, 'utf8');
  const t = h.match(/<title>([^<]*)<\/title>/i);
  const e = h.match(/예상 제목<\/th>\s*<td>([\s\S]*?)<\/td>/);
  const chunks = h.split('<div class="sentence-block">').slice(1);
  let lines = 0;
  let firstEn = '';
  for (const ch of chunks) {
    const tr = ch.match(/direct-trans/);
    if (!tr) continue;
    lines++;
    if (!firstEn) {
      const enM = ch.match(/<div class="sentence-en">([\s\S]*?)<\/div>/);
      if (enM) firstEn = strip(enM[1]).slice(0, 55);
    }
  }
  return { ko: strip(t && t[1]), en: strip(e && e[1]), lines, firstEn };
}

const all = [];
for (const lesson of LESSONS) {
  const dir = path.join(BASE, lesson);
  for (const sub of fs.readdirSync(dir).sort()) {
    const ap = path.join(dir, sub, 'analysis.html');
    if (!fs.existsSync(ap) || !fs.statSync(path.join(dir, sub)).isDirectory()) continue;
    const r = parse(ap);
    all.push({ lesson, sub, ...r });
  }
}

console.log(JSON.stringify(all, null, 2));
