// 학교별 1학기말 · 고1 모의고사(3월+6월) 한줄해석 모음
// node build-translation-school-mock.js [현일고|인동고1|all]

const fs = require('fs');
const path = require('path');
const {
  LOGO_LOCKUP_CSS,
  TOOLBAR_CSS,
  toolbarLeftHtml,
  GRADE_FILTER_CSS,
} = require('./assets/build-page-ui');

const ROOT = __dirname;
const LOGO = fs.readFileSync(path.join(ROOT, 'assets', 'logo-base64.txt'), 'utf8').trim();
const LOCKUP = fs.readFileSync(path.join(ROOT, 'assets', 'logo-lockup-color.txt'), 'utf8').trim();

const MOCK_SOURCES = [
  {
    month: '3월',
    label: '2026 3월 모의고사',
    file: 'collections/2026년-고1-3월-모의고사-분석구조도.html',
    mode: 'legacy',
  },
  {
    month: '6월',
    label: '2026 6월 모의고사',
    file: 'collections/고1-2026년-6모고.html',
    mode: 'main-link',
  },
];

const SCHOOLS = [
  {
    id: '현일고',
    title: '2026년 1학기말고사 현일고 · 모의고사 · 한줄해석',
    navCatalog: '2026년-1학기말고사-현일고-부교재-분석자료.html',
    out: 'collections/2026년-1학기말고사-현일고-모의고사-한줄해석.html',
    desc: '현일고 1학기말 시험범위 <strong>2026 고1 모의고사(3월·6월)</strong> 지문의 <strong>직독·의역(한글)</strong>만 문장 순서대로 모았습니다.',
  },
  {
    id: '인동고1',
    title: '2026년 1학기말고사 인동고1 · 모의고사 · 한줄해석',
    navCatalog: '인동고1-1학기말_부교재분석자료.html',
    out: 'collections/2026년-1학기말고사-인동고1-모의고사-한줄해석.html',
    desc: '인동고1 1학기말 시험범위 <strong>2026 고1 모의고사(3월·6월)</strong> 지문의 <strong>직독·의역(한글)</strong>만 문장 순서대로 모았습니다.',
  },
];

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function l08MockPath(month, unitRaw) {
  const unit = String(unitRaw).replace(/_/g, '~');
  const unitVariants = [unit, unit.endsWith('번') ? unit : unit + '번', unit.replace(/번$/, '')];
  for (const u of unitVariants) {
    const alt = `study/L08/고1_2026_모의고사/${month}/${u}/analysis.html`;
    if (fs.existsSync(path.join(ROOT, alt))) return alt;
  }
  return null;
}

function resolveLocalPath(localPath) {
  const decoded = decodeURIComponent(localPath);

  if (decoded.endsWith('/index.html')) {
    const asAnalysis = decoded.replace(/\/index\.html$/, '/analysis.html');
    if (fs.existsSync(path.join(ROOT, asAnalysis))) return asAnalysis;
    const mIdx = decoded.match(/^study\/3월\/(.+?)\/index\.html$/);
    if (mIdx) {
      const alt = l08MockPath('3월', mIdx[1]);
      if (alt) return alt;
    }
  }

  if (decoded.endsWith('analysis.html') && fs.existsSync(path.join(ROOT, decoded))) return decoded;

  let m = decoded.match(/^study\/3월\/(.+?)\/analysis\.html$/);
  if (m) {
    const alt = l08MockPath('3월', m[1]);
    if (alt) return alt;
  }
  m = decoded.match(/^study\/3월\/(.+?)\.html$/);
  if (m) {
    const alt = l08MockPath('3월', m[1]);
    if (alt) return alt;
    const legacyAnalysis = `study/3월/${m[1]}/analysis.html`;
    if (fs.existsSync(path.join(ROOT, legacyAnalysis))) return legacyAnalysis;
  }
  if (fs.existsSync(path.join(ROOT, decoded))) return decoded;
  return decoded;
}

function toGithubUrl(localPath) {
  return `https://gongwoojeong-edu.github.io/gwj-study/${encodeURI(localPath).replace(/%2F/g, '/')}`;
}

function parseMainLinkCollection(htmlPath) {
  const html = fs.readFileSync(path.join(ROOT, htmlPath), 'utf8');
  const re =
    /<a\s+href="(https:\/\/gongwoojeong-edu\.github\.io\/gwj-study\/(study\/[^"#]+analysis\.html))[^"]*"[^>]*class="item-main-link">[\s\S]*?<code class="item-code">([^<]*)<\/code>\s*<strong class="item-title">([^<]*)<\/strong>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const localPath = resolveLocalPath(m[2]);
    out.push({
      url: toGithubUrl(localPath),
      localPath,
      code: m[3].trim().replace(/번$/, '') + '번',
      koTitle: m[4].trim(),
    });
  }
  return out;
}

function parseLegacyCollection(htmlPath) {
  const html = fs.readFileSync(path.join(ROOT, htmlPath), 'utf8');
  const re = /<code class="item-code">([^<]*)<\/code>\s*<strong class="item-title">([^<]*)<\/strong>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const codeRaw = m[1].trim();
    const code = /번$/.test(codeRaw) ? codeRaw : codeRaw + '번';
    const unit = code.replace(/번$/, '');
    const localPath =
      l08MockPath('3월', unit) ||
      (fs.existsSync(path.join(ROOT, `study/3월/${unit}/analysis.html`))
        ? `study/3월/${unit}/analysis.html`
        : fs.existsSync(path.join(ROOT, `study/3월/${unit}번/analysis.html`))
          ? `study/3월/${unit}번/analysis.html`
          : null);
    if (!localPath) {
      console.warn('경로 없음:', code);
      continue;
    }
    out.push({
      url: toGithubUrl(localPath),
      localPath,
      code,
      koTitle: m[2].trim(),
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

function sortKey(code) {
  const m = String(code).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 9999;
}

const circled = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];
const numLabel = (i) => circled[i] || `(${i + 1})`;

function buildSchoolPage(school) {
  const groups = [];
  let totalPassages = 0;
  let totalLines = 0;

  for (const src of MOCK_SOURCES) {
    const list = src.mode === 'main-link' ? parseMainLinkCollection(src.file) : parseLegacyCollection(src.file);
    const items = [];
    for (const it of list) {
      const a = parseAnalysis(it.localPath);
      if (!a || a.lines.length === 0) {
        console.warn(`[${school.id}] 해석 없음:`, it.localPath);
        continue;
      }
      items.push({
        ...it,
        expected: a.expected,
        lines: a.lines,
        sortKey: sortKey(it.code),
      });
    }
    items.sort((a, b) => a.sortKey - b.sortKey || a.code.localeCompare(b.code, 'ko', { numeric: true }));
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
      <div class="passage" data-search="${esc((it.koTitle + ' ' + it.expected + ' ' + it.code + ' ' + it.lines.join(' ')).toLowerCase())}">
        <div class="passage-head">
          <span class="code-badge">${esc(it.code)}</span>
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
        <h2>${esc(g.label)}</h2>
        <span class="series-count">지문 ${g.items.length}개</span>
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
<title>${esc(school.title)} · 공우정바른학원</title>
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
  .container{max-width:980px;margin:0 auto;padding:0 18px;position:relative;z-index:1}
  .hero{background:linear-gradient(135deg,var(--brand-dark),var(--accent-teal));color:#fff;padding:34px 30px;border-radius:18px;margin:22px 0 18px;box-shadow:0 6px 20px rgba(74,61,107,.22);position:relative;overflow:hidden}
  .hero .hero-logo{height:26px;width:auto;display:block;margin-bottom:12px;filter:brightness(0) invert(1);opacity:.95}
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
    .watermark{opacity:.1;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{size:A4;margin:14mm}
  }
  @media(max-width:560px){.hero h1{font-size:22px}.toolbar .search{min-width:130px}}
</style>
</head>
<body>
<div class="watermark" aria-hidden="true"></div>
<nav class="toolbar">
  ${toolbarLeftHtml(LOCKUP, `<a class="nav-link" href="${esc(school.navCatalog)}">📋 시험범위 목차</a>`)}
  <input type="search" class="search" id="search" placeholder="🔍 해석·제목 검색…">
  <button class="print-btn" onclick="beforePrint()">🖨 인쇄 / PDF</button>
</nav>
<div class="container">
  <div class="hero">
    <img class="hero-logo" src="${LOGO}" alt="공우정바른학원">
    <div class="eyebrow">공우정바른학원 · GWJ EDU</div>
    <h1>${esc(school.title)}</h1>
    <p>${school.desc}</p>
    <div class="stats">
      <div class="stat"><b>${totalPassages}</b><span>지문</span></div>
      <div class="stat"><b>${totalLines}</b><span>문장(줄)</span></div>
      <div class="stat"><b>${groups.length}</b><span>회차</span></div>
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

  const outPath = path.join(ROOT, school.out);
  fs.writeFileSync(outPath, html, 'utf8');

  console.log(`\n[${school.id}] 생성: ${path.relative(ROOT, outPath)}`);
  console.log(`  총 ${totalPassages}지문 / ${totalLines}줄`);
  for (const g of groups) {
    const ln = g.items.reduce((n, x) => n + x.lines.length, 0);
    console.log(`  - ${g.label}: ${g.items.length}지문, ${ln}줄`);
  }
}

const arg = (process.argv[2] || 'all').trim();
const targets = arg === 'all' ? SCHOOLS : SCHOOLS.filter((s) => s.id === arg);
if (!targets.length) {
  console.error('사용법: node build-translation-school-mock.js [현일고|인동고1|all]');
  process.exit(1);
}
for (const school of targets) buildSchoolPage(school);
