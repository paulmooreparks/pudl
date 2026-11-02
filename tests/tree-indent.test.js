/* 0.96.8: a tree's --tree-indent and --tree-row-pad-start, set by a
   host on the tree, with defaults that leave an untouched tree as it
   was. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 900, height: 600 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/tests/fixtures/tree-indent.html');
  await p.waitForFunction(() => document.querySelectorAll('.tree .tree-toggle, .tree [aria-expanded] > *').length > 0);
  const read = id => p.evaluate(id => {
    const tree = document.getElementById(id), links = [...tree.querySelectorAll('a')];
    const left = tree.getBoundingClientRect().left;
    const space4 = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--space-4')) || null;
    return {
      space4,
      rows: links.map(a => {
        const first = a.firstElementChild, cs = getComputedStyle(a);
        return { pad: parseFloat(cs.paddingInlineStart), gap: cs.gap, lead: Math.round(a.getBoundingClientRect().left - left), first: first ? Math.round(first.getBoundingClientRect().left - left) : null, toggleW: first ? Math.round(first.getBoundingClientRect().width) : null };
      })
    };
  }, id);
  const plain = await read('plain'), tuned = await read('tuned');
  check('an untouched tree keeps 6px before each row and the spacing token per level', plain.rows.every(r => r.pad === 6) && plain.rows[1].lead - plain.rows[0].lead === plain.space4 && plain.rows[2].lead - plain.rows[1].lead === plain.space4, plain);
  check('a tuned tree takes its host\'s step and start padding at every level', tuned.rows.every(r => r.pad === 0) && tuned.rows[1].lead - tuned.rows[0].lead === 16 && tuned.rows[2].lead - tuned.rows[1].lead === 16 && tuned.rows[0].first === 0 && tuned.rows[1].first === 16 && tuned.rows[2].first === 32, tuned);
  check('the toggle and the gap are unchanged by the properties', tuned.rows[0].toggleW === plain.rows[0].toggleW && tuned.rows[0].gap === plain.rows[0].gap, [plain.rows[0], tuned.rows[0]]);
  check('no page errors', !errors.length, errors);
  await b.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
