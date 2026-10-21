/* Writes a minified copy of every script and stylesheet in dist/ to
   dist/min/, under the same name, pudl-windows.js as min/pudl-windows.js
   and pudl.css as min/pudl.css, each with a source map that points at the
   readable file, which stays the source and what PUDL documents.
   `node build/minify.js --check` rebuilds them in memory and fails if any
   committed copy differs.

   The copies live in a folder of their own rather than beside their
   sources as name.min.js (0.73.0). jsDelivr documents that it minifies a
   file itself when a .min.js or .min.css that is asked for does not exist
   (https://www.jsdelivr.com/documentation#id-minify-js-and-css), and for a
   release it had only just seen it did so for files that did exist, and
   then kept serving its own. A name without .min is never minified by it.

   A stylesheet's relative addresses, such as url(fonts/…), are rewritten
   to reach from min/ to what they named, url(../fonts/…).

   esbuild is a maintainer's dependency only, pinned in package.json, as
   fontTools is for the fonts; a project using PUDL still builds nothing.
   It minifies each file on its own, without bundling, so it never renames
   a top-level name, and it keeps the syntax as written, since no target
   is given. https://esbuild.github.io/api/#transform */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const DIST = path.join(__dirname, '..', 'dist');
const MIN = path.join(DIST, 'min');
const check = process.argv.includes('--check');

const sources = fs.readdirSync(DIST)
  .filter(f => /\.(js|css)$/.test(f) && !/\.min\.(js|css)$/.test(f))
  .sort();

/* A relative address in a stylesheet, one that is not data:, a scheme, a
   path from the root or a fragment, made to reach up from min/. */
function upOne(css) {
  return css.replace(/url\((["']?)(?![a-z][a-z0-9+.-]*:|\/|#)([^)"']+)\1\)/gi, function (all, q, url) {
    return 'url(' + q + '../' + url + q + ')';
  });
}

let stale = 0;
let before = 0, after = 0;
const written = [];
for (const name of sources) {
  const ext = path.extname(name);
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
  const link = ext === '.js' ? `//# sourceMappingURL=${name}.map\n` : `/*# sourceMappingURL=${name}.map */\n`;
  /* The banner adds a line, which the map's mappings skip with a leading
     semicolon. The source is the readable file, one folder up. */
  const map = JSON.parse(result.map);
  map.file = name;
  map.sources = ['../' + name];
  map.mappings = ';' + map.mappings;
  const body = ext === '.css' ? upOne(result.code) : result.code;
  const outputs = [
    [name, banner + body + link],
    [name + '.map', JSON.stringify(map) + '\n']
  ];
  for (const [file, text] of outputs) {
    const target = path.join(MIN, file);
    written.push(file);
    if (check) {
      const actual = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : null;
      if (actual !== text) { console.log('Stale generated file: dist/min/' + file); stale++; }
    } else {
      fs.mkdirSync(MIN, { recursive: true });
      fs.writeFileSync(target, text);
    }
  }
  before += Buffer.byteLength(code);
  after += Buffer.byteLength(outputs[0][1]);
}

/* A copy whose source has gone is stale, and so is a copy left beside its
   source as name.min.js by 0.70.0 to 0.72.0. */
if (fs.existsSync(MIN)) {
  for (const f of fs.readdirSync(MIN)) {
    if (written.includes(f)) continue;
    if (check) { console.log('Minified copy without a source: dist/min/' + f); stale++; }
    else fs.unlinkSync(path.join(MIN, f));
  }
}
for (const f of fs.readdirSync(DIST)) {
  if (!/\.min\.(js|css)(\.map)?$/.test(f)) continue;
  if (check) { console.log('Minified copy outside dist/min/: dist/' + f); stale++; }
  else fs.unlinkSync(path.join(DIST, f));
}

if (stale) process.exit(1);
console.log(`${check ? 'Checked' : 'Wrote'} ${sources.length} minified copies in dist/min/: ${before.toLocaleString('en')} bytes of source, ${after.toLocaleString('en')} minified`);
