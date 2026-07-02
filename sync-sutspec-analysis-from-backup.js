// Syntax Studio 백업 JSON → 수특라이트 시험범위(25) analysis.html 생성
// node sync-sutspec-analysis-from-backup.js [백업파일경로]

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  loadBackupRecords,
  matchSutspecRecord,
  writeMinimalAnalysisHtml,
} = require('./assets/build-topic-hyunil-core');

const SUTSPEC_UNITS = [
  '강10-Ex1',
  '강10-Ex2',
  '강10-Ex3',
  '강10-Ex4',
  '강2-Ex5',
  '강2-Ex6',
  '강3-Ex1',
  '강3-Ex2',
  '강3-Ex3',
  '강3-Ex4',
  '강3-Ex5',
  '강3-Ex6',
  '강4-Ex1',
  '강4-Ex2',
  '강4-Ex3',
  '강4-Ex4',
  '강4-Ex5·6(장문)',
  '강8-Ex1',
  '강8-Ex2',
  '강8-Ex3',
  '강8-Ex4',
  '강9-Ex1',
  '강9-Ex2',
  '강9-Ex3',
  '강9-Ex4',
];

function resolveSutspecPath(unitLabel) {
  const base = 'study/L09/고2_2026_수특라이트';
  const m = unitLabel.match(/^강(\d+)-Ex(\d+)/);
  if (!m) return null;
  const lesson = `${m[1]}강`;
  const ex = `Ex${m[2]}`;
  return `${base}/${lesson}/${ex}/analysis.html`;
}

const backupArg = process.argv[2];
const { records, path: backupPath } = loadBackupRecords(backupArg);

if (!backupPath) {
  console.error('백업 JSON을 찾을 수 없습니다. Syntax Studio → 📦 백업 내보내기 후 gwj_backup_YYYY-MM-DD.json 을 프로젝트 루트에 두세요.');
  process.exit(1);
}

console.log('백업:', path.relative(ROOT, backupPath), `(${records.length}건)`);

let written = 0;
let missing = 0;

for (const unit of SUTSPEC_UNITS) {
  const localPath = resolveSutspecPath(unit);
  if (!localPath) continue;

  const rec = matchSutspecRecord(records, unit);
  if (!rec?.data?.topic_ko && !rec?.data?.topic_sentence_en && !rec?.data?.topic_en) {
    console.warn('  ✗ 매칭 없음:', unit);
    missing++;
    continue;
  }

  const outPath = path.join(ROOT, localPath);
  writeMinimalAnalysisHtml(rec.data, outPath);
  console.log('  ✓', unit, '→', path.relative(ROOT, localPath), `(${rec.data.title_ko || rec.data.expected_title || ''})`);
  written++;
}

console.log(`\n완료: ${written}개 생성, ${missing}개 누락 (총 ${SUTSPEC_UNITS.length}지문)`);
if (missing > 0) {
  console.log('※ 누락 지문은 Syntax Studio 책장에 (고2) 2026 수특라이트 · N강 · ExM 형식으로 저장돼 있는지 확인 후 백업을 다시 내보내세요.');
  process.exit(missing === SUTSPEC_UNITS.length ? 1 : 0);
}
