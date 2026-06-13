// 지문별 핵심 어법 포인트 모음 생성기
// gwj_backup JSON -> 교재/강별로 정리된 어법 포인트 학습 자료(HTML)

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'gwj_backup_2026-04-28.json');
const OUT = path.join(__dirname, 'collections', '지문별-어법포인트-모음.html');

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const records = raw.records || [];

// 공우정 심볼/로고 (분석교안에서 추출한 base64 PNG)
const LOGO = fs.readFileSync(path.join(__dirname, 'assets', 'logo-base64.txt'), 'utf8').trim();
const LOCKUP = fs.readFileSync(path.join(__dirname, 'assets', 'logo-lockup-color.txt'), 'utf8').trim();

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// grammar_points 안에는 일부 <strong> 등 인라인 태그가 들어있을 수 있어
// 안전한 태그만 허용하고 나머지는 이스케이프
const ALLOWED = /<\/?(strong|b|em|i|span|br)\s*\/?>/gi;
const safeInline = (s) => {
  if (s == null) return '';
  const placeholders = [];
  let t = String(s).replace(ALLOWED, (m) => {
    placeholders.push(m);
    return `\u0000${placeholders.length - 1}\u0000`;
  });
  t = esc(t);
  t = t.replace(/\u0000(\d+)\u0000/g, (_, i) => placeholders[+i]);
  return t;
};

// 레코드 -> 정규화
const items = records
  .map((r) => {
    const d = r.data || {};
    const gp = (d.transformations && d.transformations.grammar_points) || [];
    return {
      id: r.id,
      series: d.series_title || d.level || '기타 자료',
      volume: d.volume_title || d.textbook || '',
      unitTitle: d.unit_title || d.lesson || d.item_code || '',
      unitNo: typeof d.unit_no === 'number' ? d.unit_no : parseInt(d.item_code, 10) || 9999,
      itemCode: d.item_code || '',
      titleKo: d.title_ko || '',
      expectedTitle: d.expected_title || '',
      topicKo: d.topic_ko || '',
      grammar: Array.isArray(gp) ? gp.filter((x) => x && String(x).trim()) : [],
      url: r.githubUrlAnalysis || r.githubUrl || '',
    };
  })
  .filter((it) => it.grammar.length > 0);

// ───────────────────────────────────────────────────────────────
// 모의고사 등 JSON 백업에 없는 자료를 analysis.html에서 직접 보강
//   - 컬렉션 인덱스(한글 제목/코드/경로) + 각 analysis.html의 "③ 어법 포인트"
//   - 같은 series_title("(고N) 2026 모의고사")의 "월별" 볼륨으로 누적
// 향후 새 회차/자료 추가 시 EXTRA_SOURCES에 한 줄만 추가하면 됩니다.
// ───────────────────────────────────────────────────────────────
const EXTRA_SOURCES = [
  { series: '(고1) 2026 모의고사', volume: '6월', file: 'collections/고1-2026년-6모고.html' },
  { series: '(고2) 2026 모의고사', volume: '6월', file: 'collections/고2-6모고.html' },
];

function parseCollection(htmlPath) {
  const abs = path.join(__dirname, htmlPath);
  if (!fs.existsSync(abs)) return [];
  const html = fs.readFileSync(abs, 'utf8');
  const re =
    /<a\s+href="(https:\/\/gongwoojeong-edu\.github\.io\/gwj-study\/(study\/[^"#]+analysis\.html))[^"]*"[^>]*class="item-main-link">[\s\S]*?<code class="item-code">([^<]*)<\/code>\s*<strong class="item-title">([^<]*)<\/strong>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    out.push({ url: m[1], localPath: decodeURIComponent(m[2]), code: m[3].trim(), koTitle: m[4].trim() });
  }
  return out;
}

function parseGrammarPoints(localPath) {
  const abs = path.join(__dirname, localPath);
  if (!fs.existsSync(abs)) return null;
  const html = fs.readFileSync(abs, 'utf8');
  const boxRe = /box-label">[^<]*어법\s*포인트<\/div>\s*<div class="box-body">([\s\S]*?)<\/div>\s*<\/div>/;
  const bm = html.match(boxRe);
  const points = [];
  if (bm) {
    const liRe = /<li>([\s\S]*?)<\/li>/g;
    let lm;
    while ((lm = liRe.exec(bm[1]))) {
      const txt = lm[1].trim();
      if (txt) points.push(txt);
    }
    if (points.length === 0) {
      const plain = bm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (plain) points.push(plain);
    }
  }
  let expected = '';
  const em = html.match(/예상 제목<\/th>\s*<td>([\s\S]*?)<\/td>/);
  if (em) expected = em[1].replace(/<[^>]+>/g, '').trim();
  return { points, expected };
}

for (const src of EXTRA_SOURCES) {
  for (const it of parseCollection(src.file)) {
    const a = parseGrammarPoints(it.localPath);
    if (!a || a.points.length === 0) continue;
    items.push({
      id: it.url,
      series: src.series,
      volume: src.volume,
      unitTitle: it.code,
      unitNo: parseInt(it.code, 10) || 9999,
      itemCode: it.code,
      titleKo: it.koTitle,
      expectedTitle: a.expected,
      topicKo: '',
      grammar: a.points,
      url: it.url,
    });
  }
}

// 대분류(카테고리) 분류 규칙 — 향후 누적 시 키워드만 보강하면 됩니다.
const CATEGORY_ORDER = ['교과서 본문', '부교재 지문', '모의고사 지문'];
const TEXTBOOK_RE = /(교과서|능률|천재|비상|동아|YBM|지학사|금성|미래엔|다락원|NE능률)/;
function categoryOf(series) {
  if (/모의고사|모고|학력평가|학평/.test(series)) return '모의고사 지문';
  if (TEXTBOOK_RE.test(series)) return '교과서 본문';
  return '부교재 지문';
}

// 그룹: series -> volume
const seriesOrder = [];
const seriesMap = new Map();
for (const it of items) {
  if (!seriesMap.has(it.series)) {
    seriesMap.set(it.series, new Map());
    seriesOrder.push(it.series);
  }
  const volMap = seriesMap.get(it.series);
  if (!volMap.has(it.volume)) volMap.set(it.volume, []);
  volMap.get(it.volume).push(it);
}

// 정렬
for (const volMap of seriesMap.values()) {
  for (const arr of volMap.values()) {
    arr.sort((a, b) => a.unitNo - b.unitNo || a.itemCode.localeCompare(b.itemCode));
  }
}

const totalPassages = items.length;
const totalPoints = items.reduce((n, it) => n + it.grammar.length, 0);
const today = new Date();
const dateStr = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;

// 볼륨 정렬용 숫자 추출 ("3월"->3, "1강"->1, "제1회"->1)
const volNum = (v) => {
  const m = String(v).match(/\d+/);
  return m ? parseInt(m[0], 10) : 9999;
};

let sid = 0; // 시리즈 고유 id (탭 스코프용)

function renderCards(arr) {
  let cards = '';
  for (const it of arr) {
    const lis = it.grammar.map((g) => `<li>${safeInline(g)}</li>`).join('');
    const codeLabel = it.itemCode ? `${esc(it.itemCode)}` : '';
    const titleLink = it.url
      ? `<a class="passage-link" href="${esc(it.url)}" target="_blank" rel="noopener">분석교안 ↗</a>`
      : '';
    cards += `
        <div class="passage" data-search="${esc((it.titleKo + ' ' + it.expectedTitle + ' ' + it.grammar.join(' ')).toLowerCase())}">
          <div class="passage-head">
            <span class="code-badge">${codeLabel}</span>
            <div class="passage-titles">
              <div class="t-ko">${esc(it.titleKo) || esc(it.expectedTitle)}</div>
              ${it.expectedTitle ? `<div class="t-en">${esc(it.expectedTitle)}</div>` : ''}
            </div>
            ${titleLink}
          </div>
          <ul class="grammar-list">${lis}</ul>
        </div>`;
  }
  return cards;
}

// 시리즈 1개 -> HTML(볼륨 탭) + 지문 수
function buildSeries(series) {
  const volMap = seriesMap.get(series);
  const vols = [...volMap.entries()].sort((a, b) => volNum(a[0]) - volNum(b[0]) || String(a[0]).localeCompare(String(b[0])));
  const seriesPassages = vols.reduce((n, [, arr]) => n + arr.length, 0);
  const id = `s${sid++}`;

  // 볼륨이 1개이고 이름이 없으면 탭 없이 카드만
  const single = vols.length === 1 && !vols[0][0];
  if (single) {
    return {
      passages: seriesPassages,
      html: `
      <section class="series" data-active-vol="0">
        <div class="series-head">
          <h3>${esc(series)}</h3>
          <span class="series-count">지문 ${seriesPassages}개</span>
        </div>
        <div class="vol-panels">
          <div class="vol-panel" data-vol="0">${renderCards(vols[0][1])}</div>
        </div>
      </section>`,
    };
  }

  let tabs = '';
  let panels = '';
  vols.forEach(([vol, arr], i) => {
    tabs += `<button class="vol-tab${i === 0 ? ' active' : ''}" data-vol="${i}">${esc(vol || '기타')}<span class="vol-tab-n">${arr.length}</span></button>`;
    panels += `
          <div class="vol-panel" data-vol="${i}"${i === 0 ? '' : ' hidden'}>
            <h4 class="vol-print-label">${esc(vol || '기타')}</h4>
            ${renderCards(arr)}
          </div>`;
  });

  return {
    passages: seriesPassages,
    html: `
      <section class="series" data-series-id="${id}" data-active-vol="0">
        <div class="series-head">
          <h3>${esc(series)}</h3>
          <span class="series-count">지문 ${seriesPassages}개</span>
        </div>
        <div class="vol-tabs" role="tablist">${tabs}</div>
        <div class="vol-panels">${panels}</div>
      </section>`,
  };
}

// 본문 빌드: 대분류(카테고리) -> 시리즈 -> 볼륨 -> 지문
const usedCategories = [];
let sections = '';
for (const cat of CATEGORY_ORDER) {
  const seriesInCat = seriesOrder.filter((s) => categoryOf(s) === cat);
  if (!seriesInCat.length) continue;
  usedCategories.push(cat);
  let catPassages = 0;
  let seriesHtml = '';
  for (const series of seriesInCat) {
    const b = buildSeries(series);
    catPassages += b.passages;
    seriesHtml += b.html;
  }
  sections += `
    <div class="category" data-category="${esc(cat)}">
      <div class="category-head">
        <h2>${esc(cat)}</h2>
        <span class="category-count">${seriesInCat.length}개 자료 · 지문 ${catPassages}개</span>
      </div>
      ${seriesHtml}
    </div>`;
}

const filterBtns =
  `<button class="filter-btn active" data-target="all">전체</button>` +
  usedCategories.map((c) => `<button class="filter-btn" data-target="${esc(c)}">${esc(c)}</button>`).join('');

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>지문별 핵심 어법 포인트 모음 · 공우정바른학원</title>
<style>
  :root{
    --brand:#6B5B95; --brand-dark:#4A3D6B; --brand-light:#E8E4F3; --brand-bg:#F4F2F8;
    --bg:#F7F5F0; --card:#fff; --border:#E3DFD5; --text:#2A2A2A; --muted:#6E6B65;
    --accent-red:#A32D2D; --accent-amber:#7a4500;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Pretendard','Noto Sans KR','Malgun Gothic',-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:0 0 60px}
  a{color:inherit}
  .toolbar{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid var(--border);padding:10px 18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 2px 8px rgba(0,0,0,.04)}
  .toolbar-brand{display:flex;align-items:center;gap:10px}
  .toolbar .logo-img{height:30px;width:auto;display:block}
  .toolbar .logo-lockup{height:36px;width:auto;display:block;border-radius:3px}
  .brand-mark{font-weight:800;color:var(--brand-dark);font-size:15px;letter-spacing:-.3px}
  .brand-sub{font-size:11px;color:var(--muted)}
  .watermark{position:fixed;inset:-60%;z-index:0;pointer-events:none;background-image:url(${LOGO});background-repeat:repeat;background-size:190px auto;opacity:.04;transform:rotate(-22deg)}
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
  .filters{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px}
  .filter-btn{padding:7px 14px;border:1px solid var(--border);border-radius:20px;background:#fff;font-size:12.5px;font-weight:600;color:var(--muted);cursor:pointer;transition:.15s;font-family:inherit}
  .filter-btn:hover{border-color:var(--brand);color:var(--brand-dark)}
  .filter-btn.active{background:var(--brand);border-color:var(--brand);color:#fff}
  .category{margin-bottom:38px}
  .category-head{display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,var(--brand-dark),var(--brand));color:#fff;padding:13px 18px;border-radius:12px;margin-bottom:18px;box-shadow:0 3px 10px rgba(74,61,107,.18)}
  .category-head h2{font-size:20px;font-weight:800;letter-spacing:-.3px}
  .category-count{font-size:12px;font-weight:600;opacity:.9;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);padding:2px 11px;border-radius:12px}
  .series{margin-bottom:24px;padding-left:4px}
  .series-head{display:flex;align-items:baseline;gap:12px;padding-bottom:9px;margin-bottom:13px;border-bottom:2px solid var(--brand-light)}
  .series-head h3{font-size:17px;color:var(--brand-dark);font-weight:800}
  .series-count{font-size:12px;color:var(--muted);background:var(--brand-bg);padding:2px 10px;border-radius:12px}
  .volume{margin-bottom:18px}
  .volume-title{font-size:13.5px;color:var(--text);font-weight:700;margin:14px 0 10px;padding-left:9px;border-left:3px solid var(--brand)}
  .vol-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px;border-bottom:1px solid var(--border);padding-bottom:0}
  .vol-tab{position:relative;display:inline-flex;align-items:center;gap:6px;padding:8px 15px;border:1px solid var(--border);border-bottom:none;background:#f3f1ea;color:var(--muted);font-size:13px;font-weight:700;cursor:pointer;border-radius:9px 9px 0 0;font-family:inherit;margin-bottom:-1px}
  .vol-tab:hover{color:var(--brand-dark);background:var(--brand-bg)}
  .vol-tab.active{background:#fff;color:var(--brand-dark);border-color:var(--border);border-bottom:1px solid #fff}
  .vol-tab-n{font-size:10.5px;font-weight:700;background:var(--brand-light);color:var(--brand-dark);padding:1px 7px;border-radius:9px}
  .vol-tab.active .vol-tab-n{background:var(--brand);color:#fff}
  .vol-print-label{display:none}
  .vol-panel[hidden]{display:none}
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
    body{background:#fff;padding:0}
    .hero{box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .passage{break-inside:avoid;box-shadow:none}
    .series{break-inside:auto}
    .vol-tabs{display:none!important}
    .vol-panel[hidden]{display:block!important}
    .vol-print-label{display:block;font-size:13.5px;color:var(--text);font-weight:700;margin:14px 0 10px;padding-left:9px;border-left:3px solid var(--brand)}
    .category-head{-webkit-print-color-adjust:exact;print-color-adjust:exact;break-after:avoid}
    .watermark{opacity:.05;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{size:A4;margin:14mm}
  }
  @media(max-width:560px){.hero h1{font-size:22px}.toolbar .search{min-width:140px}}
</style>
</head>
<body>
<div class="watermark" aria-hidden="true"></div>
<nav class="toolbar">
  <img class="logo-lockup" src="${LOCKUP}" alt="공우정바른학원 GWJ EDU">
  <input type="search" class="search" id="search" placeholder="🔍 어법·제목 검색…">
  <button class="print-btn" onclick="window.print()">🖨 인쇄 / PDF</button>
</nav>
<div class="container">
  <div class="hero">
    <img class="hero-logo" src="${LOGO}" alt="공우정바른학원">
    <div class="eyebrow">공우정바른학원 · GWJ EDU</div>
    <h1>지문별 핵심 어법 포인트 모음</h1>
    <p>교과서 본문 · 부교재 지문 · 모의고사 지문의 분석교안에서 추출한 핵심 어법 포인트를 한곳에 모았습니다. 자료가 추가될 때마다 계속 누적됩니다.</p>
    <div class="stats">
      <div class="stat"><b>${totalPassages}</b><span>지문</span></div>
      <div class="stat"><b>${totalPoints}</b><span>어법 포인트</span></div>
      <div class="stat"><b>${seriesOrder.length}</b><span>자료</span></div>
    </div>
  </div>
  <div class="filters">${filterBtns}</div>
  <div id="content">${sections}</div>
  <div class="no-result" id="noResult">검색 결과가 없습니다.</div>
  <div class="footer">공우정바른학원 · GWJ EDU &nbsp;·&nbsp; 생성일 ${dateStr}</div>
</div>
<script>
  const search = document.getElementById('search');
  const noResult = document.getElementById('noResult');
  const filterBtns = document.querySelectorAll('.filter-btn');
  let activeSeries = 'all';

  function syncTabs(series, q){
    const tabs=[...series.querySelectorAll('.vol-tab')];
    const panels=[...series.querySelectorAll('.vol-panel')];
    if(!tabs.length){ // 단일 패널(탭 없음)
      panels.forEach(p=>{p.hidden=false;});
      return;
    }
    if(q){
      // 검색 중: 매칭 있는 모든 볼륨 패널/탭 표시
      panels.forEach(p=>{ p.hidden = (+p.dataset.mc||0)===0; });
      tabs.forEach(t=>{
        const panel=panels.find(p=>p.dataset.vol===t.dataset.vol);
        t.style.display=(panel && (+panel.dataset.mc||0)>0)?'':'none';
      });
    }else{
      // 평상시: 활성 탭만
      const active=series.dataset.activeVol||'0';
      panels.forEach(p=>{ p.hidden = p.dataset.vol!==active; });
      tabs.forEach(t=>{ t.style.display=''; t.classList.toggle('active', t.dataset.vol===active); });
    }
  }

  function apply(){
    const q = search.value.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll('.category').forEach(cat=>{
      const matchCat = activeSeries==='all' || cat.dataset.category===activeSeries;
      let catVisible = 0;
      cat.querySelectorAll('.series').forEach(series=>{
        let seriesVisible=0;
        series.querySelectorAll('.vol-panel').forEach(panel=>{
          let mc=0;
          panel.querySelectorAll('.passage').forEach(p=>{
            const hit = matchCat && (!q || p.dataset.search.includes(q));
            p.style.display = hit ? '' : 'none';
            if(hit){mc++;seriesVisible++;catVisible++;visible++;}
          });
          panel.dataset.mc=mc;
        });
        syncTabs(series, q);
        series.style.display = (matchCat && seriesVisible>0) ? '' : 'none';
      });
      cat.style.display = (matchCat && catVisible>0) ? '' : 'none';
    });
    noResult.style.display = visible===0 ? 'block':'none';
  }
  search.addEventListener('input',apply);
  filterBtns.forEach(b=>b.addEventListener('click',()=>{
    filterBtns.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    activeSeries=b.dataset.target;
    apply();
  }));
  // 볼륨 탭 전환
  document.querySelectorAll('.vol-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      const series=tab.closest('.series');
      series.dataset.activeVol=tab.dataset.vol;
      if(!search.value.trim()) syncTabs(series, '');
    });
  });
</script>
</body>
</html>`;

fs.writeFileSync(OUT, html, 'utf8');

// 요약 출력
console.log('생성 완료:', path.relative(__dirname, OUT));
console.log('총 지문:', totalPassages, '/ 총 어법 포인트:', totalPoints);
for (const cat of usedCategories) {
  const seriesInCat = seriesOrder.filter((s) => categoryOf(s) === cat);
  console.log(`\n[${cat}]`);
  for (const s of seriesInCat) {
    const volMap = seriesMap.get(s);
    const vols = [...volMap.entries()].map(([v, arr]) => `${v || '-'}(${arr.length})`).join(', ');
    let n = 0;
    for (const arr of volMap.values()) n += arr.length;
    console.log(`  - ${s} : ${n}지문  [${vols}]`);
  }
}
