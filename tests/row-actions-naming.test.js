const assert = require('assert');
const { launch, ROOT } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.goto(ROOT + '/tests/fixtures/row-actions.html');
    await page.waitForFunction(() => window.pudlMenu);
    await page.evaluate(() => {
      const fixture = document.createElement('div');
      fixture.innerHTML = '<span id="known-label">Known actions</span>' +
        '<button id="empty-label" data-row-actions aria-label=""></button>' +
        '<button id="blank-label" data-row-actions aria-label="  "></button>' +
        '<button id="empty-title" data-row-actions title=""></button>' +
        '<button id="blank-title" data-row-actions title="  "></button>' +
        '<button id="missing-ref" data-row-actions aria-labelledby="later-label"></button>' +
        '<button id="blank-ref" data-row-actions aria-labelledby="  "></button>' +
        '<button id="valid-label" data-row-actions aria-label="Authored actions"></button>' +
        '<button id="valid-title" data-row-actions title="Title actions"></button>' +
        '<button id="valid-text" data-row-actions>Text actions</button>' +
        '<button id="valid-ref" data-row-actions aria-labelledby="missing known-label" aria-label="Lower priority"></button>' +
        '<button id="missing-with-label" data-row-actions aria-labelledby="other-later" aria-label="Preserved actions"></button>';
      document.body.append(fixture);
    });
    await page.waitForFunction(() => document.querySelector('#blank-ref').__pudlRowActions);
    for (const id of ['empty-label', 'blank-label', 'empty-title', 'blank-title', 'missing-ref', 'blank-ref']) {
      assert.equal(await page.locator('#' + id).ariaSnapshot(), '- button "Actions"');
      console.log('PASS fallback ' + id);
    }
    for (const [id, name] of [['valid-label', 'Authored actions'], ['valid-title', 'Title actions'], ['valid-text', 'Text actions'], ['valid-ref', 'Known actions'], ['missing-with-label', 'Preserved actions']]) {
      assert.equal(await page.locator('#' + id).ariaSnapshot(), '- button "' + name + '"');
      console.log('PASS authored ' + id);
    }
    assert.equal(await page.locator('#missing-ref').getAttribute('aria-labelledby'), 'later-label');
    await page.evaluate(() => {
      for (const [id, text] of [['later-label', 'Later actions'], ['other-later', 'Later authored precedence']]) {
        const span = document.createElement('span'); span.id = id; span.textContent = text; document.body.append(span);
      }
    });
    assert.equal(await page.locator('#missing-ref').ariaSnapshot(), '- button "Later actions"');
    assert.equal(await page.locator('#missing-ref').getAttribute('aria-label'), 'Actions');
    assert.equal(await page.locator('#missing-with-label').ariaSnapshot(), '- button "Later authored precedence"');
    assert.equal(await page.locator('#missing-with-label').getAttribute('aria-label'), 'Preserved actions');
    console.log('PASS later labelled-by targets retain native precedence and authored references');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
