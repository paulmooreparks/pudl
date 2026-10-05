/* The menu bar's pins group (from parkscomputing.com's proposal of
   2026-10-05): between the site's group and the applet's, the Pins menu
   and a button for each pinned item, giving way all together to an Items
   menu when they do not fit. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : ''));
  if (!ok) failures++;
}
(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1500, height: 800 } });
  const errors = [], warnings = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto(ROOT + '/tests/fixtures/menubar-pins.html');
  await p.waitForFunction(() => document.querySelectorAll('[data-applet-state="running"]').length === 2);
  await p.evaluate(() => {
    /* The host opens a pin its own way, and names what is in front as the
       Pins menu opens. */
    document.querySelector('[data-menubar-pins]').addEventListener('click', e => {
      const a = e.target.closest('a');
      if (a) { e.preventDefault(); __log.push('open ' + a.id); }
    });
    document.querySelector('#pin-front').addEventListener('click', () => __log.push('pin front'));
    document.querySelector('[data-menubar-pins]').addEventListener('pudl:pins-menu', () => {
      document.querySelector('#pin-front').textContent = 'Pin “' + document.querySelector('.win.is-active .win-title, .win .win-title').textContent + '”';
      __log.push('pins-menu');
    });
    pudlWindows.raise('notes');
    pudlMenubar.refresh();
  });

  const groups = await p.$$eval('.menubar-row > .menubar-menu:not(.menubar-one)', gs => gs.map(g => g.getAttribute('aria-label')));
  check('the pins group stands between the site group and the applet group', groups.join('|') === 'Parks Computing|Pins|Notes', groups.join('|'));

  const pins = p.locator('.menubar-pins .menubar-pin');
  const shown = await pins.evaluateAll(as => as.map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href'), role: a.getAttribute('role'), icon: !!a.querySelector('img, .glyph') })));
  check('each pin is a link in the bar, with its icon and title', shown.length === 2 && shown[0].text === 'About' && shown[0].href === '#about-page' && shown[1].text === 'Terminal' &&
    shown.every(s => s.role === 'menuitem' && s.icon), JSON.stringify(shown));
  const glyph = await p.$eval('.menubar-pins > .menubar-glyph', g => getComputedStyle(g, '::before').maskImage || getComputedStyle(g, '::before').webkitMaskImage);
  check('the group is marked by the pin glyph', /svg/.test(glyph) && glyph.includes('13.5'), glyph.slice(0, 60));
  check('Items stays hidden while the pins fit', await p.locator('.menubar-pins-more').isHidden());

  await pins.first().click();
  check('a plain press presses the host\'s link, so the host opens the item', await p.evaluate(() => __log.includes('open pin-about')));
  check('and the browser does not follow the link itself', !p.url().includes('#about-page'), p.url());

  /* The Pins menu: the host names what is in front as it opens. */
  await p.locator('.menubar-pins .menubar-title').first().click();
  const row = p.locator('#menubar-panel .menu-action').first();
  check('the Pins menu sends pudl:pins-menu before it is read', await p.evaluate(() => __log.includes('pins-menu')) && (await row.textContent()).includes('Notes'), await row.textContent());
  await row.click();
  check('a Pins command presses the host\'s button', await p.evaluate(() => __log.includes('pin front')));

  /* The keyboard: the arrows reach the pins, and Space opens one. */
  await p.locator('.menubar-pins .menubar-title').first().focus();
  await p.keyboard.press('ArrowRight');
  check('ArrowRight moves from the Pins menu to the first pin', await p.evaluate(() => document.activeElement.classList.contains('menubar-pin') && document.activeElement.textContent.trim() === 'About'));
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press(' ');
  check('Space on a pin opens it', await p.evaluate(() => __log.includes('open pin-terminal')));
  await p.locator('.menubar-pins .menubar-title').first().focus();
  await p.keyboard.press('Enter');
  await p.keyboard.press('ArrowRight');
  const to = await p.evaluate(() => ({ panel: document.getElementById('menubar-panel').getAttribute('aria-labelledby'), title: document.querySelector('.menubar-front .menubar-title').id }));
  check('from the open Pins menu, ArrowRight opens the next menu, past the pins', to.panel === to.title, JSON.stringify(to));
  await p.keyboard.press('Escape');

  /* The host adds a pin; the bar follows. */
  await p.evaluate(() => {
    const li = document.createElement('li');
    li.innerHTML = '<a href="#guide-page" id="pin-guide"><span class="glyph" style="--glyph: var(--glyph-document)" aria-hidden="true"></span> A guide with a long title</a>';
    document.querySelector('[data-menubar-pins]').appendChild(li);
  });
  await p.waitForFunction(() => document.querySelectorAll('.menubar-pins .menubar-pin').length === 3);
  check('a pin the host adds appears in the bar', true);

  /* Narrower: first the pins give way to Items, all together. */
  let middle = 0;
  for (let w = 1500; w >= 400; w -= 10) {
    await p.setViewportSize({ width: w, height: 800 });
    await p.waitForTimeout(30);
    const state = await p.$eval('.menubar-row', r => r.classList.contains('menubar-collapsed') ? 2 : r.classList.contains('menubar-pins-collapsed') ? 1 : 0);
    if (state === 1) { middle = w; break; }
    if (state === 2) break;
  }
  check('before the bar collapses, the pins give way to Items', middle > 0, 'at ' + middle + 'px');
  const visiblePins = await pins.evaluateAll(as => as.filter(a => a.offsetParent !== null).length);
  check('they give way all together, never some of them', visiblePins === 0, String(visiblePins));
  await p.locator('.menubar-pins-more').click();
  const items = await p.locator('#menubar-panel .menu-action').evaluateAll(rs => rs.map(r => ({ text: r.textContent.trim(), tag: r.tagName, icon: !!r.querySelector('.menubar-icon') })));
  check('Items lists every pin, as links with their icons', items.map(i => i.text).join('|') === 'About|Terminal|A guide with a long title' && items.every(i => i.tag === 'A' && i.icon), JSON.stringify(items));
  await p.locator('#menubar-panel .menu-action').nth(2).click();
  check('choosing one from Items opens it the host\'s way', await p.evaluate(() => __log.includes('open pin-guide')));

  /* A phone: the bar is one menu, and its panel has the Pins section, with
     the commands and then the pins. */
  await p.setViewportSize({ width: 360, height: 700 });
  await p.waitForFunction(() => document.querySelector('.menubar-row').classList.contains('menubar-collapsed'));
  await p.locator('.menubar-one .menubar-title').click();
  const section = await p.$eval('#menubar-panel', panel => {
    const out = []; let inPins = false;
    for (const n of panel.children) {
      if (n.classList.contains('md-section-label')) { inPins = n.textContent === 'Pins'; continue; }
      if (inPins && n.classList.contains('menu-action')) out.push(n.textContent.trim());
    }
    return out;
  });
  check('the collapsed bar lists the Pins commands, then the pins', section.length === 4 && section[0].startsWith('Pin “') && section.slice(1).join('|') === 'About|Terminal|A guide with a long title', section.join('|'));
  await p.keyboard.press('Escape');

  /* With nothing pinned, the Pins menu still stands, alone. */
  await p.setViewportSize({ width: 1500, height: 800 });
  await p.evaluate(() => document.querySelectorAll('[data-menubar-pins] > li:not(:first-child)').forEach(li => li.remove()));
  await p.waitForFunction(() => document.querySelectorAll('.menubar-pins .menubar-pin').length === 0);
  check('an empty pins group keeps its Pins menu, and no Items', await p.locator('.menubar-pins .menubar-title').count() === 1 && await p.locator('.menubar-pins .menubar-title').isVisible());

  check('no warnings', !warnings.some(w => w.includes('pin')), warnings.join(' | '));
  check('no errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
