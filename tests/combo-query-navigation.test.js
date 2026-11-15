const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    async function fresh(complete = false) {
      await page.goto(ROOT + '/tests/fixtures/combo-query-navigation.html');
      await page.evaluate(complete => {
        // This invented fixture is recreated before enhancement for completion.
        if (complete) {
          const s = document.createElement('select');
          s.id = 'completion'; s.setAttribute('data-combo', ''); s.setAttribute('data-combo-complete', '');
          s.innerHTML = '<option value="p1">Ada Invented</option><option value="p2">Priya Example</option>';
          document.body.append(s); pudlCombo.enhance(document);
        }
        window.s = complete ? document.querySelector('#completion') : document.querySelector('select[name=b]');
        window.q = complete ? document.querySelector('#completion-combo') : document.querySelectorAll('input[role=combobox]')[1];
        window.p = document.getElementById(q.getAttribute('aria-controls'));
        window.events = [];
        for (const type of ['input', 'change']) s.addEventListener(type, () => events.push(type));
      }, complete);
      await page.locator(complete ? '#completion-combo' : 'input[role=combobox]').nth(complete ? 0 : 1).focus();
    }
    const state = () => page.evaluate(() => ({value:s.value, text:q.value, open:p.matches(':popover-open'), rows:[...p.querySelectorAll('[role=option]')].map(r=>r.textContent), active:q.getAttribute('aria-activedescendant'), events:[...events]}));
    const type = async text => { await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type(text); };
    for (const key of ['ArrowDown', 'ArrowUp', 'Alt+ArrowDown']) {
      await fresh(); await type('no such invented person');
      for (let i = 0; i < 2; i++) {
        await page.keyboard.press(key);
        const r = await state();
        assert.equal(r.value, 'p1'); assert.deepEqual(r.events, []);
        assert.equal(r.open, false); assert.deepEqual(r.rows, []); assert.equal(r.active, null);
      }
      await page.keyboard.press('Enter');
      assert.deepEqual(await state(), {value:'p1',text:'Ada Invented',open:false,rows:[],active:null,events:[]});
      console.log('PASS unmatched repeated ' + key + ' and silent Enter');
      await fresh(); await type('Pri'); await page.keyboard.press('Escape');
      await page.keyboard.press(key);
      let r = await state(); assert.equal(r.open,true); assert.deepEqual(r.rows,['Priya Example']); assert.equal(r.value,'p1'); assert.deepEqual(r.events,[]);
      await page.keyboard.press('Enter'); assert.equal((await state()).value,'p2'); assert.deepEqual((await state()).events,['input','change']);
      console.log('PASS matching closed-query ' + key);
    }
    await fresh(); await type('Ada Invented'); await page.keyboard.press('Escape'); await page.keyboard.press('ArrowUp');
    assert.deepEqual((await state()).rows,['Ada Invented']);
    console.log('PASS selected-label equality retains editing intent');
    await fresh(true); await type('Pri'); await page.keyboard.press('Escape'); await page.keyboard.press('Alt+ArrowDown');
    assert.deepEqual((await state()).rows,['Priya Example']); assert.equal((await state()).text,'Priya Example');
    console.log('PASS completion prefix survives closed-list reopening');
    await fresh(); await type('unknown'); await page.locator('.combo-open').nth(1).click();
    assert.equal((await state()).rows.length,4); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter');
    assert.equal((await state()).value,''); assert.deepEqual((await state()).events,['input','change']);
    console.log('PASS explicit browsing deliberately clears optional choice');
    await fresh(); await type(''); await page.keyboard.press('Backspace'); await page.keyboard.press('ArrowDown');
    assert.equal((await state()).rows.length,4); assert.deepEqual((await state()).events,[]);
    console.log('PASS intentionally empty query browses without mutation');
    await fresh(); await type('Pri'); await page.keyboard.press('Alt+ArrowUp'); await page.keyboard.press('Alt+ArrowDown');
    assert.deepEqual((await state()).rows,['Priya Example']); assert.deepEqual((await state()).events,[]);
    assert.deepEqual(errors,[]);
    console.log('PASS modifier close retains query');
  } finally { await browser.close(); }
})().catch(e => {console.error(e); process.exitCode=1;});
