'use strict';
const assert = require('node:assert/strict');
const { launch, ROOT } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(ROOT + '/tests/fixtures/desktop-menu-maintenance.html');
    const field = page.locator('#pick-combo'); await field.waitFor();
    await page.evaluate(() => {
      window.events = []; window.queries = [];
      const select = document.getElementById('pick');
      select.addEventListener('pudl:combo-query', event => queries.push({ query: event.detail.query, token: Object.isFrozen(event.detail.ticket), target: event.target === select }));
      ['input', 'change'].forEach(type => select.addEventListener(type, () => events.push(type)));
      window.replace = ticket => pudlCombo.replaceOptions(select, ticket, [new Option('Remote result', 'remote')], { open: true });
      window.begin = () => pudlCombo.beginOptions(select);
    });
    await field.fill('Remote');
    assert.deepEqual(await page.evaluate(() => queries.at(-1)), { query: 'Remote', token: true, target: true }, 'query event is published on the original select with an opaque ticket');
    const replaced = await page.evaluate(() => {
      const field = document.getElementById('pick-combo'); field.setSelectionRange(2, 4);
      const old = begin(), current = begin();
      const stale = replace(old), accepted = replace(current), duplicate = replace(current);
      return { stale, accepted, duplicate, value: document.getElementById('pick').value, text: field.value,
        caret: [field.selectionStart, field.selectionEnd], focused: document.activeElement === field, events,
        selectedRetained: [...document.getElementById('pick').options].some(o => o.value === 'kept' && o.selected),
        open: document.getElementById(field.getAttribute('aria-controls')).matches(':popover-open') };
    });
    assert.deepEqual(replaced, { stale: false, accepted: true, duplicate: false, value: 'kept', text: 'Remote', caret: [2, 4], focused: true, events: [], selectedRetained: true, open: true });
    console.log('PASS option replacement preserves selected value, query, caret and focus without events; newer same-query request wins');
    for (const boundary of ['escape', 'outside', 'blur-return', 'query', 'reset', 'disabled', 'detach-return', 'wrapper-hidden', 'wrapper-inert', 'wrapper-ancestor-hidden', 'wrapper-ancestor-inert']) {
      await field.fill('Remote');
      await page.evaluate(() => { window.ticket = begin(); });
      if (boundary === 'escape') {
        await field.press('ArrowDown'); await field.press('Escape');
        assert.equal(await page.evaluate(() => begin()), null, 'dismissed query cannot acquire a fresh reopening ticket');
      }
      if (boundary === 'outside') {
        await field.press('ArrowDown');
        assert.equal(await page.locator('#outside').count(), 1, 'outside dismissal retains its fixture document at ' + page.url());
        await page.locator('#outside').click();
      }
      if (boundary === 'blur-return') { await page.locator('#outside').focus(); await field.focus(); }
      if (boundary === 'query') await field.fill('Different');
      if (boundary === 'reset') await page.evaluate(() => document.getElementById('form').reset());
      if (boundary === 'disabled') {
        await page.evaluate(() => { const s = document.getElementById('pick'); s.disabled = true; s.disabled = false; });
      }
      if (boundary === 'detach-return') {
        await page.evaluate(() => { const s = document.getElementById('pick'), parent = s.parentNode, next = s.nextSibling; s.remove(); parent.insertBefore(s, next); });
      }
      if (boundary.startsWith('wrapper-')) {
        assert.equal(await page.evaluate(boundary => {
          const field = document.getElementById('pick-combo');
          const wrap = field.closest('.combo');
          const target = boundary.includes('ancestor') ? wrap.parentElement : wrap;
          const attribute = boundary.endsWith('inert') ? 'inert' : 'hidden';
          target.setAttribute(attribute, ''); target.removeAttribute(attribute);
          return replace(ticket);
        }, boundary), false, boundary + ' same-turn restoration retires the response');
      }
      assert.equal(await page.evaluate(() => replace(ticket)), false, boundary + ' retires the response');
      assert.equal(await page.locator('#pick option[value="remote"]').count(), 1, 'stale response does not mutate the existing options');
    }
    await field.fill('Remote');
    const invalid = await page.evaluate(() => {
      const ticket = begin();
      try { pudlCombo.replaceOptions(document.getElementById('pick'), ticket, ['<option>unsafe</option>'], { open: true }); return false; }
      catch (error) { return error instanceof TypeError; }
    });
    assert.equal(invalid, true, 'HTML strings are not option elements');
    assert.deepEqual(errors, []);
    console.log('PASS dismissal, focus/query/reset/disable/detach boundaries reject pending responses without reopening');
  } finally { await browser.close(); }
})().catch(error => { console.error('FAIL remote option replacement', error); process.exitCode = 1; });
