const { launch, ROOT, out, engine } = require('./lib');
const path = require('path');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const watch = p => p.on('pageerror', e => errors.push(e.message));

  /* === Forced colours ==================================================== */
  const f = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  watch(f);
  await f.emulateMedia({ forcedColors: 'active' });
  await f.goto(ROOT + '/reference.html');
  await f.focus('.btn-primary');
  await f.keyboard.press('Shift');
  const fc = await f.evaluate(() => {
    const b = document.activeElement;
    const cs = getComputedStyle(b);
    const seg = getComputedStyle(document.querySelector('.seg button[aria-pressed="true"]'));
    const probe = document.createElement('span'); probe.style.color = 'Highlight'; document.body.append(probe);
    const hl = getComputedStyle(probe).color; probe.remove();
    return { outline: cs.outlineStyle + ' ' + cs.outlineWidth, border: cs.borderTopStyle, segBg: seg.backgroundColor, hl };
  });
  check('forced colours: focus is a real outline', fc.outline === 'solid 2px', fc.outline);
  check('forced colours: buttons keep a border', fc.border === 'solid', fc.border);
  check('forced colours: a selected segment takes the highlight', fc.segBg === fc.hl, JSON.stringify(fc));
  await f.evaluate(() => document.querySelector('.win-demo').scrollIntoView({ block: 'center' }));
  await f.click('.win-demo-list a[data-win-open="exp-12"]');
  await f.waitForSelector('.win[data-win="exp-12"].active');
  const head = await f.evaluate(() => getComputedStyle(document.querySelector('.win.active .win-head')).backgroundColor);
  check('forced colours: the active title bar takes the highlight', head === fc.hl, head);
  await f.screenshot({ path: out('forced.png'), clip: { x: 0, y: 0, width: 1280, height: 700 } });

  /* === Reduced motion ==================================================== */
  const m = await b.newPage();
  watch(m);
  await m.emulateMedia({ reducedMotion: 'reduce' });
  await m.goto(ROOT + '/reference.html');
  const dur = await m.evaluate(() => getComputedStyle(document.querySelector('.switch-track')).transitionDuration);
  check('reduced motion: transitions finish at once', /^1e-05s|^0\.00001s|^0s/.test(dur), dur);

  /* === Right to left ===================================================== */
  const r = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  watch(r);
  await r.goto(ROOT + '/reference.html');
  await r.evaluate(() => { document.documentElement.dir = 'rtl'; document.getElementById('md').scrollIntoView(); });
  const side = () => r.evaluate(() => Math.round(document.querySelector('.layout-demo .md-sidebar').getBoundingClientRect().width));
  const pos = await r.evaluate(() => {
    const s = document.querySelector('.layout-demo .md-sidebar').getBoundingClientRect();
    const d = document.querySelector('.layout-demo .md-detail').getBoundingClientRect();
    const row = getComputedStyle(document.querySelector('.layout-demo .md-row:has(> [aria-current])'));
    return { sideRight: s.left > d.left, rowBar: row.borderLeftWidth + ' ' + row.borderLeftColor + ' / ' + row.borderRightWidth };
  });
  check('RTL: the sidebar sits on the right', pos.sideRight, JSON.stringify(pos));
  check('RTL: the selected row marks the edge facing the detail', /^3px/.test(pos.rowBar) && / \/ 0px$/.test(pos.rowBar), pos.rowBar);
  const w0 = await side();
  const hb = await r.locator('.layout-demo .md-resize').boundingBox();
  await r.mouse.move(hb.x + 3, hb.y + 100); await r.mouse.down(); await r.mouse.move(hb.x - 97, hb.y + 100, { steps: 6 }); await r.mouse.up();
  check('RTL: dragging the divider left widens the sidebar', Math.abs((await side()) - w0 - 100) <= 1, w0 + ' -> ' + (await side()));
  await r.focus('.layout-demo .md-resize');
  const w1 = await side();
  await r.keyboard.press('ArrowLeft');
  check('RTL: Left widens it too', (await side()) === w1 + 16, w1 + ' -> ' + (await side()));
  await r.click('[popovertarget="md-trip-menu"]');
  await r.waitForFunction(() => { const el = document.getElementById('md-trip-menu'); return el.matches(':popover-open') && el.style.top; });
  const al = await r.evaluate(() => {
    const bt = document.querySelector('[popovertarget="md-trip-menu"]').getBoundingClientRect();
    const pn = document.getElementById('md-trip-menu').getBoundingClientRect();
    return Math.round(pn.right - bt.right);
  });
  check('RTL: a menu lines up with its button\'s right edge', Math.abs(al) <= 1, String(al));
  await r.keyboard.press('Escape');
  const thumb = await r.evaluate(() => getComputedStyle(document.querySelector('.switch[aria-checked="true"] .switch-thumb')).transform);
  check('RTL: a switch that is on slides to the left', /matrix\(1, 0, 0, 1, -18, 0\)/.test(thumb), thumb);

  /* === Print ============================================================= */
  const pr = await b.newPage({ viewport: { width: 1280, height: 900 } });
  watch(pr);
  await pr.goto(ROOT + '/samples/article-reader.html?open=url-state,numerals&top=numerals');
  await pr.evaluate(() => localStorage.setItem('pudl-theme', 'dark'));
  await pr.reload();
  await pr.waitForSelector('.win[data-win="numerals"].active');
  await pr.emulateMedia({ media: 'print' });
  const pt = await pr.evaluate(() => {
    const d = s => getComputedStyle(document.querySelector(s)).display;
    return {
      topbar: d('.topbar'), tabs: d('.app-section-bar'), toolbar: d('.md-toolbar'), side: d('.md-sidebar'),
      other: d('.win[data-win="url-state"]'), active: getComputedStyle(document.querySelector('.win[data-win="numerals"]')).position,
      chrome: d('.win[data-win="numerals"] .win-chrome'),
      bg: getComputedStyle(document.body).backgroundColor, fg: getComputedStyle(document.body).color
    };
  });
  check('print: the chrome does not print', pt.topbar === 'none' && pt.tabs === 'none' && pt.toolbar === 'none' && pt.chrome === 'none', JSON.stringify(pt));
  check('print: only the window in front prints, in the flow', pt.other === 'none' && pt.active === 'static' && pt.side === 'none', JSON.stringify(pt));
  check('print: black on white, even from the dark theme', pt.bg === 'rgb(255, 255, 255)' && pt.fg === 'rgb(0, 0, 0)', JSON.stringify(pt));
  /* Playwright makes PDFs only in Chromium; the print rules above are
     checked in every engine. */
  if (engine === 'chromium') {
    const pdf = await pr.pdf({ path: out('print.pdf') });
    check('print: a PDF renders', pdf.length > 1000);
  }

  /* === Words and glyphs ================================================== */
  const t = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  watch(t);
  await t.goto(ROOT + '/reference.html');
  const words = await t.evaluate(async () => {
    const layer = document.querySelector('[data-win-layer]');
    layer.setAttribute('data-win-text-restore', 'Wiederherstellen');
    layer.setAttribute('data-win-text-maximize', 'Maximieren');
    layer.setAttribute('data-win-text-head', 'Fenster {title}');
    document.getElementById('demo-launcher').setAttribute('data-menu-empty', 'Nichts gefunden.');
    document.querySelector('.layout-demo .md-resize').setAttribute('data-md-valuetext', '{n} Pixel');
    window.dispatchEvent(new Event('resize'));
    return true;
  });
  await t.evaluate(() => document.querySelector('.win-demo').scrollIntoView({ block: 'center' }));
  await t.click('.win-demo-list a[data-win-open="exp-12"]');
  await t.waitForSelector('.win[data-win="exp-12"]');
  check('words: the maximize label comes from the page', (await t.getAttribute('.win[data-win="exp-12"] [data-win-action="maximize"]', 'aria-label')) === 'Maximieren');
  await t.click('.win[data-win="exp-12"] [data-win-action="maximize"]');
  check('words: so does restore', (await t.getAttribute('.win[data-win="exp-12"] [data-win-action="maximize"]', 'aria-label')) === 'Wiederherstellen');
  check('words: so does the title bar label', (await t.getAttribute('.win[data-win="exp-12"] .win-head', 'aria-label')) === 'Fenster Hotel, Makati, three nights');
  await t.click('[popovertarget="demo-launcher"]');
  await t.fill('#demo-launcher .md-filter', 'zzzz');
  check('words: the empty menu message comes from the page', (await t.textContent('#demo-launcher .menu-empty')) === 'Nichts gefunden.');
  await t.keyboard.press('Escape');
  check('words: the divider value text comes from the page', /^\d+ Pixel$/.test(await t.getAttribute('.layout-demo .md-resize', 'aria-valuetext')));
  const glyph = await t.evaluate(() => getComputedStyle(document.querySelector('.form-error'), '::before').maskImage);
  check('glyphs: the warning is drawn, never an emoji', /svg/.test(glyph), glyph.slice(0, 40));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
