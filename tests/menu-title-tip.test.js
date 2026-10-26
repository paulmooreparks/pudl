/* A tooltip never covers a menu its control has opened, and a menu title
   showing its words gets no tooltip repeating them; a folded title, showing
   only its glyph, still does. */
const { launch, ROOT } = require('./lib');
const assert = require('assert/strict');
(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 2400, height: 900 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/samples/menu-ribbon.html');
  await p.waitForFunction(() => window.pudlMenubar && document.querySelector('.menubar-title'));
  const tipOpen = () => p.evaluate(() => !!document.querySelector('.tooltip:popover-open'));
  const settle = () => p.waitForTimeout(700);
  const title = p.locator('.menubar-row .menubar-title').filter({ hasText: 'Window' }).first();
  await title.waitFor();

  await title.hover(); await settle();
  assert.equal(await tipOpen(), false, 'a title showing its words has no tooltip');

  await title.click(); await settle();
  assert.equal(await title.getAttribute('aria-expanded'), 'true');
  assert.equal(await tipOpen(), false, 'no tooltip over an open menu, pointer');
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape');

  await p.mouse.move(10, 880);
  await title.focus(); await p.keyboard.press('Enter'); await settle();
  assert.equal(await tipOpen(), false, 'no tooltip over an open menu, keyboard');
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape');

  /* A menu opening while a tooltip shows takes it away. */
  await p.evaluate(() => { const b = document.createElement('button'); b.className = 'icon-btn'; b.id = 'probe'; b.setAttribute('aria-label', 'Probe'); document.body.append(b); });
  await p.hover('#probe'); await p.waitForSelector('.tooltip:popover-open');
  await title.click(); await settle();
  assert.equal(await tipOpen(), false, 'opening a menu hides a showing tooltip');
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape');

  /* Folded to its glyph, a title still has its tooltip. */
  let folded = false;
  for (let width = 1400; width >= 500 && !folded; width -= 50) {
    await p.setViewportSize({ width, height: 900 });
    await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    folded = await p.evaluate(() => {
      const t = [...document.querySelectorAll('.menubar-row .menubar-title')].find(t => t.offsetParent && t.getAttribute('data-tooltip') && !t.innerText.trim());
      if (t) t.id = 'folded-title';
      return !!t;
    });
  }
  assert.ok(folded, 'some title folds to its glyph');
  const glyphOnly = p.locator('#folded-title');
  await p.mouse.move(10, 880); await settle();
  await glyphOnly.hover();
  await p.waitForSelector('.tooltip:popover-open');

  assert.deepEqual(errors, []);
  await browser.close();
  console.log('PASS menu title tooltips');
})().catch(e => { console.error('FAIL ' + e.stack.split('\n').filter(l => l.includes('.test.js:')).join(' ') + ' ' + e.message.slice(0, 300).replace(/\n/g, ' ')); process.exit(1); });
