// 현일고2 1학기말 시험범위 · 지문별 주제 / 주제문장 모음 (2종)
// node build-topic-hyunil-h2.js

const path = require('path');
const {
  ROOT,
  parseMainLinkCollection,
  parseTopicAnalysis,
  enrichItems,
  sortKey,
  runTopicBuild,
} = require('./assets/build-topic-hyunil-core');

const OUT_THEME = path.join(ROOT, 'collections', '2026년-1학기말고사-현일고2-주제-모음.html');
const OUT_SENTENCE = path.join(ROOT, 'collections', '2026년-1학기말고사-현일고2-주제문장-모음.html');

const NAV = {
  themeHref: '2026년-1학기말고사-현일고2-주제-모음.html',
  sentenceHref: '2026년-1학기말고사-현일고2-주제문장-모음.html',
  extraLinks: [
    { href: '2026년-1학기말고사-현일고2-부교재-분석자료.html', label: '📋 시험범위' },
    { href: '2026-고2-3월-모의고사.html', label: '📝 3월 모의고사' },
    { href: '고2-6모고.html', label: '📝 6월 모의고사' },
    { href: '현일고2-2026-1학기말-5월이투스.html', label: '📝 5월 이투스' },
  ],
};

const MOCK_SOURCES = [
  { label: '2026 3월 모의고사', file: 'collections/2026-고2-3월-모의고사.html' },
  { label: '2026 6월 모의고사', file: 'collections/고2-6모고.html' },
  { label: '2026 5월 이투스 모의고사', file: 'collections/현일고2-2026-1학기말-5월이투스.html', dedupe: true },
];

const HACKERS_VOL_ORDER = ['1회', '2회', '제1회'];

function hackersBadge(it) {
  const m = it.localPath.match(/\/([^/]+)\/analysis\.html$/);
  return m ? m[1].replace(/^0?2회_/, '').replace(/^1회_/, '') : it.code;
}

function collectH2Series() {
  const catalogItems = parseMainLinkCollection('collections/2026년-1학기말고사-현일고2-부교재-분석자료.html');

  const byVol = new Map();
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
    const volM = it.localPath.match(/해커스수능독해불변의법칙\/([^/]+)\//);
    const vol = volM ? volM[1] : '기타';
    if (!byVol.has(vol)) byVol.set(vol, []);
    byVol.get(vol).push({ ...it, ...a, sortKey: sortKey(it.code) });
  }

  const allSeries = [];
  for (const vol of HACKERS_VOL_ORDER.filter((v) => byVol.has(v))) {
    const items = byVol.get(vol).sort((a, b) => a.sortKey - b.sortKey || a.code.localeCompare(b.code, 'ko', { numeric: true }));
    allSeries.push({
      title: `해커스 수능독해 불변의법칙 · ${vol}`,
      items,
      badgeFn: hackersBadge,
    });
  }

  for (const src of MOCK_SOURCES) {
    const list = parseMainLinkCollection(src.file, { dedupe: !!src.dedupe });
    const items = enrichItems(list, src.label);
    if (items.length) {
      allSeries.push({ title: src.label, items, badgeFn: (it) => it.code });
    }
  }

  return allSeries;
}

const allSeries = collectH2Series();
const result = runTopicBuild({
  nav: NAV,
  outTheme: OUT_THEME,
  outSentence: OUT_SENTENCE,
  titleTheme: '2026년 1학기말고사 현일고2 · 지문별 주제 모음',
  titleSentence: '2026년 1학기말고사 현일고2 · 지문별 주제문장 모음',
  heroTheme:
    '현일고2 1학기말 시험범위 <strong>해커스 수능독해 불변의법칙(1·2·제1회)</strong>과 <strong>2026 고2 모의고사(3·5·6월)</strong> 지문의 <strong>주제(요지)</strong>를 한글로 정리했습니다. <strong>주제·요지·제목 고르기</strong> 대비용으로 암기하세요.',
  heroSentence:
    '같은 시험범위 지문의 <strong>주제문장(중심문장)</strong> 영문과 한글 해설입니다. <strong>빈칸·필자 주장·구조 파악</strong> 대비용으로 활용하세요.',
  searchTheme: '🔍 제목·주제 검색…',
  searchSentence: '🔍 제목·주제문 검색…',
  primaryLabel: '부교재',
  secondaryLabel: '모의고사',
  allSeries,
});

console.log('생성 완료:');
console.log(' -', result.outThemeRel);
console.log(' -', result.outSentenceRel);
console.log('총 지문:', result.totalPassages, `(부교재 ${result.primaryCount} + 모의고사 ${result.secondaryCount})`);
for (const s of allSeries) {
  console.log(`  - ${s.title}: ${s.items.length}지문`);
}
