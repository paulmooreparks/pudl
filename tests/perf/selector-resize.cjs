// Run against a static checkout server through PUDL_ROOT. This diagnostic
// wraps selector calls in the page; its timings are not unbiased wall times.
const { chromium } = require('playwright');
const { ROOT } = require('../lib');
const { execFileSync } = require('child_process');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const baselineMenu = process.argv.includes('--baseline-menu');
  if (baselineMenu) {
    const body = execFileSync('git', ['show', 'v0.83.1:dist/pudl-menu.js'], { cwd: path.resolve(__dirname, '../..') });
    await page.route('**/dist/pudl-menu.js', route => route.fulfill({ body, contentType: 'application/javascript' }));
  }
  await page.goto(ROOT + '/tests/fixtures/split-docks.html');
  await page.waitForSelector('[data-win="e"]');
  await page.evaluate(() => {
    const zones = { a: 'top-left', b: 'top-right', c: 'bottom-left', d: 'bottom-right' };
    for (const key of Object.keys(zones)) pudlWindows.snap(key, zones[key]);
    for (const body of document.querySelectorAll('.win-body')) {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < 4200; i++) {
        const row = document.createElement('section');
        row.innerHTML = '<header><span>Message</span><time>Today</time></header><p>Some text with <strong>emphasis</strong> and <code>commands</code>.</p><pre>command</pre><footer>Done</footer>';
        fragment.appendChild(row);
      }
      body.appendChild(fragment);
    }
  });
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await settle();
  await page.evaluate(() => {
    window.selectorStats = {};
    for (const prototype of [Element.prototype, Document.prototype]) {
      for (const method of ['querySelector', 'querySelectorAll']) {
        const original = prototype[method];
        prototype[method] = function (selector) {
          const start = performance.now();
          const result = original.call(this, selector);
          const ms = performance.now() - start;
          const key = method + ' ' + selector;
          const entry = window.selectorStats[key] || (window.selectorStats[key] = { ms: 0, count: 0, stack: '' });
          entry.ms += ms; entry.count++;
          if (ms > .5 && !entry.stack) entry.stack = new Error().stack;
          return result;
        };
      }
    }
  });
  for (let i = 0; i < 24; i++) {
    await page.setViewportSize({ width: 1920 - i * 18, height: 1080 - i * 8 });
    await settle();
  }
  const result = await page.evaluate(() => ({ nodes: document.getElementsByTagName('*').length, selectors: Object.entries(window.selectorStats).sort((a, b) => b[1].ms - a[1].ms).slice(0, 15) }));
  console.log(JSON.stringify({ baselineMenu, ...result }, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
