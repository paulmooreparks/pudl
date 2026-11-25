/* Invented fields and host clipboard transport. No operating-system clipboard
   or customer content is used. Native editing and Undo remain real. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { launch, ROOT, out } = require('./lib');
let browser, page;

(async () => {
  browser = await launch();
  page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.goto(ROOT + '/tests/fixtures/edit-context-menu.html');
  await page.waitForFunction(() => window.pudlClipboard && window.pudlMenu);
  const menu = page.locator('.context-menu:popover-open');
  const words = () => menu.locator('.menubar-words').allTextContents();
  async function field(id, start, end) {
    await page.evaluate(({ id, start, end }) => {
      const el = document.getElementById(id); el.focus();
      if (start != null) el.setSelectionRange(start, end);
    }, { id, start, end });
    await page.keyboard.press('Shift+F10');
    await menu.waitFor();
  }
  async function choose(label) { await menu.getByRole('menuitem', { name: label, exact: true }).click(); }
  const rowFor = label => menu.getByRole('menuitem').filter({ has: page.getByText(label, { exact: true }) });
  async function disabled(label) { return rowFor(label).getAttribute('aria-disabled'); }

  await field('plain', 6, 10);
  assert.deepEqual(await words(), ['Cut', 'Copy', 'Paste', 'Select All']);
  await page.screenshot({ path: out('edit-context-menu-field.png') });
  await choose('Copy');
  await page.waitForFunction(() => writes.length === 1);
  assert.equal(await page.evaluate(() => clipboard), 'Beta');
  assert.equal(await page.inputValue('#plain'), 'Alpha Beta Gamma');
  console.log('PASS field Copy uses the host transport and preserves its value');

  await page.evaluate(() => { clipboard = 'Delta'; changes = []; });
  await field('plain', 6, 10);
  await choose('Paste');
  await page.waitForFunction(() => document.getElementById('plain').value === 'Alpha Delta Gamma');
  assert.equal(await page.evaluate(() => changes.filter(e => e.id === 'plain' && e.type === 'input').length), 1);
  await page.keyboard.press('Control+Z');
  await page.waitForFunction(() => document.getElementById('plain').value === 'Alpha Beta Gamma');
  console.log('PASS field Paste replaces the captured selection, fires input once and supports native Undo');

  await field('plain', 6, 10);
  await choose('Cut');
  await page.waitForFunction(() => document.getElementById('plain').value === 'Alpha  Gamma');
  assert.equal(await page.evaluate(() => clipboard), 'Beta');
  await page.keyboard.press('Control+Z');
  await page.waitForFunction(() => document.getElementById('plain').value === 'Alpha Beta Gamma');
  console.log('PASS Cut writes before deletion and preserves native Undo');

  await page.focus('#history');
  await page.keyboard.press('End');
  await page.keyboard.type(' typed');
  await page.evaluate(() => {
    delete window.finishRead;
    pudlClipboard.setTransport({ readText: () => new Promise(resolve => { window.finishRead = resolve; }), writeText: () => Promise.resolve() });
  });
  await field('history', 0, 6);
  await page.evaluate(() => { changes = []; });
  await choose('Paste');
  await page.waitForFunction(() => typeof finishRead === 'function');
  await page.evaluate(() => finishRead('After'));
  await page.waitForFunction(() => document.getElementById('history').value === 'After typed');
  await page.keyboard.press('Control+Z');
  await page.waitForFunction(() => document.getElementById('history').value === 'Before typed');
  await page.keyboard.press('Control+Shift+Z');
  await page.waitForFunction(() => document.getElementById('history').value === 'After typed');
  await page.focus('#plain');
  assert.equal(await page.evaluate(() => changes.filter(e => e.id === 'history' && e.type === 'change').length), 1);
  console.log('PASS a real typed edit survives delayed Paste Undo/Redo and change commits once on blur');

  await page.evaluate(() => {
    delete window.finishWrite;
    pudlClipboard.setTransport({ readText: () => 'Pasted', writeText: () => new Promise(resolve => { window.finishWrite = resolve; }) });
  });
  await field('history', 0, 5);
  await page.evaluate(() => { changes = []; });
  await choose('Cut');
  await page.waitForFunction(() => typeof finishWrite === 'function');
  await page.evaluate(() => finishWrite());
  await page.waitForFunction(() => document.getElementById('history').value === ' typed');
  await page.keyboard.press('Control+Z');
  await page.waitForFunction(() => document.getElementById('history').value === 'After typed');
  await page.keyboard.press('Control+Shift+Z');
  await page.waitForFunction(() => document.getElementById('history').value === ' typed');
  await page.focus('#plain');
  assert.equal(await page.evaluate(() => changes.filter(e => e.id === 'history' && e.type === 'change').length), 1);
  await page.evaluate(() => {
    pudlClipboard.setTransport({ readText: () => clipboard, writeText: text => { clipboard = text; return Promise.resolve(); } });
  });
  console.log('PASS delayed Cut preserves earlier typing, Undo/Redo and commit-time change');

  await field('notes', 0, 5);
  await choose('Select All');
  assert.deepEqual(await page.evaluate(() => { const e = document.getElementById('notes'); return [e.selectionStart, e.selectionEnd]; }), [0, 22]);
  console.log('PASS Select All selects the target textarea only');

  await field('readonly', 0, 9);
  assert.equal(await disabled('Cut'), 'true');
  assert.equal(await disabled('Paste'), 'true');
  assert.notEqual(await disabled('Copy'), 'true');
  await page.keyboard.press('Escape');
  await field('plain', 0, 0);
  assert.equal(await disabled('Cut'), 'true');
  assert.equal(await disabled('Copy'), 'true');
  await page.keyboard.press('Escape');
  await field('password', 0, 8);
  assert.equal(await disabled('Cut'), 'true');
  assert.equal(await disabled('Copy'), 'true');
  assert.notEqual(await disabled('Paste'), 'true');
  await page.keyboard.press('Escape');
  console.log('PASS read-only, empty-selection and password fields keep unsafe edits disabled');

  for (const id of ['email', 'number']) {
    await page.evaluate(id => {
      const el = document.getElementById(id);
      el.setAttribute('data-menu-reasons', 'tooltip');
      window.selectCalls = 0;
      const originalSelect = el.select;
      el.select = function () { selectCalls++; return originalSelect.call(this); };
    }, id);
    await field(id);
    assert.deepEqual(await words(), ['Cut', 'Copy', 'Paste', 'Select All']);
    for (const label of ['Cut', 'Copy', 'Paste']) {
      assert.equal(await disabled(label), 'true');
      const row = rowFor(label);
      const reason = await row.getAttribute('title');
      assert.match(reason, /does not expose text selection positions/);
      assert.equal(await row.evaluate(el => document.getElementById(el.getAttribute('aria-describedby')).textContent), reason);
    }
    assert.notEqual(await disabled('Select All'), 'true');
    await choose('Select All');
    assert.equal(await page.evaluate(() => selectCalls), 1);
    assert.equal(await page.evaluate(id => document.activeElement.id === id, id), true);

    await page.evaluate(() => {
      window.nativeEditKeys = [];
      window.captureEditKey = e => {
        if ((e.ctrlKey || e.metaKey) && /^[xcva]$/i.test(e.key)) nativeEditKeys.push({ key: e.key.toLowerCase(), prevented: e.defaultPrevented });
      };
      window.addEventListener('keydown', captureEditKey);
    });
    for (const key of ['X', 'C', 'V', 'A']) {
      const prevented = await page.evaluate(({ id, key }) => {
        const event = new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true, cancelable: true });
        document.getElementById(id).dispatchEvent(event);
        return event.defaultPrevented;
      }, { id, key });
      assert.equal(prevented, false);
    }
    await page.keyboard.press('Control+A');
    await page.keyboard.type(id === 'email' ? 'native@example.test' : '6789');
    assert.equal(await page.inputValue('#' + id), id === 'email' ? 'native@example.test' : '6789');
    assert.deepEqual(await page.evaluate(() => nativeEditKeys), [
      { key: 'x', prevented: false }, { key: 'c', prevented: false },
      { key: 'v', prevented: false }, { key: 'a', prevented: false }, { key: 'a', prevented: false }
    ]);
    await page.evaluate(() => window.removeEventListener('keydown', captureEditKey));
  }
  console.log('PASS email and number menus explain disabled edits, invoke documented select() and leave native shortcuts uncanceled');

  for (const id of ['email-text', 'decimal-text']) {
    await page.evaluate(() => { clipboard = 'Replacement'; });
    await field(id, 0, 3);
    assert.notEqual(await disabled('Cut'), 'true');
    assert.notEqual(await disabled('Copy'), 'true');
    assert.notEqual(await disabled('Paste'), 'true');
    const original = await page.inputValue('#' + id);
    await choose('Paste');
    await page.waitForFunction(({ id, expected }) => document.getElementById(id).value === expected,
      { id, expected: 'Replacement' + original.slice(3) });
    await page.keyboard.press('Control+Z');
    assert.equal(await page.inputValue('#' + id), original);
  }
  console.log('PASS text fields with email/decimal inputmode retain selection, Paste and native Undo');

  await field('owned', 0, 6);
  assert.deepEqual(await words(), ['Editor Paste']);
  await choose('Editor Paste');
  await page.waitForFunction(() => changes.some(e => e.type === 'transaction'));
  console.log('PASS a document-level applet handler claims editing without duplicated generic rows');

  await field('canceled-owner', 0, 11);
  assert.deepEqual(await words(), ['Application owns request']);
  await page.keyboard.press('Escape');
  console.log('PASS a canceled context request preserves its application rows and suppresses default contributions');

  /* Establish pointer intent after dismissing the keyboard menu, then
     select the invented article text before delivering the pointer event. */
  await page.click('#article');
  await page.evaluate(() => {
    const el = document.getElementById('article'), range = document.createRange();
    range.setStart(el.firstChild, 0); range.setEnd(el.firstChild, 8);
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 400, clientY: 400 }));
  });
  assert.deepEqual(await words(), ['Inspect selection', 'Cut', 'Copy', 'Paste', 'Select All']);
  assert.equal(await menu.locator('[role="separator"]').count(), 1);
  assert.equal(await disabled('Cut'), 'true');
  assert.equal(await disabled('Paste'), 'true');
  await choose('Copy');
  await page.waitForFunction(() => clipboard === 'Invented');
  console.log('PASS selected document text merges with page rows and remains copyable');

  await page.evaluate(() => {
    const el = document.getElementById('rich-reference'), range = document.createRange();
    range.selectNodeContents(el.querySelector('strong')); el.focus();
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
  });
  await page.keyboard.type('Delta');
  const nativeRich = await page.locator('#rich-reference').innerHTML();
  assert.equal(await page.locator('#rich-reference strong').textContent(), 'Delta');
  assert.notEqual(nativeRich, 'Alpha <strong>Beta</strong> Gamma');
  await page.keyboard.press('Control+Z');
  await page.waitForFunction(() => document.getElementById('rich-reference').innerHTML === 'Alpha <strong>Beta</strong> Gamma');
  await page.evaluate(() => {
    const el = document.getElementById('rich'), range = document.createRange();
    range.selectNodeContents(el.querySelector('strong')); el.focus();
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    clipboard = 'Delta';
  });
  await page.keyboard.press('Shift+F10');
  await choose('Paste');
  await page.waitForFunction(expected => document.getElementById('rich').innerHTML === expected, nativeRich);
  await page.keyboard.press('Control+Z');
  await page.waitForFunction(() => document.getElementById('rich').innerHTML === 'Alpha <strong>Beta</strong> Gamma');
  console.log('PASS contenteditable Paste matches independent keyboard editing and restores rich markup on Undo');

  await page.evaluate(() => {
    const el = document.getElementById('rich-readonly'), range = document.createRange();
    range.selectNodeContents(el.querySelector('strong')); el.focus();
    getSelection().removeAllRanges(); getSelection().addRange(range);
  });
  await page.keyboard.press('Shift+F10');
  assert.equal(await disabled('Cut'), 'true');
  assert.equal(await disabled('Paste'), 'true');
  assert.notEqual(await disabled('Copy'), 'true');
  await choose('Copy');
  await page.waitForFunction(() => clipboard === 'Beta');
  assert.equal(await page.locator('#rich-readonly').innerHTML(), 'Alpha <strong>Beta</strong> Gamma');
  console.log('PASS read-only contenteditable keeps selection Copy and disables mutations');

  await page.evaluate(() => {
    pudlClipboard.setTransport({ readText: () => Promise.reject(new Error('Denied')), writeText: () => Promise.reject(new Error('Denied')) });
    errors = [];
  });
  await field('plain', 6, 10);
  await choose('Cut');
  await page.waitForFunction(() => errors.includes('cut'));
  assert.equal(await page.inputValue('#plain'), 'Alpha Beta Gamma');
  await field('plain', 6, 10);
  await choose('Paste');
  await page.waitForFunction(() => errors.includes('paste'));
  assert.equal(await page.inputValue('#plain'), 'Alpha Beta Gamma');
  console.log('PASS rejected host reads/writes report errors without deletion or fallback transport');

  for (const mutation of ['readonly', 'changed', 'removed', 'selection', 'focus', 'type']) {
    await page.evaluate(() => {
      errors = []; delete window.finishRead;
      pudlClipboard.setTransport({ readText: () => new Promise(resolve => { window.finishRead = resolve; }), writeText: () => Promise.resolve() });
    });
    await field('plain', 6, 10);
    await choose('Paste');
    await page.waitForFunction(() => typeof finishRead === 'function');
    await page.evaluate(mutation => {
      const el = document.getElementById('plain');
      if (mutation === 'readonly') el.readOnly = true;
      if (mutation === 'changed') el.value = 'Changed while reading';
      if (mutation === 'removed') { window.removedField = el; window.removedFieldParent = el.parentNode; el.remove(); }
      if (mutation === 'selection') el.setSelectionRange(0, 5);
      if (mutation === 'focus') document.getElementById('notes').focus();
      if (mutation === 'type') el.type = 'password';
      finishRead('Unexpected');
    }, mutation);
    await page.waitForFunction(() => errors.includes('paste'));
    assert.equal(await page.evaluate(() => (document.getElementById('plain') || removedField).value), mutation === 'changed' ? 'Changed while reading' : 'Alpha Beta Gamma');
    await page.evaluate(() => {
      const el = document.getElementById('plain') || removedField;
      if (!el.isConnected) removedFieldParent.appendChild(el);
      el.readOnly = false; el.type = 'text'; el.value = 'Alpha Beta Gamma';
    });
  }
  console.log('PASS pending reads reject changed text, selection, focus, type, permissions and connectivity');

  await page.evaluate(() => {
    errors = []; delete window.finishWrite;
    pudlClipboard.setTransport({ readText: () => 'Pasted', writeText: () => new Promise(resolve => { window.finishWrite = resolve; }) });
  });
  await field('plain', 6, 10);
  await choose('Cut');
  await page.waitForFunction(() => typeof finishWrite === 'function');
  await page.evaluate(() => { document.getElementById('plain').setSelectionRange(0, 5); finishWrite(); });
  await page.waitForFunction(() => errors.includes('cut'));
  assert.equal(await page.inputValue('#plain'), 'Alpha Beta Gamma');
  console.log('PASS a successful delayed Cut write cannot delete a selection it no longer owns');

  await page.evaluate(() => {
    errors = []; window.canceledPreflights = [];
    pudlClipboard.setTransport({ readText: () => 'Canceled', writeText: () => Promise.resolve() });
    document.getElementById('plain').addEventListener('beforeinput', event => {
      event.preventDefault();
      canceledPreflights.push({ type: event.inputType, canceled: event.defaultPrevented, trusted: event.isTrusted });
    }, { once: true });
  });
  await field('plain', 6, 10);
  await choose('Paste');
  await page.waitForFunction(() => canceledPreflights.length === 1);
  assert.deepEqual(await page.evaluate(() => canceledPreflights), [{ type: 'insertText', canceled: true, trusted: false }]);
  assert.deepEqual(await page.evaluate(() => errors), []);
  assert.equal(await page.inputValue('#plain'), 'Alpha Beta Gamma');
  console.log('PASS beforeinput cancellation prevents mutation');

  await page.evaluate(() => {
    errors = []; delete window.finishRead;
    pudlClipboard.setTransport({ readText: () => new Promise(resolve => { window.finishRead = resolve; }), writeText: () => Promise.resolve() });
  });
  await page.evaluate(() => {
    const el = document.getElementById('rich'), range = document.createRange();
    range.selectNodeContents(el.querySelector('strong')); el.focus();
    getSelection().removeAllRanges(); getSelection().addRange(range);
  });
  await page.keyboard.press('Shift+F10');
  await choose('Paste');
  await page.waitForFunction(() => typeof finishRead === 'function');
  await page.evaluate(() => { const el = document.getElementById('rich'); el.innerHTML = el.innerHTML; finishRead('Unexpected'); });
  await page.waitForFunction(() => errors.includes('paste'));
  assert.equal(await page.locator('#rich').innerHTML(), 'Alpha <strong>Beta</strong> Gamma');
  console.log('PASS identical serialized HTML cannot authorize a stale live Range after node replacement');

  await page.evaluate(() => {
    errors = []; window.pendingReads = [];
    pudlClipboard.setTransport({ readText: () => new Promise(resolve => pendingReads.push(resolve)), writeText: () => Promise.resolve() });
  });
  await field('plain', 6, 10);
  await choose('Paste');
  await page.waitForFunction(() => pendingReads.length === 1);
  await field('plain', 6, 10);
  await choose('Paste');
  await page.waitForFunction(() => pendingReads.length === 2);
  await page.evaluate(() => pendingReads[1]('Newer'));
  await page.waitForFunction(() => document.getElementById('plain').value === 'Alpha Newer Gamma');
  await page.evaluate(() => pendingReads[0]('Older'));
  await page.waitForFunction(() => errors.includes('paste'));
  assert.equal(await page.inputValue('#plain'), 'Alpha Newer Gamma');
  await page.evaluate(() => { document.getElementById('plain').value = 'Alpha Beta Gamma'; });
  console.log('PASS overlapping reads resolved out of order cannot overwrite the newer edit');

  for (const effect of ['redirect', 'readonly']) {
    await page.evaluate(() => {
      errors = [];
      pudlClipboard.setTransport({ readText: () => 'Unexpected', writeText: () => Promise.resolve() });
    });
    await field('plain', 6, 10);
    await page.evaluate(effect => {
      window.focusEffect = () => {
        if (effect === 'redirect') document.getElementById('notes').focus();
        else document.getElementById('plain').readOnly = true;
      };
      document.getElementById('plain').addEventListener('focus', focusEffect);
    }, effect);
    await choose('Paste');
    await page.waitForFunction(() => errors.includes('paste'));
    assert.equal(await page.inputValue('#plain'), 'Alpha Beta Gamma');
    assert.equal(await page.inputValue('#notes'), 'First line\nSecond line');
    await page.evaluate(() => {
      const el = document.getElementById('plain'); el.removeEventListener('focus', focusEffect); el.readOnly = false;
    });
  }
  console.log('PASS synchronous focus redirection or invalidation cannot move an edit into another field');

  await page.evaluate(() => {
    window.offscreenCopied = null;
    pudlClipboard.setTransport({ readText: () => 'Pasted', writeText: text => { window.offscreenCopied = text; return Promise.resolve(); } });
    window.scrollTo(0, document.documentElement.scrollHeight);
    const el = document.getElementById('plain'); el.focus({ preventScroll: true }); el.setSelectionRange(6, 10);
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.mouse.move(800, 400);
  await page.mouse.wheel(0, 3000);
  await page.waitForFunction(() => document.getElementById('plain').getBoundingClientRect().bottom < 0);
  assert.ok(await page.locator('#plain').evaluate(el => el.getBoundingClientRect().bottom < 0), 'the intended focused field is above the viewport');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'plain');
  await page.keyboard.press('Shift+F10');
  const bounds = await menu.evaluate(el => {
    const panel = el.getBoundingClientRect(), first = el.querySelector('.menu-action').getBoundingClientRect();
    return { top: panel.top, bottom: panel.bottom, firstTop: first.top, height: innerHeight };
  });
  assert.ok(bounds.top >= 0 && bounds.bottom <= bounds.height && bounds.firstTop >= 0, JSON.stringify(bounds));
  await choose('Copy');
  await page.waitForFunction(() => offscreenCopied === 'Beta');
  console.log('PASS keyboard editing menus stay inside the viewport when the focused field is offscreen');

  const transportContract = await page.evaluate(async () => {
    let rejected = false;
    try { pudlClipboard.setTransport({ readText() {} }); } catch (error) { rejected = error instanceof TypeError; }
    pudlClipboard.setTransport({ readText: () => 12, writeText: () => undefined });
    let textRejected = false;
    try { await pudlClipboard.readText(); } catch (error) { textRejected = error instanceof TypeError; }
    const result = await pudlClipboard.writeText('text');
    return { rejected, textRejected, voidResult: result === undefined };
  });
  assert.deepEqual(transportContract, { rejected: true, textRejected: true, voidResult: true });
  console.log('PASS clipboard transport validates both methods and its text/void result contract');

  const fallbackContract = await page.evaluate(async () => {
    const prior = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    let reads = 0, writes = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      readText: () => { reads++; return Promise.resolve('Browser fixture'); },
      writeText: text => { writes.push(text); return Promise.resolve(); }
    } });
    try {
      pudlClipboard.setTransport(null);
      const text = await pudlClipboard.readText();
      await pudlClipboard.writeText('Browser write');
      pudlClipboard.setTransport({ readText: () => Promise.reject(new Error('Denied')), writeText: () => { throw new Error('Denied'); } });
      let denied = 0;
      try { await pudlClipboard.readText(); } catch (_) { denied++; }
      try { await pudlClipboard.writeText('Forbidden retry'); } catch (_) { denied++; }
      return { text, reads, writes, denied };
    } finally {
      if (prior) Object.defineProperty(navigator, 'clipboard', prior); else delete navigator.clipboard;
    }
  });
  assert.deepEqual(fallbackContract, { text: 'Browser fixture', reads: 1, writes: ['Browser write'], denied: 2 });
  console.log('PASS browser fallback is used only without a host and never retried after host rejection');

  await page.evaluate(() => { pudlClipboard.setTransport({ readText: () => 'Pasted', writeText: () => Promise.resolve() }); });
  await field('readonly', 0, 9);
  await page.screenshot({ path: out('edit-context-menu-readonly.png') });
  await browser.close();
})().catch(async error => {
  if (page && !page.isClosed()) {
    const state = await page.evaluate(() => {
      const selection = getSelection();
      return { active: document.activeElement && document.activeElement.id,
        rich: document.getElementById('rich').innerHTML,
        selected: selection && selection.toString(), errors: errorDetails, changes };
    });
    fs.writeFileSync(out('edit-context-menu-failure.json'), JSON.stringify(state, null, 2) + '\n');
    await page.screenshot({ path: out('edit-context-menu-failure.png') });
  }
  if (browser) await browser.close();
  console.error(error); process.exit(1);
});
