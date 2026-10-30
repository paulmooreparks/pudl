'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const pw = require('playwright');
for (const engine of (process.env.PUDL_BROWSER ? [process.env.PUDL_BROWSER] : ['chromium', 'firefox', 'webkit'])) test(engine + ' host-owned appearance never accesses storage', async () => {
  const browser = await pw[engine].launch();
  try {
    let page = await browser.newPage();
    await page.setContent('<html data-pudl-persistence="host" data-theme="light" data-skin="gel"><input value="keep"></html>');
    await page.evaluate(() => {
      window.storageCalls = 0;
      Object.defineProperty(window, 'localStorage', { get() { window.storageCalls++; throw new Error('Host owns persistence'); } });
    });
    for (const file of ['pudl-theme.js', 'pudl-skins.js']) await page.addScriptTag({content:fs.readFileSync((process.env.PUDL_MIN ? 'dist/min/' : 'dist/') + file, 'utf8')});
    const result = await page.evaluate(() => {
      const initial = { theme: pudlThemePreference(), skin: pudlSkins.preference() };
      pudlSetTheme('dark'); pudlSkins.select('bevel');
      window.dispatchEvent(new StorageEvent('storage', {key:'pudl-theme',newValue:'light'}));
      window.dispatchEvent(new StorageEvent('storage', {key:'pudl-skin',newValue:'standard'}));
      return { initial, theme: pudlThemePreference(), skin: pudlSkins.preference(), effective:pudlSkins.current(), calls:window.storageCalls };
    });
    assert.deepEqual(result,{initial:{theme:'light',skin:'gel'},theme:'dark',skin:'bevel',effective:'standard',calls:0});
    await page.close();
    page = await browser.newPage();
    await page.setContent('<html data-pudl-persistence="host" data-skin="gel"><input value="keep"></html>');
    await page.evaluate(async () => {
      window.bootEvents = [];
      document.addEventListener('pudl:skin-change', event => window.bootEvents.push(event.detail.skin));
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.dataset.pudlSkin = 'gel';
      link.href = 'data:text/css,:root[data-skin="gel"]{--boot-probe:1}';
      const loaded = new Promise((resolve, reject) => {link.onload=resolve;link.onerror=reject;});
      document.head.appendChild(link); await loaded;
    });
    await page.addScriptTag({content:fs.readFileSync((process.env.PUDL_MIN ? 'dist/min/' : 'dist/') + 'pudl-skins.js','utf8')});
    assert.deepEqual(await page.evaluate(() => ({skin:pudlSkins.current(),events:window.bootEvents})), {skin:'gel',events:['gel']});
  } finally {await browser.close();}
});
