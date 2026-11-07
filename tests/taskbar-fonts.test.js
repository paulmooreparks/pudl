const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');

(async () => {
  const browser = await launch();
  let releaseFonts;
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const fontGate = new Promise(resolve => { releaseFonts = resolve; });
    await page.route('**/*.woff2', async route => { await fontGate; await route.continue(); });
    await page.goto(ROOT + '/samples/skins.html?skin=standard', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const tab = document.querySelector('.win-bar [aria-current="true"]');
      return tab && parseFloat(tab.style.getPropertyValue('--win-tab-natural')) > 0 && document.fonts.status === 'loading';
    });
    const initial = await page.locator('.win-bar [aria-current="true"]').evaluate(tab => parseFloat(tab.style.getPropertyValue('--win-tab-natural')));
    releaseFonts();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const measured = await page.locator('.win-bar [aria-current="true"]').evaluate(tab => {
      const dock = tab.parentElement, cached = parseFloat(tab.style.getPropertyValue('--win-tab-natural'));
      dock.setAttribute('data-win-dock-measure', '');
      const natural = tab.getBoundingClientRect().width;
      dock.removeAttribute('data-win-dock-measure');
      return { cached, natural, width: tab.getBoundingClientRect().width };
    });
    assert(Math.abs(initial - measured.natural) > 1, 'the delayed font changes the natural entry width');
    assert(Math.abs(measured.cached - measured.natural) < 0.1, 'font completion invalidates cached taskbar widths');
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.locator('.win-bar [aria-current="true"]').evaluate(tab => tab.getBoundingClientRect().width), measured.width, 'remeasurement preserves settled width');
    assert.deepEqual(errors, []);
    console.log('PASS delayed fonts update natural taskbar widths before later layout');
  } finally { releaseFonts(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
