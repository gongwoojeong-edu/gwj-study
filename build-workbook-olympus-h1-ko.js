// 올림포스 영어독해기본1 · 5·8·9강 → 한글 내용파악 워크북 (학생용 / 정답지)

const fs = require('fs');
const path = require('path');
const { brandCss, BRAND_PRINT_CSS, heroBrandHtml, watermarkHtml, TOOLBAR_CSS, toolbarLeftHtml } = require('./assets/build-page-ui');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'study', 'L08', '고1_2026_올림포스영어독해기본1');
const COLLECTION = path.join(ROOT, 'collections', '2026년-1학기말고사-현일고-부교재-분석자료.html');
const OUT_STUDENT = path.join(ROOT, 'collections', '올림포스-영어독해기본1-5-8-9강-한글내용파악-학생용.html');
const OUT_ANSWER = path.join(ROOT, 'collections', '올림포스-영어독해기본1-5-8-9강-한글내용파악-정답지.html');
const LESSONS = ['5강', '8강', '9강'];

const LOGO = fs.readFileSync(path.join(ROOT, 'assets', 'logo-base64.txt'), 'utf8').trim();

const BOOK_LABEL = '(고1) 올림포스 영어독해기본1';
const GITHUB = 'https://gongwoojeong-edu.github.io/gwj-study';

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadTitleMap(collectionPath) {
  const html = fs.readFileSync(collectionPath, 'utf8');
  const map = new Map();
  const re =
    /<a\s+href="https:\/\/gongwoojeong-edu\.github\.io\/gwj-study\/(study\/[^"#]+analysis\.html)[^"]*"[^>]*class="item-main-link">[\s\S]*?<code class="item-code">([^<]*)<\/code>\s*<strong class="item-title">([^<]*)<\/strong>/g;
  let m;
  while ((m = re.exec(html))) {
    const localPath = decodeURIComponent(m[1]);
    if (!localPath.includes('올림포스영어독해기본1')) continue;
    const lessonM = localPath.match(/\/(\d+강)\//);
    if (!lessonM || !LESSONS.includes(lessonM[1])) continue;
    map.set(localPath, {
      code: m[2].trim(),
      koTitle: m[3].trim(),
      lesson: lessonM[1],
    });
  }
  return map;
}

function textbookUnitLabel(sub, lesson) {
  const rest = sub.replace(new RegExp(`^${lesson}_?`), '');
  if (/^\d+번$/.test(rest)) return rest;
  if (/ANALYSIS/i.test(rest)) return 'ANALYSIS';
  if (/논술/.test(rest)) return '논술형';
  if (/서술/.test(rest)) return '서술형';
  return rest || sub;
}

function formatSource(lesson, unitLabel) {
  return `${BOOK_LABEL} · ${lesson} · ${unitLabel}`;
}

function parseAnalysis(fullPath) {
  const html = fs.readFileSync(fullPath, 'utf8');

  let expected = '';
  const em = html.match(/예상 제목<\/th>\s*<td>([\s\S]*?)<\/td>/);
  if (em) expected = stripHtml(em[1]);

  let topic = '';
  const tm = html.match(/<tr><th>주제<\/th>\s*<td>([\s\S]*?)<\/td>/);
  if (tm) topic = stripHtml(tm[1]);

  const chunks = html.split('<div class="sentence-block">').slice(1);
  const pairs = [];
  for (const chunk of chunks) {
    const enM = chunk.match(/<div class="sentence-en">([\s\S]*?)<\/div>/);
    const trM = chunk.match(/<div class="direct-trans">([\s\S]*?)<\/div>/);
    if (!enM || !trM) continue;
    const en = stripHtml(enM[1]);
    const ko = stripHtml(trM[1].replace(/<span class="trans-label">[\s\S]*?<\/span>/, ''));
    if (en && ko) pairs.push({ en, ko });
  }
  return { expected, topic, pairs };
}

function unitSortKey(name) {
  const n = name.match(/(\d+)번/);
  if (n) return `01-${String(n[1]).padStart(2, '0')}-${name}`;
  if (/ANALYSIS/i.test(name)) return `02-${name}`;
  if (/논술/.test(name)) return `03-${name}`;
  if (/서술/.test(name)) return `04-${name}`;
  return `99-${name}`;
}

function passageFingerprint(pairs) {
  const first = pairs[0]?.en || '';
  return first
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 48);
}

function collectLessonItems(lesson, titleMap) {
  const dir = path.join(BASE, lesson);
  if (!fs.existsSync(dir)) return [];
  const subs = fs
    .readdirSync(dir)
    .filter((x) => fs.statSync(path.join(dir, x)).isDirectory())
    .sort((a, b) => unitSortKey(a).localeCompare(unitSortKey(b), 'ko', { numeric: true }));

  const prefixedAnalysis = `${lesson}_ANALYSIS`;
  const skipSubs = new Set();
  if (subs.includes(prefixedAnalysis) && subs.includes('ANALYSIS')) {
    skipSubs.add('ANALYSIS');
  }

  const items = [];
  const seenFp = new Set();
  for (const sub of subs) {
    if (skipSubs.has(sub)) {
      console.warn('중복 제외:', path.join(dir, sub));
      continue;
    }
    const analysisPath = path.join(dir, sub, 'analysis.html');
    if (!fs.existsSync(analysisPath)) continue;
    const parsed = parseAnalysis(analysisPath);
    if (!parsed.pairs.length) {
      console.warn('해석 없음:', path.relative(ROOT, analysisPath));
      continue;
    }
    const fp = passageFingerprint(parsed.pairs);
    if (fp && seenFp.has(fp)) {
      console.warn('동일 지문 제외:', path.relative(ROOT, analysisPath));
      continue;
    }
    if (fp) seenFp.add(fp);

    const rel = path.relative(ROOT, analysisPath).replace(/\\/g, '/');
    const meta = titleMap.get(rel) || {};
    const unitLabel = textbookUnitLabel(sub, lesson);
    const code = meta.code || unitLabel;
    const koTitle = meta.koTitle || parsed.expected || unitLabel;

    items.push({
      lesson,
      unit: sub,
      unitLabel,
      code,
      koTitle,
      expected: parsed.expected,
      topic: parsed.topic,
      pairs: parsed.pairs,
      source: formatSource(lesson, unitLabel),
      url: `${GITHUB}/${rel}`,
      rel,
    });
  }
  return items;
}

const circled = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮'];
const numLabel = (i) => circled[i] || `(${i + 1})`;

function buildPassageCards(items, mode) {
  let cards = '';
  for (const it of items) {
    const searchText = [it.source, it.koTitle, it.expected, it.topic, ...it.pairs.flatMap((p) => [p.en, p.ko])]
      .join(' ')
      .toLowerCase();

    let rows;
    if (mode === 'student') {
      rows = it.pairs
        .map(
          (p, i) =>
            `<li><span class="ln-no">${numLabel(i)}</span><span class="ln-ko">${esc(p.ko)}</span></li>`
        )
        .join('');
    } else {
      rows = it.pairs
        .map(
          (p, i) => `
        <li class="pair-row">
          <span class="ln-no">${numLabel(i)}</span>
          <div class="pair-text">
            <div class="ln-ko">${esc(p.ko)}</div>
            <div class="ln-en">${esc(p.en)}</div>
          </div>
        </li>`
        )
        .join('');
    }

    const topicBlock =
      mode === 'answer' && it.topic
        ? `<div class="topic-box"><span class="topic-label">주제</span>${esc(it.topic)}</div>`
        : '';

    const titleEn =
      mode === 'answer' && it.expected ? `<div class="t-en">${esc(it.expected)}</div>` : '';

    cards += `
      <div class="passage" data-search="${esc(searchText)}">
        <div class="passage-head">
          <span class="code-badge">${esc(it.unitLabel)}</span>
          <div class="passage-titles">
            <div class="source-line">${esc(it.source)}</div>
            <div class="t-ko">${esc(it.koTitle)}</div>
            ${titleEn}
          </div>
          <span class="line-count">${it.pairs.length}문장</span>
        </div>
        ${topicBlock}
        <ol class="${mode === 'student' ? 'trans-list' : 'pair-list'}">${rows}</ol>
      </div>`;
  }
  return cards;
}

function buildHtml({ mode, title, heroText, outPath, navLinks, totalPassages, totalLines, sections }) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;
  const isStudent = mode === 'student';

  const extraCss = isStudent
    ? `
  .trans-list{list-style:none;display:flex;flex-direction:column;gap:5px}
  .trans-list li{display:flex;gap:9px;align-items:baseline;font-size:13.5px;line-height:1.75;padding:5px 10px;border-radius:7px}
  .trans-list li:nth-child(odd){background:#faf9fc}
  .ln-ko{flex:1;color:#222}`
    : `
  .pair-list{list-style:none;display:flex;flex-direction:column;gap:8px}
  .pair-row{display:flex;gap:9px;align-items:flex-start;padding:8px 10px;border-radius:8px;background:#faf9fc;border:1px solid #eee9f5}
  .pair-text{flex:1;min-width:0}
  .ln-ko{font-size:13px;line-height:1.7;color:#222;margin-bottom:4px;padding:6px 10px;border-left:3px solid #e8c87a;background:#fffbf0;border-radius:0 6px 6px 0}
  .ln-en{font-size:13.5px;line-height:1.75;color:#1a1a1a}`;

  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} · 공우정바른학원</title>
<style>
  :root{
    --brand:#6B5B95; --brand-dark:#4A3D6B; --brand-light:#E8E4F3; --brand-bg:#F4F2F8;
    --bg:#F7F5F0; --card:#fff; --border:#E3DFD5; --text:#2A2A2A; --muted:#6E6B65;
    --accent-teal:#0F6E56;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Pretendard','Noto Sans KR','Malgun Gothic',-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:0 0 60px}
  ${TOOLBAR_CSS}
  .page-nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  ${brandCss(LOGO)}
  .toolbar .search{margin-left:auto;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:#faf9fc;min-width:180px}
  .toolbar .search:focus{outline:none;border-color:var(--brand);background:#fff}
  .print-btn{padding:8px 14px;border:none;border-radius:8px;background:var(--brand);color:#fff;font-weight:700;font-size:13px;cursor:pointer}
  .print-btn:hover{background:var(--brand-dark)}
  .nav-link{padding:9px 16px;border:1px solid var(--brand-light);border-radius:8px;background:#faf9fc;color:var(--brand-dark);font-size:13.5px;font-weight:700;text-decoration:none;white-space:nowrap}
  .nav-link:hover{background:var(--brand-light)}
  .nav-link.current{background:var(--brand);border-color:var(--brand);color:#fff;pointer-events:none}
  .container{max-width:980px;margin:0 auto;padding:0 18px;position:relative;z-index:1}
  .hero{background:linear-gradient(135deg,var(--brand-dark),var(--accent-teal));color:#fff;padding:34px 30px;border-radius:18px;margin:22px 0 18px;box-shadow:0 6px 20px rgba(74,61,107,.22);position:relative;overflow:hidden}
  .hero .eyebrow{font-size:12px;letter-spacing:.12em;opacity:.9;margin-bottom:8px}
  .hero h1{font-size:26px;font-weight:800;margin-bottom:10px;word-break:keep-all}
  .hero p{font-size:13.5px;opacity:.92;line-height:1.7;max-width:720px}
  .hero .stats{display:flex;gap:22px;margin-top:16px;flex-wrap:wrap}
  .hero .stat b{font-size:22px;font-weight:800;display:block}
  .hero .stat span{font-size:11.5px;opacity:.85}
  .series{margin-bottom:30px}
  .series-head{display:flex;align-items:baseline;gap:12px;padding-bottom:10px;margin-bottom:14px;border-bottom:2px solid var(--brand-light)}
  .series-head h2{font-size:19px;color:var(--brand-dark);font-weight:800}
  .series-count{font-size:12px;color:var(--muted);background:var(--brand-bg);padding:2px 10px;border-radius:12px}
  .passage{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:15px 18px;margin-bottom:11px;box-shadow:0 1px 4px rgba(0,0,0,.03)}
  .passage-head{display:flex;align-items:center;gap:10px;margin-bottom:9px;flex-wrap:wrap;padding-bottom:8px;border-bottom:1px dashed var(--brand-light)}
  .code-badge{background:var(--brand);color:#fff;font-size:12px;font-weight:700;padding:3px 11px;border-radius:7px;white-space:nowrap}
  .passage-titles{flex:1;min-width:160px}
  .source-line{font-size:11px;color:var(--muted);font-weight:600;margin-bottom:2px}
  .t-ko{font-size:14.5px;font-weight:700;color:var(--text)}
  .t-en{font-size:11.5px;color:var(--muted);font-style:italic;margin-top:1px}
  .line-count{font-size:11px;font-weight:700;color:var(--accent-teal);background:#e6f4ef;padding:2px 9px;border-radius:10px;white-space:nowrap}
  .topic-box{font-size:12px;line-height:1.65;color:#444;background:#f5f8ff;border:1px solid #dbe6ff;border-radius:8px;padding:8px 11px;margin-bottom:10px}
  .topic-label{font-weight:800;color:var(--brand-dark);margin-right:6px}
  .ln-no{flex:0 0 auto;color:var(--brand);font-weight:800;font-size:12.5px;min-width:18px}
  .footer{text-align:center;padding:30px 20px 10px;font-size:12px;color:var(--muted)}
  .no-result{display:none;text-align:center;padding:60px 20px;color:var(--muted)}
  .is-hidden{display:none!important}
  ${extraCss}
  @media print{
    .toolbar{display:none!important}
    .is-hidden{display:none!important}
    body{background:#fff;padding:0}
    .hero{box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .passage{break-inside:avoid;box-shadow:none}
    .trans-list li:nth-child(odd),.pair-row,.ln-ko{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    ${BRAND_PRINT_CSS}
    @page{size:A4;margin:14mm}
  }
  @media(max-width:560px){.hero h1{font-size:22px}.toolbar .search{min-width:130px}}
</style>
</head>
<body>
${watermarkHtml()}
<nav class="toolbar">
  ${toolbarLeftHtml(LOGO, navLinks)}
  <input type="search" class="search" id="search" placeholder="🔍 ${isStudent ? '해석·제목·출처' : '영문·한글·제목·출처'} 검색…">
  <button class="print-btn" onclick="window.print()">🖨 인쇄 / PDF</button>
</nav>
<div class="container">
  <div class="hero">
    ${heroBrandHtml(LOGO)}
    <div class="eyebrow">공우정바른학원 · GWJ EDU</div>
    <h1>${esc(title)}</h1>
    <p>${heroText}</p>
    <div class="stats">
      <div class="stat"><b>${totalPassages}</b><span>지문</span></div>
      <div class="stat"><b>${totalLines}</b><span>문장(줄)</span></div>
      <div class="stat"><b>3</b><span>강 (5·8·9)</span></div>
    </div>
  </div>
  <div id="content">${sections}</div>
  <div class="no-result" id="noResult">검색 결과가 없습니다.</div>
  <div class="footer">공우정바른학원 · GWJ EDU &nbsp;·&nbsp; 생성일 ${dateStr}</div>
</div>
<script>
  const search=document.getElementById('search');
  const noResult=document.getElementById('noResult');
  function apply(){
    const q=(search.value||'').trim().toLowerCase();
    let visible=0;
    document.querySelectorAll('.series').forEach(sec=>{
      let secVisible=0;
      sec.querySelectorAll('.passage').forEach(p=>{
        const hay=p.getAttribute('data-search')||'';
        const hit=!q||hay.indexOf(q)>=0;
        p.classList.toggle('is-hidden',!hit);
        if(hit){secVisible++;visible++;}
      });
      sec.classList.toggle('is-hidden',secVisible===0);
    });
    noResult.style.display=visible===0?'block':'none';
  }
  search.addEventListener('input',apply);
</script>
</body>
</html>`;

  fs.writeFileSync(outPath, html, 'utf8');
}

const titleMap = loadTitleMap(COLLECTION);
let totalPassages = 0;
let totalLines = 0;
let studentSections = '';
let answerSections = '';

for (const lesson of LESSONS) {
  const items = collectLessonItems(lesson, titleMap);
  totalPassages += items.length;
  totalLines += items.reduce((n, x) => n + x.pairs.length, 0);

  studentSections += `
    <section class="series">
      <div class="series-head">
        <h2>${esc(BOOK_LABEL)} · ${esc(lesson)}</h2>
        <span class="series-count">지문 ${items.length}개</span>
      </div>
      ${buildPassageCards(items, 'student')}
    </section>`;

  answerSections += `
    <section class="series">
      <div class="series-head">
        <h2>${esc(BOOK_LABEL)} · ${esc(lesson)}</h2>
        <span class="series-count">지문 ${items.length}개</span>
      </div>
      ${buildPassageCards(items, 'answer')}
    </section>`;
}

const navStudent = `<div class="page-nav"><a class="nav-link current" href="올림포스-영어독해기본1-5-8-9강-한글내용파악-학생용.html">📝 학생용</a><a class="nav-link" href="올림포스-영어독해기본1-5-8-9강-한글내용파악-정답지.html">✅ 정답지</a><a class="nav-link" href="올림포스-영어독해기본1-5-8-9강-영한-워크북.html">↔ 영한 워크북</a></div>`;
const navAnswer = `<div class="page-nav"><a class="nav-link" href="올림포스-영어독해기본1-5-8-9강-한글내용파악-학생용.html">📝 학생용</a><a class="nav-link current" href="올림포스-영어독해기본1-5-8-9강-한글내용파악-정답지.html">✅ 정답지</a><a class="nav-link" href="올림포스-영어독해기본1-5-8-9강-영한-워크북.html">↔ 영한 워크북</a></div>`;

buildHtml({
  mode: 'student',
  title: '올림포스 영어독해기본1 · 5·8·9강 · 한글 내용파악 (학생용)',
  heroText:
    '<strong>올림포스 영어독해기본1</strong> 5·8·9강 지문을 문장 단위 <strong>한글 해석</strong>만 모았습니다. 영어 원문 없이 내용을 파악하는 연습용입니다. 출처는 교재 강·문항 기준으로 표기했습니다. ( / 표시는 의미 단위 끊어읽기)',
  outPath: OUT_STUDENT,
  navLinks: navStudent,
  totalPassages,
  totalLines,
  sections: studentSections,
});

buildHtml({
  mode: 'answer',
  title: '올림포스 영어독해기본1 · 5·8·9강 · 한글 내용파악 (정답지)',
  heroText:
    '학생용 워크북의 <strong>정답·해설 자료</strong>입니다. 각 문장마다 <strong>한글 해석</strong>과 <strong>영어 원문</strong>을 함께 확인할 수 있습니다. 출처는 교재 강·문항 기준입니다.',
  outPath: OUT_ANSWER,
  navLinks: navAnswer,
  totalPassages,
  totalLines,
  sections: answerSections,
});

console.log('생성 완료:');
console.log(' ', path.relative(ROOT, OUT_STUDENT));
console.log(' ', path.relative(ROOT, OUT_ANSWER));
console.log('총 지문:', totalPassages, '/ 총 문장:', totalLines);
for (const lesson of LESSONS) {
  const items = collectLessonItems(lesson, titleMap);
  const ln = items.reduce((n, x) => n + x.pairs.length, 0);
  console.log(`  - ${lesson}: ${items.length}지문, ${ln}줄`);
}
