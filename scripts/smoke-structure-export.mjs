import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, '..', 'app.html');
const html = fs.readFileSync(appPath, 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
const main = scripts.find((s) => s.includes('function buildStructureStandaloneHtml'));
if (!main) {
  console.error('main script not found — likely unescaped </script> still truncating');
  process.exit(1);
}

try {
  new Function(main);
  console.log('syntax: ok');
} catch (e) {
  console.error('syntax fail:', e.message);
  process.exit(1);
}

const sandbox = {
  window: {},
  document: {
    styleSheets: [],
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {} }),
    body: { appendChild: () => {} },
  },
  console,
  Array,
  Object,
  JSON,
  String,
  Number,
  Math,
  Date,
  RegExp,
  Error,
  Promise,
  Map,
  Set,
  alert: () => {},
  confirm: () => true,
  setTimeout: () => 0,
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  },
  indexedDB: undefined,
  location: { href: 'file:///app.html', hash: '', pathname: '/app.html', origin: 'file://', protocol: 'file:' },
  history: { replaceState: () => {}, pushState: () => {} },
  navigator: { userAgent: 'smoke' },
  fetch: async () => ({ ok: false, json: async () => ({}) }),
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  URL,
  Blob,
  TextEncoder,
  TextDecoder,
};
sandbox.window = sandbox;
vm.runInNewContext(main, sandbox, { timeout: 8000 });

const sample = {
  data: {
    item_code: 'L09-TEST-P001',
    textbook: '고2 모의고사',
    lesson: '5월 이투스 29',
    expected_title: '테스트 구조도',
    diagram_nodes: [
      {
        title_short: '배경',
        keyword_short: 'storm',
        detail_title: '배경 설정',
        detail_en_html: "Although the <span class='hl-teal'>storm</span> had passed",
        detail_ko_html: '비록 폭풍이 / 지나갔지만',
        detail_pt_html: 'although 양보',
      },
      {
        title_short: '갈등',
        keyword_short: 'city',
        detail_title: '갈등',
        detail_en_html: 'the city remained quiet',
        detail_ko_html: '도시는 / 조용했다',
        detail_pt_html: '',
      },
      {
        title_short: '심화',
        keyword_short: 'fear',
        detail_title: '심화',
        detail_en_html: 'fear grew',
        detail_ko_html: '두려움이 / 커졌다',
        detail_pt_html: '',
      },
      {
        title_short: '전환',
        keyword_short: 'then',
        detail_title: '전환점',
        detail_en_html: 'Then light returned',
        detail_ko_html: '그때 / 빛이 돌아왔다',
        detail_pt_html: '전환점',
      },
      {
        title_short: '전개',
        keyword_short: 'hope',
        detail_title: '전개',
        detail_en_html: 'hope rose',
        detail_ko_html: '희망이 / 솟았다',
        detail_pt_html: '',
      },
      {
        title_short: '결론',
        keyword_short: 'peace',
        detail_title: '결론',
        detail_en_html: 'peace remained',
        detail_ko_html: '평화가 / 남았다',
        detail_pt_html: '결론',
      },
    ],
    mood_bar: {
      start: '불안',
      start_en: 'uneasy',
      transition: '전환',
      end: '안도',
      end_en: 'relief',
    },
  },
  learnerMeta: {
    level: 'L09',
    unit_title: '5월 이투스 29',
    new_item_code: 'L09-TEST-P001',
  },
};

const out = sandbox.buildStructureStandaloneHtml(sample, sample.learnerMeta);
const outPath = path.join(__dirname, '_smoke-structure.html');
fs.writeFileSync(outPath, out, 'utf8');

const hasJson = out.includes('id="gwj-structure-data"');
const hasShow = out.includes('window.showDetail');
const hasClose = out.includes('window.closeDetail');
const hasCharset = /charset=["']?utf-8/i.test(out);
const nodeCount = (out.match(/class="node-g"/g) || []).length;
const payload = JSON.parse(out.match(/id="gwj-structure-data">([\s\S]*?)<\/script>/)[1]);
const body = sandbox.buildLearnerImportBody(sample.learnerMeta, sample, {
  analysis_html: '',
  structure_html: out,
});

const report = {
  outPath,
  bytes: out.length,
  hasJson,
  hasShow,
  hasClose,
  hasCharset,
  nodeG: nodeCount,
  nodesLen: payload.nodes.length,
  sampleLabel: payload.nodes[0].label,
  sampleLiteral: payload.nodes[0].literal,
  samplePoint: payload.nodes[0].point,
  keys: Object.keys(payload.nodes[0]),
  structureNodes: body.structure && body.structure.nodes.length,
  hasSvg: !!(body.structure && body.structure.svg),
};
console.log(JSON.stringify(report, null, 2));

if (!(hasJson && hasShow && hasClose && hasCharset && nodeCount === payload.nodes.length && body.structure?.nodes?.length === 6)) {
  process.exit(1);
}
console.log('smoke: PASS');
