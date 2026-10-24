// Run with PUDL_ROOT pointing to a static server for this checkout.
// Timings describe this synthetic workload and are not pass/fail thresholds.
const { chromium } = require('playwright');
const { ROOT } = require('../lib');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  await page.goto(ROOT + '/tests/fixtures/split-docks.html');
  await page.waitForSelector('[data-win="e"]');
  await page.evaluate(() => {
    for (const key of ['a', 'b', 'c', 'd']) {
      pudlWindows.dock(key, key < 'c' ? 'left' : 'right', key === 'b' || key === 'd' ? { group: 'main', position: 'after' } : undefined);
    }
    for (const body of document.querySelectorAll('.win-body')) {
      for (let i = 0; i < 600; i++) {
        const message = document.createElement('section');
        message.className = 'profile-message';
        message.innerHTML = '<h3>Message ' + i + '</h3><p>' + 'A long conversation with wrapping text and inline commands. '.repeat(12) + '</p><pre>command --argument value</pre>';
        body.appendChild(message);
      }
    }
  });
  const session = await page.context().newCDPSession(page);
  await session.send('Performance.enable');
  for (const mode of ['baseline', 'contained', 'skip-offscreen']) {
    if (mode === 'contained') await page.addStyleTag({ content: '.win-body { contain: layout style; }' });
    if (mode === 'skip-offscreen') await page.addStyleTag({ content: '.profile-message { content-visibility: auto; contain-intrinsic-size: auto 200px; }' });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const before = (await session.send('Performance.getMetrics')).metrics;
    const start = performance.now();
    for (let i = 0; i < 24; i++) {
      await page.setViewportSize({ width: 1800 - i * 18, height: 1000 - i * 8 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    }
    const after = (await session.send('Performance.getMetrics')).metrics;
    const delta = name => Math.round(1000 * (after.find(metric => metric.name === name).value - before.find(metric => metric.name === name).value));
    console.log(JSON.stringify({ mode, wallMs: Math.round(performance.now() - start), layoutMs: delta('LayoutDuration'), styleMs: delta('RecalcStyleDuration'), scriptMs: delta('ScriptDuration') }));
    await page.setViewportSize({ width: 1800, height: 1000 });
  }
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
