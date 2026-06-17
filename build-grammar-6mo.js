// 2026 6월 모의고사 지문별 핵심 어법 포인트 모음 생성기
// 컬렉션 인덱스(한글 제목/코드/경로) + 각 analysis.html의 "③ 어법 포인트" 결합

const fs = require('fs');
const path = require('path');
const {
  usedGradesFromList,
  gradeFilterHtml,
  GRADE_FILTER_CSS,
  GRADE_PRINT_CSS,
  GRADE_FILTER_SCRIPT,
} = require('./assets/build-page-ui');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'collections', '6월모의고사-어법포인트-모음.html');

// 공우정 심볼/로고 (분석교안에서 추출한 base64 PNG)
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

const ALLOWED = /<\/?(strong|b|em|i|span|br)\s*\/?>/gi;
const safeInline = (s) => {
  if (s == null) return '';
  const ph = [];
  let t = String(s).replace(ALLOWED, (m) => {
    ph.push(m);
    return `\u0000${ph.length - 1}\u0000`;
  });
  t = esc(t);
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => ph[+i]);
};

// 컬렉션 파일에서 {code, koTitle, url} 추출
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

// analysis.html에서 "③ 어법 포인트" li들과 예상 제목 추출
function parseAnalysis(localPath) {
  const full = path.join(ROOT, localPath);
  if (!fs.existsSync(full)) return null;
  const html = fs.readFileSync(full, 'utf8');

  // 어법 포인트 박스
  const boxRe =
    /box-label">[^<]*어법\s*포인트<\/div>\s*<div class="box-body">([\s\S]*?)<\/div>\s*<\/div>/;
  const bm = html.match(boxRe);
  let points = [];
  if (bm) {
    const body = bm[1];
    const liRe = /<li>([\s\S]*?)<\/li>/g;
    let lm;
    while ((lm = liRe.exec(body))) {
      const txt = lm[1].trim();
      if (txt) points.push(txt);
    }
    if (points.length === 0) {
      // ul/li가 아니라 평문일 경우
      const plain = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (plain) points.push(plain);
    }
  }

  // 예상 제목(영문)
  let expected = '';
  const em = html.match(/예상 제목<\/th>\s*<td>([\s\S]*?)<\/td>/);
  if (em) expected = em[1].replace(/<[^>]+>/g, '').trim();

  return { points, expected };
}

const groups = [];
let totalPassages = 0;
let totalPoints = 0;

for (const src of SOURCES) {
  const list = parseCollection(src.file);
  const items = [];
  for (const it of list) {
    const a = parseAnalysis(it.localPath);
    if (!a || a.points.length === 0) continue;
    items.push({
      code: it.code,
      koTitle: it.koTitle,
      expected: a.expected,
      url: it.url,
      points: a.points,
      sortKey: parseInt(it.code, 10) || 999,
    });
  }
  items.sort((a, b) => a.sortKey - b.sortKey || a.code.localeCompare(b.code));
  totalPassages += items.length;
  totalPoints += items.reduce((n, x) => n + x.points.length, 0);
  groups.push({ ...src, items });
}

// HTML 본문
let sections = '';
for (const g of groups) {
  let cards = '';
  for (const it of g.items) {
    const lis = it.points.map((p) => `<li>${safeInline(p)}</li>`).join('');
    cards += `
      <div class="passage" data-search="${esc((it.koTitle + ' ' + it.expected + ' ' + it.points.join(' ')).toLowerCase())}">
        <div class="passage-head">
          <span class="code-badge">${esc(it.code)}번</span>
          <div class="passage-titles">
            <div class="t-ko">${esc(it.koTitle)}</div>
            ${it.expected ? `<div class="t-en">${esc(it.expected)}</div>` : ''}
          </div>
          <a class="passage-link" href="${esc(it.url)}" target="_blank" rel="noopener">분석교안 ↗</a>
        </div>
        <ul class="grammar-list">${lis}</ul>
      </div>`;
  }
  sections += `
    <section class="series" data-grade="${esc(g.level)}">
      <div class="series-head">
        <h2>${esc(g.label)}</h2>
        <span class="series-count">지문 ${g.items.length}개</span>
      </div>
      ${cards}
    </section>`;
}

const today = new Date();
const dateStr = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;

const usedGrades = usedGradesFromList(groups);
const gradeFilters = gradeFilterHtml(usedGrades, esc);

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>2026 6월 모의고사 지문별 어법 포인트 · 공우정바른학원</title>
<style>
  :root{
    --brand:#6B5B95; --brand-dark:#4A3D6B; --brand-light:#E8E4F3; --brand-bg:#F4F2F8;
    --bg:#F7F5F0; --card:#fff; --border:#E3DFD5; --text:#2A2A2A; --muted:#6E6B65;
    --accent-red:#A32D2D;
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
  .hero .badge-exp{display:inline-block;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);font-size:11px;font-weight:700;padding:2px 10px;border-radius:12px;margin-bottom:10px;letter-spacing:.04em}
  .watermark{position:fixed;inset:0;z-index:5;pointer-events:none;background:url("${LOGO}") center center no-repeat;background-size:340px auto;opacity:.07}
  .toolbar .search{margin-left:auto;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:#faf9fc;min-width:200px}
  .toolbar .search:focus{outline:none;border-color:var(--brand);background:#fff}
  .print-btn{padding:8px 14px;border:none;border-radius:8px;background:var(--brand);color:#fff;font-weight:700;font-size:13px;cursor:pointer}
  .print-btn:hover{background:var(--brand-dark)}
  .container{max-width:980px;margin:0 auto;padding:0 18px;position:relative;z-index:1}
  .hero{background:linear-gradient(135deg,var(--brand-dark),var(--brand));color:#fff;padding:34px 30px;border-radius:18px;margin:22px 0 18px;box-shadow:0 6px 20px rgba(74,61,107,.22);position:relative;overflow:hidden}
  .hero .hero-logo{height:26px;width:auto;display:block;margin-bottom:12px;filter:brightness(0) invert(1);opacity:.95}
  .hero .eyebrow{font-size:12px;letter-spacing:.12em;opacity:.9;margin-bottom:8px}
  .hero h1{font-size:27px;font-weight:800;margin-bottom:10px;word-break:keep-all}
  .hero p{font-size:13.5px;opacity:.92;line-height:1.7;max-width:680px}
  .hero .stats{display:flex;gap:22px;margin-top:16px;flex-wrap:wrap}
  .hero .stat b{font-size:22px;font-weight:800;display:block}
  .hero .stat span{font-size:11.5px;opacity:.85}
  ${GRADE_FILTER_CSS}
  .series{margin-bottom:30px}
  .series-head{display:flex;align-items:baseline;gap:12px;padding-bottom:10px;margin-bottom:14px;border-bottom:2px solid var(--brand-light)}
  .series-head h2{font-size:19px;color:var(--brand-dark);font-weight:800}
  .series-count{font-size:12px;color:var(--muted);background:var(--brand-bg);padding:2px 10px;border-radius:12px}
  .passage{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:15px 18px;margin-bottom:11px;box-shadow:0 1px 4px rgba(0,0,0,.03)}
  .passage-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
  .code-badge{background:var(--brand);color:#fff;font-size:12px;font-weight:700;padding:3px 11px;border-radius:7px;white-space:nowrap}
  .passage-titles{flex:1;min-width:160px}
  .t-ko{font-size:14.5px;font-weight:700;color:var(--text)}
  .t-en{font-size:11.5px;color:var(--muted);font-style:italic;margin-top:1px}
  .passage-link{font-size:11px;color:var(--brand-dark);text-decoration:none;padding:3px 9px;border:1px solid var(--brand-light);border-radius:6px;white-space:nowrap}
  .passage-link:hover{background:var(--brand-light)}
  .grammar-list{list-style:none;display:flex;flex-direction:column;gap:6px}
  .grammar-list li{position:relative;padding:8px 12px 8px 30px;background:#fdfcff;border:1px solid var(--brand-light);border-radius:8px;font-size:13px;line-height:1.65;color:#333}
  .grammar-list li::before{content:"";position:absolute;left:11px;top:14px;width:7px;height:7px;border-radius:50%;background:var(--brand)}
  .grammar-list li strong{color:var(--brand-dark);font-weight:700}
  .grammar-list li b{color:var(--accent-red)}
  .footer{text-align:center;padding:30px 20px 10px;font-size:12px;color:var(--muted)}
  .no-result{display:none;text-align:center;padding:60px 20px;color:var(--muted)}
  @media print{
    .toolbar,.filters{display:none!important}
    ${GRADE_PRINT_CSS}
    body{background:#fff;padding:0}
    .hero{box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .passage{break-inside:avoid;box-shadow:none}
    .watermark{opacity:.1;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{size:A4;margin:14mm}
  }
  @media(max-width:560px){.hero h1{font-size:22px}.toolbar .search{min-width:140px}}
</style>
</head>
<body>
<div class="watermark" aria-hidden="true"></div>
<nav class="toolbar">
  <img class="logo-lockup" src="${LOCKUP}" alt="공우정바른학원 GWJ EDU">
  <a class="switch-link" href="6월모의고사-어법포인트-확장판.html">📖 확장판 보기</a>
  <input type="search" class="search" id="search" placeholder="🔍 어법·제목 검색…">
  <button class="print-btn" onclick="beforePrint()">🖨 인쇄 / PDF</button>
</nav>
<div class="container">
  <div class="hero">
    <img class="hero-logo" src="${LOGO}" alt="공우정바른학원">
    <div class="badge-exp">요약판 · 핵심 출제 우선순위</div>
    <div class="eyebrow">공우정바른학원 · GWJ EDU</div>
    <h1>2026 6월 모의고사 · 지문별 어법 포인트</h1>
    <p>2026학년도 6월 모의고사 분석교안의 각 지문에서 추출한 핵심 어법 포인트만 모았습니다. 시험 직전 어법 정리와 변형 문제 대비용으로 활용하세요.</p>
    <div class="stats">
      <div class="stat"><b>${totalPassages}</b><span>지문</span></div>
      <div class="stat"><b>${totalPoints}</b><span>어법 포인트</span></div>
      <div class="stat"><b>${groups.length}</b><span>학년</span></div>
    </div>
  </div>
  ${gradeFilters}
  <div id="content">${sections}</div>
  <div class="no-result" id="noResult">검색 결과가 없습니다.</div>
  <div class="footer">공우정바른학원 · GWJ EDU &nbsp;·&nbsp; 생성일 ${dateStr}</div>
</div>
<script>
  const search=document.getElementById('search');
  const noResult=document.getElementById('noResult');
  let activeGrade='all';
  function beforePrint(){
    if(activeGrade==='all'){
      if(!confirm('학년이 "전체"입니다. 고1·고2 가 함께 인쇄됩니다.\\n\\n고1 또는 고2를 먼저 선택하면 해당 학년만 인쇄됩니다.\\n\\n그래도 전체 인쇄할까요?')) return;
    }
    window.print();
  }
  function apply(){
    const q=search.value.trim().toLowerCase();
    let visible=0;
    document.querySelectorAll('.series').forEach(sec=>{
      const matchGrade=activeGrade==='all'||sec.dataset.grade===activeGrade;
      let secVisible=0;
      sec.querySelectorAll('.passage').forEach(p=>{
        const hit=matchGrade&&(!q||p.dataset.search.includes(q));
        p.classList.toggle('is-hidden',!hit);
        if(hit){secVisible++;visible++;}
      });
      sec.classList.toggle('is-hidden',!(matchGrade&&secVisible>0));
    });
    noResult.style.display=visible===0?'block':'none';
  }
  document.querySelectorAll('.grade-btn').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.grade-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    activeGrade=b.dataset.grade;
    apply();
  }));
  search.addEventListener('input',apply);
</script>
</body>
</html>`;

fs.writeFileSync(OUT, html, 'utf8');

console.log('생성 완료:', path.relative(ROOT, OUT));
console.log('총 지문:', totalPassages, '/ 총 어법 포인트:', totalPoints);
for (const g of groups) {
  console.log(`  - ${g.label}: ${g.items.length}지문, ${g.items.reduce((n, x) => n + x.points.length, 0)}포인트`);
  const missing = g.items.filter((x) => !x.expected).length;
  if (missing) console.log(`      (영문 제목 누락 ${missing}건)`);
}
