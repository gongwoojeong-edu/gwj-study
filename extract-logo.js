const fs = require('fs');
const path = require('path');

const ref = path.join(__dirname, 'study', '24번', '24', 'analysis.html');
const html = fs.readFileSync(ref, 'utf8');
const m = html.match(/class="print-logo"\s+src="(data:image\/png;base64,[^"]+)"/);
if (!m) {
  console.error('로고를 찾지 못했습니다.');
  process.exit(1);
}
fs.mkdirSync(path.join(__dirname, 'assets'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'assets', 'logo-base64.txt'), m[1], 'utf8');
console.log('저장 완료: assets/logo-base64.txt (length', m[1].length, ')');
