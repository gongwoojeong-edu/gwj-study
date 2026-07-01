// 주제(요약) vs 주제문장(원문 중심문) 정렬 점검
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'collections', '2026년-1학기말고사-현일고-주제문장-모음.html');

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTopicAnalysis(localPath) {
  const full = path.join(ROOT, localPath);
  if (!fs.existsSync(full)) return null;
  const html = fs.readFileSync(full, 'utf8');
  let topic = '';
  const tm = html.match(/<tr><th>주제<\/th>\s*<td>([\s\S]*?)<\/td>/);
  if (tm) topic = stripHtml(tm[1]);
  let topicEn = '';
  let topicKo = '';
  const tsm = html.match(
    /<div class="topic-sentence-box">\s*<div class="en">([\s\S]*?)<\/div>\s*<div class="ko">([\s\S]*?)<\/div>/,
  );
  if (tsm) {
    topicEn = stripHtml(tsm[1]).replace(/^["']|["']$/g, '');
    topicKo = stripHtml(tsm[2]).replace(/^→\s*/, '');
  }
  let examTopic = '';
  const tr = html.match(/제목·주제 선택[\s\S]*?주제:\s*([^<\n]+)/);
  if (tr) examTopic = tr[1].trim();
  return { topic, topicEn, topicKo, examTopic };
}

const html = fs.readFileSync(OUT, 'utf8');
const re = /href="https:\/\/gongwoojeong-edu\.github\.io\/gwj-study\/(study\/[^"]+analysis\.html)"/g;
const paths = [...new Set([...html.matchAll(re)].map((m) => decodeURIComponent(m[1])))];

const rows = [];
for (const p of paths) {
  const a = parseTopicAnalysis(p);
  if (!a) continue;
  rows.push({ path: p, ...a });
}

console.log('지문 수:', rows.length);
console.log('주제문장(영) 없음:', rows.filter((r) => !r.topicEn).length);
console.log('주제(요약) 없음:', rows.filter((r) => !r.topic).length);
console.log('④ 제목·주제 선택 블록 있음:', rows.filter((r) => r.examTopic).length);

// 주제 vs 주제문장 한글 해설 키워드 겹침 (간단)
function words(s) {
  return new Set(
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1),
  );
}
let lowOverlap = [];
for (const r of rows) {
  const w1 = words(r.topic);
  const w2 = words(r.topicKo || r.topicEn);
  const inter = [...w1].filter((x) => w2.has(x));
  const ratio = w2.size ? inter.length / Math.min(w1.size, w2.size) : 0;
  if (ratio < 0.15 && r.topic && r.topicKo) {
    lowOverlap.push({ path: r.path.split('/').slice(-3).join('/'), ratio: ratio.toFixed(2), topic: r.topic.slice(0, 70), ko: r.topicKo.slice(0, 70) });
  }
}
console.log('한글 주제↔주제문 해설 키워드 겹침 낮음(<15%):', lowOverlap.length);
lowOverlap.slice(0, 5).forEach((x) => console.log(' -', x.path, x.ratio, '|', x.topic));

console.log('\n--- 대표 3건 ---');
rows.slice(0, 3).forEach((r) => {
  console.log('\n[' + r.path.split('/').slice(-2).join('/') + ']');
  console.log('주제:', r.topic);
  console.log('주제문:', r.topicEn);
  console.log('해설:', r.topicKo);
  if (r.examTopic) console.log('④주제:', r.examTopic);
});
