// 인동고1 1학기말 시험범위 · 지문별 주제 / 주제문장 모음 (2종)
// node build-topic-indong-h1.js

const path = require('path');
const {
  ROOT,
  parseMainLinkCollection,
  parseLegacyCollection,
  parseTopicAnalysis,
  enrichItems,
  sortKey,
  runTopicBuild,
} = require('./assets/build-topic-hyunil-core');

const OUT_THEME = path.join(ROOT, 'collections', '2026년-1학기말고사-인동고1-주제-모음.html');
const OUT_SENTENCE = path.join(ROOT, 'collections', '2026년-1학기말고사-인동고1-주제문장-모음.html');

const NAV = {
  themeHref: '2026년-1학기말고사-인동고1-주제-모음.html',
  sentenceHref: '2026년-1학기말고사-인동고1-주제문장-모음.html',
  extraLinks: [
    { href: '인동고1-1학기말_부교재분석자료.html', label: '📋 시험범위' },
    { href: '2026년-1학기말고사-인동고1-모의고사-한줄해석.html', label: '📝 모의고사 한줄해석' },
  ],
};

const MOCK_SOURCES = [
  { label: '2026 3월 모의고사', file: 'collections/2026년-고1-3월-모의고사-분석구조도.html', mode: 'legacy' },
  { label: '2026 6월 모의고사', file: 'collections/고1-2026년-6모고.html', mode: 'main-link' },
];

const LESSON_ORDER = ['6강', '7강', '11강', '15강', '16강'];

function olympusBadge(it) {
  const m = it.localPath.match(/\/([^/]+)\/analysis\.html$/);
  if (!m) return it.code;
  return m[1].replace(/^\d+강_/, '');
}

function collectIndongH1Series() {
  const catalogItems = parseMainLinkCollection('collections/인동고1-1학기말_부교재분석자료.html');
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
      title: `올림포스 기출 · ${lesson}`,
      items,
      badgeFn: olympusBadge,
    });
  }

  for (const src of MOCK_SOURCES) {
    const list = src.mode === 'main-link' ? parseMainLinkCollection(src.file) : parseLegacyCollection(src.file);
    const items = enrichItems(list, src.label);
    if (items.length) {
      allSeries.push({ title: src.label, items, badgeFn: (it) => it.code });
    }
  }

  return allSeries;
}

const allSeries = collectIndongH1Series();
const result = runTopicBuild({
  nav: NAV,
  outTheme: OUT_THEME,
  outSentence: OUT_SENTENCE,
  titleTheme: '2026년 1학기말고사 인동고1 · 지문별 주제 모음',
  titleSentence: '2026년 1학기말고사 인동고1 · 지문별 주제문장 모음',
  heroTheme:
    '인동고1 1학기말 시험범위 <strong>올림포스 기출(6·7·11·15·16강)</strong>과 <strong>2026 고1 모의고사(3·6월)</strong> 지문의 <strong>주제(요지)</strong>를 한글로 정리했습니다. <strong>주제·요지·제목 고르기</strong> 대비용으로 암기하세요.',
  heroSentence:
    '같은 시험범위 지문의 <strong>주제문장(중심문장)</strong> 영문과 한글 해설입니다. <strong>빈칸·필자 주장·구조 파악</strong> 대비용으로 활용하세요.',
  searchTheme: '🔍 제목·주제 검색…',
  searchSentence: '🔍 제목·주제문 검색…',
  primaryLabel: '올림포스',
  secondaryLabel: '모의고사',
  allSeries,
});

console.log('생성 완료:');
console.log(' -', result.outThemeRel);
console.log(' -', result.outSentenceRel);
console.log('총 지문:', result.totalPassages, `(올림포스 ${result.primaryCount} + 모의고사 ${result.secondaryCount})`);
for (const s of allSeries) {
  console.log(`  - ${s.title}: ${s.items.length}지문`);
}
