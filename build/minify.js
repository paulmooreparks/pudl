/* Writes a minified copy of every script and stylesheet in dist/ beside it,
   pudl-windows.js as pudl-windows.min.js and pudl.css as pudl.min.css, each
   with a source map that points at the readable file, which stays the
   source and what PUDL documents. `node build/minify.js --check` rebuilds
   them in memory and fails if any committed copy differs.

   esbuild is a maintainer's dependency only, pinned in package.json, as
   fontTools is for the fonts; a project using PUDL still builds nothing.
   It minifies each file on its own, without bundling, so it never renames
   a top-level name, and it keeps the syntax as written, since no target
   is given. https://esbuild.github.io/api/#transform */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const DIST = path.join(__dirname, '..', 'dist');
const check = process.argv.includes('--check');

const sources = fs.readdirSync(DIST)
  .filter(f => /\.(js|css)$/.test(f) && !/\.min\.(js|css)$/.test(f))
  .sort();

let stale = 0;
let before = 0, after = 0;
for (const name of sources) {
  const ext = path.extname(name);
  const min = name.slice(0, -ext.length) + '.min' + ext;
  const code = fs.readFileSync(path.join(DIST, name), 'utf8').replace(/\r\n/g, '\n');
  const result = esbuild.transformSync(code, {
    loader: ext.slice(1),
    minify: true,
    sourcemap: 'external',
    sourcefile: name,
    sourcesContent: false,
    legalComments: 'none',
    charset: 'utf8'
  });
  const banner = `/* PUDL, Apache-2.0. Minified from ${name}, which is the source.` +
    (code.includes('@font-face') ? ' Inter is under the SIL OFL 1.1 (fonts/Inter-LICENSE.txt).' : '') + ' */\n';
  const link = ext === '.js' ? `//# sourceMappingURL=${min}.map\n` : `/*# sourceMappingURL=${min}.map */\n`;
  /* The banner adds a line, which the map's mappings skip with a leading
     semicolon. */
  const map = JSON.parse(result.map);
  map.file = min;
  map.mappings = ';' + map.mappings;
  const outputs = [
    [min, banner + result.code + link],
    [min + '.map', JSON.stringify(map) + '\n']
  ];
  for (const [file, text] of outputs) {
    const target = path.join(DIST, file);
    if (check) {
      const actual = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : null;
      if (actual !== text) { console.log('Stale generated file: dist/' + file); stale++; }
    } else {
      fs.writeFileSync(target, text);
    }
  }
  before += Buffer.byteLength(code);
  after += Buffer.byteLength(outputs[0][1]);
}

/* A minified copy whose source has gone is stale too. */
for (const f of fs.readdirSync(DIST)) {
  const m = /^(.*)\.min\.(js|css)(\.map)?$/.exec(f);
  if (m && !sources.includes(m[1] + '.' + m[2])) {
    if (check) { console.log('Minified copy without a source: dist/' + f); stale++; }
    else fs.unlinkSync(path.join(DIST, f));
  }
}

if (stale) process.exit(1);
console.log(`${check ? 'Checked' : 'Wrote'} ${sources.length} minified copies: ${before.toLocaleString('en')} bytes of source, ${after.toLocaleString('en')} minified`);
