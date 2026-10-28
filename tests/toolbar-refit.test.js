/* A folding toolbar whose contents change while one of its menus is open
   folds again when the menu closes (0.93.1): it does not fold under an
   open menu, and it does not keep a stale fold once the menu is gone,
   whether the change widened its contents or narrowed them. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/tests/fixtures/command-bar.html');
  await p.waitForFunction(() => window.pudlToolbar);
  await p.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend',
      '<div id="host" style="width: 2000px"><div class="toolbar" id="bar" role="toolbar" aria-label="Probe" data-toolbar-fold>' +
      '<div class="toolbar-group" data-toolbar-group="Model" data-toolbar-glyph="gear"><div class="menu"><button class="btn btn-sm menu-btn" type="button" popovertarget="probe-menu">Model</button>' +
      '<div class="menu-panel" id="probe-menu" popover><button class="menu-action" type="button">One</button></div></div></div>' +
      '<div class="toolbar-group" data-toolbar-group="Agent" data-toolbar-glyph="app" id="agent"><button class="btn btn-sm" type="button"><span class="glyph" style="--glyph: var(--glyph-app)" aria-hidden="true"></span><span class="toolbar-words">Agent settings</span></button></div>' +
      '<div class="toolbar-group" data-toolbar-group="Turn" data-toolbar-glyph="stop" id="turn"></div>' +
      '</div></div>');
  });
  const state = () => p.evaluate(() => {
    const bar = document.getElementById('bar');
    return { fits: bar.scrollWidth <= bar.clientWidth + 1, stages: [...bar.querySelectorAll(':scope > .toolbar-group')].map(g => g.getAttribute('data-toolbar-stage')) };
  });
  const frames = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50)))));
  /* The narrowest width at which every group is open with no turn. */
  await p.evaluate(() => { const bar = document.getElementById('bar'); pudlToolbar.fit(bar); document.getElementById('host').style.width = parseFloat(getComputedStyle(bar).getPropertyValue('--toolbar-most')) + 2 + 'px'; });
  await frames();
  let s = await state();
  check('at its widest needed width every group is open', s.fits && s.stages.every(x => x === '1'), s);

  /* Contents grow while the menu is open. */
  await p.evaluate(() => document.getElementById('probe-menu').showPopover());
  await p.evaluate(() => { document.getElementById('turn').insertAdjacentHTML('beforeend', '<button class="btn btn-sm" type="button" id="stop"><span class="glyph" style="--glyph: var(--glyph-stop)" aria-hidden="true"></span><span class="toolbar-words">Stop the running turn</span></button>'); });
  await frames();
  s = await state();
  check('nothing folds while the menu is open', s.stages.every(x => x === '1') && await p.evaluate(() => document.getElementById('probe-menu').matches(':popover-open')), s);
  await p.evaluate(() => document.getElementById('probe-menu').hidePopover());
  await frames();
  s = await state();
  check('when the menu closes the toolbar folds to fit what it now holds', s.fits && s.stages.some(x => x !== '1'), s);

  /* Contents shrink while the menu is open. */
  await p.evaluate(() => document.getElementById('probe-menu').showPopover());
  await p.evaluate(() => document.getElementById('stop').remove());
  await frames();
  await p.evaluate(() => document.getElementById('probe-menu').hidePopover());
  await frames();
  s = await state();
  check('when the menu closes after the contents shrank, every group opens again', s.fits && s.stages.every(x => x === '1'), s);

  /* With no change behind it, closing a menu refolds nothing. */
  const fitsBefore = await p.evaluate(() => { window.__fits = 0; document.getElementById('bar').addEventListener('pudl:toolbar-fit', () => window.__fits++); document.getElementById('probe-menu').showPopover(); document.getElementById('probe-menu').hidePopover(); return 0; });
  await frames();
  check('closing a menu with nothing owed does no folding', await p.evaluate(() => window.__fits) === fitsBefore);

  check('no errors', errors.length === 0, errors);
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
