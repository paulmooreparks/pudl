/* 0.96.4: the execution-state badge a host may use, and a taskbar stack's
   rows drawing their state with it at the row's end, on a menu row's
   metrics, with a column that does not move as the state changes. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  /* A pseudo-element's computed --glyph is the token's value, the SVG
     itself, so the glyphs are told apart by their paths. */
  const G = { play: 'M4 2l9 6-9 6z', pause: 'M4 3h3v10', warning: 'M8 1.8', square: "rect x='3'" };
  const is = (v, name) => typeof v === 'string' && v.includes(G[name]);
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 800 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/tests/fixtures/taskbar-stacks.html');
  await p.waitForFunction(() => window.pudlWindows && document.querySelector('#all [data-win-stack="alpha"]'));
  await p.evaluate(() => {
    const w = k => document.querySelector('.win[data-win="' + k + '"]');
    w('a1').setAttribute('data-win-state', 'working'); w('a1').setAttribute('data-win-state-label', 'Background work');
    w('a2').setAttribute('data-win-state', 'stuck');
    w('a3').removeAttribute('data-win-state');
    for (const k of ['a1', 'a2', 'a3']) w(k).setAttribute('data-win-glyph', 'document');
  });

  /* The host's own badge. */
  const host = await p.evaluate(() => {
    const out = {};
    for (const s of ['working', 'waiting', 'stuck', 'idle']) {
      const el = document.createElement('span'); el.className = 'badge'; el.setAttribute('data-state', s); el.textContent = 'Words';
      document.body.appendChild(el);
      const cs = getComputedStyle(el, '::before');
      out[s] = { content: cs.content, glyph: cs.getPropertyValue('--glyph').trim(), w: Math.round(parseFloat(cs.width)), color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor };
      el.remove();
    }
    return out;
  });
  check('a badge with data-state leads with the state\'s glyph', is(host.working.glyph, 'play') && is(host.waiting.glyph, 'pause') && is(host.stuck.glyph, 'warning') && is(host.idle.glyph, 'square') && Object.values(host).every(h => h.content === '""' && h.w > 0), host);
  check('each state has its own colour and tint', new Set(Object.values(host).map(h => h.color)).size === 4 && new Set(Object.values(host).map(h => h.bg)).size === 4, host);

  /* The stack's rows. */
  await p.locator('#all [data-win-stack="alpha"]').click();
  await p.waitForSelector('.win-stack-panel:popover-open');
  const rows = await p.evaluate(() => [...document.querySelectorAll('.win-stack-panel [data-stack-row]')].map(r => {
    const link = r.firstChild, mark = link.querySelector('.win-state'), title = link.querySelector('.win-item-title'), glyph = link.querySelector('.win-item-glyph'), close = r.lastChild;
    const lr = link.getBoundingClientRect(), mr = mark.getBoundingClientRect(), tr = title.getBoundingClientRect(), cr = close.getBoundingClientRect(), gr = glyph.getBoundingClientRect();
    const cs = getComputedStyle(link), ms = getComputedStyle(mark), before = getComputedStyle(mark, '::before');
    return { key: r.getAttribute('data-stack-row'), h: Math.round(lr.height), font: cs.fontSize, pad: cs.paddingTop + ' ' + cs.paddingLeft, glyph: Math.round(gr.width),
      badge: mark.classList.contains('badge'), state: mark.getAttribute('data-state'), hidden: mark.hidden, words: mark.textContent.trim(),
      afterTitle: mr.left >= tr.right - 1, beforeClose: mr.right <= cr.left, markFont: ms.fontSize, markWeight: ms.fontWeight, beforeGlyph: before.getPropertyValue('--glyph').trim(),
      innerGlyphShown: getComputedStyle(mark.firstChild).display !== 'none', titleRight: Math.round(tr.right), stateCol: Math.round(link.querySelector('.win-item-state').getBoundingClientRect().width) };
  }));
  const a1 = rows.find(r => r.key === 'a1'), a2 = rows.find(r => r.key === 'a2'), a3 = rows.find(r => r.key === 'a3');
  check('a row has a menu row\'s metrics: 32px tall, text-sm, 6px by 14px padding, a 14px glyph', rows.every(r => r.h === 32 && Math.round(parseFloat(r.font)) === 13 && r.pad === '6px 14px' && r.glyph === 14), rows.map(r => [r.key, r.h, r.font, r.pad, r.glyph]));
  check('a working row shows the badge with the Play glyph and the host\'s words, at the row\'s end before Close', a1 && a1.badge && a1.state === 'working' && !a1.hidden && a1.words === 'Background work' && a1.afterTitle && a1.beforeClose && is(a1.beforeGlyph, 'play') && !a1.innerGlyphShown, a1);
  check('the badge is 11px bold', a1 && Math.round(parseFloat(a1.markFont)) === 11 && Number(a1.markWeight) >= 700, a1 && [a1.markFont, a1.markWeight]);
  check('a stuck row shows the warning glyph', a2 && a2.state === 'stuck' && is(a2.beforeGlyph, 'warning'), a2);
  check('a row with no state keeps its column and shows no badge', a3 && a3.hidden && a3.stateCol === a1.stateCol && a3.stateCol > 0, a3);

  /* Geometry holds as a state changes: the column is as wide as the
     widest badge in the list (0.96.5), so another row's change within it
     moves nothing. */
  await p.evaluate(() => { const w = document.querySelector('.win[data-win="a2"]'); w.setAttribute('data-win-state', 'waiting'); w.setAttribute('data-win-state-label', 'W'); });
  await p.waitForFunction(() => document.querySelector('.win-stack-panel [data-stack-row="a2"] .win-state').getAttribute('data-state') === 'waiting');
  const after = await p.evaluate(() => { const link = document.querySelector('.win-stack-panel [data-stack-row="a2"]').firstChild; return { titleRight: Math.round(link.querySelector('.win-item-title').getBoundingClientRect().right), stateCol: Math.round(link.querySelector('.win-item-state').getBoundingClientRect().width), h: Math.round(link.getBoundingClientRect().height), glyph: getComputedStyle(link.querySelector('.win-state'), '::before').getPropertyValue('--glyph').trim() }; });
  check('a change of state and words moves nothing else in the row', after.titleRight === a2.titleRight && after.stateCol === a2.stateCol && after.h === 32 && is(after.glyph, 'pause'), { before: [a2.titleRight, a2.stateCol], after });
  const name = await p.evaluate(() => document.querySelector('.win-stack-panel [data-stack-row="a2"]').firstChild.getAttribute('aria-label'));
  check('the row\'s name still says the state', /W$|Waiting|W\b/.test(name), name);

  /* The taskbar button and title bar are untouched by the badge. */
  check('the taskbar stack button\'s own mark is not a badge', await p.evaluate(() => !document.querySelector('#all [data-win-stack="alpha"] .win-state').classList.contains('badge')));
  check('no page errors', !errors.length, errors);
  await b.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
