// 인동고2 1학기말 시험범위 · 지문별 주제 / 주제문장 모음 (2종)
// node build-topic-indong-h2.js

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  parseMainLinkCollection,
  parseTopicAnalysis,
  enrichItems,
  sortKey,
  runTopicBuild,
  toGithubUrl,
} = require('./assets/build-topic-hyunil-core');

const CATALOG = path.join(ROOT, 'collections', '인동고2-1학기말_부교재분석자료.html');
const OUT_THEME = path.join(ROOT, 'collections', '2026년-1학기말고사-인동고2-주제-모음.html');
const OUT_SENTENCE = path.join(ROOT, 'collections', '2026년-1학기말고사-인동고2-주제문장-모음.html');

const NAV = {
  themeHref: '2026년-1학기말고사-인동고2-주제-모음.html',
  sentenceHref: '2026년-1학기말고사-인동고2-주제문장-모음.html',
  extraLinks: [{ href: '인동고2-1학기말_부교재분석자료.html', label: '📋 시험범위' }],
};

// 시험범위: EBS 수능특강 라이트 영어독해연습 25지문
const SUTSPEC_UNITS = [
  '강10-Ex1',
  '강10-Ex2',
  '강10-Ex3',
  '강10-Ex4',
  '강2-Ex5',
  '강2-Ex6',
  '강3-Ex1',
  '강3-Ex2',
  '강3-Ex3',
  '강3-Ex4',
  '강3-Ex5',
  '강3-Ex6',
  '강4-Ex1',
  '강4-Ex2',
  '강4-Ex3',
  '강4-Ex4',
  '강4-Ex5·6(장문)',
  '강8-Ex1',
  '강8-Ex2',
  '강8-Ex3',
  '강8-Ex4',
  '강9-Ex1',
  '강9-Ex2',
  '강9-Ex3',
  '강9-Ex4',
];

const LESSON_ORDER = ['2강', '3강', '4강', '8강', '9강', '10강'];

function resolveSutspecPath(unitLabel) {
  const base = 'study/L09/고2_2026_수특라이트';
  const m = unitLabel.match(/^강(\d+)-Ex(\d+)/);
  if (!m) return null;
  const lesson = `${m[1]}강`;
  const ex = `Ex${m[2]}`;
  const candidates = [
    `${base}/${lesson}/${ex}/analysis.html`,
    `${base}/${lesson}/${ex.toLowerCase()}/analysis.html`,
    `${base}/${lesson}/강${m[1]}-${ex}/analysis.html`,
    `${base}/${lesson}/${m[1]}강_${ex}/analysis.html`,
  ];
  for (const p of candidates) {
    if (fs.existsSync(path.join(ROOT, p))) return p;
  }
  return candidates[0];
}

function titleFromAnalysis(localPath, fallback) {
  const a = parseTopicAnalysis(localPath);
  if (a?.topic) return a.topic.split(/[.。]/)[0].slice(0, 40);
  const full = path.join(ROOT, localPath);
  if (fs.existsSync(full)) {
    const html = fs.readFileSync(full, 'utf8');
    const tm = html.match(/<title>([^<]+)<\/title>/i);
    if (tm) return tm[1].trim();
  }
  return fallback;
}

function writeCatalog() {
  const byLesson = new Map();
  for (const unit of SUTSPEC_UNITS) {
    const lessonM = unit.match(/^강(\d+)-/);
    const lesson = lessonM ? `${lessonM[1]}강` : '기타';
    if (!byLesson.has(lesson)) byLesson.set(lesson, []);
    byLesson.get(lesson).push(unit);
  }

  let body = '';
  for (const lesson of LESSON_ORDER.filter((l) => byLesson.has(l))) {
    body += `<div class="book"><h2 class="book-title">📚 ${lesson}</h2>`;
    for (const unit of byLesson.get(lesson)) {
      const localPath = resolveSutspecPath(unit);
      if (!localPath) continue;
      const url = toGithubUrl(localPath);
      const title = titleFromAnalysis(localPath, unit);
      body += `<div class="chapter"><h3 class="chapter-title">📖 ${unit}</h3><div class="items"><div class="item">
          <a href="${url}#analysis" target="_blank" class="item-main-link">
            <div class="item-meta">
              <code class="item-code">${unit.replace(/^강\d+-/, '')}</code>
              <strong class="item-title">${title}</strong>
            </div>
          </a>
          <div class="item-links">
            <a href="${url}#analysis" target="_blank">📄 분석교안</a>
          </div>
        </div></div></div>`;
    }
    body += '</div>';
  }

  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>인동고2 1학기말_부교재분석자료</title>
<style>
  :root { --brand:#6B5B95; --brand-dark:#4A3D6B; --brand-light:#E8E4F3; --bg:#F7F5F0; --border:#e8e4f3; --text:#2a2438; --text-soft:#6c6480; --text-muted:#999; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Pretendard','Malgun Gothic',-apple-system,sans-serif; background:var(--bg); color:var(--text); line-height:1.5; padding:24px 16px; }
  .container { max-width:1100px; margin:0 auto; }
  .header { background:linear-gradient(135deg,var(--brand),var(--brand-dark)); color:#fff; padding:36px 28px; border-radius:18px; text-align:center; margin-bottom:24px; }
  h1 { font-size:28px; margin-bottom:8px; }
  .subtitle { font-size:14px; opacity:.92; }
  .book-title { font-size:19px; margin:18px 0 10px; color:var(--brand-dark); }
  .chapter-title { font-size:15px; margin:10px 0 8px; color:var(--text-soft); }
  .item { background:#fff; border:1px solid var(--border); border-radius:10px; padding:12px 14px; margin-bottom:8px; }
  .item-main-link { text-decoration:none; color:inherit; display:block; }
  .item-code { background:var(--brand); color:#fff; padding:2px 8px; border-radius:5px; font-size:11px; margin-right:8px; }
  .item-title { font-size:14px; font-weight:600; }
  .item-links { margin-top:8px; font-size:12px; }
  .item-links a { color:var(--brand-dark); margin-right:10px; }
  .footer { text-align:center; padding:24px 0 8px; font-size:12px; color:var(--text-muted); }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="brand">공우정바른학원 · GWJ EDU</div>
    <h1>인동고2 1학기말_부교재분석자료</h1>
    <div class="subtitle">${SUTSPEC_UNITS.length}개 지문 · EBS 수능특강 라이트 영어독해연습</div>
  </div>
  ${body}
  <div class="footer">Powered by GWJ AI 영어 분석기</div>
</div>
</body>
</html>`;
  fs.writeFileSync(CATALOG, html, 'utf8');
  console.log('목차 생성:', path.relative(ROOT, CATALOG));
}

function collectIndongH2Series() {
  writeCatalog();
  const catalogItems = parseMainLinkCollection('collections/인동고2-1학기말_부교재분석자료.html');
  const byLesson = new Map();

  for (const it of catalogItems) {
    const a = parseTopicAnalysis(it.localPath);
    if (!a) {
      console.warn('분석 없음:', it.localPath);
      continue;
    }
    if (!a.topicEn && !a.topic) {
      console.warn('주제·주제문 없음:', it.localPath);
      continue;
    }
    const lessonM = it.localPath.match(/\/(\d+강)\//);
    const lesson = lessonM ? lessonM[1] : '기타';
    if (!byLesson.has(lesson)) byLesson.set(lesson, []);
    byLesson.get(lesson).push({ ...it, ...a, sortKey: sortKey(it.code) });
  }

  const allSeries = [];
  for (const lesson of LESSON_ORDER.filter((l) => byLesson.has(l))) {
    const items = byLesson
      .get(lesson)
      .sort((a, b) => a.sortKey - b.sortKey || a.code.localeCompare(b.code, 'ko', { numeric: true }));
    allSeries.push({
      title: `수능특강 라이트 · ${lesson}`,
      items,
      badgeFn: (it) => it.code,
    });
  }

  return allSeries;
}

const allSeries = collectIndongH2Series();
const result = runTopicBuild({
  nav: NAV,
  outTheme: OUT_THEME,
  outSentence: OUT_SENTENCE,
  titleTheme: '2026년 1학기말고사 인동고2 · 지문별 주제 모음',
  titleSentence: '2026년 1학기말고사 인동고2 · 지문별 주제문장 모음',
  heroTheme:
    '인동고2 1학기말 시험범위 <strong>EBS 수능특강 라이트 영어독해연습(25지문)</strong>의 <strong>주제(요지)</strong>를 한글로 정리했습니다. <strong>주제·요지·제목 고르기</strong> 대비용으로 암기하세요.',
  heroSentence:
    '같은 시험범위 지문의 <strong>주제문장(중심문장)</strong> 영문과 한글 해설입니다. <strong>빈칸·필자 주장·구조 파악</strong> 대비용으로 활용하세요.',
  searchTheme: '🔍 제목·주제 검색…',
  searchSentence: '🔍 제목·주제문 검색…',
  primaryLabel: '수특라이트',
  secondaryLabel: '모의고사',
  allSeries,
});

console.log('생성 완료:');
console.log(' -', result.outThemeRel);
console.log(' -', result.outSentenceRel);
console.log('총 지문:', result.totalPassages, `(수특라이트 ${result.primaryCount})`);
for (const s of allSeries) {
  console.log(`  - ${s.title}: ${s.items.length}지문`);
}
if (result.totalPassages === 0) {
  console.warn('※ 분석교안(analysis.html)이 아직 없어 지문이 0개입니다. Syntax Studio로 생성 후 다시 빌드하세요.');
}
