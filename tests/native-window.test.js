const { launch, ROOT, out } = require('./lib');
const assert = require('assert');
(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(ROOT + '/samples/native-window.html');
  await page.waitForFunction(() => window.nativeDemo && document.querySelector('.menubar-title'));
  assert(await page.locator('[data-native-chrome-slot]:visible').count() === 0, 'normal window hides generated controls');
  await page.locator('.menubar-title').filter({ hasText: 'Example app' }).click();
  await page.waitForSelector('#menubar-panel:popover-open');
  await page.evaluate(() => nativeDemo.update({ fullscreen: true }));
  await page.setViewportSize({ width: 390, height: 800 });
  await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
  assert(await page.evaluate(() => document.querySelector('.native-window-controls').getBoundingClientRect().right <= innerWidth), 'full-screen entry refits even with a site menu open');
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.evaluate(() => nativeDemo.update({ fullscreen: false }));
  await page.click('#fullscreen');
  await page.waitForSelector('.topbar.native-chrome');
  await page.focus('#working-text');
  const corners = () => page.evaluate(() => {
    const top = document.querySelector('.topbar').getBoundingClientRect(), menu = document.querySelector('.native-window-menu').getBoundingClientRect();
    const controls = document.querySelector('.native-window-controls').getBoundingClientRect(), close = document.querySelector('[data-native-action=close]').getBoundingClientRect();
    const toggle = document.querySelector('.menubar-ribbon-toggle').getBoundingClientRect();
    return Math.abs(top.left) < 1 && Math.abs(top.right - innerWidth) < 1 && menu.left === top.left && Math.abs(close.right - top.right) < 1 && controls.left >= toggle.right && menu.top === top.top && Math.abs(close.bottom - top.bottom) <= 1;
  });
  assert(await corners(), 'corners remain outside folding content');
  await page.click('[data-native-action=minimize]');
  await page.waitForFunction(() => document.querySelector('#native-log').textContent.includes('Minimize requested'));
  assert(await page.evaluate(() => document.activeElement.id === 'working-text'), 'native action restores content focus');
  assert(await page.locator('.native-chrome').count() === 1, 'callback completion does not infer host state');
  await page.click('.native-window-menu > button');
  await page.waitForSelector('.native-window-menu .menu-panel:popover-open');
  await page.evaluate(() => nativeDemo.update({ fullscreen: true, active: true }));
  assert(await page.locator('.native-window-menu .menu-panel:popover-open').count() === 1, 'identical host state leaves the native menu open');
  await page.screenshot({ path: out('native-window-wide.png') });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.native-window-menu .menu-panel').matches(':popover-open'));
  await page.uncheck('#can-close');
  assert(await page.locator('[data-native-action=close]').isDisabled(), 'capabilities disable native controls');
  await page.check('#can-close');
  await page.click('.menubar-ribbon-toggle');
  await page.waitForSelector('.menubar-ribbon-on');
  assert(await corners(), 'ribbon preserves corner geometry');
  await page.setViewportSize({ width: 390, height: 800 });
  await page.waitForFunction(() => document.querySelector('.menubar-collapsed') || document.documentElement.scrollWidth <= innerWidth);
  assert(await corners(), 'narrow ribbon keeps all native controls accessible');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'narrow topbar does not overflow');
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth && Math.abs(document.querySelector('.topbar').getBoundingClientRect().left) < 1);
  assert(await corners(), 'RTL keeps physical native corners');
  await page.screenshot({ path: out('native-window-narrow.png') });
  await page.click('[data-native-action=restore]');
  await page.waitForFunction(() => !document.querySelector('.native-chrome'));
  assert(await page.inputValue('#working-text') === 'This content stays mounted');

  await page.evaluate(() => {
    nativeDemo.destroy();
    window.calls = 0; window.nativeErrors = 0;
    document.querySelector('.topbar').addEventListener('pudl:native-error', () => window.nativeErrors++);
    window.nativeDemo = pudlNative.attach(document.querySelector('.topbar'), { state: { fullscreen: true }, actions: {
      minimize() { window.calls++; return new Promise(resolve => { window.finishNative = resolve; }); },
      restore() { throw new Error('Native failure'); }
    } });
    window.firstNative = nativeDemo.run('minimize'); window.secondNative = nativeDemo.run('minimize');
  });
  await page.waitForFunction(() => window.finishNative);
  assert(await page.evaluate(async () => window.calls === 1 && await window.secondNative === false), 'pending actions suppress duplicates');
  await page.evaluate(async () => { window.finishNative(); await window.firstNative; window.failedNative = await nativeDemo.run('restore'); });
  assert(await page.evaluate(() => window.failedNative === false && window.nativeErrors === 1), 'failure reports event and releases pending state');
  assert(await page.locator('[data-native-action=close]').isDisabled(), 'missing callbacks are unavailable');
  await page.evaluate(() => nativeDemo.focusMenu());
  await page.keyboard.press('ArrowDown');
  await page.waitForSelector('.native-window-menu .menu-panel:popover-open');
  await page.evaluate(() => nativeDemo.update({ fullscreen: false }));
  assert(await page.locator('.native-window-menu .menu-panel:popover-open').count() === 0, 'leaving full screen closes native menu');
  await page.evaluate(() => nativeDemo.destroy());
  assert(await page.locator('[data-native-chrome-slot]').count() === 0, 'destroy removes generated chrome');
  assert(await page.evaluate(async () => {
    let invoked = false;
    const instance = pudlNative.attach(document.querySelector('.topbar'), { state: { fullscreen: true }, actions: { close() { invoked = true; } } });
    const pending = instance.run('close'); instance.destroy();
    return await pending === false && !invoked;
  }), 'destroy discards an action before invocation');
  assert(await page.evaluate(() => {
    const instance = pudlNative.attach(document.querySelector('.topbar'));
    let rejected = false; try { instance.update({ fullscreen: 'false' }); } catch (e) { rejected = e instanceof TypeError; }
    instance.destroy(); return rejected;
  }), 'invalid host state does not enable controls');
  await page.setContent('<link rel="stylesheet" href="' + ROOT + '/dist/pudl.css"><script src="' + ROOT + '/dist/pudl-native.js"></script><script src="' + ROOT + '/dist/pudl-menu.js" defer></script><script src="' + ROOT + '/dist/pudl-menubar.js" defer></script><header class="topbar"><nav data-menubar data-menubar-ribbon><ul data-menubar-source hidden><li>App<ul><li><button>About</button></li></ul></li></ul></nav></header><script>window.early = pudlNative.attach(document.querySelector(".topbar"), {state:{fullscreen:true}});</script>');
  await page.waitForSelector('.menubar-ribbon-toggle');
  assert(await corners(), 'native attach before menu initialization preserves ordering');
  await page.evaluate(() => document.documentElement.dataset.theme = 'light');
  await page.screenshot({ path: out('native-window-light.png') });
  await page.emulateMedia({ media: 'print' });
  assert(await page.locator('[data-native-chrome-slot]:visible').count() === 0, 'native chrome is absent in print');
  assert.deepStrictEqual(errors, []);
  await browser.close(); console.log('PASS native host chrome');
})().catch(e => { console.log('FAIL ' + e.message + ' ' + e.stack); process.exit(1); });
