// 6월 모의고사 전 지문 어휘표 추출 -> assets/vocab-6mo.json
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCES = [
  { level: '고1', label: '(고1) 2026 6월 모의고사', file: 'collections/고1-2026년-6모고.html' },
  { level: '고2', label: '(고2) 2026 6월 모의고사', file: 'collections/고2-6모고.html' },
];

function parseCollection(htmlPath) {
  const html = fs.readFileSync(path.join(ROOT, htmlPath), 'utf8');
  const re =
    /<a\s+href="(https:\/\/gongwoojeong-edu\.github\.io\/gwj-study\/(study\/[^"#]+analysis\.html))[^"]*"[^>]*class="item-main-link">[\s\S]*?<code class="item-code">([^<]*)<\/code>\s*<strong class="item-title">([^<]*)<\/strong>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    out.push({ url: m[1], localPath: decodeURIComponent(m[2]), code: m[3].trim(), koTitle: m[4].trim() });
  }
  return out;
}

const clean = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

// 비고에서 유의어/반의어 라벨 분리
function splitNote(note) {
  const res = { syn: '', ant: '', etc: '' };
  if (!note) return res;
  // "유의어: a, b" / "반의어: c" / "..., 유의어" 등 다양한 형태 대응
  let rest = note;
  const synM = rest.match(/유의어\s*[:：]?\s*([^/|;]+)/);
  const antM = rest.match(/반의어\s*[:：]?\s*([^/|;]+)/);
  if (synM) res.syn = synM[1].replace(/유의어/g, '').trim();
  if (antM) res.ant = antM[1].replace(/반의어/g, '').trim();
  if (!synM && !antM) res.etc = note;
  return res;
}

function parseVocab(localPath) {
  const full = path.join(ROOT, localPath);
  if (!fs.existsSync(full)) return [];
  const html = fs.readFileSync(full, 'utf8');
  const tableM = html.match(/<table class="vocab-table">([\s\S]*?)<\/table>/);
  if (!tableM) return [];
  const body = tableM[1];
  const rowRe = /<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g;
  const rows = [];
  let m;
  while ((m = rowRe.exec(body))) {
    const word = clean(m[1]);
    if (!word || word === '단어·어구') continue;
    const note = clean(m[4]);
    rows.push({ word, pos: clean(m[2]), meaning: clean(m[3]), note, ...splitNote(note) });
  }
  return rows;
}

const data = [];
const uniq = new Map();
let totalRows = 0;
for (const src of SOURCES) {
  const list = parseCollection(src.file);
  for (const it of list.sort((a, b) => (parseInt(a.code) || 999) - (parseInt(b.code) || 999))) {
    const vocab = parseVocab(it.localPath);
    if (!vocab.length) continue;
    totalRows += vocab.length;
    data.push({ level: src.level, label: src.label, code: it.code, koTitle: it.koTitle, url: it.url, vocab });
    for (const v of vocab) {
      const key = v.word.toLowerCase();
      if (!uniq.has(key)) uniq.set(key, { word: v.word, meaning: v.meaning, count: 0 });
      uniq.get(key).count++;
    }
  }
}

fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'assets', 'vocab-6mo.json'), JSON.stringify(data, null, 2), 'utf8');

// 고유어 목록도 별도 저장(보강 작성용 참고)
const uniqList = [...uniq.values()].sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));
fs.writeFileSync(path.join(ROOT, 'assets', 'vocab-6mo-unique.json'), JSON.stringify(uniqList, null, 2), 'utf8');

const withSyn = data.reduce((n, p) => n + p.vocab.filter((v) => v.syn).length, 0);
const withAnt = data.reduce((n, p) => n + p.vocab.filter((v) => v.ant).length, 0);

console.log('지문 수:', data.length, '/ 총 어휘 행:', totalRows, '/ 고유 단어:', uniq.size);
console.log('기존 데이터에 유의어 라벨 있는 행:', withSyn, '/ 반의어 라벨 있는 행:', withAnt);
console.log('저장: assets/vocab-6mo.json , assets/vocab-6mo-unique.json');
