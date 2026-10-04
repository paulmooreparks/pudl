/* Monospace text is read character for character, so PUDL turns ligatures
   off wherever it sets the monospace face (from PUDL Desktop, where
   Cascadia Code drew a Markdown table's "|---|" as one joined line). */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/reference.html');
  const got = await p.evaluate(() => {
    const box = document.createElement('div');
    box.innerHTML =
      '<pre class="code" id="pre">|---|--:| != =&gt;</pre>' +
      '<div class="code-surface" id="surface"><span id="inner">a != b</span></div>' +
      '<nav class="path mono" id="path">/a/b</nav>';
    document.body.appendChild(box);
    const lig = id => getComputedStyle(document.getElementById(id)).fontVariantLigatures;
    return { pre: lig('pre'), surface: lig('surface'), inner: lig('inner'), path: lig('path') };
  });
  check('a code block sets no ligatures', got.pre === 'none', got.pre);
  check('a code surface sets no ligatures', got.surface === 'none', got.surface);
  check('text inside a code surface, such as an editor\'s, inherits that', got.inner === 'none', got.inner);
  check('a monospace path sets no ligatures', got.path === 'none', got.path);
  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
