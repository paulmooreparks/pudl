/* A stack is a button and an ordinary taskbar entry is a link, so they take
   their line height from different places. Every entry in one taskbar row
   must still be the same height, whatever the skin, theme, execution state,
   text size and width, and across the switch between stacks and windows. */
const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');

(async () => {
  const browser = await launch();
  let failures = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    async function load() {
      await page.goto(ROOT + '/tests/fixtures/taskbar-stacks-full.html');
      await page.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.includes('child'));
      await settle();
    }
    async function width(value) {
      await page.evaluate(value => { document.getElementById('probe-bar').style.width = value + 'px'; }, value);
      await settle();
    }
    /* The heights of the entries that are showing, with what kind each is. */
    const rows = () => page.locator('#probe').evaluate(dock => Array.from(dock.children)
      .filter(node => node.classList.contains('win-tab') && node.getClientRects().length && node.getBoundingClientRect().height > 0)
      .map(node => ({ kind: node.hasAttribute('data-win-stack') ? 'stack' : 'window', height: node.getBoundingClientRect().height })));
    async function equalRow(label, expectKinds) {
      const found = await rows();
      const kinds = new Set(found.map(entry => entry.kind));
      for (const kind of expectKinds) assert(kinds.has(kind), label + ': the row shows a ' + kind + ' ' + JSON.stringify(found));
      const heights = found.map(entry => entry.height);
      assert(Math.max(...heights) - Math.min(...heights) < 0.5, label + ': entries differ in height ' + JSON.stringify(found));
      return heights[0];
    }
    async function scenario(name, action) {
      try { await load(); await action(); console.log('PASS ' + name); }
      catch (error) { failures++; console.error('FAIL ' + name, error); }
    }
    const states = () => page.evaluate(() => {
      const set = { a1: 'working', b1: 'waiting', a2: 'stuck', b2: 'idle' };
      Object.keys(set).forEach(key => document.querySelector('[data-win="' + key + '"]').setAttribute('data-win-state', set[key]));
    });

    await scenario('stacks and ordinary entries are one height at the default size', async () => {
      await width(1250);
      const ordinary = await equalRow('separate', ['window']);
      await width(560);
      assert.equal(await equalRow('stacked', ['stack', 'window']), ordinary, 'stacking does not change the row height');
    });
    await scenario('the row keeps its height as the layout switches between windows and stacks', async () => {
      const seen = new Set();
      for (const value of [1250, 560, 1250, 560, 1250]) { await width(value); seen.add(Math.round((await equalRow('width ' + value, [])) * 10)); }
      assert.equal(seen.size, 1, 'one height throughout: ' + [...seen]);
    });
    for (const skin of ['standard', 'bevel', 'gel', 'glaze']) {
      for (const theme of ['light', 'dark']) {
        await scenario(skin + ' ' + theme + ' with execution states', async () => {
          if (skin !== 'standard') await page.addStyleTag({ url: ROOT + '/dist/pudl-skin-' + skin + '.css' });
          await page.evaluate(({ skin, theme }) => { document.documentElement.dataset.skin = skin; document.documentElement.dataset.theme = theme; }, { skin, theme });
          await states();
          await width(1250);
          const ordinary = await equalRow('separate', ['window']);
          await width(560);
          assert.equal(await equalRow('stacked', ['stack', 'window']), ordinary);
        });
      }
    }
    await scenario('enlarged text keeps stacks and windows level without clipping', async () => {
      await page.evaluate(() => { document.documentElement.style.fontSize = '150%'; });
      await states();
      await width(1250);
      const ordinary = await equalRow('separate', ['window']);
      await width(560);
      assert.equal(await equalRow('stacked', ['stack', 'window']), ordinary);
      assert.equal(await page.locator('#probe').evaluate(dock => Array.from(dock.children).every(node => node.scrollHeight <= node.clientHeight + 1)), true, 'no entry clips its content');
    });
    await scenario('a narrow layout keeps stacks and windows level', async () => {
      await page.setViewportSize({ width: 520, height: 900 });
      await width(500);
      await equalRow('narrow separate', []);
      await page.evaluate(() => { document.querySelector('[data-win-layer]').setAttribute('data-win-taskbar-stacks', 'full'); });
      await width(300);
      await equalRow('narrow', ['stack']);
    });
    await scenario('a docked window is the same height as its neighbours', async () => {
      await page.evaluate(() => pudlWindows.dock('a3', 'left'));
      await settle();
      await width(1250);
      const ordinary = await equalRow('separate', ['window']);
      await width(560);
      assert.equal(await equalRow('stacked', ['stack']), ordinary);
    });
    assert.equal(failures, 0, 'every scenario must pass');
    assert.deepEqual(errors, [], 'no browser errors');
    console.log('ALL PASSED');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
