/* The menu bar unfolded into a ribbon (stable in 0.80.0): every title but
   Pins becomes a tab, one row of tools holds the chosen tab's commands,
   each applet keeps its own tab, a choice is captioned, a dangerous
   command is a danger button, the page's root says the ribbon shows, a
   toolbar marked to give way hides, and a wordy front title is cut short
   with its words as its tooltip. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1920, height: 900 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/samples/menu-ribbon.html');
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) { /* none */ } });
  await p.reload();
  await p.waitForSelector('.menubar-ribbon-toggle');
  /* A window's own toolbar that repeats the ribbon's commands. */
  await p.evaluate(() => {
    const t = document.createElement('div');
    t.className = 'toolbar'; t.id = 'own-toolbar'; t.setAttribute('role', 'toolbar'); t.setAttribute('aria-label', 'Formatting');
    t.setAttribute('data-toolbar-ribbon', 'hide');
    t.innerHTML = '<div class="toolbar-group" role="group" aria-label="Text"><button type="button" class="btn btn-sm">Bold</button></div>';
    document.querySelector('.win[data-win="editor"] .win-body').prepend(t);
  });
  check('folded, a toolbar marked to give way to the ribbon shows', await p.isVisible('#own-toolbar'));

  await p.click('.menubar-ribbon-toggle');
  await p.waitForSelector('#menubar-ribbon-row');
  const tabs = await p.evaluate(() => [...document.querySelectorAll('[data-menubar] [role="tab"]')].map(t => t.textContent.trim()));
  check('unfolded, every title is a tab, a resident applet\'s included', tabs.includes('File') && tabs.includes('View') && tabs.includes('Pins'), JSON.stringify(tabs));
  check('the page\'s root says the ribbon shows', await p.evaluate(() => document.documentElement.hasAttribute('data-menubar-ribbon-on')));
  check('a toolbar marked to give way to the ribbon hides', !(await p.isVisible('#own-toolbar')));
  /* The topbar's rule is the chosen tab's outline colour, in both themes. */
  for (const theme of ['dark', 'light']) {
    const rule = await p.evaluate(t => {
      document.documentElement.dataset.theme = t;
      const c = document.querySelector('.menubar-title[aria-selected="true"]');
      return [getComputedStyle(c.closest('.topbar')).borderBottomColor, getComputedStyle(c).borderTopColor];
    }, theme);
    check('the topbar\'s rule continues the chosen tab\'s line, ' + theme, rule[0] === rule[1], JSON.stringify(rule));
  }
  await p.evaluate(() => delete document.documentElement.dataset.theme);

  /* The row is built from the chosen tab's rows. */
  await p.getByRole('tab', { name: 'View', exact: true }).click();
  const captions = await p.evaluate(() => [...document.querySelectorAll('#menubar-ribbon-row .toolbar-group[data-toolbar-captioned] > .toolbar-label')].filter(l => l.getClientRects().length).map(l => l.textContent));
  check('a choice is captioned with its heading', captions.includes('Theme'), JSON.stringify(captions));
  await p.getByRole('tab', { name: 'File', exact: true }).click();
  const danger = await p.evaluate(() => { const d = [...document.querySelectorAll('#menubar-ribbon-row .btn-danger')].map(x => x.textContent.trim()); return d; });
  check('a dangerous command is a danger button', danger.includes('Close document'), JSON.stringify(danger));

  /* Each applet keeps the tab chosen in it. */
  await p.getByRole('tab', { name: 'Format', exact: true }).click();
  await p.click('.win-dock [data-win-tab="reader"]');
  await p.waitForFunction(() => [...document.querySelectorAll('[data-menubar] [role="tab"]')].some(t => t.textContent.trim() === 'Feed'));
  const readerTab = await p.evaluate(() => document.querySelector('[data-menubar] [role="tab"][aria-selected="true"]').textContent.trim());
  await p.click('.win-dock [data-win-tab="editor"]');
  await p.waitForFunction(() => [...document.querySelectorAll('[data-menubar] [role="tab"]')].some(t => t.textContent.trim() === 'Format'));
  const editorTab = await p.evaluate(() => document.querySelector('[data-menubar] [role="tab"][aria-selected="true"]').textContent.trim());
  check('each applet opens on its first tab, and keeps the one chosen in it', readerTab === 'Reader' && editorTab === 'Format', JSON.stringify({ readerTab, editorTab }));

  await p.click('.menubar-ribbon-toggle');
  check('folded again, the root no longer says so, and the toolbar shows', await p.evaluate(() => !document.documentElement.hasAttribute('data-menubar-ribbon-on')) && await p.isVisible('#own-toolbar'));

  /* A wordy front title is cut short, its words its tooltip. */
  /* The bar measures again as its width changes, so each step nudges it. */
  const read = () => p.evaluate(() => {
    const t = [...document.querySelectorAll('.menubar-front > .menubar-title')].find(x => x.textContent.trim() === 'Insert');
    const w = t.querySelector('.menubar-words');
    return { cut: w.scrollWidth > w.clientWidth + 1, tip: t.getAttribute('data-tooltip'), name: t.textContent.trim() };
  });
  await p.evaluate(() => document.documentElement.style.setProperty('--menubar-title-max', '2em'));
  const tipIs = want => p.waitForFunction(want => {
    const t = [...document.querySelectorAll('.menubar-front > .menubar-title')].find(x => x.textContent.trim() === 'Insert');
    return t.getAttribute('data-tooltip') === want;
  }, want, { timeout: 5000 }).catch(() => {});
  await p.setViewportSize({ width: 1900, height: 900 }); await tipIs('Insert');
  const cut = await read();
  await p.evaluate(() => document.documentElement.style.removeProperty('--menubar-title-max'));
  await p.setViewportSize({ width: 1920, height: 900 }); await tipIs(null);
  cut.after = (await read()).tip;
  check('a front title keeps its full-title tooltip before and after truncation', cut.cut && cut.tip === 'Insert' && cut.name === 'Insert' && cut.after === 'Insert', JSON.stringify(cut));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
