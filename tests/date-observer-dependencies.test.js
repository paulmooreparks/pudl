const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    for (const kind of ['date', 'time']) {
      await page.goto(ROOT + '/tests/fixtures/' + kind + '-validation.html');
      await page.waitForSelector('#value-text');
      await page.evaluate(() => {
        window.source = document.getElementById('value');
        window.query = document.getElementById('value-text');
        window.events = [];
        source.addEventListener('input', () => events.push('input'));
        source.addEventListener('change', () => events.push('change'));
        window.originalValue = source.value;
        window.fs = document.createElement('fieldset'); fs.disabled = true;
        window.legend = document.createElement('legend'); legend.textContent = 'Current';
        source.form.append(fs); fs.append(legend); legend.append(source);
      });
      await page.waitForFunction(() => query.parentElement.previousSibling === source);
      await page.waitForFunction(() => !query.matches(':disabled'));
      await page.evaluate(() => { window.first = document.createElement('legend'); first.textContent = 'New first'; fs.prepend(first); });
      await page.waitForFunction(() => source.matches(':disabled') && query.matches(':disabled'));
      await page.evaluate(() => first.remove());
      await page.waitForFunction(() => !source.matches(':disabled') && !query.matches(':disabled'));
      await page.evaluate(() => {
        window.external = document.createElement('form'); external.id = 'external-owner';
        document.body.append(external); source.setAttribute('form', external.id);
      });
      await page.waitForFunction(() => query.form === external);
      await page.evaluate(() => { window.replacement = document.createElement('form'); replacement.id = external.id; external.replaceWith(replacement); });
      await page.waitForFunction(() => source.form === replacement && query.form === replacement);
      await page.evaluate(() => { window.blocker = document.createElement('div'); blocker.id = replacement.id; replacement.before(blocker); });
      await page.waitForFunction(() => source.form === null && query.form === null);
      await page.evaluate(() => blocker.remove());
      await page.waitForFunction(() => source.form === replacement && query.form === replacement);
      await page.evaluate(() => replacement.remove());
      await page.waitForFunction(() => source.form === null && query.form === null);
      await page.evaluate(() => document.body.append(replacement));
      await page.waitForFunction(() => source.form === replacement && query.form === replacement);
      assert.deepEqual(await page.evaluate(() => events), []);
      assert.equal(await page.evaluate(() => source.value === originalValue), true);
      console.log('PASS ' + kind + ' indirect first-legend and external form dependencies preserve source/events');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
