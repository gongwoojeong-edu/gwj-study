// 올림포스 영어독해기본1 · 5·8·9강 → 영어지문+한줄해석 워크북

const fs = require('fs');
const path = require('path');
const { TOOLBAR_CSS, LOGO_LOCKUP_CSS, toolbarLeftHtml } = require('./assets/build-page-ui');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'study', 'L08', '고1_2026_올림포스영어독해기본1');
const OUT = path.join(ROOT, 'collections', '올림포스-영어독해기본1-5-8-9강-영한-워크북.html');
const LESSONS = ['5강', '8강', '9강'];

const LOGO = fs.readFileSync(path.join(ROOT, 'assets', 'logo-base64.txt'), 'utf8').trim();
const LOCKUP = fs.readFileSync(path.join(ROOT, 'assets', 'logo-lockup-color.txt'), 'utf8').trim();

const TITLE = '올림포스 영어독해기본1 · 5·8·9강 · 영한 워크북';
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

function parseAnalysis(fullPath) {
  const html = fs.readFileSync(fullPath, 'utf8');
  let expected = '';
  const em = html.match(/예상 제목<\/th>\s*<td>([\s\S]*?)<\/td>/);
  if (em) expected = stripHtml(em[1]);

  let koTitle = '';
  const tm = html.match(/<title>([^<]*)<\/title>/i);
  if (tm) koTitle = stripHtml(tm[1]);

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
  return { expected, koTitle, pairs };
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

function collectLessonItems(lesson) {
  const dir = path.join(BASE, lesson);
  if (!fs.existsSync(dir)) return [];
  const subs = fs
    .readdirSync(dir)
    .filter((x) => fs.statSync(path.join(dir, x)).isDirectory())
    .sort((a, b) => unitSortKey(a).localeCompare(unitSortKey(b), 'ko', { numeric: true }));

  // 5강만 `ANALYSIS`·`5강_ANALYSIS` 중복 폴더 — 강 접두(`5강_ANALYSIS`) 우선
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
    const url = `${GITHUB}/${rel}`;
    const unitLabel = sub.replace(/^\d+강_/, '').replace(/^\d+강/, sub);
    items.push({
      lesson,
      unit: sub,
      unitLabel: unitLabel || sub,
      koTitle: parsed.koTitle,
      expected: parsed.expected,
      pairs: parsed.pairs,
      url,
      rel,
    });
  }
  return items;
}

const circled = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮'];
const numLabel = (i) => circled[i] || `(${i + 1})`;

let totalPassages = 0;
let totalLines = 0;
let sections = '';

for (const lesson of LESSONS) {
  const items = collectLessonItems(lesson);
  totalPassages += items.length;
  totalLines += items.reduce((n, x) => n + x.pairs.length, 0);

  let cards = '';
  for (const it of items) {
    const searchText = [it.koTitle, it.expected, it.unitLabel, ...it.pairs.flatMap((p) => [p.en, p.ko])]
      .join(' ')
      .toLowerCase();
    const rows = it.pairs
      .map(
        (p, i) => `
        <li class="pair-row">
          <span class="ln-no">${numLabel(i)}</span>
          <div class="pair-text">
            <div class="ln-en">${esc(p.en)}</div>
            <div class="ln-ko">${esc(p.ko)}</div>
          </div>
        </li>`
      )
      .join('');

    cards += `
      <div class="passage" data-search="${esc(searchText)}">
        <div class="passage-head">
          <span class="code-badge">${esc(it.unitLabel)}</span>
          <div class="passage-titles">
            <div class="t-ko">${esc(it.koTitle || it.unitLabel)}</div>
            ${it.expected ? `<div class="t-en">${esc(it.expected)}</div>` : ''}
          </div>
          <span class="line-count">${it.pairs.length}문장</span>
          <a class="passage-link" href="${esc(it.url)}" target="_blank" rel="noopener">분석교안 ↗</a>
        </div>
        <ol class="pair-list">${rows}</ol>
      </div>`;
  }

  sections += `
    <section class="series">
      <div class="series-head">
        <h2>올림포스 영어독해기본1 · ${esc(lesson)}</h2>
        <span class="series-count">지문 ${items.length}개</span>
      </div>
      ${cards}
    </section>`;
}

const today = new Date();
const dateStr = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(TITLE)} · 공우정바른학원</title>
<style>
  :root{
    --brand:#6B5B95; --brand-dark:#4A3D6B; --brand-light:#E8E4F3; --brand-bg:#F4F2F8;
    --bg:#F7F5F0; --card:#fff; --border:#E3DFD5; --text:#2A2A2A; --muted:#6E6B65;
    --accent-teal:#0F6E56;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Pretendard','Noto Sans KR','Malgun Gothic',-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:0 0 60px}
  ${TOOLBAR_CSS}
  ${LOGO_LOCKUP_CSS}
  .toolbar-left{display:flex;align-items:center;gap:16px;flex:1;min-width:0}
  .watermark{position:fixed;inset:0;z-index:5;pointer-events:none;background:url("${LOGO}") center center no-repeat;background-size:340px auto;opacity:.07}
  .toolbar .search{margin-left:auto;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:#faf9fc;min-width:180px}
  .toolbar .search:focus{outline:none;border-color:var(--brand);background:#fff}
  .print-btn{padding:8px 14px;border:none;border-radius:8px;background:var(--brand);color:#fff;font-weight:700;font-size:13px;cursor:pointer}
  .print-btn:hover{background:var(--brand-dark)}
  .nav-link{padding:9px 16px;border:1px solid var(--brand-light);border-radius:8px;background:#faf9fc;color:var(--brand-dark);font-size:13.5px;font-weight:700;text-decoration:none;white-space:nowrap}
  .nav-link:hover{background:var(--brand-light)}
  .container{max-width:980px;margin:0 auto;padding:0 18px;position:relative;z-index:1}
  .hero{background:linear-gradient(135deg,var(--brand-dark),var(--accent-teal));color:#fff;padding:34px 30px;border-radius:18px;margin:22px 0 18px;box-shadow:0 6px 20px rgba(74,61,107,.22);position:relative;overflow:hidden}
  .hero .hero-logo{height:26px;width:auto;display:block;margin-bottom:12px;filter:brightness(0) invert(1);opacity:.95}
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
  .t-ko{font-size:14.5px;font-weight:700;color:var(--text)}
  .t-en{font-size:11.5px;color:var(--muted);font-style:italic;margin-top:1px}
  .line-count{font-size:11px;font-weight:700;color:var(--accent-teal);background:#e6f4ef;padding:2px 9px;border-radius:10px;white-space:nowrap}
  .passage-link{font-size:11px;color:var(--brand-dark);text-decoration:none;padding:3px 9px;border:1px solid var(--brand-light);border-radius:6px;white-space:nowrap}
  .passage-link:hover{background:var(--brand-light)}
  .pair-list{list-style:none;display:flex;flex-direction:column;gap:8px}
  .pair-row{display:flex;gap:9px;align-items:flex-start;padding:8px 10px;border-radius:8px;background:#faf9fc;border:1px solid #eee9f5}
  .ln-no{flex:0 0 auto;color:var(--brand);font-weight:800;font-size:12.5px;min-width:18px;padding-top:2px}
  .pair-text{flex:1;min-width:0}
  .ln-en{font-size:13.5px;line-height:1.75;color:#1a1a1a;margin-bottom:4px}
  .ln-ko{font-size:13px;line-height:1.7;color:#444;padding-left:8px;border-left:3px solid #e8c87a;background:#fffbf0;padding:6px 10px;border-radius:0 6px 6px 0}
  .footer{text-align:center;padding:30px 20px 10px;font-size:12px;color:var(--muted)}
  .no-result{display:none;text-align:center;padding:60px 20px;color:var(--muted)}
  .is-hidden{display:none!important}
  @media print{
    .toolbar{display:none!important}
    .is-hidden{display:none!important}
    body{background:#fff;padding:0}
    .hero{box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .passage{break-inside:avoid;box-shadow:none}
    .pair-row{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .watermark{opacity:.1;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{size:A4;margin:14mm}
  }
  @media(max-width:560px){.hero h1{font-size:22px}.toolbar .search{min-width:130px}}
</style>
</head>
<body>
<div class="watermark" aria-hidden="true"></div>
<nav class="toolbar">
  ${toolbarLeftHtml(LOCKUP, `<a class="nav-link" href="2026년-올림포스-영어독해기본1-분석구조도1.html">📋 분석구조도</a><a class="nav-link" href="2026년-1학기말고사-현일고-올림포스-한줄해석.html">📝 한줄해석만</a>`)}
  <input type="search" class="search" id="search" placeholder="🔍 영문·한글·제목 검색…">
  <button class="print-btn" onclick="window.print()">🖨 인쇄 / PDF</button>
</nav>
<div class="container">
  <div class="hero">
    <img class="hero-logo" src="${LOGO}" alt="공우정바른학원">
    <div class="eyebrow">공우정바른학원 · GWJ EDU</div>
    <h1>${esc(TITLE)}</h1>
    <p><strong>올림포스 영어독해기본1</strong> 5·8·9강 지문을 문장 단위로 정리했습니다. 각 줄마다 <strong>영어 원문</strong>과 <strong>직독·의역(한글)</strong>을 함께 볼 수 있는 워크북입니다.</p>
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

fs.writeFileSync(OUT, html, 'utf8');

console.log('생성 완료:', path.relative(ROOT, OUT));
console.log('총 지문:', totalPassages, '/ 총 문장:', totalLines);
for (const lesson of LESSONS) {
  const items = collectLessonItems(lesson);
  const ln = items.reduce((n, x) => n + x.pairs.length, 0);
  console.log(`  - ${lesson}: ${items.length}지문, ${ln}줄`);
}
