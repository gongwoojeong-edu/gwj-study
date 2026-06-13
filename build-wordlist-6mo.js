// 2026 6월 모의고사 전 지문 단어장 (단어학습기 import용)
//  - collections/6월모의고사-단어장.txt   (영단어 / 품사 - 한글뜻)
//  - collections/6월모의고사-단어장.html  (미리보기 + 전체 복사 버튼)
// 소스: assets/vocab-6mo.json (분석교안 추출)
// 다의어 보강: assets/vocab-meaning-aug-6mo.json (선택) { "word": ["추가뜻", ...] }

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'vocab-6mo.json'), 'utf8'));
const AUG_PATH = path.join(ROOT, 'assets', 'vocab-meaning-aug-6mo.json');
const AUG = fs.existsSync(AUG_PATH) ? JSON.parse(fs.readFileSync(AUG_PATH, 'utf8')) : {};
const LOGO = fs.readFileSync(path.join(ROOT, 'assets', 'logo-base64.txt'), 'utf8').trim();
const LOCKUP = fs.readFileSync(path.join(ROOT, 'assets', 'logo-lockup-color.txt'), 'utf8').trim();

const esc = (s) =>
  String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 의미 문자열을 "센스" 단위로 분리 (구분자 / 또는 ; )
function splitSenses(str) {
  return String(str || '')
    .split(/\s*[\/;]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// 단어 병합 (소문자 키)
const map = new Map();
for (const p of DATA) {
  for (const v of p.vocab) {
    const key = v.word.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { word: v.word, pos: new Set(), senses: [] });
    }
    const e = map.get(key);
    if (v.pos) e.pos.add(v.pos.trim());
    for (const s of splitSenses(v.meaning)) {
      if (!e.senses.includes(s)) e.senses.push(s);
    }
  }
}

// 다의어 보강 머지
let augAdded = 0;
for (const [key, e] of map) {
  const extra = AUG[key] || AUG[e.word] || [];
  for (const s of extra) {
    const t = String(s).trim();
    if (t && !e.senses.includes(t)) {
      e.senses.push(t);
      augAdded++;
    }
  }
}

// 정렬 (알파벳)
const list = [...map.values()].sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));

// 품사 정규화 (소스 혼재 -> 약어 통일)
const KMAP = {
  '명사': 'n.', '대명사': 'pron.', '동사': 'v.', '조동사': 'aux.', '동명사': 'n.',
  '형용사': 'adj.', '현재분사': 'adj.', '과거분사': 'adj.', '분사': 'adj.',
  '부사': 'adv.', '전치사': 'prep.', '접속사': 'conj.', '감탄사': 'int.',
  '한정사': 'det.', '관사': 'art.', '수사': 'num.',
  '동사구': 'phr.v.', '구동사': 'phr.v.',
  '명사구': 'phr.', '부사구': 'phr.', '전치사구': 'phr.', '형용사구': 'phr.',
  '구': 'phr.', '숙어': 'phr.', '관용구': 'phr.', '표현': 'phr.', '구어표현': 'phr.',
};
const EMAP = {
  'n': 'n.', 'v': 'v.', 'adj': 'adj.', 'adv': 'adv.', 'prep': 'prep.', 'conj': 'conj.',
  'int': 'int.', 'pron': 'pron.', 'aux': 'aux.', 'det': 'det.', 'art': 'art.',
  'idiom': 'phr.', 'phrase': 'phr.', 'phr': 'phr.',
  'phrasalv': 'phr.v.', 'phrv': 'phr.v.',
};
function normPos(p) {
  const raw = String(p || '').trim();
  if (!raw) return '';
  const k = raw.replace(/\s+/g, '');
  if (KMAP[k]) return KMAP[k];
  const e = raw.toLowerCase().replace(/[\s.]/g, '');
  if (EMAP[e]) return EMAP[e];
  return raw; // 알 수 없는 값은 원본 유지
}

// 출력 라인: 영단어 / 품사 - 뜻1 / 뜻2 ...
function posStr(e) {
  const set = new Set();
  for (const raw of e.pos) {
    for (const tok of String(raw).split(/[\/,]/)) {
      const n = normPos(tok);
      if (n) set.add(n);
    }
  }
  return [...set].join('/') || '-';
}
function meaningStr(e) {
  return e.senses.join(' / ');
}

const lines = list.map((e) => `${e.word} / ${posStr(e)} - ${meaningStr(e)}`);
const txt = lines.join('\n') + '\n';
fs.writeFileSync(path.join(ROOT, 'collections', '6월모의고사-단어장.txt'), txt, 'utf8');

// HTML 미리보기 (전체 복사 버튼)
const today = new Date();
const dateStr = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;
const rowsHtml = list
  .map(
    (e) => `<tr data-search="${esc((e.word + ' ' + meaningStr(e)).toLowerCase())}">
      <td class="c-word">${esc(e.word)}</td>
      <td class="c-pos">${esc(posStr(e))}</td>
      <td class="c-mean">${esc(meaningStr(e))}</td>
    </tr>`
  )
  .join('');

const plainForCopy = esc(txt);

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>2026 6월 모의고사 단어장 · 공우정바른학원</title>
<style>
  :root{--brand:#6B5B95;--brand-dark:#4A3D6B;--brand-light:#E8E4F3;--brand-bg:#F4F2F8;--bg:#F7F5F0;--card:#fff;--border:#E3DFD5;--text:#2A2A2A;--muted:#6E6B65}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Pretendard','Noto Sans KR','Malgun Gothic',-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:0 0 60px}
  .toolbar{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid var(--border);padding:10px 18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 2px 8px rgba(0,0,0,.04)}
  .toolbar .logo-lockup{height:36px;width:auto;display:block;border-radius:3px}
  .watermark{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:url(${LOGO});background-repeat:no-repeat;background-position:center center;background-size:min(460px,55vw) auto;opacity:.06}
  .toolbar .search{margin-left:auto;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:#faf9fc;min-width:180px}
  .toolbar .search:focus{outline:none;border-color:var(--brand);background:#fff}
  .copy-btn{padding:8px 14px;border:none;border-radius:8px;background:var(--brand);color:#fff;font-weight:700;font-size:13px;cursor:pointer}
  .copy-btn:hover{background:var(--brand-dark)}
  .container{max-width:880px;margin:0 auto;padding:0 18px;position:relative;z-index:1}
  .hero{background:linear-gradient(135deg,var(--brand-dark),var(--brand));color:#fff;padding:30px 28px;border-radius:18px;margin:22px 0 16px;box-shadow:0 6px 20px rgba(74,61,107,.22)}
  .hero .hero-logo{height:26px;width:auto;display:block;margin-bottom:12px;filter:brightness(0) invert(1);opacity:.95}
  .hero h1{font-size:25px;font-weight:800;margin-bottom:9px}
  .hero p{font-size:13px;opacity:.92;max-width:680px}
  .hero .stats{display:flex;gap:22px;margin-top:14px;flex-wrap:wrap}
  .hero .stat b{font-size:21px;font-weight:800;display:block}
  .hero .stat span{font-size:11.5px;opacity:.85}
  .hint{font-size:12.5px;color:var(--muted);background:var(--brand-bg);border:1px solid var(--brand-light);border-radius:10px;padding:10px 14px;margin-bottom:14px}
  .hint code{background:#fff;border:1px solid var(--border);border-radius:5px;padding:1px 6px;font-size:12px}
  table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;font-size:13.5px}
  thead th{background:var(--brand-bg);color:var(--brand-dark);text-align:left;padding:9px 12px;border-bottom:1px solid var(--border);font-size:12px;font-weight:700}
  tbody td{padding:8px 12px;border-bottom:1px solid #f0eee8;vertical-align:top}
  tbody tr:last-child td{border-bottom:none}
  tbody tr:nth-child(even){background:#faf9fc}
  .c-word{font-weight:700;width:26%;color:var(--brand-dark)}
  .c-pos{width:12%;color:var(--muted);font-size:12px}
  .c-mean{width:62%}
  .footer{text-align:center;padding:26px 20px 10px;font-size:12px;color:var(--muted)}
  .no-result{display:none;text-align:center;padding:50px 20px;color:var(--muted)}
  .toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:var(--brand-dark);color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;opacity:0;transition:.25s;z-index:100}
  .toast.show{opacity:1}
  @media print{.toolbar{display:none!important}body{background:#fff}.hero{box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}.watermark{opacity:.05;-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{size:A4;margin:13mm}}
</style>
</head>
<body>
<div class="watermark" aria-hidden="true"></div>
<nav class="toolbar">
  <img class="logo-lockup" src="${LOCKUP}" alt="공우정바른학원 GWJ EDU">
  <input type="search" class="search" id="search" placeholder="🔍 단어·뜻 검색…">
  <button class="copy-btn" id="copyBtn">📋 전체 복사</button>
</nav>
<div class="container">
  <div class="hero">
    <img class="hero-logo" src="${LOGO}" alt="공우정바른학원">
    <h1>2026 6월 모의고사 · 단어장</h1>
    <p>6월 모의고사 전 지문 핵심 어휘를 단어학습기 import용으로 정리했습니다. 형식은 <strong>영단어 / 품사 - 한글뜻</strong>이며, 다의어는 주요 의미를 모두 표기했습니다.</p>
    <div class="stats">
      <div class="stat"><b>${list.length}</b><span>표제어</span></div>
      <div class="stat"><b>${list.reduce((n, e) => n + e.senses.length, 0)}</b><span>뜻(센스)</span></div>
    </div>
  </div>
  <div class="hint">📋 <strong>전체 복사</strong> 버튼을 누르면 아래 형식의 전체 목록이 클립보드에 복사됩니다 → 단어학습기에 붙여넣기 하세요.<br>형식: <code>영단어 / 품사 - 뜻1 / 뜻2 …</code> (한 줄에 한 단어)</div>
  <table>
    <thead><tr><th>영단어</th><th>품사</th><th>한글뜻 (주요 다의 모두)</th></tr></thead>
    <tbody id="tbody">${rowsHtml}</tbody>
  </table>
  <div class="no-result" id="noResult">검색 결과가 없습니다.</div>
  <div class="footer">공우정바른학원 · GWJ EDU &nbsp;·&nbsp; 생성일 ${dateStr} &nbsp;·&nbsp; 6월 모의고사 단어장</div>
</div>
<div class="toast" id="toast">클립보드에 복사되었습니다</div>
<textarea id="raw" style="position:absolute;left:-9999px;top:-9999px" readonly>${plainForCopy}</textarea>
<script>
  const search=document.getElementById('search');
  const noResult=document.getElementById('noResult');
  const rows=[...document.querySelectorAll('#tbody tr')];
  search.addEventListener('input',()=>{
    const q=search.value.trim().toLowerCase();
    let visible=0;
    rows.forEach(r=>{const hit=!q||r.dataset.search.includes(q);r.style.display=hit?'':'none';if(hit)visible++;});
    noResult.style.display=visible===0?'block':'none';
  });
  const toast=document.getElementById('toast');
  function showToast(msg){toast.textContent=msg;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1600);}
  document.getElementById('copyBtn').addEventListener('click',async()=>{
    const text=document.getElementById('raw').value;
    try{await navigator.clipboard.writeText(text);showToast('전체 '+${list.length}+'개 단어가 복사되었습니다');}
    catch(e){const ta=document.getElementById('raw');ta.style.left='0';ta.select();document.execCommand('copy');ta.style.left='-9999px';showToast('복사되었습니다');}
  });
</script>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'collections', '6월모의고사-단어장.html'), html, 'utf8');

console.log('생성 완료:');
console.log('  - collections/6월모의고사-단어장.txt');
console.log('  - collections/6월모의고사-단어장.html');
console.log('표제어:', list.length, '/ 총 뜻(센스):', list.reduce((n, e) => n + e.senses.length, 0), '/ 보강으로 추가된 뜻:', augAdded);
console.log('\n[샘플 10]');
console.log(lines.slice(0, 10).join('\n'));
