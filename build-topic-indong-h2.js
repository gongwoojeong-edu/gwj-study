// 인동고2 1학기말 시험범위 · 지문별 주제 / 주제문장 모음 (2종)
// 범위: NE능률 오선영 교과서 2·4과 + 수특라이트 25 + 2026 6월 모의고사
// node build-topic-indong-h2.js

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  parseMainLinkCollection,
  parseTopicAnalysis,
  resolveTopicAnalysis,
  loadBackupRecords,
  enrichItems,
  sortKey,
  runTopicBuild,
  toGithubUrl,
} = require('./assets/build-topic-hyunil-core');

const CATALOG = path.join(ROOT, 'collections', '인동고2-1학기말_시험범위.html');
const SUTSPEC_CATALOG = path.join(ROOT, 'collections', '인동고2-1학기말_부교재분석자료.html');
const OUT_THEME = path.join(ROOT, 'collections', '2026년-1학기말고사-인동고2-주제-모음.html');
const OUT_SENTENCE = path.join(ROOT, 'collections', '2026년-1학기말고사-인동고2-주제문장-모음.html');

const NAV = {
  themeHref: '2026년-1학기말고사-인동고2-주제-모음.html',
  sentenceHref: '2026년-1학기말고사-인동고2-주제문장-모음.html',
  extraLinks: [
    { href: '인동고2-1학기말_시험범위.html', label: '📋 시험범위' },
    { href: '인동고2-1학기말_부교재분석자료.html', label: '📚 수특라이트' },
    { href: '고2-6모고.html', label: '📝 6월 모의고사' },
  ],
};

const TEXTBOOK_BASE = 'study/L09/NE능률_오선영_영어I';

const TEXTBOOK_UNITS = [
  {
    lesson: '2과',
    code: '본문',
    title: 'Wake Up Your Lazy Brain!',
    subtitle: 'The Power of Good Habits',
  },
  {
    lesson: '4과',
    code: '본문',
    title: 'Seeing the Extraordinary in the Ordinary',
    subtitle: 'Spark Your Creativity',
  },
];

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

const SUTSPEC_LESSON_ORDER = ['2강', '3강', '4강', '8강', '9강', '10강'];

const MOCK_SOURCES = [{ label: '2026 6월 모의고사', file: 'collections/고2-6모고.html' }];

function textbookPath(unit) {
  return `${TEXTBOOK_BASE}/${unit.lesson}/${unit.code}/analysis.html`;
}

function resolveSutspecPath(unitLabel) {
  const base = 'study/L09/고2_2026_수특라이트';
  const m = unitLabel.match(/^강(\d+)-Ex(\d+)/);
  if (!m) return null;
  const lesson = `${m[1]}강`;
  const ex = `Ex${m[2]}`;
  const num = `${m[2]}번`;
  const candidates = [
    `${base}/${lesson}/${ex}/analysis.html`,
    `${base}/${lesson}/${num}/analysis.html`,
    `${base}/${lesson}/${m[1]}강-${num}/analysis.html`,
  ];
  for (const p of candidates) {
    if (fs.existsSync(path.join(ROOT, p))) return p;
  }
  return candidates[0];
}

function titleFromAnalysis(localPath, fallback, backupRecords) {
  const a = parseTopicAnalysis(localPath) || null;
  if (a?.topic) return a.topic.split(/[.。]/)[0].slice(0, 40);
  const full = path.join(ROOT, localPath);
  if (fs.existsSync(full)) {
    const html = fs.readFileSync(full, 'utf8');
    const tm = html.match(/<title>([^<]+)<\/title>/i);
    if (tm) return tm[1].trim();
  }
  return fallback;
}

function catalogItemHtml({ localPath, code, title, links = ['analysis'] }) {
  const url = toGithubUrl(localPath);
  const linkHtml = links
    .map((kind) => {
      if (kind === 'structure') {
        const structPath = localPath.replace(/analysis\.html$/, 'structure.html');
        return `<a href="${toGithubUrl(structPath)}#structure" target="_blank">🗂 구조도</a>`;
      }
      return `<a href="${url}#analysis" target="_blank">📄 분석교안</a>`;
    })
    .join('\n            ');
  return `<div class="item">
          <a href="${url}#analysis" target="_blank" class="item-main-link">
            <div class="item-meta">
              <code class="item-code">${code}</code>
              <strong class="item-title">${title}</strong>
            </div>
          </a>
          <div class="item-links">
            ${linkHtml}
          </div>
        </div>`;
}

function writeCatalog() {
  let textbookBody = '';
  for (const unit of TEXTBOOK_UNITS) {
    const localPath = textbookPath(unit);
    const displayTitle = unit.subtitle ? `${unit.title} · ${unit.subtitle}` : unit.title;
    textbookBody += `<div class="chapter"><h3 class="chapter-title">📖 ${unit.lesson} ${unit.code}</h3><div class="items">${catalogItemHtml({
      localPath,
      code: unit.code,
      title: displayTitle,
    })}</div></div>`;
  }

  const byLesson = new Map();
  for (const unit of SUTSPEC_UNITS) {
    const lessonM = unit.match(/^강(\d+)-/);
    const lesson = lessonM ? `${lessonM[1]}강` : '기타';
    if (!byLesson.has(lesson)) byLesson.set(lesson, []);
    byLesson.get(lesson).push(unit);
  }

  let sutspecBody = '';
  for (const lesson of SUTSPEC_LESSON_ORDER.filter((l) => byLesson.has(l))) {
    sutspecBody += `<div class="book"><h2 class="book-title">📚 ${lesson}</h2>`;
    for (const unit of byLesson.get(lesson)) {
      const localPath = resolveSutspecPath(unit);
      if (!localPath) continue;
      const title = titleFromAnalysis(localPath, unit);
      sutspecBody += `<div class="chapter"><h3 class="chapter-title">📖 ${unit}</h3><div class="items">${catalogItemHtml({
        localPath,
        code: unit.replace(/^강\d+-/, ''),
        title,
      })}</div></div>`;
    }
    sutspecBody += '</div>';
  }

  const mockItems = parseMainLinkCollection('collections/고2-6모고.html');
  let mockBody = '';
  for (const it of mockItems) {
    mockBody += `<div class="chapter"><h3 class="chapter-title">📖 ${it.code}번</h3><div class="items">${catalogItemHtml({
      localPath: it.localPath,
      code: it.code,
      title: it.title || `${it.code}번`,
      links: ['analysis', 'structure'],
    })}</div></div>`;
  }

  const totalCount = TEXTBOOK_UNITS.length + SUTSPEC_UNITS.length + mockItems.length;

  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>인동고2 1학기말 시험범위</title>
<style>
  :root { --brand:#6B5B95; --brand-dark:#4A3D6B; --brand-light:#E8E4F3; --bg:#F7F5F0; --border:#e8e4f3; --text:#2a2438; --text-soft:#6c6480; --text-muted:#999; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Pretendard','Malgun Gothic',-apple-system,sans-serif; background:var(--bg); color:var(--text); line-height:1.5; padding:24px 16px; }
  .container { max-width:1100px; margin:0 auto; }
  .header { background:linear-gradient(135deg,var(--brand),var(--brand-dark)); color:#fff; padding:36px 28px; border-radius:18px; text-align:center; margin-bottom:24px; }
  h1 { font-size:28px; margin-bottom:8px; }
  .subtitle { font-size:14px; opacity:.92; }
  .intro { background:#fff; border-left:4px solid var(--brand); padding:14px 18px; border-radius:10px; margin-bottom:18px; font-size:14px; color:var(--text-soft); }
  .level-section { background:#fff; border-radius:16px; padding:22px 24px; margin-bottom:22px; box-shadow:0 2px 10px rgba(0,0,0,.05); }
  .level-header { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding-bottom:14px; margin-bottom:18px; border-bottom:2px solid var(--brand-light); }
  .level-badge { background:linear-gradient(135deg,var(--brand),var(--brand-dark)); color:#fff; padding:6px 12px; border-radius:8px; font-size:14px; font-weight:700; }
  .level-name { font-size:18px; font-weight:700; color:var(--brand-dark); }
  .level-count { margin-left:auto; font-size:12px; color:var(--text-muted); background:var(--brand-light); padding:4px 10px; border-radius:12px; }
  .book-title { font-size:19px; margin:18px 0 10px; color:var(--brand-dark); }
  .chapter-title { font-size:15px; margin:10px 0 8px; color:var(--text-soft); }
  .item { background:#faf9fc; border:1px solid var(--border); border-radius:10px; padding:12px 14px; margin-bottom:8px; }
  .item-main-link { text-decoration:none; color:inherit; display:block; }
  .item-code { background:var(--brand); color:#fff; padding:2px 8px; border-radius:5px; font-size:11px; margin-right:8px; }
  .item-title { font-size:14px; font-weight:600; }
  .item-links { margin-top:8px; font-size:12px; }
  .item-links a { color:var(--brand-dark); margin-right:10px; text-decoration:none; }
  .footer { text-align:center; padding:24px 0 8px; font-size:12px; color:var(--text-muted); }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="brand">공우정바른학원 · GWJ EDU</div>
    <h1>인동고2 1학기말 시험범위</h1>
    <div class="subtitle">${totalCount}개 지문 · 교과서 2·4과 + 수특라이트 + 6월 모의고사</div>
  </div>
  <div class="intro">인동고2 1학기말 시험범위입니다. <strong>NE능률(오선영) 영어I</strong> 교과서 2·4과, <strong>EBS 수능특강 라이트</strong> 25지문, <strong>2026년 6월 고2 모의고사</strong> 독해·어법·어휘 지문(18~45번)을 포함합니다.</div>

  <div class="level-section">
    <div class="level-header">
      <span class="level-badge">교과서</span>
      <span class="level-name">NE능률(오선영) 영어I</span>
      <span class="level-count">${TEXTBOOK_UNITS.length}지문</span>
    </div>
    ${textbookBody}
  </div>

  <div class="level-section">
    <div class="level-header">
      <span class="level-badge">부교재</span>
      <span class="level-name">EBS 수능특강 라이트 영어독해연습</span>
      <span class="level-count">${SUTSPEC_UNITS.length}지문</span>
    </div>
    ${sutspecBody}
  </div>

  <div class="level-section">
    <div class="level-header">
      <span class="level-badge">모의고사</span>
      <span class="level-name">2026년 6월 고2 전국연합학력평가</span>
      <span class="level-count">${mockItems.length}지문</span>
    </div>
    <div class="book"><h2 class="book-title">📚 6월</h2>${mockBody}</div>
  </div>

  <div class="footer">Powered by GWJ AI 영어 분석기</div>
</div>
</body>
</html>`;
  fs.writeFileSync(CATALOG, html, 'utf8');
  console.log('목차 생성:', path.relative(ROOT, CATALOG));
}

async function collectTextbookSeries(backupRecords) {
  const items = [];
  for (const unit of TEXTBOOK_UNITS) {
    const localPath = textbookPath(unit);
    const it = {
      localPath,
      code: `${unit.lesson} ${unit.code}`,
      title: unit.title,
      url: toGithubUrl(localPath),
    };
    const a = await resolveTopicAnalysis(localPath, { backupRecords });
    if (!a) {
      console.warn('분석 없음(교과서):', localPath);
      continue;
    }
    if (!a.topicEn && !a.topic) {
      console.warn('주제·주제문 없음(교과서):', localPath);
      continue;
    }
    items.push({ ...it, ...a, sortKey: sortKey(unit.lesson) });
  }
  if (!items.length) return [];
  return [{ title: 'NE능률(오선영) · 2·4과', items, badgeFn: (it) => it.code }];
}

async function collectSutspecSeries(backupRecords) {
  const catalogItems = parseMainLinkCollection(path.relative(ROOT, SUTSPEC_CATALOG));
  const byLesson = new Map();

  for (const it of catalogItems) {
    const a = await resolveTopicAnalysis(it.localPath, { backupRecords });
    if (!a) {
      console.warn('분석 없음(수특):', it.localPath);
      continue;
    }
    if (!a.topicEn && !a.topic) {
      console.warn('주제·주제문 없음(수특):', it.localPath, it.title || it.code);
      continue;
    }
    const lessonM = it.localPath.match(/\/(\d+강)\//);
    const lesson = lessonM ? lessonM[1] : '기타';
    if (!byLesson.has(lesson)) byLesson.set(lesson, []);
    byLesson.get(lesson).push({
      ...it,
      ...a,
      title: it.title && it.title !== it.code ? it.title : a.expected || it.title,
      sortKey: sortKey(it.code),
    });
  }

  const series = [];
  for (const lesson of SUTSPEC_LESSON_ORDER.filter((l) => byLesson.has(l))) {
    const items = byLesson
      .get(lesson)
      .sort((a, b) => a.sortKey - b.sortKey || a.code.localeCompare(b.code, 'ko', { numeric: true }));
    series.push({
      title: `수능특강 라이트 · ${lesson}`,
      items,
      badgeFn: (it) => it.code,
    });
  }
  return series;
}

async function collectIndongH2Series() {
  writeCatalog();
  const { records: backupRecords, path: backupPath } = loadBackupRecords();
  if (backupPath) {
    console.log('백업 로드:', path.relative(ROOT, backupPath), `(${backupRecords.length}건)`);
  } else {
    console.warn('백업 JSON 없음 — analysis.html 또는 GitHub Pages만 사용합니다.');
  }

  const allSeries = [
    ...(await collectTextbookSeries(backupRecords)),
    ...(await collectSutspecSeries(backupRecords)),
  ];

  for (const src of MOCK_SOURCES) {
    const list = parseMainLinkCollection(src.file);
    const items = enrichItems(list, src.label);
    if (items.length) {
      allSeries.push({ title: src.label, items, badgeFn: (it) => it.code });
    }
  }

  return allSeries;
}

(async () => {
  const allSeries = await collectIndongH2Series();
  const result = runTopicBuild({
    nav: NAV,
    outTheme: OUT_THEME,
    outSentence: OUT_SENTENCE,
    titleTheme: '2026년 1학기말고사 인동고2 · 지문별 주제 모음',
    titleSentence: '2026년 1학기말고사 인동고2 · 지문별 주제문장 모음',
    heroTheme:
      '인동고2 1학기말 시험범위 <strong>NE능률(오선영) 교과서 2·4과</strong>, <strong>EBS 수능특강 라이트(25지문)</strong>, <strong>2026 고2 6월 모의고사</strong> 지문의 <strong>주제(요지)</strong>를 한글로 정리했습니다. <strong>주제·요지·제목 고르기</strong> 대비용으로 암기하세요.',
    heroSentence:
      '같은 시험범위 지문의 <strong>주제문장(중심문장)</strong> 영문과 한글 해설입니다. <strong>빈칸·필자 주장·구조 파악</strong> 대비용으로 활용하세요.',
    searchTheme: '🔍 제목·주제 검색…',
    searchSentence: '🔍 제목·주제문 검색…',
    primaryLabel: '교과서·수특',
    secondaryLabel: '모의고사',
    allSeries,
  });

  console.log('생성 완료:');
  console.log(' -', result.outThemeRel);
  console.log(' -', result.outSentenceRel);
  console.log(' -', path.relative(ROOT, CATALOG));
  console.log('총 지문:', result.totalPassages, `(교과서·수특 ${result.primaryCount} + 모의 ${result.secondaryCount})`);
  for (const s of allSeries) {
    console.log(`  - ${s.title}: ${s.items.length}지문`);
  }
  if (result.primaryCount === 0) {
    console.warn('※ 수특/교과서 주제가 0개입니다. Syntax Studio → 📦 백업 내보내기 → node sync-sutspec-analysis-from-backup.js → node build-topic-indong-h2.js');
  }
})();
