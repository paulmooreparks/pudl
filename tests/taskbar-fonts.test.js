const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');

(async () => {
  const browser = await launch();
  let releaseFonts;
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
    await page.addInitScript(() => {
      const listen = FontFaceSet.prototype.addEventListener;
      FontFaceSet.prototype.addEventListener = function (type, ...args) {
        if (type !== 'loadingdone') return listen.call(this, type, ...args);
      };
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(ROOT + '/samples/skins.html?skin=standard');
    await page.evaluate(async () => {
      await document.fonts.ready;
      document.documentElement.style.setProperty('--font', 'monospace');
      window.dispatchEvent(new Event('resize'));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await page.waitForFunction(() => {
      const tab = document.querySelector('.win-bar [aria-current="true"]');
      return tab && parseFloat(tab.style.getPropertyValue('--win-tab-natural')) > 0;
    });
    const lateGate = new Promise(resolve => { releaseFonts = resolve; });
    await page.route('**/Inter-latin.woff2?late=1', async route => { await lateGate; await route.continue(); });
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = '@font-face { font-family: "LateTaskbarInter"; src: url("/dist/fonts/Inter-latin.woff2?late=1") format("woff2"); font-weight: 400 900; font-display: swap; }';
      document.head.appendChild(style);
      document.documentElement.style.setProperty('--font', '"LateTaskbarInter", monospace');
      window.dispatchEvent(new Event('resize'));
    });
    await page.waitForFunction(() => document.fonts.status === 'loading');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const fallback = await page.locator('.win-bar [aria-current="true"]').evaluate(tab => parseFloat(tab.style.getPropertyValue('--win-tab-natural')));
    releaseFonts();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const loaded = await page.locator('.win-bar [aria-current="true"]').evaluate(tab => {
      const dock = tab.parentElement, cached = parseFloat(tab.style.getPropertyValue('--win-tab-natural'));
      dock.setAttribute('data-win-dock-measure', '');
      const natural = tab.getBoundingClientRect().width;
      dock.removeAttribute('data-win-dock-measure');
      return { cached, natural };
    });
    assert(Math.abs(fallback - loaded.natural) > 1, 'a later font cycle changes text geometry');
    assert(Math.abs(loaded.cached - loaded.natural) < 0.1, 'later ready promises refresh widths without loadingdone');
    const width = await page.locator('.win-bar [aria-current="true"]').evaluate(tab => tab.getBoundingClientRect().width);
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.locator('.win-bar [aria-current="true"]').evaluate(tab => tab.getBoundingClientRect().width), width, 'remeasurement preserves settled width');
    assert.deepEqual(errors, []);
    console.log('PASS a later CSS font updates taskbar widths without loadingdone');
  } finally { if (releaseFonts) releaseFonts(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
