// 2026 6월 모의고사 전 지문 유의어/반의어 자료 (2파일)
//  - collections/6월모의고사-유의어.html
//  - collections/6월모의고사-반의어.html
// 기존 교재 데이터(비고 라벨) + AI 보강(assets/vocab-aug-6mo.json) 병합, 출처 구분 표시

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const LOGO = fs.readFileSync(path.join(ROOT, 'assets', 'logo-base64.txt'), 'utf8').trim();
const LOCKUP = fs.readFileSync(path.join(ROOT, 'assets', 'logo-lockup-color.txt'), 'utf8').trim();
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'vocab-6mo.json'), 'utf8'));
const AUG = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'vocab-aug-6mo.json'), 'utf8'));

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// "eng(한글)" -> {en, ko}
function parseEntry(str) {
  const m = String(str).match(/^([^(]+?)\s*\(([^)]*)\)\s*$/);
  if (m) return { en: m[1].trim(), ko: m[2].trim() };
  return { en: String(str).trim(), ko: '' };
}

// 기존 비고 라벨(쉼표 구분) -> ["a","b"]
function splitExisting(str) {
  if (!str) return [];
  return str
    .split(/[,/·]|\s{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// 단어별 유의어/반의어 병합 (출처: 교재/AI)
function mergeEntries(word, existing, kind) {
  const key = word.toLowerCase();
  const aug = AUG[key] || {};
  const augList = (kind === 'syn' ? aug.syn : aug.ant) || [];
  const out = [];
  const seen = new Set();
  const push = (raw, src) => {
    const e = parseEntry(raw);
    const k = e.en.toLowerCase();
    if (!e.en || seen.has(k)) return;
    seen.add(k);
    out.push({ ...e, src });
  };
  splitExisting(existing).forEach((x) => push(x, '교재'));
  augList.forEach((x) => push(x, 'AI'));
  return out;
}

function chip(e) {
  const srcCls = e.src === '교재' ? 'src-book' : 'src-ai';
  const ko = e.ko ? `<span class="chip-ko">${esc(e.ko)}</span>` : '';
  return `<span class="chip ${srcCls}" title="출처: ${e.src}"><span class="chip-en">${esc(e.en)}</span>${ko}</span>`;
}

const circled = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];

function buildOne({ kind, title, subtitle, accent, otherLinks }) {
  // kind: 'syn' | 'ant'
  const groups = new Map();
  let totalWords = 0;
  let totalEntries = 0;

  for (const p of DATA) {
    const rows = [];
    for (const v of p.vocab) {
      const existing = kind === 'syn' ? v.syn : v.ant;
      const entries = mergeEntries(v.word, existing, kind);
      if (!entries.length) continue;
      rows.push({ word: v.word, meaning: v.meaning, entries });
      totalEntries += entries.length;
    }
    if (!rows.length) continue;
    totalWords += rows.length;
    if (!groups.has(p.level)) groups.set(p.level, { label: p.label, items: [] });
    groups.get(p.level).items.push({ code: p.code, koTitle: p.koTitle, url: p.url, rows });
  }

  let sections = '';
  const levels = [...groups.keys()];
  for (const lv of levels) {
    const g = groups.get(lv);
    let cards = '';
    for (const it of g.items) {
      const trs = it.rows
        .map(
          (r) => `<tr>
            <td class="w-word">${esc(r.word)}</td>
            <td class="w-mean">${esc(r.meaning)}</td>
            <td class="w-chips">${r.entries.map(chip).join('')}</td>
          </tr>`
        )
        .join('');
      cards += `
        <div class="passage" data-search="${esc((it.koTitle + ' ' + it.rows.map((r) => r.word + ' ' + r.entries.map((e) => e.en).join(' ')).join(' ')).toLowerCase())}">
          <div class="passage-head">
            <span class="code-badge">${esc(it.code)}번</span>
            <div class="passage-titles"><div class="t-ko">${esc(it.koTitle)}</div></div>
            <span class="line-count">${it.rows.length}단어</span>
            <a class="passage-link" href="${esc(it.url)}" target="_blank" rel="noopener">분석교안 ↗</a>
          </div>
          <table class="vtable"><thead><tr><th>단어·어구</th><th>뜻</th><th>${kind === 'syn' ? '유의어 (Synonyms)' : '반의어 (Antonyms)'}</th></tr></thead><tbody>${trs}</tbody></table>
        </div>`;
    }
    sections += `
      <section class="series" data-series="${esc(lv)}">
        <div class="series-head"><h2>${esc(g.label)}</h2><span class="series-count">지문 ${g.items.length}개 · ${g.items.reduce((n, x) => n + x.rows.length, 0)}단어</span></div>
        ${cards}
      </section>`;
  }

  const filterBtns =
    `<button class="filter-btn active" data-target="all">전체</button>` +
    levels.map((lv) => `<button class="filter-btn" data-target="${esc(lv)}">${esc(groups.get(lv).label)}</button>`).join('');

  const today = new Date();
  const dateStr = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} · 공우정바른학원</title>
<style>
  :root{
    --brand:#6B5B95; --brand-dark:#4A3D6B; --brand-light:#E8E4F3; --brand-bg:#F4F2F8;
    --bg:#F7F5F0; --card:#fff; --border:#E3DFD5; --text:#2A2A2A; --muted:#6E6B65;
    --accent:${accent};
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Pretendard','Noto Sans KR','Malgun Gothic',-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:0 0 60px}
  .toolbar{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid var(--border);padding:10px 18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 2px 8px rgba(0,0,0,.04)}
  .toolbar-brand{display:flex;align-items:center;gap:10px}
  .toolbar .logo-img{height:30px;width:auto;display:block}
  .toolbar .logo-lockup{height:36px;width:auto;display:block;border-radius:3px}
  .brand-mark{font-weight:800;color:var(--brand-dark);font-size:15px;letter-spacing:-.3px}
  .brand-sub{font-size:11px;color:var(--muted)}
  .watermark{position:fixed;inset:0;z-index:5;pointer-events:none;background:url("${LOGO}") center center no-repeat;background-size:340px auto;opacity:.07}
  .toolbar .links{display:flex;gap:6px;flex-wrap:wrap}
  .switch-link{padding:7px 12px;border:1px solid var(--brand-light);border-radius:8px;background:#faf9fc;color:var(--brand-dark);font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap}
  .switch-link:hover{background:var(--brand-light)}
  .toolbar .search{margin-left:auto;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:#faf9fc;min-width:170px}
  .toolbar .search:focus{outline:none;border-color:var(--brand);background:#fff}
  .print-btn{padding:8px 14px;border:none;border-radius:8px;background:var(--brand);color:#fff;font-weight:700;font-size:13px;cursor:pointer}
  .print-btn:hover{background:var(--brand-dark)}
  .container{max-width:1000px;margin:0 auto;padding:0 18px;position:relative;z-index:1}
  .hero{background:linear-gradient(135deg,var(--brand-dark),var(--accent));color:#fff;padding:32px 30px;border-radius:18px;margin:22px 0 16px;box-shadow:0 6px 20px rgba(74,61,107,.22);position:relative;overflow:hidden}
  .hero .hero-logo{height:26px;width:auto;display:block;margin-bottom:12px;filter:brightness(0) invert(1);opacity:.95}
  .hero .eyebrow{font-size:12px;letter-spacing:.12em;opacity:.9;margin-bottom:8px}
  .hero h1{font-size:26px;font-weight:800;margin-bottom:9px;word-break:keep-all}
  .hero p{font-size:13px;opacity:.92;line-height:1.7;max-width:720px}
  .hero .stats{display:flex;gap:22px;margin-top:15px;flex-wrap:wrap}
  .hero .stat b{font-size:21px;font-weight:800;display:block}
  .hero .stat span{font-size:11.5px;opacity:.85}
  .legend{display:flex;gap:14px;align-items:center;margin:0 0 14px;font-size:12px;color:var(--muted);flex-wrap:wrap}
  .legend .chip{cursor:default}
  .filters{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px}
  .filter-btn{padding:7px 14px;border:1px solid var(--border);border-radius:20px;background:#fff;font-size:12.5px;font-weight:600;color:var(--muted);cursor:pointer;font-family:inherit}
  .filter-btn:hover{border-color:var(--brand);color:var(--brand-dark)}
  .filter-btn.active{background:var(--brand);border-color:var(--brand);color:#fff}
  .series{margin-bottom:28px}
  .series-head{display:flex;align-items:baseline;gap:12px;padding-bottom:10px;margin-bottom:14px;border-bottom:2px solid var(--brand-light)}
  .series-head h2{font-size:19px;color:var(--brand-dark);font-weight:800}
  .series-count{font-size:12px;color:var(--muted);background:var(--brand-bg);padding:2px 10px;border-radius:12px}
  .passage{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:11px;box-shadow:0 1px 4px rgba(0,0,0,.03)}
  .passage-head{display:flex;align-items:center;gap:10px;margin-bottom:9px;flex-wrap:wrap}
  .code-badge{background:var(--brand);color:#fff;font-size:12px;font-weight:700;padding:3px 11px;border-radius:7px;white-space:nowrap}
  .passage-titles{flex:1;min-width:140px}
  .t-ko{font-size:14px;font-weight:700;color:var(--text)}
  .line-count{font-size:11px;font-weight:700;color:var(--accent);background:#eee;padding:2px 9px;border-radius:10px;white-space:nowrap}
  .passage-link{font-size:11px;color:var(--brand-dark);text-decoration:none;padding:3px 9px;border:1px solid var(--brand-light);border-radius:6px;white-space:nowrap}
  .passage-link:hover{background:var(--brand-light)}
  .vtable{width:100%;border-collapse:collapse;font-size:12.5px}
  .vtable thead th{background:var(--brand-bg);color:var(--brand-dark);padding:6px 10px;border:1px solid var(--border);font-weight:700;text-align:left;font-size:11px}
  .vtable tbody td{padding:7px 10px;border:1px solid var(--border);vertical-align:top;line-height:1.55}
  .w-word{font-weight:700;width:20%;color:var(--text)}
  .w-mean{width:24%;color:var(--muted);font-size:11.5px}
  .w-chips{width:56%}
  .chip{display:inline-flex;align-items:baseline;gap:4px;margin:2px 4px 2px 0;padding:2px 8px;border-radius:12px;font-size:11.5px;border:1px solid transparent;white-space:nowrap}
  .chip-en{font-weight:700}
  .chip-ko{font-size:10px;opacity:.8}
  .src-ai{background:#eef0fb;border-color:#d6daf5;color:#3a3f7a}
  .src-book{background:#e6f4ef;border-color:#bfe3d6;color:#0f6e56}
  .footer{text-align:center;padding:28px 20px 10px;font-size:12px;color:var(--muted)}
  .no-result{display:none;text-align:center;padding:60px 20px;color:var(--muted)}
  @media print{
    .toolbar,.filters{display:none!important}
    body{background:#fff;padding:0}
    .hero{box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .passage{break-inside:avoid;box-shadow:none}
    .chip,.vtable thead th{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .watermark{opacity:.1;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{size:A4;margin:13mm}
  }
  @media(max-width:560px){.hero h1{font-size:21px}.w-word,.w-mean{width:auto}}
</style>
</head>
<body>
<div class="watermark" aria-hidden="true"></div>
<nav class="toolbar">
  <img class="logo-lockup" src="${LOCKUP}" alt="공우정바른학원 GWJ EDU">
  <div class="links">${otherLinks}</div>
  <input type="search" class="search" id="search" placeholder="🔍 단어·뜻 검색…">
  <button class="print-btn" onclick="window.print()">🖨 인쇄 / PDF</button>
</nav>
<div class="container">
  <div class="hero">
    <img class="hero-logo" src="${LOGO}" alt="공우정바른학원">
    <div class="eyebrow">공우정바른학원 · GWJ EDU</div>
    <h1>${esc(title)}</h1>
    <p>${subtitle}</p>
    <div class="stats">
      <div class="stat"><b>${totalWords}</b><span>수록 단어</span></div>
      <div class="stat"><b>${totalEntries}</b><span>${kind === 'syn' ? '유의어' : '반의어'} 수</span></div>
      <div class="stat"><b>${levels.length}</b><span>학년</span></div>
    </div>
  </div>
  <div class="legend">
    <span>출처 구분:</span>
    <span class="chip src-book"><span class="chip-en">교재</span></span> 분석교안 비고
    <span class="chip src-ai"><span class="chip-en">AI</span></span> AI 보강(검수 권장)
  </div>
  <div class="filters">${filterBtns}</div>
  <div id="content">${sections}</div>
  <div class="no-result" id="noResult">검색 결과가 없습니다.</div>
  <div class="footer">공우정바른학원 · GWJ EDU &nbsp;·&nbsp; 생성일 ${dateStr} &nbsp;·&nbsp; ${esc(title)}</div>
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
}

const synLinks =
  `<a class="switch-link" href="6월모의고사-반의어.html">↔ 반의어</a>` +
  `<a class="switch-link" href="6월모의고사-한줄해석.html">📝 한줄해석</a>`;
const antLinks =
  `<a class="switch-link" href="6월모의고사-유의어.html">↔ 유의어</a>` +
  `<a class="switch-link" href="6월모의고사-한줄해석.html">📝 한줄해석</a>`;

const synHtml = buildOne({
  kind: 'syn',
  title: '2026 6월 모의고사 · 유의어 자료',
  subtitle:
    '각 지문 핵심 어휘의 <strong>유의어(Synonyms)</strong>를 모았습니다. 분석교안 비고에 표기된 항목(교재)과 AI 보강 항목을 구분 표시했으니, 시험 출제·암기용으로 활용하세요.',
  accent: '#0F6E56',
  otherLinks: synLinks,
});
const antHtml = buildOne({
  kind: 'ant',
  title: '2026 6월 모의고사 · 반의어 자료',
  subtitle:
    '각 지문 핵심 어휘의 <strong>반의어(Antonyms)</strong>를 모았습니다. 반의어가 성립하는 단어만 수록했으며, 출처(교재/AI)를 구분 표시했습니다.',
  accent: '#B5532A',
  otherLinks: antLinks,
});

fs.writeFileSync(path.join(ROOT, 'collections', '6월모의고사-유의어.html'), synHtml, 'utf8');
fs.writeFileSync(path.join(ROOT, 'collections', '6월모의고사-반의어.html'), antHtml, 'utf8');

console.log('생성 완료:');
console.log('  - collections/6월모의고사-유의어.html');
console.log('  - collections/6월모의고사-반의어.html');
