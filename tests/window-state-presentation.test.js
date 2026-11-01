/* Public state presentation stays consistent across every generated surface. */
const assert = require('node:assert/strict');
const { launch, ROOT, out } = require('./lib');

(async () => {
  const browser = await launch();
  try {
    const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const settle = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
    const mapping = { working: 'play', waiting: 'pause', idle: 'square', stuck: 'warning' };
    async function mark(selector, glyph) {
      const result = await p.locator(selector).first().evaluate((n, glyph) => {
        const s = getComputedStyle(n);
        return { mask: s.maskImage, expected: s.getPropertyValue('--glyph-' + glyph).trim(), animation: s.animationName, size: s.width };
      }, glyph);
      assert.equal(result.mask, result.expected, selector + ' uses ' + glyph);
      assert.equal(result.animation, 'none', selector + ' stays static');
      assert.equal(result.size, '16px', selector + ' keeps its compact size');
    }
    for (const motion of ['reduce', 'no-preference']) {
      await p.emulateMedia({ reducedMotion: motion });
      await p.goto(ROOT + '/tests/fixtures/taskbar-stacks.html?no-stacks');
      await p.waitForSelector('#all [data-win-tab="a1"]');
      await p.evaluate(() => document.querySelectorAll('.win').forEach(w => { w.removeAttribute('data-win-running'); w.removeAttribute('data-win-state'); }));
      for (const [state, glyph] of Object.entries(mapping)) {
        await p.evaluate(state => { document.querySelector('[data-win="a1"]').dataset.winState = state; }, state);
        await settle();
        await mark('[data-win="a1"] .win-execution .glyph', glyph);
        await mark('#all [data-win-tab="a1"] .win-state .glyph', glyph);
      }
      await p.evaluate(() => { const w = document.querySelector('[data-win="a1"]'); w.removeAttribute('data-win-state'); w.setAttribute('data-win-running', ''); });
      await settle(); await mark('#all [data-win-tab="a1"] .win-state .glyph', 'play');
      await p.evaluate(() => document.querySelector('[data-win-layer]').dataset.winTaskbarStacks = 'always');
      for (const [state, glyph] of Object.entries(mapping)) {
        await p.evaluate(state => document.querySelector('[data-win="a1"]').dataset.winState = state, state);
        await settle(); await mark('#all [data-win-stack="alpha"] .win-state .glyph', glyph);
        await p.locator('#all [data-win-stack="alpha"]').click();
        await mark('[data-stack-row="a1"] .win-state .glyph', glyph);
        await p.keyboard.press('Escape');
      }
      await p.evaluate(() => pudlWindows.dock('a1', 'left'));
      for (const [state, glyph] of Object.entries(mapping)) {
        await p.evaluate(state => document.querySelector('[data-win="a1"]').dataset.winState = state, state);
        await settle(); await mark('[data-dock-key="a1"] .win-state .glyph', glyph);
      }
    }
    await p.goto(ROOT + '/tests/fixtures/window-status.html?shared=1');
    await p.waitForSelector('[data-win="status"] .win-status-toggle', { state: 'attached' });
    const win = p.locator('[data-win="status"]');
    const popup = '.win-status-popover:popover-open';
    const set = value => win.evaluate((w, value) => { if (value === null) w.removeAttribute('data-win-state-title'); else w.setAttribute('data-win-state-title', value); }, value).then(settle);
    await p.evaluate(() => {
      const w = document.querySelector('[data-win="status"]'); w.dataset.winState = 'working'; w.dataset.winStatusRows = '3';
      pudlWindows.retitle('status', 'Long conversation title requiring a folded status group '.repeat(4));
      w.querySelector('.win-body input').value = 'Kept edit';
      const chip = w.querySelector('.win-status:not(.win-execution)');
      const icon = document.createElement('span'); icon.className = 'glyph'; icon.style.setProperty('--glyph', 'var(--glyph-play)'); chip.prepend(icon);
    });
    await settle();
    const baseline = await win.boundingBox();
    const body = await win.locator('.win-body').elementHandle();
    for (const value of ['', 'unknown', null]) {
      await set(value);
      assert.equal(await win.locator('.win-execution').getAttribute('hidden'), null, 'default chip remains for ' + value);
    }
    await win.locator('.win-status-toggle').click();
    const url = p.url();
    for (const motion of ['reduce', 'no-preference']) {
      await p.emulateMedia({ reducedMotion: motion });
      for (const [state, glyph] of Object.entries(mapping)) {
        await win.evaluate((w, state) => w.dataset.winState = state, state); await settle();
        await mark(popup + ' .win-state .glyph', glyph);
      }
    }
    await p.locator(popup + ' .win-status-rows').evaluate(n => { n.id = 'persistent-status-region'; });
    await set('none');
    assert.equal(await win.locator('.win-execution').getAttribute('hidden'), '');
    assert.equal(await p.locator(popup + ' .win-execution-row').count(), 0);
    assert.equal(await p.locator(popup + ' li').count(), 3, 'host chips remain');
    assert.equal(await p.locator(popup + ' li .glyph').count(), 1, 'host glyph remains');
    assert.equal(await p.locator(popup).getAttribute('data-win-status-rows'), '3');
    assert.equal(await p.evaluate(() => document.activeElement.id), 'persistent-status-region');
    await set(null);
    assert.equal(await p.locator(popup + ' .win-execution-row').count(), 1);
    assert.equal(await p.locator(popup + ' li').count(), 4);
    await p.keyboard.press('Escape');
    await set('none');
    const chrome = await win.locator('.win-chrome').boundingBox();
    for (const state of Object.keys(mapping)) { await win.evaluate((w, state) => w.dataset.winState = state, state); await settle(); assert.deepEqual(await win.locator('.win-chrome').boundingBox(), chrome); }
    assert.deepEqual(await win.boundingBox(), baseline);
    assert.equal(p.url(), url);
    assert.equal(await body.evaluate(n => n === document.querySelector('[data-win="status"] .win-body')), true);
    assert.equal(await win.locator('input').inputValue(), 'Kept edit');
    await p.evaluate(() => pudlWindows.dock('status', 'left')); await settle();
    await p.locator('[data-dock-key="status"]').click({ button: 'right' });
    await p.locator('.context-menu:popover-open').getByRole('menuitem', { name: 'Window status', exact: true }).click();
    assert.equal(await p.locator(popup + ' .win-execution-row').count(), 0);
    await set(null); assert.equal(await p.locator(popup + ' .win-execution-row').count(), 1);
    await set('none'); assert.equal(await p.locator(popup + ' .win-execution-row').count(), 0);
    await mark('[data-dock-key="status"] .win-state .glyph', 'warning');
    await win.locator('.win-statuses').evaluate(g => g.querySelectorAll(':scope > .win-status:not(.win-execution)').forEach(n => n.remove())); await settle();
    assert.equal(await p.locator(popup).count(), 0, 'empty suppressed popup closes');
    assert.equal(await p.locator('[data-dock-key="status"]').evaluate(n => n === document.activeElement), true);
    assert.equal(await win.locator('.win-statuses').getAttribute('hidden'), '');
    const replacement = value => '<section class="win" data-win="status" data-win-state="working"' + (value ? ' data-win-state-title="none"' : '') + '><header class="win-head"><h2 class="win-title">Agent</h2><div class="win-statuses"><span class="win-status">Host working</span></div></header><div class="win-body">Replacement</div></section>';
    await p.evaluate(markup => pudlWindows.update('status', markup), replacement(true)); await settle();
    assert.equal(await win.getAttribute('data-win-state-title'), 'none');
    await p.evaluate(markup => pudlWindows.update('status', markup), replacement(false)); await settle();
    assert.equal(await win.getAttribute('data-win-state-title'), null);
    await mark('[data-dock-key="status"] .win-state .glyph', 'play');
    await p.route('**/tests/fixtures/window-status.html?initial-suppression', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('data-win="status"', 'data-win="status" data-win-state="working" data-win-state-title="none"') });
    });
    await p.goto(ROOT + '/tests/fixtures/window-status.html?initial-suppression');
    await p.waitForSelector('[data-win="status"] .win-execution', { state: 'attached' });
    await settle();
    assert.equal(await win.locator('.win-execution').isVisible(), false, 'suppression applies during window setup');
    assert.equal(await win.locator('.win-status:not(.win-execution)').count(), 3);
    await set(null);
    await mark('[data-win="status"] .win-execution .glyph', 'play');
    await p.screenshot({ path: out('window-state-presentation.png') });
    assert.deepEqual(errors, []);
    console.log('PASS static glyph mapping on every surface and public title suppression');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
