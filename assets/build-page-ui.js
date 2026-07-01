// 학년(고1/고2) 필터 + 인쇄 UI + 브랜드(로고·워터마크) — 자료 페이지 공용

const GRADE_ORDER = ['고1', '고2', '고3'];

function usedGradesFromList(items, levelKey = 'level') {
  return GRADE_ORDER.filter((g) => items.some((x) => x[levelKey] === g));
}

function gradeFilterHtml(grades, esc) {
  if (!grades.length) return '';
  return `<div class="filters">
    <div class="filter-row">
      <span class="filter-label">학년</span>
      <button type="button" class="grade-btn active" data-grade="all">전체</button>${grades.map((g) => `<button type="button" class="grade-btn" data-grade="${esc(g)}">${esc(g)}</button>`).join('')}
    </div>
  </div>`;
}

const TOOLBAR_CSS = `.toolbar{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid var(--border);padding:10px 18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 2px 8px rgba(0,0,0,.04);min-height:56px}`;

/** @deprecated use brandCss() — kept for scripts not yet migrated */
const LOGO_LOCKUP_CSS = '';

function brandCss(logoSrc) {
  const u = String(logoSrc || '').replace(/"/g, '\\"');
  return `
  .toolbar-left{display:flex;align-items:center;gap:14px;flex:1;min-width:0;flex-wrap:wrap}
  .brand-mark{display:flex;align-items:center;gap:10px;flex-shrink:0}
  .brand-symbol{height:44px;width:44px;display:block;object-fit:contain;flex-shrink:0}
  .brand-text{display:flex;flex-direction:column;line-height:1.25;gap:1px}
  .brand-text strong{font-size:14px;font-weight:800;color:var(--brand-dark);letter-spacing:-.02em}
  .brand-sub{font-size:10.5px;font-weight:600;color:var(--muted);letter-spacing:.06em}
  .watermark{position:fixed;inset:0;z-index:0;pointer-events:none;background:url("${u}") center 40% no-repeat;background-size:min(240px,46vw) auto;opacity:.034}
  .hero .hero-brand-symbol{height:38px;width:38px;display:block;margin-bottom:10px;filter:brightness(0) invert(1);opacity:.93}`;
}

const BRAND_PRINT_CSS = `
    .watermark{opacity:.055;-webkit-print-color-adjust:exact;print-color-adjust:exact}`;

function watermarkHtml() {
  return '<div class="watermark" aria-hidden="true"></div>';
}

function heroBrandHtml(logoSrc) {
  return `<img class="hero-brand-symbol" src="${logoSrc}" alt="공우정바른학원">`;
}

const SIXMO_VOCAB_PAGES = [
  { id: 'syn', href: '6월모의고사-유의어.html' },
  { id: 'ant', href: '6월모의고사-반의어.html' },
  { id: 'trans', href: '6월모의고사-한줄해석.html' },
];

function sixMoNavLabel(id) {
  if (id === 'ant') return '↔ 반의어';
  if (id === 'trans') return '📝 한줄해석';
  return '↔ 유의어';
}

const PAGE_NAV_CSS = `
  .page-nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .nav-link{padding:8px 14px;border:1px solid var(--brand-light);border-radius:8px;background:#faf9fc;color:var(--brand-dark);font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap;line-height:1.2}
  .nav-link:hover{background:var(--brand-light)}
  .nav-link.current{background:var(--brand);border-color:var(--brand);color:#fff;pointer-events:none}`;

function sixMoPageNavHtml(current, esc) {
  return `<div class="page-nav">${SIXMO_VOCAB_PAGES.filter((p) => p.id !== current).map((p) =>
    `<a class="nav-link" href="${esc(p.href)}">${esc(sixMoNavLabel(p.id))}</a>`,
  ).join('')}</div>`;
}

function toolbarLeftHtml(logoSrc, pageNavHtml = '') {
  return `<div class="toolbar-left">
    <div class="brand-mark">
      <img class="brand-symbol" src="${logoSrc}" alt="">
      <span class="brand-text"><strong>공우정바른학원</strong><span class="brand-sub">GWJ EDU</span></span>
    </div>
    ${pageNavHtml}
  </div>`;
}

const GRADE_FILTER_CSS = `
  .filters{display:flex;flex-direction:column;gap:10px;margin-bottom:18px;position:relative;z-index:10}
  .filter-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
  .filter-label{font-size:12px;font-weight:700;color:var(--muted);min-width:32px;flex-shrink:0}
  .grade-btn{padding:7px 14px;border:1px solid var(--border);border-radius:20px;background:#fff;font-size:12.5px;font-weight:600;color:var(--muted);cursor:pointer;transition:.15s;font-family:inherit}
  .grade-btn:hover{border-color:var(--brand);color:var(--brand-dark)}
  .grade-btn.active{background:var(--brand);border-color:var(--brand);color:#fff}
  .is-hidden{display:none!important}`;

const GRADE_PRINT_CSS = `
    .is-hidden{display:none!important}`;

// .series > .passage 구조용
const GRADE_FILTER_SCRIPT = `
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
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.grade-btn');
    if(!btn) return;
    document.querySelectorAll('.grade-btn').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    activeGrade=btn.dataset.grade;
    apply();
  });
  search.addEventListener('input',apply);`;

// 단어장 등 flat table row용 (data-grade="고1 고2" 공백 구분)
const GRADE_ROW_FILTER_SCRIPT = `
  let activeGrade='all';
  function beforePrint(){
    if(activeGrade==='all'){
      if(!confirm('학년이 "전체"입니다. 고1·고2 가 함께 인쇄됩니다.\\n\\n고1 또는 고2를 먼저 선택하면 해당 학년만 인쇄됩니다.\\n\\n그래도 전체 인쇄할까요?')) return;
    }
    window.print();
  }
  function rowMatchGrade(row){
    if(activeGrade==='all') return true;
    return (row.dataset.grade||'').split(/\\s+/).includes(activeGrade);
  }
  function apply(){
    const q=search.value.trim().toLowerCase();
    let visible=0;
    rows.forEach(r=>{
      const hit=rowMatchGrade(r)&&(!q||r.dataset.search.includes(q));
      r.classList.toggle('is-hidden',!hit);
      if(hit) visible++;
    });
    noResult.style.display=visible===0?'block':'none';
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.grade-btn');
    if(!btn) return;
    document.querySelectorAll('.grade-btn').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    activeGrade=btn.dataset.grade;
    apply();
  });
  search.addEventListener('input',apply);`;

module.exports = {
  GRADE_ORDER,
  usedGradesFromList,
  gradeFilterHtml,
  LOGO_LOCKUP_CSS,
  TOOLBAR_CSS,
  brandCss,
  BRAND_PRINT_CSS,
  watermarkHtml,
  heroBrandHtml,
  PAGE_NAV_CSS,
  sixMoPageNavHtml,
  toolbarLeftHtml,
  GRADE_FILTER_CSS,
  GRADE_PRINT_CSS,
  GRADE_FILTER_SCRIPT,
  GRADE_ROW_FILTER_SCRIPT,
};
