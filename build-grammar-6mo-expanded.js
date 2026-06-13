// 2026 6월 모의고사 지문별 어법 "확장판"
// 각 analysis.html의 "문장별 분석" 표(성분·품사 / 어구 / 설명)를 전부 끌어모아
// 지문당 15~20개 수준의 어법 요소를 정리 (요약판의 상위 호환)

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'collections', '6월모의고사-어법포인트-확장판.html');
const SUMMARY_LINK = '6월모의고사-어법포인트-모음.html';

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

// 일반 인라인(설명/어구용): strong,b,em,i,br 만 허용
const ALLOWED = /<\/?(strong|b|em|i|br)\s*\/?>/gi;
const safeInline = (s) => {
  if (s == null) return '';
  const ph = [];
  let t = String(s).replace(ALLOWED, (m) => {
    ph.push(m);
    return `\u0000${ph.length - 1}\u0000`;
  });
  t = esc(t.trim());
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => ph[+i]);
};

// 영어 문장용: hl- 하이라이트 span + strong + br 허용
const ALLOWED_S = /<\/?(?:strong|span|br)(?:\s+class=['"][^'"]*['"])?\s*\/?>/gi;
const safeSentence = (s) => {
  if (s == null) return '';
  const ph = [];
  let t = String(s).replace(ALLOWED_S, (m) => {
    // class 따옴표를 큰따옴표로 통일
    ph.push(m.replace(/class='([^']*)'/gi, 'class="$1"'));
    return `\u0000${ph.length - 1}\u0000`;
  });
  t = esc(t.trim());
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => ph[+i]);
};

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

// 문장별 분석 추출
function parseAnalysis(localPath) {
  const full = path.join(ROOT, localPath);
  if (!fs.existsSync(full)) return null;
  const html = fs.readFileSync(full, 'utf8');

  // 예상 제목
  let expected = '';
  const em = html.match(/예상 제목<\/th>\s*<td>([\s\S]*?)<\/td>/);
  if (em) expected = em[1].replace(/<[^>]+>/g, '').trim();

  // 문장 블록들 분리
  const chunks = html.split('<div class="sentence-block">').slice(1);
  const sentences = [];
  for (const chunk of chunks) {
    const titleM = chunk.match(/<div class="sentence-title">([\s\S]*?)<\/div>/);
    const enM = chunk.match(/<div class="sentence-en">([\s\S]*?)<\/div>/);
    const tableM = chunk.match(/<table class="analysis-table">([\s\S]*?)<\/table>/);
    if (!enM) continue;

    let label = '';
    if (titleM) {
      const raw = titleM[1].replace(/<[^>]+>/g, '').trim();
      // "2 문장별 분석 — ① 동격 표현 + 수동태" -> "① 동격 표현 + 수동태"
      const dash = raw.lastIndexOf('—');
      label = dash >= 0 ? raw.slice(dash + 1).trim() : raw.replace(/^\d+\s*문장별\s*분석\s*/, '').trim();
    }

    const rows = [];
    if (tableM) {
      const rowRe =
        /<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g;
      let rm;
      while ((rm = rowRe.exec(tableM[1]))) {
        rows.push({
          comp: safeInline(rm[1].replace(/<[^>]+>/g, '')),
          phrase: safeInline(rm[2].replace(/<[^>]+>/g, '')),
          desc: safeInline(rm[3]),
        });
      }
    }

    const transM = chunk.match(/<div class="direct-trans">([\s\S]*?)<\/div>/);
    let trans = '';
    if (transM) {
      trans = transM[1].replace(/<span class="trans-label">[\s\S]*?<\/span>/, '').replace(/<[^>]+>/g, '').trim();
    }

    sentences.push({ label, en: safeSentence(enM[1]), rows, trans });
  }

  return { expected, sentences };
}

const groups = [];
let totalPassages = 0;
let totalElements = 0;

for (const src of SOURCES) {
  const list = parseCollection(src.file);
  const items = [];
  for (const it of list) {
    const a = parseAnalysis(it.localPath);
    if (!a || a.sentences.length === 0) continue;
    const elemCount = a.sentences.reduce((n, s) => n + s.rows.length, 0);
    items.push({
      code: it.code,
      koTitle: it.koTitle,
      expected: a.expected,
      url: it.url,
      sentences: a.sentences,
      elemCount,
      sortKey: parseInt(it.code, 10) || 999,
    });
  }
  items.sort((a, b) => a.sortKey - b.sortKey || a.code.localeCompare(b.code));
  totalPassages += items.length;
  totalElements += items.reduce((n, x) => n + x.elemCount, 0);
  groups.push({ ...src, items });
}

const avg = totalPassages ? Math.round(totalElements / totalPassages) : 0;

// 본문
let sections = '';
for (const g of groups) {
  let cards = '';
  for (const it of g.items) {
    let sBlocks = '';
    for (const s of it.sentences) {
      const rowsHtml = s.rows
        .map(
          (r) =>
            `<li><span class="comp">${r.comp}</span>${
              r.phrase ? `<span class="phrase">${r.phrase}</span>` : ''
            }<span class="desc">${r.desc}</span></li>`
        )
        .join('');
      sBlocks += `
        <div class="sentence">
          ${s.label ? `<div class="s-label">${esc(s.label)}</div>` : ''}
          <div class="s-en">${s.en}</div>
          <ul class="elem-list">${rowsHtml}</ul>
          ${s.trans ? `<div class="s-trans">${esc(s.trans)}</div>` : ''}
        </div>`;
    }
    cards += `
      <div class="passage" data-search="${esc((it.koTitle + ' ' + it.expected + ' ' + it.sentences.map((s) => s.rows.map((r) => r.comp + ' ' + r.desc).join(' ')).join(' ')).toLowerCase())}">
        <div class="passage-head">
          <span class="code-badge">${esc(it.code)}번</span>
          <div class="passage-titles">
            <div class="t-ko">${esc(it.koTitle)}</div>
            ${it.expected ? `<div class="t-en">${esc(it.expected)}</div>` : ''}
          </div>
          <span class="elem-count">어법 ${it.elemCount}</span>
          <a class="passage-link" href="${esc(it.url)}" target="_blank" rel="noopener">분석교안 ↗</a>
        </div>
        ${sBlocks}
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
<title>2026 6월 모의고사 어법 확장판 · 공우정바른학원</title>
<style>
  :root{
    --brand:#6B5B95; --brand-dark:#4A3D6B; --brand-light:#E8E4F3; --brand-bg:#F4F2F8;
    --bg:#F7F5F0; --card:#fff; --border:#E3DFD5; --text:#2A2A2A; --muted:#6E6B65;
    --accent-red:#A32D2D; --accent-teal:#0F6E56; --accent-amber:#7a4500;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Pretendard','Noto Sans KR','Malgun Gothic',-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:0 0 60px}
  .toolbar{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid var(--border);padding:10px 18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 2px 8px rgba(0,0,0,.04)}
  .toolbar-brand{display:flex;align-items:center;gap:10px}
  .toolbar .logo-img{height:30px;width:auto;display:block}
  .toolbar .logo-lockup{height:36px;width:auto;display:block;border-radius:3px}
  .brand-mark{font-weight:800;color:var(--brand-dark);font-size:15px;letter-spacing:-.3px}
  .brand-sub{font-size:11px;color:var(--muted)}
  .toolbar .switch-link{font-size:12px;font-weight:700;color:var(--brand-dark);text-decoration:none;padding:6px 12px;border:1px solid var(--brand-light);border-radius:8px;background:var(--brand-bg)}
  .toolbar .switch-link:hover{background:var(--brand);color:#fff;border-color:var(--brand)}
  .watermark{position:fixed;inset:0;z-index:5;pointer-events:none;background:url("${LOGO}") center center no-repeat;background-size:340px auto;opacity:.07}
  .toolbar .search{margin-left:auto;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:#faf9fc;min-width:180px}
  .toolbar .search:focus{outline:none;border-color:var(--brand);background:#fff}
  .print-btn{padding:8px 14px;border:none;border-radius:8px;background:var(--brand);color:#fff;font-weight:700;font-size:13px;cursor:pointer}
  .print-btn:hover{background:var(--brand-dark)}
  .container{max-width:1000px;margin:0 auto;padding:0 18px;position:relative;z-index:1}
  .hero{background:linear-gradient(135deg,var(--brand-dark),var(--brand));color:#fff;padding:34px 30px;border-radius:18px;margin:22px 0 18px;box-shadow:0 6px 20px rgba(74,61,107,.22);position:relative;overflow:hidden}
  .hero .hero-logo{height:26px;width:auto;display:block;margin-bottom:12px;filter:brightness(0) invert(1);opacity:.95}
  .hero .eyebrow{font-size:12px;letter-spacing:.12em;opacity:.9;margin-bottom:8px}
  .hero .badge-exp{display:inline-block;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);font-size:11px;font-weight:700;padding:2px 10px;border-radius:12px;margin-bottom:10px;letter-spacing:.04em}
  .hero h1{font-size:27px;font-weight:800;margin-bottom:10px;word-break:keep-all}
  .hero p{font-size:13.5px;opacity:.92;line-height:1.7;max-width:720px}
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
  .passage{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:15px 18px;margin-bottom:13px;box-shadow:0 1px 4px rgba(0,0,0,.03)}
  .passage-head{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;padding-bottom:8px;border-bottom:1px dashed var(--brand-light)}
  .code-badge{background:var(--brand);color:#fff;font-size:12px;font-weight:700;padding:3px 11px;border-radius:7px;white-space:nowrap}
  .passage-titles{flex:1;min-width:160px}
  .t-ko{font-size:14.5px;font-weight:700;color:var(--text)}
  .t-en{font-size:11.5px;color:var(--muted);font-style:italic;margin-top:1px}
  .elem-count{font-size:11px;font-weight:700;color:var(--accent-teal);background:#e6f4ef;padding:2px 9px;border-radius:10px;white-space:nowrap}
  .passage-link{font-size:11px;color:var(--brand-dark);text-decoration:none;padding:3px 9px;border:1px solid var(--brand-light);border-radius:6px;white-space:nowrap}
  .passage-link:hover{background:var(--brand-light)}
  .sentence{padding:9px 0 4px;border-bottom:1px solid #f1eef7}
  .sentence:last-child{border-bottom:none}
  .s-label{font-size:11px;font-weight:700;color:var(--brand-dark);margin-bottom:5px}
  .s-en{font-size:13px;line-height:1.7;background:#faf9fc;border-left:3px solid var(--brand-light);border-radius:0 6px 6px 0;padding:7px 11px;margin-bottom:7px}
  .s-en .hl-blue{color:var(--brand-dark);font-weight:700}
  .s-en .hl-red{color:var(--accent-red);font-weight:700}
  .s-en .hl-teal{color:var(--accent-teal);font-weight:700}
  .s-en .hl-amber{color:var(--accent-amber);font-weight:700}
  .s-en .hl-purple{color:var(--brand);font-weight:700}
  .s-en strong{font-weight:700}
  .elem-list{list-style:none;display:flex;flex-direction:column;gap:4px;margin-bottom:6px}
  .elem-list li{display:flex;gap:8px;align-items:baseline;font-size:12.5px;line-height:1.55;padding:3px 0}
  .elem-list .comp{flex:0 0 auto;min-width:74px;font-weight:700;color:var(--brand-dark);font-size:11.5px}
  .elem-list .phrase{flex:0 0 auto;font-family:'SF Mono',Consolas,monospace;font-size:11px;color:#555;background:#f4f2f8;padding:1px 7px;border-radius:5px}
  .elem-list .desc{flex:1;color:#333}
  .s-trans{font-size:11.5px;color:var(--muted);background:#f3f1e9;border-left:3px solid var(--accent-amber);border-radius:0 5px 5px 0;padding:5px 10px}
  .footer{text-align:center;padding:30px 20px 10px;font-size:12px;color:var(--muted)}
  .no-result{display:none;text-align:center;padding:60px 20px;color:var(--muted)}
  @media print{
    .toolbar,.filters{display:none!important}
    body{background:#fff;padding:0}
    .hero{box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .passage{break-inside:avoid;box-shadow:none}
    .watermark{opacity:.1;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{size:A4;margin:13mm}
  }
  @media(max-width:560px){.hero h1{font-size:22px}.toolbar .search{min-width:130px}.elem-list li{flex-wrap:wrap}}
</style>
</head>
<body>
<div class="watermark" aria-hidden="true"></div>
<nav class="toolbar">
  <img class="logo-lockup" src="${LOCKUP}" alt="공우정바른학원 GWJ EDU">
  <a class="switch-link" href="${SUMMARY_LINK}">📑 요약판 보기</a>
  <input type="search" class="search" id="search" placeholder="🔍 어법·제목 검색…">
  <button class="print-btn" onclick="window.print()">🖨 인쇄 / PDF</button>
</nav>
<div class="container">
  <div class="hero">
    <img class="hero-logo" src="${LOGO}" alt="공우정바른학원">
    <div class="badge-exp">확장판 · 전체 어법 요소</div>
    <div class="eyebrow">공우정바른학원 · GWJ EDU</div>
    <h1>2026 6월 모의고사 · 어법 확장판</h1>
    <p>각 지문의 <strong>문장별 구·절 분석</strong>에 등장하는 어법 요소를 빠짐없이 모았습니다. 요약판이 핵심 출제 우선순위라면, 확장판은 지문에 나오는 모든 어법을 점검해 "정리본 밖" 출제 가능성까지 대비하는 용도입니다.</p>
    <div class="stats">
      <div class="stat"><b>${totalPassages}</b><span>지문</span></div>
      <div class="stat"><b>${totalElements}</b><span>어법 요소</span></div>
      <div class="stat"><b>${avg}</b><span>지문당 평균</span></div>
    </div>
  </div>
  <div class="filters">${filterBtns}</div>
  <div id="content">${sections}</div>
  <div class="no-result" id="noResult">검색 결과가 없습니다.</div>
  <div class="footer">공우정바른학원 · GWJ EDU &nbsp;·&nbsp; 생성일 ${dateStr} &nbsp;·&nbsp; 확장판</div>
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
console.log('총 지문:', totalPassages, '/ 총 어법 요소:', totalElements, '/ 지문당 평균:', avg);
for (const g of groups) {
  const el = g.items.reduce((n, x) => n + x.elemCount, 0);
  console.log(`  - ${g.label}: ${g.items.length}지문, ${el}요소`);
}
