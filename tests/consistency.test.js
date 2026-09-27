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
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  watch(p);
  await p.goto(ROOT + '/reference.html');
  const cs = (sel, prop, pseudo) => p.evaluate(([s, pr, ps]) => getComputedStyle(document.querySelector(s), ps || null)[pr], [sel, prop, pseudo]);
  const token = (name) => p.evaluate(n => {
    const s = document.createElement('span'); s.style.color = 'var(' + n + ')'; document.body.append(s);
    const c = getComputedStyle(s).color; s.remove(); return c;
  }, name);

  /* Section tabs. */
  const tabs = await p.evaluate(() => {
    const bar = document.querySelector('.tabs-demo .app-section-bar');
    const all = [...bar.querySelectorAll('.section-tab')];
    const cur = bar.querySelector('[aria-current]');
    const other = all.find(t => t !== cur);
    const r = el => el.getBoundingClientRect();
    return {
      otherBg: getComputedStyle(other).backgroundImage,
      curBg: getComputedStyle(cur).backgroundColor,
      curTaller: r(cur).height > r(other).height,
      sameFoot: Math.abs(r(cur).bottom - r(other).bottom) < 1,
      curBottom: Math.round(r(cur).bottom), barBottom: Math.round(r(bar).bottom)
    };
  });
  check('tabs: a tab you can go to is raised', /gradient/.test(tabs.otherBg), tabs.otherBg);
  check('tabs: the current tab takes the section colour', tabs.curBg === await token('--section-current-bg'), tabs.curBg);
  check('tabs: the current tab is taller and stands on the same baseline', tabs.curTaller && tabs.sameFoot && tabs.curBottom === tabs.barBottom, JSON.stringify(tabs));
  await p.locator('.tabs-demo').screenshot({ path: out('tabs16.png') });

  /* State by attribute, and the old class. */
  const state = await p.evaluate(() => {
    const on = document.querySelector('.seg button[aria-pressed="true"]');
    const off = document.querySelector('.seg button[aria-pressed="false"]');
    const link = document.querySelector('.seg a[aria-current]');
    const legacy = document.createElement('div');
    legacy.className = 'seg'; legacy.innerHTML = '<button class="active">x</button><button>y</button>';
    document.body.append(legacy);
    const bg = el => getComputedStyle(el).backgroundImage;
    const row = document.querySelector('.layout-demo .md-row:has(> [aria-current])');
    const r = { on: bg(on), off: bg(off), link: bg(link), legacy: bg(legacy.firstChild),
      rowEdge: getComputedStyle(row).borderInlineEndColor, rowWeight: getComputedStyle(row.querySelector('.md-item')).fontWeight };
    legacy.remove();
    return r;
  });
  check('state: aria-pressed raises a segment', /gradient/.test(state.on) && state.off === 'none', JSON.stringify(state));
  check('state: aria-current raises a view link', /gradient/.test(state.link));
  check('state: the old .active class still works', /gradient/.test(state.legacy));
  check('state: aria-current marks a list row', state.rowEdge === await token('--accent') && state.rowWeight === '700', JSON.stringify(state));

  /* Pills. */
  const pills = await p.evaluate(() => {
    const g = s => getComputedStyle(document.querySelector(s));
    const probe = document.createElement('span'); document.body.append(probe);
    probe.style.color = 'var(--text)'; const text = getComputedStyle(probe).color;
    probe.style.color = 'var(--positive)'; const pos = getComputedStyle(probe).color;
    probe.remove();
    const kind = document.createElement('span'); kind.className = 'fc-kind'; document.body.append(kind);
    const legacySize = getComputedStyle(kind).fontSize; kind.remove();
    return {
      chip: g('.chip').color, text,
      filterBorder: g('.filter-chip').borderTopStyle,
      xBg: g('.filter-chip-x').backgroundImage,
      pos: g('.badge.positive').color, posWant: pos,
      mask: getComputedStyle(document.querySelector('.badge.positive'), '::before').maskImage,
      kind: g('.filter-chip-kind').fontSize, legacySize
    };
  });
  check('pills: a chip is neutral', pills.chip === pills.text, JSON.stringify(pills));
  check('pills: a filter chip is outlined and its × is raised', pills.filterBorder === 'solid' && /gradient/.test(pills.xBg));
  check('pills: a positive badge uses --positive and a drawn glyph', pills.pos === pills.posWant && /svg/.test(pills.mask));
  check('names: .fc-kind still styles like .filter-chip-kind', pills.kind === pills.legacySize);
  const prTheme = await p.evaluate(() => {
    document.documentElement.style.setProperty('--pr', '#ff0000');
    const c = getComputedStyle(document.querySelector('.badge.positive')).color;
    document.documentElement.style.removeProperty('--pr');
    return c;
  });
  check('names: a theme that sets --pr still colours --positive', prTheme === 'rgb(255, 0, 0)', prTheme);

  /* Switch. */
  const sw = await p.evaluate(() => {
    const t = document.querySelector('.switch-track'), th = document.querySelector('.switch-thumb');
    return { track: getComputedStyle(t).boxShadow, thumb: getComputedStyle(th).backgroundImage, thumbShadow: getComputedStyle(th).boxShadow };
  });
  check('switch: the thumb is raised in a sunken track', /inset/.test(sw.track) && /gradient/.test(sw.thumb) && /inset/.test(sw.thumbShadow), JSON.stringify(sw));

  /* Glyphs. */
  const glyphs = await p.evaluate(() => {
    const m = (s, ps) => getComputedStyle(document.querySelector(s), ps).maskImage || getComputedStyle(document.querySelector(s), ps).webkitMaskImage;
    return {
      err: m('.form-error', '::before'), caret: m('.menu-btn', '::after'),
      content: getComputedStyle(document.querySelector('.form-error'), '::before').content
    };
  });
  check('glyphs: the form error draws its warning from a mask', /svg/.test(glyphs.err) && glyphs.content === '""', JSON.stringify(glyphs));
  check('glyphs: the menu caret is a mask', /svg/.test(glyphs.caret));
  await p.evaluate(() => document.querySelector('.win-demo').scrollIntoView({ block: 'center' }));
  await p.click('.win-demo-list a[data-win-open="exp-12"]');
  await p.waitForSelector('.win[data-win="exp-12"]');
  const wg = await p.evaluate(() => ({
    close: getComputedStyle(document.querySelector('.win[data-win="exp-12"] [data-win-action="close"]'), '::before').maskImage,
    dock: getComputedStyle(document.querySelector('.win-tab'), '::before').maskImage
  }));
  check('glyphs: window buttons and dock tabs are masks', /svg/.test(wg.close) && /svg/.test(wg.dock), JSON.stringify(wg).slice(0, 120));

  /* Headings. */
  const h = await p.evaluate(() => {
    const a = document.createElement('h2'); a.textContent = 'x';
    const c = document.createElement('h2'); c.className = 'card-title'; c.textContent = 'x';
    document.body.append(a, c);
    const r = [getComputedStyle(a).fontSize, getComputedStyle(c).fontSize];
    a.remove(); c.remove(); return r;
  });
  check('type: a bare h2 takes the scale, a classed one its class', h[0] === '24px' && h[1] === '17px', JSON.stringify(h));

  /* Dialog. */
  await p.click('[commandfor="demo-dialog"]');
  let d = await p.evaluate(() => { const el = document.getElementById('demo-dialog'); return { open: el.open, modal: el.matches(':modal') }; });
  check('dialog: the command button opens it as a modal', d.open && d.modal, JSON.stringify(d));
  await p.screenshot({ path: out('dialog16.png'), clip: { x: 0, y: 0, width: 1280, height: 700 } });
  await p.keyboard.press('Escape');
  check('dialog: Escape closes it', !(await p.evaluate(() => document.getElementById('demo-dialog').open)));
  await p.click('[commandfor="demo-dialog"]');
  await p.click('#demo-dialog button[value="stay"]');
  d = await p.evaluate(() => { const el = document.getElementById('demo-dialog'); return { open: el.open, value: el.returnValue }; });
  check('dialog: a button in its form closes it with its value', !d.open && d.value === 'stay', JSON.stringify(d));

  /* Forced colours: the new pieces. */
  const f = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  watch(f);
  await f.emulateMedia({ forcedColors: 'active' });
  await f.goto(ROOT + '/reference.html');
  const fc = await f.evaluate(() => {
    const probe = document.createElement('span'); probe.style.color = 'Highlight'; document.body.append(probe);
    const hl = getComputedStyle(probe).color; probe.remove();
    return {
      hl, tab: getComputedStyle(document.querySelector('.tabs-demo [aria-current]')).backgroundColor,
      glyph: getComputedStyle(document.querySelector('.form-error'), '::before').backgroundColor
    };
  });
  check('forced colours: the current tab takes the highlight', fc.tab === fc.hl, JSON.stringify(fc));
  check('forced colours: glyphs stay painted', fc.glyph !== 'rgba(0, 0, 0, 0)', fc.glyph);

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
