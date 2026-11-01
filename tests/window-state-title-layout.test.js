const assert = require('node:assert/strict');
const { launch, ROOT, out } = require('./lib');

(async () => {
  const browser = await launch();
  try {
    const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await p.goto(ROOT + '/tests/fixtures/window-status.html');
    await p.waitForSelector('[data-win="status"] .win-execution', { state: 'attached' });
    const settle = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
    for (const skin of ['standard', 'bevel', 'gel', 'glaze', 'matte', 'ink', 'alloy', 'glass']) {
      if (skin !== 'standard') await p.addStyleTag({ url: ROOT + '/dist/pudl-skin-' + skin + '.css' });
      for (const theme of ['light', 'dark']) {
        await p.evaluate(({ skin, theme }) => { document.documentElement.dataset.skin = skin; document.documentElement.dataset.theme = theme; }, { skin, theme });
        for (const scale of ['100%', '200%']) {
          await p.evaluate(scale => {
            document.documentElement.style.fontSize = scale;
            const w = document.querySelector('[data-win="status"]');
            w.dataset.winState = 'working'; w.removeAttribute('data-win-state-title');
          }, scale); await settle();
          const group = p.locator('[data-win="status"] .win-statuses');
          const full = await group.boundingBox();
          await p.evaluate(() => document.querySelector('[data-win="status"]').dataset.winStateTitle = 'none'); await settle();
          const suppressed = await group.boundingBox();
          /* A folded group has only its toggle; an unfolded group frees the chip. */
          if (await group.getAttribute('data-win-status-compact') === null) assert(full.width - suppressed.width >= 24, skin + ' ' + theme + ' frees the title slot');
          const snapshot = () => p.locator('[data-win="status"]').evaluate(w => [w, w.querySelector('.win-chrome'), w.querySelector('.win-statuses')].map(n => { const r = n.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
          const before = await snapshot();
          for (const state of ['working', 'waiting', 'idle', 'stuck', '']) {
            await p.evaluate(state => { const w = document.querySelector('[data-win="status"]'); if (state) w.dataset.winState = state; else w.removeAttribute('data-win-state'); }, state); await settle();
            assert.deepEqual(await snapshot(), before, skin + ' ' + theme + ' ' + scale + ' keeps suppressed geometry stable');
          }
        }
      }
    }
    await p.setViewportSize({ width: 520, height: 900 });
    await p.evaluate(() => { const w = document.querySelector('[data-win="status"]'); w.dataset.winState = 'working'; w.dataset.winStateTitle = 'none'; }); await settle();
    assert.equal(await p.locator('[data-win="status"] .win-execution').isVisible(), false);
    await p.screenshot({ path: out('window-state-title-narrow.png') });
    await p.setViewportSize({ width: 1400, height: 900 });
    await p.goto(ROOT + '/tests/fixtures/taskbar-stacks.html?no-stacks');
    await p.waitForSelector('#all [data-win-tab="a1"]');
    await p.evaluate(() => {
      const states = { a1: 'working', b1: 'waiting', a2: 'idle', b2: 'stuck' };
      document.querySelectorAll('.win').forEach(w => { w.removeAttribute('data-win-attention'); w.removeAttribute('data-win-running'); const state = states[w.dataset.win]; if (state) w.dataset.winState = state; });
    });
    for (const skin of ['standard', 'bevel', 'gel', 'glaze', 'matte', 'ink', 'alloy', 'glass']) {
      if (skin !== 'standard') await p.addStyleTag({ url: ROOT + '/dist/pudl-skin-' + skin + '.css' });
      for (const theme of ['light', 'dark']) {
        await p.evaluate(({ skin, theme }) => { document.documentElement.dataset.skin = skin; document.documentElement.dataset.theme = theme; }, { skin, theme }); await settle();
        await p.locator('#all').screenshot({ path: out('execution-glyphs-' + skin + '-' + theme + '-' + (process.env.PUDL_MIN === '1' ? 'min' : 'normal') + '.png') });
      }
    }
    console.log('PASS title slot removal and stable state geometry across admitted skins, palettes and enlarged text');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
