const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(ROOT + '/samples/markup-menu-choices.html');
    await page.waitForSelector('.menubar-ready');
    await page.evaluate(() => {
      window.choices = []; window.legacy = 0;
      document.addEventListener('pudl:menu-choose', e => choices.push({ value: e.detail.value, button: e.detail.button.value, target: e.target.id, canceled: e.defaultPrevented }));
      document.getElementById('theme-choices').addEventListener('click', () => legacy++);
    });
    await page.locator('[data-menu-id="appearance"]').click();
    await page.getByRole('menuitemradio', { name: 'Dark', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.deepEqual(await page.evaluate(() => choices), [{ value: 'dark', button: 'dark', target: 'theme-choices', canceled: true }]);
    assert.equal(await page.evaluate(() => legacy), 0);
    await page.locator('[data-menu-id="appearance"]').focus();
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('End'); await page.keyboard.press('Enter');
    assert.equal(await page.locator('html').getAttribute('data-theme'), null);
    await page.locator('.menubar-ribbon-toggle').click();
    await page.locator('[data-menu-id="appearance"]').click();
    await page.locator('#menubar-ribbon-row').getByRole('button', { name: 'Light', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    // Unknown values pass through unchanged to the host, with one legacy click.
    await page.evaluate(() => {
      const row = document.createElement('li');
      const button = document.createElement('button');
      button.value = "quoted'\"\\value"; button.textContent = 'Opaque choice';
      button.setAttribute('aria-checked', 'false'); button.dataset.shortcut = 'Ctrl+Alt+K';
      row.append(button); document.getElementById('theme-choices').append(row); pudlMenubar.refresh();
    });
    await page.keyboard.press('Control+Alt+k');
    assert.equal(await page.evaluate(() => choices.at(-1).value), "quoted'\"\\value");
    assert.equal(await page.evaluate(() => legacy), 1);
    await page.evaluate(() => {
      document.querySelector('button[value="dark"]').disabled = true; pudlMenubar.refresh();
    });
    assert.equal(await page.locator('#menubar-ribbon-row').getByRole('button', { name: 'Dark', exact: true }).isEnabled(), false);
    assert.deepEqual(errors, []);
    console.log('PASS markup choice pointer, keyboard, ribbon, shortcuts, cancellation, legacy click, opaque string values and disabled commands');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
