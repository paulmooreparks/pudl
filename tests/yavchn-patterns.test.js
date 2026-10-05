/* The patterns YAVCHN and parkscomputing.com each built for themselves,
   now PUDL's (YAVCHN's PUDL-PROPOSAL.md, Part B): a filter menu that stays
   open across the swap its boxes cause (B1), a settings panel (B2), a
   disclosure button (B4), toasts carried by content loaded later (B5) and
   a window's default identity menu (B6). */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const page = async (url, opts) => {
    const p = await b.newPage(Object.assign({ viewport: { width: 1000, height: 700 } }, opts));
    p.on('pageerror', e => errors.push(e.message));
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.goto(url);
    return p;
  };

  /* === B1: a filter menu ================================================ */
  let p = await page(ROOT + '/tests/fixtures/filter-menu.html');
  const loads = [];
  p.on('load', () => loads.push(p.url()));
  await p.click('.menu-btn');
  await p.waitForFunction(() => document.getElementById('show-menu').matches(':popover-open'));
  const row = await p.evaluate(() => { const r = document.querySelector('.menu-check'); const s = getComputedStyle(r); return { display: s.display, pad: s.paddingLeft, nowrap: s.whiteSpace }; });
  check('a checkbox row is set as a menu row', row.display === 'flex' && row.pad === '14px' && row.nowrap === 'nowrap', JSON.stringify(row));
  /* WebKit does not focus a button a click presses, so the keyboard's
     route starts from the focused button. */
  await p.focus('.menu-btn');
  await p.keyboard.press('ArrowDown');
  const reached = await p.evaluate(() => document.activeElement.matches('.menu-check input'));
  check('the arrow keys reach the boxes', reached);
  await p.evaluate(() => { document.getElementById('marker').__old = true; });
  await p.click('.menu-check >> text=Lobsters');
  await p.waitForFunction(() => /source=lobsters/.test(location.search) && !document.getElementById('marker').__old);
  await p.waitForFunction(() => document.getElementById('show-menu').matches(':popover-open'), null, { timeout: 3000 }).catch(() => {});
  const after = await p.evaluate(() => ({
    open: document.getElementById('show-menu').matches(':popover-open'),
    focus: document.activeElement && document.activeElement.value,
    swapped: !document.getElementById('marker').__old
  }));
  check('ticking a box sends the filter, and the regions swap without loading the page', after.swapped && loads.length === 0, JSON.stringify(after) + ' ' + loads.join(','));
  check('the menu opens again on the new region with focus on the same box', after.open && after.focus === 'lobsters', JSON.stringify(after));
  await p.close();

  /* === B2, B4: a settings panel and a disclosure button ================= */
  p = await page(ROOT + '/reference.html');
  const layout = await p.evaluate(() => {
    document.body.innerHTML =
      '<div class="settings-panel" id="sp">' +
        '<section class="card"><h2 class="card-title">Reading</h2><p class="card-desc">How stories open.</p>' +
          '<label class="check"><input type="checkbox"> Open in a window</label>' +
          '<div class="settings-actions" id="acts"><button class="btn btn-primary">Save</button><button class="btn">Reset</button></div>' +
          '<p class="settings-status" id="st" role="status"></p></section>' +
        '<section class="card"><h2 class="card-title">Account</h2></section>' +
      '</div>' +
      '<button class="btn disclosure" id="d" type="button" aria-expanded="false" aria-controls="note">Note</button><div id="note" hidden>Text</div>';
    const sp = document.getElementById('sp'), cards = sp.querySelectorAll('.card');
    const gap = cards[1].getBoundingClientRect().top - cards[0].getBoundingClientRect().bottom;
    const acts = getComputedStyle(document.getElementById('acts'));
    return { column: getComputedStyle(sp).flexDirection, max: getComputedStyle(sp).maxWidth, gap: Math.round(gap), acts: acts.display + ' ' + acts.flexWrap, status: getComputedStyle(document.getElementById('st')).display };
  });
  check('a settings panel is a column of cards 12px apart, at most 720px wide', layout.column === 'column' && layout.max === '720px' && layout.gap === 12, JSON.stringify(layout));
  check('its actions are a row that wraps, and an empty status line takes no room', layout.acts === 'flex wrap' && layout.status === 'none', JSON.stringify(layout));
  const chevron = async () => p.evaluate(() => { const s = getComputedStyle(document.getElementById('d'), '::after'); return { mask: s.maskImage || s.webkitMaskImage, t: s.transform, w: s.width }; });
  const closed = await chevron();
  await p.evaluate(() => document.getElementById('d').setAttribute('aria-expanded', 'true'));
  const opened = await chevron();
  check('a disclosure button carries the chevron glyph at 16px', /svg/.test(closed.mask) && closed.mask.includes('12.5') && closed.w === '16px', JSON.stringify(closed));
  check('it turns over when expanded', closed.t === 'none' && opened.t !== 'none', closed.t + ' / ' + opened.t);
  check('it is a raised button', await p.evaluate(() => getComputedStyle(document.getElementById('d')).backgroundImage !== 'none'));
  await p.close();

  /* === B5: toasts in content loaded later =============================== */
  p = await page(ROOT + '/samples/expenses.html');
  const toast = await p.evaluate(() => new Promise(resolve => {
    const win = document.createElement('section');
    win.className = 'win';
    win.innerHTML = '<div class="win-body"><div class="toast positive" hidden><p class="toast-text">Your picture was saved</p></div></div>';
    document.body.appendChild(win);
    win.dispatchEvent(new CustomEvent('pudl:window-open', { bubbles: true }));
    setTimeout(() => {
      const t = document.querySelector('.toast-region .toast');
      resolve({ moved: !!t && !win.querySelector('.toast'), shown: !!t && !t.hidden, text: t && t.textContent.trim(), close: !!(t && t.querySelector('.toast-close')),
                live: (document.querySelector('.toast-region') || {}).getAttribute && document.querySelector('.toast-region').getAttribute('aria-live') });
    }, 400);
  }));
  check('a toast in a window\'s content moves into the toast region, shown', toast.moved && toast.shown && toast.text === 'Your picture was saved', JSON.stringify(toast));
  check('where it is announced, with a dismiss button', toast.live === 'polite' && toast.close, JSON.stringify(toast));
  await p.close();

  /* === B6: a window's default identity menu ============================= */
  p = await page(ROOT + '/tests/fixtures/menubar.html', { viewport: { width: 1500, height: 800 } });
  await p.waitForFunction(() => document.querySelectorAll('[data-applet-state="running"]').length === 2);
  await p.evaluate(() => {
    const t = document.createElement('template');
    t.id = 'tpl-plain';
    t.innerHTML = '<section class="win" data-win="plain"><header class="win-head"><h2 class="win-title">Settings</h2>' +
      '<nav class="win-chrome" aria-label="Window"><a class="win-btn" data-win-action="page" href="/settings" aria-label="Open as a page"></a>' +
      '<a class="win-btn" data-win-action="close" href="?" aria-label="Close"></a></nav></header><div class="win-body"><p>Plain content</p></div></section>';
    document.body.appendChild(t);
    pudlWindows.open('plain');
  });
  await p.waitForSelector('.win[data-win="plain"]');
  await p.waitForTimeout(200);
  const menu = await p.evaluate(() => { const g = document.querySelector('.menubar-front'); return g && [...g.querySelectorAll('.menubar-title')].map(t => t.textContent.trim()); });
  check('a window whose content offers no menu gets one title, its own', JSON.stringify(menu) === '["Settings"]', JSON.stringify(menu));
  await p.click('.menubar-front .menubar-title');
  await p.waitForFunction(() => document.getElementById('menubar-panel').matches(':popover-open'));
  const rows = await p.$$eval('#menubar-panel > *', els => els.map(e => e.matches('.menu-sep') ? '|' : e.textContent.trim()));
  check('holding what every window offers', rows.join(',') === 'Open as a page,Copy link to this content,|,Close window', rows.join(','));
  await p.close();

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
