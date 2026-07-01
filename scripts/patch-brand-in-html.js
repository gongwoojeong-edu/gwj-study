// collections/ 내 예전 lockup·워터마크가 남은 정적 HTML 일괄 정리
const fs = require('fs');
const path = require('path');
const { brandCss, TOOLBAR_CSS, BRAND_PRINT_CSS } = require('../assets/build-page-ui');

const ROOT = path.join(__dirname, '..');
const LOGO = fs.readFileSync(path.join(ROOT, 'assets', 'logo-base64.txt'), 'utf8').trim();
const esc = (s) => String(s).replace(/"/g, '\\"');

function brandMarkHtml() {
  return `<div class="brand-mark"><img class="brand-symbol" src="${LOGO}" alt=""><span class="brand-text"><strong>공우정바른학원</strong><span class="brand-sub">GWJ EDU</span></span></div>`;
}

function patchHtml(html) {
  if (!html.includes('logo-lockup') && !html.includes('background-size:340px')) return null;

  let out = html;
  out = out.replace(
    /\.toolbar\{position:sticky[^}]+\}/,
    TOOLBAR_CSS.trim(),
  );
  out = out.replace(/\s*\.toolbar \.logo-lockup\{[^}]+\}/g, '');
  out = out.replace(
    /\.watermark\{position:fixed;inset:0;z-index:\d+;pointer-events:none;[^}]+\}/,
    `.watermark{position:fixed;inset:0;z-index:0;pointer-events:none;background:url("${esc(LOGO)}") center 40% no-repeat;background-size:min(240px,46vw) auto;opacity:.034}`,
  );
  out = out.replace(
    /\.hero \.hero-logo\{[^}]+\}/,
    '.hero .hero-brand-symbol{height:38px;width:38px;display:block;margin-bottom:10px;filter:brightness(0) invert(1);opacity:.93}',
  );
  out = out.replace(
    /<img class="logo-lockup" src="data:image[^"]+" alt="[^"]*">/,
    brandMarkHtml(),
  );
  out = out.replace(/class="hero-logo"/g, 'class="hero-brand-symbol"');
  out = out.replace(
    /\.watermark\{opacity:\.1;/g,
    '.watermark{opacity:.055;',
  );

  const brandBlock = brandCss(LOGO).trim();
  if (!out.includes('.brand-symbol{')) {
    out = out.replace(/(<style>\s*)/, `$1\n  ${brandBlock}\n`);
  }

  return out;
}

const dir = path.join(ROOT, 'collections');
let n = 0;
for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith('.html')) continue;
  const fp = path.join(dir, name);
  const raw = fs.readFileSync(fp, 'utf8');
  const patched = patchHtml(raw);
  if (patched) {
    fs.writeFileSync(fp, patched, 'utf8');
    console.log('patched:', name);
    n++;
  }
}
console.log(n ? `done: ${n} file(s)` : 'no files needed patching');
