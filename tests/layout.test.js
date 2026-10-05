/* Layout (specification 0.14.0): .vstack, .hstack and .auto-grid keep
   their components in document order with a gap from the spacing grid,
   wrap or drop columns rather than widen the page, and add nothing around
   their components. */
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
  const measure = () => p.evaluate(() => {
    const r = el => el.getBoundingClientRect();
    const v = document.getElementById('v'), h = document.getElementById('h'), g = document.getElementById('g');
    const vk = [...v.children].map(r), hk = [...h.children].map(r), gk = [...g.children].map(r);
    const space = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--space-' + n));
    return {
      space3: space(3), space5: space(5),
      vGap: Math.round(vk[1].top - vk[0].bottom), vOrder: vk[0].top < vk[1].top, vPad: Math.round(vk[0].top - r(v).top),
      hGap: Math.round(hk[1].left - hk[0].right), hSameLine: Math.round(hk[0].top) === Math.round(hk[1].top),
      hWrapped: hk.some(k => Math.round(k.top) > Math.round(hk[0].top)),
      pushEnd: Math.round(r(h).right - hk[hk.length - 1].right),
      columns: new Set(gk.map(k => Math.round(k.left))).size,
      span: Math.round(gk[gk.length - 1].width) === Math.round(r(g).width),
      wide: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });
  await p.evaluate(() => {
    document.body.innerHTML =
      '<div style="padding:16px">' +
      '<div class="vstack" id="v"><p style="margin:0">First</p><p style="margin:0">Second</p></div>' +
      '<div class="hstack gap-5" id="h" style="margin-top:16px"><button class="btn">One</button><button class="btn">Two</button><button class="btn">Three</button><button class="btn">Four</button><button class="btn push-end">Last</button></div>' +
      '<div class="auto-grid" id="g" style="margin-top:16px">' + '<div class="card">Cell</div>'.repeat(5) + '<div class="card span-all">Across</div></div>' +
      '</div>';
  });
  let m = await measure();
  check('a stack places its components one above another, in order, with space-3 between', m.vOrder && m.vGap === m.space3, JSON.stringify(m));
  check('it adds nothing around them', m.vPad === 0, String(m.vPad));
  check('a row places its components side by side with its chosen gap', m.hSameLine && m.hGap === m.space5, JSON.stringify(m));
  check('push-end puts the last component at the row\'s end', m.pushEnd === 0, String(m.pushEnd));
  check('a grid fits as many 224px columns as there is room for', m.columns === 4, String(m.columns));
  check('span-all makes a component span its line', m.span);
  await p.setViewportSize({ width: 320, height: 700 });
  m = await measure();
  check('at 320px the row wraps rather than widening the page', m.hWrapped && !m.wide, JSON.stringify(m));
  check('and the grid is one column', m.columns === 1, String(m.columns));
  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
