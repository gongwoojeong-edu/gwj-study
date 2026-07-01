// One-off helper: normalize brand imports/CSS in build-*.js files
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const files = fs
  .readdirSync(ROOT)
  .filter((f) => f.startsWith('build-') && f.endsWith('.js'))
  .map((f) => path.join(ROOT, f));

const UI_IMPORT =
  "brandCss,\n  BRAND_PRINT_CSS,\n  heroBrandHtml,\n  watermarkHtml,\n  TOOLBAR_CSS,\n  toolbarLeftHtml";

for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');
  const before = s;

  s = s.replace(/\nconst LOCKUP = fs\.readFileSync\([^\n]+\n/g, '\n');

  if (s.includes("require('./assets/build-page-ui')") || s.includes('require("./assets/build-page-ui")')) {
    s = s.replace(/LOGO_LOCKUP_CSS,\s*/g, '');
    if (!s.includes('brandCss')) {
      s = s.replace(
        /(\{[^}]*)(TOOLBAR_CSS)/,
        (m, a, b) => (a.includes('brandCss') ? m : `${a}${UI_IMPORT.replace('TOOLBAR_CSS', b).replace(/,\n  TOOLBAR_CSS/, ',\n  TOOLBAR_CSS')}`),
      );
      // simpler: inject after opening brace of require
      s = s.replace(
        /const \{([^}]+)\} = require\('\.\/assets\/build-page-ui'\);/,
        (m, inner) => {
          const parts = new Set(
            inner
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
          );
          parts.delete('LOGO_LOCKUP_CSS');
          ['brandCss', 'BRAND_PRINT_CSS', 'heroBrandHtml', 'watermarkHtml'].forEach((x) => parts.add(x));
          return `const { ${[...parts].join(', ')} } = require('./assets/build-page-ui');`;
        },
      );
    }
  } else if (!s.includes('brandCss') && s.includes('toolbarLeftHtml')) {
    s = s.replace(
      /const \{ TOOLBAR_CSS, toolbarLeftHtml \}/,
      "const { brandCss, BRAND_PRINT_CSS, heroBrandHtml, watermarkHtml, TOOLBAR_CSS, toolbarLeftHtml }",
    );
  }

  s = s.replace(/\$\{LOGO_LOCKUP_CSS\}\s*/g, '');
  s = s.replace(
    /\.toolbar-left\{display:flex;align-items:center;gap:16px;flex:1;min-width:0(?:;flex-wrap:wrap)?\}\s*/g,
    '',
  );
  s = s.replace(
    /\.watermark\{position:fixed;inset:0;z-index:5;pointer-events:none;background:url\("\$\{LOGO\}"\) center center no-repeat;background-size:340px auto;opacity:\.07\}\s*/g,
    '${brandCss(LOGO)}\n  ',
  );
  s = s.replace(
    /\.hero \.hero-logo\{height:26px;width:auto;display:block;margin-bottom:12px;filter:brightness\(0\) invert\(1\);opacity:\.95\}\s*/g,
    '',
  );
  s = s.replace(
    /\.watermark\{opacity:\.1;-webkit-print-color-adjust:exact;print-color-adjust:exact\}/g,
    '${BRAND_PRINT_CSS}',
  );

  s = s.replace(/toolbarLeftHtml\(LOCKUP,/g, 'toolbarLeftHtml(LOGO,');
  s = s.replace(
    /<img class="hero-logo" src="\$\{LOGO\}" alt="공우정바른학원">/g,
    '${heroBrandHtml(LOGO)}',
  );
  s = s.replace(
    /<div class="watermark" aria-hidden="true"><\/div>/g,
    '${watermarkHtml()}',
  );

  if (s !== before) {
    fs.writeFileSync(file, s, 'utf8');
    console.log('patched', path.basename(file));
  }
}
