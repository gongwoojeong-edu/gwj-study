/**
 * 구조도 standalone HTML + 학습기 전송 structure JSON 패치
 */
import fs from 'fs';

const path = 'app.html';
let html = fs.readFileSync(path, 'utf8');
const headLines = html.split('\n').length;

const marker = '// ============================================================\n// 구조도 렌더링\n// ============================================================';
if (!html.includes(marker)) {
  console.error('marker not found');
  process.exit(1);
}

const insertBlock = `// ============================================================
// 구조도 내보내기 / 학습기 전송 JSON (구문랩 규격)
// ============================================================
const STRUCTURE_STEP_BADGES = [
  { bg: '#F1EFE8', color: '#555', badge: '단계 ①' },
  { bg: '#FCEBEB', color: '#791F1F', badge: '단계 ②' },
  { bg: '#FCEBEB', color: '#791F1F', badge: '단계 ③' },
  { bg: '#E1F5EE', color: '#085041', badge: '단계 ④ — ★ 전환점' },
  { bg: '#E6F1FB', color: '#0C447C', badge: '단계 ⑤' },
  { bg: '#EEEDFE', color: '#3C3489', badge: '단계 ⑥ — ★ 결론' }
];
const STRUCTURE_DEFAULT_CHILDREN = [[1], [2], [3], [4, 5], [5], []];

/** diagram_nodes → gwj-structure-data JSON (키 누락 없이 "" 폴백) */
function buildStructureExportPayload(meta, rec) {
  const d = (rec && rec.data) || {};
  const nodes = d.diagram_nodes || [];
  const code = (meta && (meta.new_item_code || meta.item_code)) || d.item_code || '';
  const unitTitle = (meta && meta.unit_title) || d.lesson || d.textbook || '';
  return {
    code: code || '',
    unitTitle: unitTitle || '',
    nodes: nodes.map(function(n, i) {
      return {
        id: i,
        label: n.title_short || n.detail_title || '',
        english: n.detail_en_html || '',
        korean: n.detail_ko || n.korean || '',
        literal: n.detail_ko_html || '',
        point: n.detail_pt_html || '',
        children: STRUCTURE_DEFAULT_CHILDREN[i] || []
      };
    })
  };
}

function buildStructurePayloadForSend(meta, rec) {
  const exportData = buildStructureExportPayload(meta, rec);
  const svg = extractStructureSvg(rec.data);
  const payload = { nodes: exportData.nodes };
  if (svg) payload.svg = svg;
  return payload;
}

function extractStructureSvg(d) {
  try {
    const inner = renderStructureToString(d);
    const m = inner.match(/<svg[\\s\\S]*?<\\/svg>/i);
    return m ? m[0] : '';
  } catch (e) {
    return '';
  }
}

function getStructureStandaloneStyles() {
  return [
    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; color: #333; line-height: 1.55; margin: 0; background: #f5f5f0; }',
    '.structure-view { max-width: 780px; margin: 20px auto; padding: 20px; }',
    '.structure-header { text-align: center; margin-bottom: 20px; }',
    '.structure-header .badge { display: inline-block; background: #791F1F; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; padding: 3px 12px; border-radius: 20px; margin-bottom: 8px; }',
    '.structure-header h1 { font-size: 22px; font-weight: 700; color: #333; margin-bottom: 4px; }',
    '.structure-header p { font-size: 12px; color: #888; }',
    '.diagram-wrap { background: #fff; border-radius: 16px; border: 1px solid #e0e0d8; padding: 28px 24px 24px; margin-bottom: 16px; }',
    '.diagram-wrap svg { width: 100%; height: auto; display: block; overflow: visible; }',
    '.node-g { cursor: pointer; transition: opacity 0.15s; }',
    '.node-g:hover { opacity: 0.82; }',
    '.detail-wrap { display: none; animation: slideIn 0.25s ease; }',
    '.detail-wrap.visible { display: block; }',
    '@keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }',
    '.detail-card { background: #fff; border-radius: 14px; border: 1.5px solid #dde2ef; overflow: hidden; }',
    '.detail-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #eee; }',
    '.detail-step-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }',
    '.detail-title { font-size: 16px; font-weight: 700; color: #333; }',
    '.detail-body { padding: 14px 18px; }',
    '.label-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }',
    '.label-tag { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; color: #888; background: #f0f0ec; padding: 2px 8px; border-radius: 4px; }',
    '.en-box { border-left: 3.5px solid #ccc; border-radius: 0 8px 8px 0; padding: 10px 14px; font-size: 13.5px; line-height: 1.75; color: #333; margin-bottom: 10px; background: #f8f7f3; }',
    '.hl-navy,.hl-blue { color: #791F1F; font-weight: 700; }',
    '.hl-teal { color: #0a5040; font-weight: 700; }',
    '.hl-amber { color: #7a4500; font-weight: 700; }',
    '.hl-red { color: #9a2010; font-weight: 700; }',
    '.hl-purple { color: #4a2d88; font-weight: 700; }',
    '.ko-box { background: #fdf5f5; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #333; line-height: 1.7; margin-bottom: 10px; }',
    '.point-box { background: #fef9f0; border: 1px solid #e8c87a; border-left: 3.5px solid #e8a020; border-radius: 0 8px 8px 0; padding: 8px 13px; font-size: 12.5px; color: #5a3500; line-height: 1.6; }',
    '.close-btn { display: block; width: 100%; margin-top: 12px; padding: 8px; background: none; border: 1px solid #ddd; border-radius: 8px; font-size: 12px; color: #aaa; cursor: pointer; font-family: inherit; }',
    '.close-btn:hover { background: #f5f5f5; color: #666; }',
    '.legend { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 10px; }',
    '.legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #666; }',
    '.legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }'
  ].join('\\n');
}

/** 오프라인/blob URL용 단독 실행형 구조도 HTML (요구사항 A) */
function buildStructureStandaloneHtml(rec, meta) {
  meta = meta || inferLearnerMeta(rec);
  const exportData = buildStructureExportPayload(meta, rec);
  const innerHtml = renderStructureToString(rec.data);
  const jsonStr = JSON.stringify(exportData, null, 2);
  const title = escapeHtml(rec.data.expected_title || rec.data.topic_en || '구조도');
  const badgeScript = STRUCTURE_STEP_BADGES.map(function(b) {
    return '{bg:"' + b.bg + '",color:"' + b.color + '",badge:"' + b.badge.replace(/"/g, '\\\\"') + '"}';
  }).join(',');

  return '<!DOCTYPE html>\\n' +
    '<html lang="ko">\\n<head>\\n<meta charset="utf-8">\\n<title>' + title + '</title>\\n' +
    '<style>' + getStructureStandaloneStyles() + '</style>\\n</head>\\n<body>\\n' +
    innerHtml + '\\n' +
    '<script type="application/json" id="gwj-structure-data">\\n' + jsonStr + '\\n<' + '/script>\\n' +
    '<script>\\n' +
    '(function(){\\n' +
    'var STEP_BADGES=[' + badgeScript + '];\\n' +
    'var currentDetail=-1;\\n' +
    'function readExportData(){return JSON.parse(document.getElementById("gwj-structure-data").textContent);}\\n' +
    'window.showDetail=function(i){\\n' +
    '  var nodes=readExportData().nodes;\\n' +
    '  var n=nodes[i];\\n' +
    '  if(!n)return;\\n' +
    '  if(currentDetail===i){closeDetail();return;}\\n' +
    '  currentDetail=i;\\n' +
    '  var colors=STEP_BADGES[i]||STEP_BADGES[0];\\n' +
    '  var badge=document.getElementById("d-badge");\\n' +
    '  badge.textContent=colors.badge+" — "+(n.label||"");\\n' +
    '  badge.style.background=colors.bg;\\n' +
    '  badge.style.color=colors.color;\\n' +
    '  document.getElementById("d-title").textContent=n.label||"";\\n' +
    '  document.getElementById("d-en").innerHTML=n.english||"";\\n' +
    '  document.getElementById("d-ko").innerHTML=n.literal||n.korean||"";\\n' +
    '  document.getElementById("d-pt").innerHTML=n.point||"";\\n' +
    '  var wrap=document.getElementById("detail-wrap");\\n' +
    '  wrap.classList.add("visible");\\n' +
    '  setTimeout(function(){wrap.scrollIntoView({behavior:"smooth",block:"nearest"});},60);\\n' +
    '};\\n' +
    'window.closeDetail=function(){\\n' +
    '  currentDetail=-1;\\n' +
    '  document.getElementById("detail-wrap").classList.remove("visible");\\n' +
    '};\\n' +
    '})();\\n' +
    '<' + '/script>\\n</body>\\n</html>';
}

`;

html = html.replace(marker, insertBlock + marker);

// buildLearnerImportBody — structure 필드 추가
const learnerBodyOld = `    analysis_html: htmlExtras.analysis_html || '',
    structure_html: htmlExtras.structure_html || '',
    external_url: rec.githubUrl || ''
  };`;
const learnerBodyNew = `    analysis_html: htmlExtras.analysis_html || '',
    structure_html: htmlExtras.structure_html || '',
    external_url: rec.githubUrl || ''
  };
  if (htmlExtras.structure) {
    body.structure = htmlExtras.structure;
  } else if ((rec.data.diagram_nodes || []).length > 0) {
    body.structure = buildStructurePayloadForSend(meta, rec);
  }`;
if (!html.includes(learnerBodyOld)) {
  console.error('buildLearnerImportBody block not found');
  process.exit(1);
}
html = html.replace(learnerBodyOld, learnerBodyNew);

// sendToLearnerSilent
const silentOld = `  try { structureHtml = renderStructureToString(rec.data); } catch (e) { structureHtml = ''; }

  const metaForSend = { ...meta, series_title: normalizeSendSeriesTitle(meta), volume_title: normalizeSendVolumeTitle(meta.volume_title) };
  const body = buildLearnerImportBody(metaForSend, rec, {
    analysis_html: wrapWithStyles(analysisHtml),
    structure_html: wrapWithStyles(structureHtml)
  });`;
const silentNew = `  const metaForSend = { ...meta, series_title: normalizeSendSeriesTitle(meta), volume_title: normalizeSendVolumeTitle(meta.volume_title) };
  let structureStandalone = '';
  try { structureStandalone = buildStructureStandaloneHtml(rec, metaForSend); } catch (e) { structureStandalone = ''; }
  const body = buildLearnerImportBody(metaForSend, rec, {
    analysis_html: wrapWithStyles(analysisHtml),
    structure_html: structureStandalone,
    structure: buildStructurePayloadForSend(metaForSend, rec)
  });`;
if (!html.includes(silentOld)) {
  console.error('sendToLearnerSilent block not found');
  process.exit(1);
}
html = html.replace(silentOld, silentNew);

// sendToLearner (일반 전송)
const sendOld = `  const analysisHtmlWithStyles = wrapWithStyles(analysisHtml);
  const structureHtmlWithStyles = wrapWithStyles(structureHtml);

  console.info('📤 전송 데이터:', {
    level, series_title, volume_title, unit_title, unit_no, item_code,
    analysis_size: analysisHtmlWithStyles.length,
    structure_size: structureHtmlWithStyles.length
  });

  // 전송 시작 토스트
  showToast('📤 학습기로 전송 중...', 'info');

  try {
    const sendMeta = {
      level, series_title, volume_title, unit_title,
      unit_no, passage_no, new_item_code: item_code
    };
    const body = buildLearnerImportBody(sendMeta, rec, {
      analysis_html: analysisHtmlWithStyles,
      structure_html: structureHtmlWithStyles
    });`;
const sendNew = `  const analysisHtmlWithStyles = wrapWithStyles(analysisHtml);
  let structureStandalone = '';
  try { structureStandalone = buildStructureStandaloneHtml(rec, {
    level, series_title, volume_title, unit_title,
    unit_no, passage_no, new_item_code: item_code, item_code
  }); } catch (e) { structureStandalone = ''; }

  console.info('📤 전송 데이터:', {
    level, series_title, volume_title, unit_title, unit_no, item_code,
    analysis_size: analysisHtmlWithStyles.length,
    structure_size: structureStandalone.length,
    structure_nodes: (rec.data.diagram_nodes || []).length
  });

  // 전송 시작 토스트
  showToast('📤 학습기로 전송 중...', 'info');

  try {
    const sendMeta = {
      level, series_title, volume_title, unit_title,
      unit_no, passage_no, new_item_code: item_code
    };
    const body = buildLearnerImportBody(sendMeta, rec, {
      analysis_html: analysisHtmlWithStyles,
      structure_html: structureStandalone,
      structure: buildStructurePayloadForSend(sendMeta, rec)
    });`;
if (!html.includes(sendOld)) {
  console.error('sendToLearner block not found');
  process.exit(1);
}
html = html.replace(sendOld, sendNew);

// buildStandaloneHtml — structure 단독은 gwj 규격 HTML
const standaloneOld = `function buildStandaloneHtml(rec, scope) {
  scope = scope || 'all';

  // 현재 페이지의 CSS 스타일 추출 (CORS 이슈 등 방어)`;
const standaloneNew = `function buildStandaloneHtml(rec, scope) {
  scope = scope || 'all';

  if (scope === 'structure') {
    return buildStructureStandaloneHtml(rec, rec.learnerMeta || inferLearnerMeta(rec));
  }

  // 현재 페이지의 CSS 스타일 추출 (CORS 이슈 등 방어)`;
if (!html.includes(standaloneOld)) {
  console.error('buildStandaloneHtml block not found');
  process.exit(1);
}
html = html.replace(standaloneOld, standaloneNew);

// buildStandaloneHtml structure script block — all/structure 탭용도 JSON 기반으로 (structure only early return handles export)
// structure 포함 all 스코프는 기존 structureData 유지 (앱 내 미리보기와 동일)

fs.writeFileSync(path, html, 'utf8');
const newLines = html.split('\n').length;
console.log('patched:', headLines, '->', newLines);
if (!html.trimEnd().endsWith('</body></html>')) {
  console.error('missing closing tags');
  process.exit(1);
}
console.log('ok');
