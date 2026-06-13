// 2026 6월 모의고사 전 지문 한줄해석(한글) 자료
// 각 analysis.html의 문장별 "직독·의역"을 문장 순서대로 한글만 정리
// (이후 빈칸넣기 워크북/시험지 제작의 기반 자료)

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'collections', '6월모의고사-한줄해석.html');

const LOGO = fs.readFileSync(path.join(ROOT, 'assets', 'logo-base64.txt'), 'utf8').trim();
const LOCKUP = fs.readFileSync(path.join(ROOT, 'assets', 'logo-lockup-color.txt'), 'utf8').trim();

const SOURCES = [
  { level: '고1', label: '(고1) 2026 6월 모의고사', file: 'collections/고1-2026년-6모고.html' },
  { level: '고2', label: '(고2) 2026 6월 모의고사', file: 'collections/고2-6모고.html' },
];

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function parseCollection(htmlPath) {
  const html = fs.readFileSync(path.join(ROOT, htmlPath), 'utf8');
  const re =
    /<a\s+href="(https:\/\/gongwoojeong-edu\.github\.io\/gwj-study\/(study\/[^"#]+analysis\.html))[^"]*"[^>]*class="item-main-link">[\s\S]*?<code class="item-code">([^<]*)<\/code>\s*<strong class="item-title">([^<]*)<\/strong>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    out.push({
      url: m[1],
      localPath: decodeURIComponent(m[2]),
      code: m[3].trim(),
      koTitle: m[4].trim(),
    });
  }
  return out;
}

// 직독·의역(한글)만 문장 순서대로 추출
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

const groups = [];
let totalPassages = 0;
let totalLines = 0;

for (const src of SOURCES) {
  const list = parseCollection(src.file);
  const items = [];
  for (const it of list) {
    const a = parseAnalysis(it.localPath);
    if (!a || a.lines.length === 0) continue;
    items.push({
      code: it.code,
      koTitle: it.koTitle,
      expected: a.expected,
      url: it.url,
      lines: a.lines,
      sortKey: parseInt(it.code, 10) || 999,
    });
  }
  items.sort((a, b) => a.sortKey - b.sortKey || a.code.localeCompare(b.code));
  totalPassages += items.length;
  totalLines += items.reduce((n, x) => n + x.lines.length, 0);
  groups.push({ ...src, items });
}

let sections = '';
for (const g of groups) {
  let cards = '';
  for (const it of g.items) {
    const lis = it.lines
      .map((ln, i) => `<li><span class="ln-no">${numLabel(i)}</span><span class="ln-ko">${esc(ln)}</span></li>`)
      .join('');
    cards += `
      <div class="passage" data-search="${esc((it.koTitle + ' ' + it.expected + ' ' + it.lines.join(' ')).toLowerCase())}">
        <div class="passage-head">
          <span class="code-badge">${esc(it.code)}번</span>
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
    <section class="series" data-series="${esc(g.level)}">
      <div class="series-head">
        <h2>${esc(g.label)}</h2>
        <span class="series-count">지문 ${g.items.length}개</span>
      </div>
      ${cards}
    </section>`;
}

const today = new Date();
const dateStr = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;

const filterBtns =
  `<button class="filter-btn active" data-target="all">전체</button>` +
  groups.map((g) => `<button class="filter-btn" data-target="${esc(g.level)}">${esc(g.label)}</button>`).join('');

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>2026 6월 모의고사 한줄해석(한글) · 공우정바른학원</title>
<style>
  :root{
    --brand:#6B5B95; --brand-dark:#4A3D6B; --brand-light:#E8E4F3; --brand-bg:#F4F2F8;
    --bg:#F7F5F0; --card:#fff; --border:#E3DFD5; --text:#2A2A2A; --muted:#6E6B65;
    --accent-teal:#0F6E56;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Pretendard','Noto Sans KR','Malgun Gothic',-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:0 0 60px}
  .toolbar{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid var(--border);padding:10px 18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 2px 8px rgba(0,0,0,.04)}
  .toolbar-brand{display:flex;align-items:center;gap:10px}
  .toolbar .logo-img{height:30px;width:auto;display:block}
  .toolbar .logo-lockup{height:36px;width:auto;display:block;border-radius:3px}
  .brand-mark{font-weight:800;color:var(--brand-dark);font-size:15px;letter-spacing:-.3px}
  .brand-sub{font-size:11px;color:var(--muted)}
  .watermark{position:fixed;inset:-60%;z-index:0;pointer-events:none;background-image:url(${LOGO});background-repeat:repeat;background-size:190px auto;opacity:.04;transform:rotate(-22deg)}
  .toolbar .search{margin-left:auto;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:#faf9fc;min-width:180px}
  .toolbar .search:focus{outline:none;border-color:var(--brand);background:#fff}
  .print-btn{padding:8px 14px;border:none;border-radius:8px;background:var(--brand);color:#fff;font-weight:700;font-size:13px;cursor:pointer}
  .print-btn:hover{background:var(--brand-dark)}
  .container{max-width:980px;margin:0 auto;padding:0 18px;position:relative;z-index:1}
  .hero{background:linear-gradient(135deg,var(--brand-dark),var(--brand));color:#fff;padding:34px 30px;border-radius:18px;margin:22px 0 18px;box-shadow:0 6px 20px rgba(74,61,107,.22);position:relative;overflow:hidden}
  .hero .hero-logo{height:26px;width:auto;display:block;margin-bottom:12px;filter:brightness(0) invert(1);opacity:.95}
  .hero .eyebrow{font-size:12px;letter-spacing:.12em;opacity:.9;margin-bottom:8px}
  .hero h1{font-size:27px;font-weight:800;margin-bottom:10px;word-break:keep-all}
  .hero p{font-size:13.5px;opacity:.92;line-height:1.7;max-width:700px}
  .hero .stats{display:flex;gap:22px;margin-top:16px;flex-wrap:wrap}
  .hero .stat b{font-size:22px;font-weight:800;display:block}
  .hero .stat span{font-size:11.5px;opacity:.85}
  .filters{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px}
  .filter-btn{padding:7px 14px;border:1px solid var(--border);border-radius:20px;background:#fff;font-size:12.5px;font-weight:600;color:var(--muted);cursor:pointer;transition:.15s;font-family:inherit}
  .filter-btn:hover{border-color:var(--brand);color:var(--brand-dark)}
  .filter-btn.active{background:var(--brand);border-color:var(--brand);color:#fff}
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
  .trans-list{list-style:none;counter-reset:none;display:flex;flex-direction:column;gap:5px}
  .trans-list li{display:flex;gap:9px;align-items:baseline;font-size:13.5px;line-height:1.75;padding:5px 10px;border-radius:7px}
  .trans-list li:nth-child(odd){background:#faf9fc}
  .ln-no{flex:0 0 auto;color:var(--brand);font-weight:800;font-size:12.5px;min-width:18px}
  .ln-ko{flex:1;color:#222}
  .footer{text-align:center;padding:30px 20px 10px;font-size:12px;color:var(--muted)}
  .no-result{display:none;text-align:center;padding:60px 20px;color:var(--muted)}
  @media print{
    .toolbar,.filters{display:none!important}
    body{background:#fff;padding:0}
    .hero{box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .passage{break-inside:avoid;box-shadow:none}
    .trans-list li:nth-child(odd){-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .watermark{opacity:.05;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{size:A4;margin:14mm}
  }
  @media(max-width:560px){.hero h1{font-size:22px}.toolbar .search{min-width:130px}}
</style>
</head>
<body>
<div class="watermark" aria-hidden="true"></div>
<nav class="toolbar">
  <img class="logo-lockup" src="${LOCKUP}" alt="공우정바른학원 GWJ EDU">
  <input type="search" class="search" id="search" placeholder="🔍 해석·제목 검색…">
  <button class="print-btn" onclick="window.print()">🖨 인쇄 / PDF</button>
</nav>
<div class="container">
  <div class="hero">
    <img class="hero-logo" src="${LOGO}" alt="공우정바른학원">
    <div class="eyebrow">공우정바른학원 · GWJ EDU</div>
    <h1>2026 6월 모의고사 · 전 지문 한줄해석</h1>
    <p>각 지문을 문장 단위로 끊어 읽은 <strong>직독·의역(한글)</strong>만 모았습니다. 빠른 의미 점검과 끊어읽기 연습, 그리고 빈칸넣기 워크북 제작의 기반 자료로 활용하세요. ( / 표시는 의미 단위 끊어읽기)</p>
    <div class="stats">
      <div class="stat"><b>${totalPassages}</b><span>지문</span></div>
      <div class="stat"><b>${totalLines}</b><span>문장(줄)</span></div>
      <div class="stat"><b>${groups.length}</b><span>학년</span></div>
    </div>
  </div>
  <div class="filters">${filterBtns}</div>
  <div id="content">${sections}</div>
  <div class="no-result" id="noResult">검색 결과가 없습니다.</div>
  <div class="footer">공우정바른학원 · GWJ EDU &nbsp;·&nbsp; 생성일 ${dateStr} &nbsp;·&nbsp; 한줄해석(한글)</div>
</div>
<script>
  const search=document.getElementById('search');
  const noResult=document.getElementById('noResult');
  const filterBtns=document.querySelectorAll('.filter-btn');
  let activeSeries='all';
  function apply(){
    const q=search.value.trim().toLowerCase();
    let visible=0;
    document.querySelectorAll('.series').forEach(sec=>{
      const matchSeries=activeSeries==='all'||sec.dataset.series===activeSeries;
      let secVisible=0;
      sec.querySelectorAll('.passage').forEach(p=>{
        const hit=matchSeries&&(!q||p.dataset.search.includes(q));
        p.style.display=hit?'':'none';
        if(hit){secVisible++;visible++;}
      });
      sec.style.display=(matchSeries&&secVisible>0)?'':'none';
    });
    noResult.style.display=visible===0?'block':'none';
  }
  search.addEventListener('input',apply);
  filterBtns.forEach(b=>b.addEventListener('click',()=>{
    filterBtns.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    activeSeries=b.dataset.target;
    apply();
  }));
</script>
</body>
</html>`;

fs.writeFileSync(OUT, html, 'utf8');

console.log('생성 완료:', path.relative(ROOT, OUT));
console.log('총 지문:', totalPassages, '/ 총 문장(줄):', totalLines);
for (const g of groups) {
  const ln = g.items.reduce((n, x) => n + x.lines.length, 0);
  console.log(`  - ${g.label}: ${g.items.length}지문, ${ln}줄`);
}
