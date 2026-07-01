// 현일고 1학기말 시험범위 · 올림포스 영어독해기본1 → 한줄해석(한글) 모음
// 소스: collections/2026년-1학기말고사-현일고-부교재-분석자료.html

const fs = require('fs');
const path = require('path');
const { gradeFilterHtml, brandCss, BRAND_PRINT_CSS, heroBrandHtml, watermarkHtml, TOOLBAR_CSS, toolbarLeftHtml, GRADE_FILTER_CSS, GRADE_PRINT_CSS, GRADE_FILTER_SCRIPT } = require('./assets/build-page-ui');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'collections', '2026년-1학기말고사-현일고-부교재-분석자료.html');
const OUT = path.join(ROOT, 'collections', '2026년-1학기말고사-현일고-올림포스-한줄해석.html');

const LOGO = fs.readFileSync(path.join(ROOT, 'assets', 'logo-base64.txt'), 'utf8').trim();

const TITLE = '2026년 1학기말고사 현일고 · 올림포스 독해기본 · 한줄해석';
const FILTER_OLYMPUS = /올림포스.*독해/i;

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function parseCollection(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const re =
    /<a\s+href="(https:\/\/gongwoojeong-edu\.github\.io\/gwj-study\/(study\/[^"#]+analysis\.html))[^"]*"[^>]*class="item-main-link">[\s\S]*?<code class="item-code">([^<]*)<\/code>\s*<strong class="item-title">([^<]*)<\/strong>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const localPath = decodeURIComponent(m[2]);
    if (!FILTER_OLYMPUS.test(localPath)) continue;
    const lessonM = localPath.match(/\/(\d+강)\//);
    const unitM = localPath.match(/\/(\d+강\/[^/]+)\/analysis\.html$/);
    out.push({
      url: m[1],
      localPath,
      code: m[3].trim(),
      koTitle: m[4].trim(),
      lesson: lessonM ? lessonM[1] : '기타',
      unitPath: unitM ? unitM[1] : '',
    });
  }
  return out;
}

function parseAnalysis(localPath) {
  const full = path.join(ROOT, localPath);
  if (!fs.existsSync(full)) return null;
  const html = fs.readFileSync(full, 'utf8');

  let expected = '';
  const em = html.match(/예상 제목<\/th>\s*<td>([\s\S]*?)<\/td>/);
  if (em) expected = em[1].replace(/<[^>]+>/g, '').trim();

  const chunks = html.split('<div class="sentence-block">').slice(1);
  const lines = [];
  for (const chunk of chunks) {
    const transM = chunk.match(/<div class="direct-trans">([\s\S]*?)<\/div>/);
    if (!transM) continue;
    const ko = transM[1]
      .replace(/<span class="trans-label">[\s\S]*?<\/span>/, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (ko) lines.push(ko);
  }
  return { expected, lines };
}

const circled = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];
const numLabel = (i) => circled[i] || `(${i + 1})`;

const list = parseCollection(SOURCE);
const byLesson = new Map();

for (const it of list) {
  const a = parseAnalysis(it.localPath);
  if (!a || a.lines.length === 0) {
    console.warn('해석 없음:', it.localPath);
    continue;
  }
  if (!byLesson.has(it.lesson)) byLesson.set(it.lesson, []);
  byLesson.get(it.lesson).push({
    ...it,
    expected: a.expected,
    lines: a.lines,
    sortKey: it.unitPath,
  });
}

const lessonOrder = [...byLesson.keys()].sort((a, b) => {
  const na = parseInt(a, 10) || 999;
  const nb = parseInt(b, 10) || 999;
  return na - nb || a.localeCompare(b, 'ko');
});

let totalPassages = 0;
let totalLines = 0;
let sections = '';

for (const lesson of lessonOrder) {
  const items = byLesson.get(lesson).sort((a, b) =>
    a.sortKey.localeCompare(b.sortKey, 'ko', { numeric: true })
  );
  totalPassages += items.length;
  totalLines += items.reduce((n, x) => n + x.lines.length, 0);

  let cards = '';
  for (const it of items) {
    const unitLabel = it.unitPath.replace(/^\d+강\//, '') || it.code + '번';
    const lis = it.lines
      .map((ln, i) => `<li><span class="ln-no">${numLabel(i)}</span><span class="ln-ko">${esc(ln)}</span></li>`)
      .join('');
    cards += `
      <div class="passage" data-search="${esc((it.koTitle + ' ' + it.expected + ' ' + unitLabel + ' ' + it.lines.join(' ')).toLowerCase())}">
        <div class="passage-head">
          <span class="code-badge">${esc(unitLabel)}</span>
          <div class="passage-titles">
            <div class="t-ko">${esc(it.koTitle)}</div>
            ${it.expected ? `<div class="t-en">${esc(it.expected)}</div>` : ''}
          </div>
          <span class="line-count">${it.lines.length}문장</span>
          <a class="passage-link" href="${esc(it.url)}" target="_blank" rel="noopener">분석교안 ↗</a>
        </div>
        <ol class="trans-list">${lis}</ol>
      </div>`;
  }

  sections += `
    <section class="series" data-grade="all">
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
  ${brandCss(LOGO)}
  .toolbar .search{margin-left:auto;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:#faf9fc;min-width:180px}
  .toolbar .search:focus{outline:none;border-color:var(--brand);background:#fff}
  .print-btn{padding:8px 14px;border:none;border-radius:8px;background:var(--brand);color:#fff;font-weight:700;font-size:13px;cursor:pointer}
  .print-btn:hover{background:var(--brand-dark)}
  .container{max-width:980px;margin:0 auto;padding:0 18px;position:relative;z-index:1}
  .hero{background:linear-gradient(135deg,var(--brand-dark),var(--accent-teal));color:#fff;padding:34px 30px;border-radius:18px;margin:22px 0 18px;box-shadow:0 6px 20px rgba(74,61,107,.22);position:relative;overflow:hidden}
  .hero .eyebrow{font-size:12px;letter-spacing:.12em;opacity:.9;margin-bottom:8px}
  .hero h1{font-size:26px;font-weight:800;margin-bottom:10px;word-break:keep-all}
  .hero p{font-size:13.5px;opacity:.92;line-height:1.7;max-width:720px}
  .hero .stats{display:flex;gap:22px;margin-top:16px;flex-wrap:wrap}
  .hero .stat b{font-size:22px;font-weight:800;display:block}
  .hero .stat span{font-size:11.5px;opacity:.85}
  ${GRADE_FILTER_CSS}
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
  .trans-list{list-style:none;display:flex;flex-direction:column;gap:5px}
  .trans-list li{display:flex;gap:9px;align-items:baseline;font-size:13.5px;line-height:1.75;padding:5px 10px;border-radius:7px}
  .trans-list li:nth-child(odd){background:#faf9fc}
  .ln-no{flex:0 0 auto;color:var(--brand);font-weight:800;font-size:12.5px;min-width:18px}
  .ln-ko{flex:1;color:#222}
  .footer{text-align:center;padding:30px 20px 10px;font-size:12px;color:var(--muted)}
  .no-result{display:none;text-align:center;padding:60px 20px;color:var(--muted)}
  @media print{
    .toolbar,.filters{display:none!important}
    .is-hidden{display:none!important}
    body{background:#fff;padding:0}
    .hero{box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .passage{break-inside:avoid;box-shadow:none}
    .trans-list li:nth-child(odd){-webkit-print-color-adjust:exact;print-color-adjust:exact}
    ${BRAND_PRINT_CSS}
    @page{size:A4;margin:14mm}
  }
  @media(max-width:560px){.hero h1{font-size:22px}.toolbar .search{min-width:130px}}
</style>
</head>
<body>
${watermarkHtml()}
<nav class="toolbar">
  ${toolbarLeftHtml(LOGO, `<a class="nav-link" href="2026년-1학기말고사-현일고-부교재-분석자료.html">📋 시험범위 목차</a>`)}
  <input type="search" class="search" id="search" placeholder="🔍 해석·제목 검색…">
  <button class="print-btn" onclick="beforePrint()">🖨 인쇄 / PDF</button>
</nav>
<div class="container">
  <div class="hero">
    ${heroBrandHtml(LOGO)}
    <div class="eyebrow">공우정바른학원 · GWJ EDU</div>
    <h1>${esc(TITLE)}</h1>
    <p>현일고 1학기말 시험범위 <strong>올림포스 영어독해기본1</strong> 지문의 <strong>직독·의역(한글)</strong>만 문장 순서대로 모았습니다. 빠른 의미 점검·끊어읽기 연습용으로 활용하세요.</p>
    <div class="stats">
      <div class="stat"><b>${totalPassages}</b><span>지문</span></div>
      <div class="stat"><b>${totalLines}</b><span>문장(줄)</span></div>
      <div class="stat"><b>${lessonOrder.length}</b><span>강</span></div>
    </div>
  </div>
  <div id="content">${sections}</div>
  <div class="no-result" id="noResult">검색 결과가 없습니다.</div>
  <div class="footer">공우정바른학원 · GWJ EDU &nbsp;·&nbsp; 생성일 ${dateStr}</div>
</div>
<script>
  const search=document.getElementById('search');
  const noResult=document.getElementById('noResult');
  function beforePrint(){ window.print(); }
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
for (const lesson of lessonOrder) {
  const items = byLesson.get(lesson);
  const ln = items.reduce((n, x) => n + x.lines.length, 0);
  console.log(`  - ${lesson}: ${items.length}지문, ${ln}줄`);
}
