// 현일고 주제 / 주제문장 모음 HTML 생성 공통 모듈

const fs = require('fs');
const path = require('path');
const { brandCss, BRAND_PRINT_CSS, heroBrandHtml, watermarkHtml, TOOLBAR_CSS, toolbarLeftHtml } = require('./build-page-ui');

const ROOT = path.join(__dirname, '..');
const LOGO = fs.readFileSync(path.join(ROOT, 'assets', 'logo-base64.txt'), 'utf8').trim();

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

function l08MockPath(month, unitRaw) {
  const unit = String(unitRaw).replace(/_/g, '~');
  const unitVariants = [unit, unit.endsWith('번') ? unit : unit + '번', unit.replace(/번$/, '')];
  for (const u of unitVariants) {
    const alt = `study/L08/고1_2026_모의고사/${month}/${u}/analysis.html`;
    if (fs.existsSync(path.join(ROOT, alt))) return alt;
  }
  return null;
}

function l09G2MockPath(month, unitRaw) {
  const base = String(unitRaw).replace(/번$/, '');
  const unitVariants = [base + '번', base];
  for (const u of unitVariants) {
    const alt = `study/L09/고2_2026_모의고사/${month}/${u}/analysis.html`;
    if (fs.existsSync(path.join(ROOT, alt))) return alt;
  }
  return null;
}

function resolveLocalPath(localPath) {
  const decoded = decodeURIComponent(localPath).replace(/#.*$/, '');

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

  m = decoded.match(/^study\/(\d+)번\/\1\/analysis\.html$/);
  if (m) {
    const alt = l09G2MockPath('3월', m[1]);
    if (alt) return alt;
  }

  if (/\d+\.\//.test(decoded)) {
    const dotPlain = decoded.replace(/\/(\d+)\.\//g, '/$1/');
    if (fs.existsSync(path.join(ROOT, dotPlain))) return dotPlain;
    const dotBan = decoded.replace(/\/(\d+)\.\//g, '/$1번/');
    if (fs.existsSync(path.join(ROOT, dotBan))) return dotBan;
  }

  if (fs.existsSync(path.join(ROOT, decoded))) return decoded;
  return decoded;
}

function pickBetterCatalogItem(a, b) {
  const aOk = fs.existsSync(path.join(ROOT, a.localPath));
  const bOk = fs.existsSync(path.join(ROOT, b.localPath));
  if (aOk && !bOk) return a;
  if (bOk && !aOk) return b;
  if (!/\.\//.test(a.localPath) && /\.\//.test(b.localPath)) return a;
  if (/\.\//.test(a.localPath) && !/\.\//.test(b.localPath)) return b;
  return a;
}

function toGithubUrl(localPath) {
  return `https://gongwoojeong-edu.github.io/gwj-study/${encodeURI(localPath).replace(/%2F/g, '/')}`;
}

function passageDedupeKey(localPath) {
  const m = localPath.match(/^(.*)\/([^/]+)\/analysis\.html$/);
  if (!m) return localPath;
  const unit = m[2].replace(/\.$/, '').replace(/번$/, '');
  return `${m[1]}/${unit}`;
}

function parseOlympusCatalog(htmlPath, filterRe) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const re =
    /<a\s+href="(https:\/\/gongwoojeong-edu\.github\.io\/gwj-study\/(study\/[^"#]+analysis\.html))[^"]*"[^>]*class="item-main-link">[\s\S]*?<code class="item-code">([^<]*)<\/code>\s*<strong class="item-title">([^<]*)<\/strong>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const localPath = decodeURIComponent(m[2]).replace(/#.*$/, '');
    if (filterRe && !filterRe.test(localPath)) continue;
    const lessonM = localPath.match(/\/(\d+강)\//);
    const unitM = localPath.match(/\/(\d+강\/[^/]+)\/analysis\.html$/);
    out.push({
      url: toGithubUrl(localPath),
      localPath,
      code: m[3].trim(),
      koTitle: m[4].trim(),
      lesson: lessonM ? lessonM[1] : '기타',
      unitPath: unitM ? unitM[1] : '',
    });
  }
  return out;
}

function parseMainLinkCollection(htmlPath, { dedupe = false } = {}) {
  const html = fs.readFileSync(path.join(ROOT, htmlPath), 'utf8');
  const re =
    /<a\s+href="(https:\/\/gongwoojeong-edu\.github\.io\/gwj-study\/(study\/[^"#]+analysis\.html))[^"]*"[^>]*class="item-main-link">[\s\S]*?<code class="item-code">([^<]*)<\/code>\s*<strong class="item-title">([^<]*)<\/strong>/g;
  const out = [];
  const map = new Map();
  let m;
  while ((m = re.exec(html))) {
    const localPath = resolveLocalPath(m[2]);
    const codeRaw = m[3].trim();
    const code = /번$/.test(codeRaw) || /-\d+/.test(codeRaw) ? codeRaw : codeRaw + '번';
    const item = {
      url: toGithubUrl(localPath),
      localPath,
      code,
      koTitle: m[4].trim(),
    };
    if (dedupe) {
      const key = passageDedupeKey(localPath);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
      } else {
        map.set(key, pickBetterCatalogItem(existing, item));
      }
    } else {
      out.push(item);
    }
  }
  return dedupe ? [...map.values()] : out;
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

function parseTopicAnalysis(localPath) {
  const full = path.join(ROOT, localPath);
  if (!fs.existsSync(full)) return null;
  const html = fs.readFileSync(full, 'utf8');

  let topic = '';
  const tm = html.match(/<tr><th>주제<\/th>\s*<td>([\s\S]*?)<\/td>/);
  if (tm) topic = stripHtml(tm[1]);

  let expected = '';
  const em = html.match(/예상 제목<\/th>\s*<td>([\s\S]*?)<\/td>/);
  if (em) expected = stripHtml(em[1]);

  let topicEn = '';
  let topicKo = '';
  const tsm = html.match(
    /<div class="topic-sentence-box">\s*<div class="en">([\s\S]*?)<\/div>\s*<div class="ko">([\s\S]*?)<\/div>/,
  );
  if (tsm) {
    topicEn = stripHtml(tsm[1]).replace(/^["']|["']$/g, '');
    topicKo = stripHtml(tsm[2]).replace(/^→\s*/, '');
  }

  let examTopic = '';
  const tr = html.match(/제목·주제 선택[\s\S]*?주제:\s*([^<\n]+)/);
  if (tr) examTopic = stripHtml(tr[1]);

  if (!topicEn) {
    const rows = html.match(/<tr>[\s\S]*?<\/tr>/g) || [];
    for (const row of rows) {
      if (!/주제문/.test(row)) continue;
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => stripHtml(x[1]));
      if (cells.length >= 2 && cells[1]) {
        topicEn = cells[1];
        break;
      }
    }
  }

  return { topic, expected, topicEn, topicKo, examTopic };
}

function sortKey(code) {
  const m = String(code).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 9999;
}

function enrichItems(list, label) {
  const items = [];
  for (const it of list) {
    const a = parseTopicAnalysis(it.localPath);
    if (!a) {
      console.warn(`[${label}] 분석 없음:`, it.localPath);
      continue;
    }
    if (!a.topicEn && !a.topic) {
      console.warn(`[${label}] 주제·주제문 없음:`, it.localPath);
      continue;
    }
    items.push({ ...it, ...a, sortKey: sortKey(it.code) });
  }
  items.sort((a, b) => a.sortKey - b.sortKey || a.code.localeCompare(b.code, 'ko', { numeric: true }));
  return items;
}

function passageCard(it, badge, searchBits, mode) {
  const hasTheme = !!it.topic;
  const hasSentence = !!(it.topicEn || it.topicKo);
  if (mode === 'theme' && !hasTheme) return '';
  if (mode === 'sentence' && !hasSentence) return '';
  if (!hasTheme && !hasSentence) return '';

  const search = searchBits.join(' ').toLowerCase();
  const themeBlock = hasTheme
    ? `<div class="theme-box"><span class="theme-label">주제</span>${esc(it.topic)}</div>`
    : '';
  const sentenceBlock = hasSentence
    ? `<div class="topic-sentence">
          <div class="ts-label">▶ 주제문장 (Topic Sentence)</div>
          ${it.topicEn ? `<div class="ts-en">${esc(it.topicEn)}</div>` : ''}
          ${it.topicKo ? `<div class="ts-ko">${esc(it.topicKo)}</div>` : ''}
        </div>`
    : '';

  const body = mode === 'theme' ? themeBlock : sentenceBlock;

  return `
      <div class="passage" data-search="${esc(search)}">
        <div class="passage-head">
          <span class="code-badge">${esc(badge)}</span>
          <div class="passage-titles">
            <div class="t-ko">${esc(it.koTitle)}</div>
            ${it.expected ? `<div class="t-en">${esc(it.expected)}</div>` : ''}
          </div>
          <a class="passage-link" href="${esc(it.url)}" target="_blank" rel="noopener">분석교안 ↗</a>
        </div>
        ${body}
      </div>`;
}

function buildSections(allSeries, mode) {
  let sections = '';
  for (const { title, items, badgeFn } of allSeries) {
    let cards = '';
    for (const it of items) {
      const badge = badgeFn(it);
      cards += passageCard(
        it,
        badge,
        [it.koTitle, it.expected, badge, it.topic, it.topicEn, it.topicKo, it.examTopic],
        mode,
      );
    }
    sections += `
    <section class="series">
      <div class="series-head">
        <h2>${esc(title)}</h2>
        <span class="series-count">지문 ${items.length}개</span>
      </div>
      ${cards}
    </section>`;
  }
  return sections;
}

function pageNavHtml(current, nav) {
  const pages = [
    { id: 'theme', href: nav.themeHref, label: '📌 주제 모음' },
    { id: 'sentence', href: nav.sentenceHref, label: '▶ 주제문장 모음' },
  ];
  const swap = pages
    .filter((p) => p.id !== current)
    .map((p) => `<a class="nav-link" href="${esc(p.href)}">${esc(p.label)}</a>`)
    .join('');
  const base = (nav.extraLinks || [])
    .map((l) => `<a class="nav-link" href="${esc(l.href)}">${l.label}</a>`)
    .join('');
  return swap + base;
}

function buildHtml({
  mode,
  title,
  heroLead,
  searchPlaceholder,
  outPath,
  navCurrent,
  nav,
  totalPassages,
  primaryCount,
  secondaryCount,
  primaryLabel,
  secondaryLabel,
  sections,
}) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;
  const hint =
    mode === 'theme'
      ? `📌 <strong>주제·요지·제목 고르기</strong>는 이 한글 주제를 우선 암기하세요. 주제문장 버전은 <a href="${esc(nav.sentenceHref)}" style="color:var(--brand-dark);font-weight:700">▶ 주제문장 모음</a>에서 확인하세요.`
      : `▶ <strong>빈칸·필자 주장·중심문장</strong> 대비용입니다. 시험 <strong>주제고르기</strong>는 <a href="${esc(nav.themeHref)}" style="color:var(--brand-dark);font-weight:700">📌 주제 모음</a>을 함께 암기하세요.`;

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
  .nav-link{padding:9px 14px;border:1px solid var(--brand-light);border-radius:8px;background:#faf9fc;color:var(--brand-dark);font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap;line-height:1.2}
  .nav-link:hover{background:var(--brand-light)}
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
  .hint{font-size:12.5px;color:var(--muted);background:var(--brand-bg);border:1px solid var(--brand-light);border-radius:10px;padding:10px 14px;margin-bottom:14px;line-height:1.65}
  .hint a{color:var(--brand-dark)}
  .series{margin-bottom:30px}
  .series-head{display:flex;align-items:baseline;gap:12px;padding-bottom:10px;margin-bottom:14px;border-bottom:2px solid var(--brand-light)}
  .series-head h2{font-size:19px;color:var(--brand-dark);font-weight:800}
  .series-count{font-size:12px;color:var(--muted);background:var(--brand-bg);padding:2px 10px;border-radius:12px}
  .passage{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:15px 18px;margin-bottom:11px;box-shadow:0 1px 4px rgba(0,0,0,.03)}
  .passage-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;padding-bottom:8px;border-bottom:1px dashed var(--brand-light)}
  .code-badge{background:var(--brand);color:#fff;font-size:12px;font-weight:700;padding:3px 11px;border-radius:7px;white-space:nowrap}
  .passage-titles{flex:1;min-width:160px}
  .t-ko{font-size:14.5px;font-weight:700;color:var(--text)}
  .t-en{font-size:11.5px;color:var(--muted);font-style:italic;margin-top:1px}
  .passage-link{font-size:11px;color:var(--brand-dark);text-decoration:none;padding:3px 9px;border:1px solid var(--brand-light);border-radius:6px;white-space:nowrap;margin-left:auto}
  .passage-link:hover{background:var(--brand-light)}
  .theme-box{font-size:13.5px;line-height:1.7;color:#333;background:#f5f8ff;border:1px solid #dbe6ff;border-left:4px solid var(--brand);border-radius:8px;padding:11px 13px}
  .theme-label{font-weight:800;color:var(--brand-dark);margin-right:6px}
  .topic-sentence{background:#faf9fc;border:1.5px solid var(--brand-light);border-left:4px solid var(--brand);border-radius:8px;padding:12px 14px}
  .ts-label{font-size:11px;font-weight:800;color:var(--brand-dark);letter-spacing:.04em;margin-bottom:8px}
  .ts-en{font-size:14px;line-height:1.75;color:var(--text);font-style:italic;margin-bottom:6px}
  .ts-ko{font-size:13px;line-height:1.7;color:var(--muted)}
  .footer{text-align:center;padding:30px 20px 10px;font-size:12px;color:var(--muted)}
  .no-result{display:none;text-align:center;padding:60px 20px;color:var(--muted)}
  .is-hidden{display:none!important}
  @media print{
    .toolbar,.hint{display:none!important}
    .is-hidden{display:none!important}
    body{background:#fff;padding:0}
    .hero{box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .passage{break-inside:avoid;box-shadow:none}
    .topic-sentence,.theme-box{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    ${BRAND_PRINT_CSS}
    @page{size:A4;margin:14mm}
  }
  @media(max-width:560px){.hero h1{font-size:22px}.toolbar .search{min-width:130px}}
</style>
</head>
<body>
${watermarkHtml()}
<nav class="toolbar">
  ${toolbarLeftHtml(LOGO, `<div class="page-nav">${pageNavHtml(navCurrent, nav)}</div>`)}
  <input type="search" class="search" id="search" placeholder="${esc(searchPlaceholder)}">
  <button class="print-btn" onclick="window.print()">🖨 인쇄 / PDF</button>
</nav>
<div class="container">
  <div class="hero">
    ${heroBrandHtml(LOGO)}
    <div class="eyebrow">공우정바른학원 · GWJ EDU · 시험대비자료</div>
    <h1>${esc(title)}</h1>
    <p>${heroLead}</p>
    <div class="stats">
      <div class="stat"><b>${totalPassages}</b><span>지문</span></div>
      <div class="stat"><b>${primaryCount}</b><span>${esc(primaryLabel)}</span></div>
      <div class="stat"><b>${secondaryCount}</b><span>${esc(secondaryLabel)}</span></div>
    </div>
  </div>
  <div class="hint">${hint}</div>
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
  return path.relative(ROOT, outPath);
}

function runTopicBuild({
  nav,
  outTheme,
  outSentence,
  titleTheme,
  titleSentence,
  heroTheme,
  heroSentence,
  searchTheme,
  searchSentence,
  primaryLabel,
  secondaryLabel,
  allSeries,
}) {
  const primaryCount = allSeries
    .filter((s) => !/모의고사|이투스/.test(s.title))
    .reduce((n, s) => n + s.items.length, 0);
  const secondaryCount = allSeries
    .filter((s) => /모의고사|이투스/.test(s.title))
    .reduce((n, s) => n + s.items.length, 0);
  const totalPassages = primaryCount + secondaryCount;

  const outThemeRel = buildHtml({
    mode: 'theme',
    navCurrent: 'theme',
    title: titleTheme,
    heroLead: heroTheme,
    searchPlaceholder: searchTheme,
    outPath: outTheme,
    nav,
    totalPassages,
    primaryCount,
    secondaryCount,
    primaryLabel,
    secondaryLabel,
    sections: buildSections(allSeries, 'theme'),
  });

  const outSentenceRel = buildHtml({
    mode: 'sentence',
    navCurrent: 'sentence',
    title: titleSentence,
    heroLead: heroSentence,
    searchPlaceholder: searchSentence,
    outPath: outSentence,
    nav,
    totalPassages,
    primaryCount,
    secondaryCount,
    primaryLabel,
    secondaryLabel,
    sections: buildSections(allSeries, 'sentence'),
  });

  return { outThemeRel, outSentenceRel, totalPassages, primaryCount, secondaryCount, allSeries };
}

module.exports = {
  ROOT,
  parseOlympusCatalog,
  parseMainLinkCollection,
  parseLegacyCollection,
  parseTopicAnalysis,
  enrichItems,
  sortKey,
  buildSections,
  runTopicBuild,
};
