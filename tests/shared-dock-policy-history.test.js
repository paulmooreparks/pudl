const assert = require('assert/strict');
const fs = require('fs');
const { launch, ROOT, out } = require('./lib');
const { captureLifecycleChecks } = require('./shared-docks.test');

/* Exercise the actual private driver with explicit render/dispatch stubs.
   Browser cases below separately establish public rendering behavior. */
function driverContractChecks() {
  const vm = require('vm'), path = require('path');
  const source = fs.readFileSync(path.join(__dirname, '../dist/pudl-windows.js'), 'utf8');
  const part = (a, b) => { const start = source.indexOf(a), end = source.indexOf(b, start); assert.ok(start >= 0 && end > start); return source.slice(start, end); };
  const code = part('  function enterPolicyRender(owner)', '  function renderDockGroupsBody()') +
    part('  function apply(st, owner)', '  function applyBody(st, owner)') +
    part('    function refreshPolicy()', "    window.addEventListener('resize'");
  function setup() {
    const c = { policyStamp: null, policyGeneration: 0, policyDriver: false, policyPending: false, policyDeferred: false,
      policyOwner: null, renderDepth: 0, renderFailed: false, resumePolicy: null, syncing: 0, state: { open: ['one'] },
      width: 1400, events: 0, reported: [], cancelGesture: null, document: { activeElement: null },
      CSS: { escape: x => x }, CustomEvent: function () {}, forgetLayerSize() {}, restricted() { return false; },
      sharedEdges() { return ['left']; }, roomFor() { return {}; } };
    c.narrowLayer = c.autoCollapsed = () => c.width < 1000;
    c.layer = { hasAttribute: () => false, querySelectorAll: () => [], dispatchEvent() {
      c.events++; if (c.listener) try { c.listener(); } catch (error) { c.reported.push(error.message); }
    } };
    c.renderDockGroupsBody = () => { if (c.groupError) throw new Error('group sentinel'); c.rendered = c.width; };
    c.applyBody = (state, owner) => { if (c.before) c.before(); c.renderDockGroups(owner); if (c.tail) c.tail(); if (c.applyError) throw new Error('apply sentinel'); };
    vm.createContext(c); vm.runInContext(code, c); return c;
  }
  let c = setup();
  c.cancelGesture = () => { assert.equal(c.policyDriver, true); c.cancelGesture = null; c.refreshPolicy(); };
  c.listener = () => { assert.equal(c.policyOwner, null); assert.equal(c.policyDriver, true); c.refreshPolicy(); };
  c.refreshPolicy(); assert.equal(c.events, 1); c.refreshPolicy(); assert.equal(c.events, 1);
  for (const mode of ['empty', 'restoring', 'unfinished']) {
    c = setup(); let tail = false, once = true;
    if (mode === 'empty') c.state.open = [];
    if (mode === 'restoring') c.syncing = 1;
    if (mode !== 'unfinished') { c.refreshPolicy(); assert.equal(c.policyDeferred, true); }
    c.syncing = 0; c.state.open = ['one'];
    c.before = () => { if (mode === 'unfinished' && once) { once = false; c.refreshPolicy(); assert.equal(c.events, 0); } };
    c.tail = () => { tail = true; };
    c.listener = () => { assert.equal(tail, true); if (c.events === 1) { c.width = 800; c.apply(c.state); c.width = 1400; } };
    c.apply(c.state); assert.equal(c.events, 2); assert.equal(c.rendered, 1400); assert.equal(c.renderDepth, 0);
    c.refreshPolicy(); assert.equal(c.events, 2);
  }
  c = setup(); c.applyError = true;
  assert.throws(() => c.refreshPolicy(), /apply sentinel/); assert.equal(c.events, 0); assert.equal(c.policyDriver, false); assert.equal(c.policyOwner, null); assert.equal(c.renderDepth, 0);
  c = setup(); let once = true;
  c.before = () => { if (!once) return; once = false; c.groupError = true; try { c.renderDockGroups(); } catch {} c.groupError = false; };
  c.refreshPolicy(); assert.equal(c.events, 0); assert.equal(c.policyStamp, null);
  c = setup(); c.listener = () => { if (c.events === 1) { c.apply(c.state); throw new Error('listener sentinel'); } };
  c.refreshPolicy(); assert.equal(c.events, 2); assert.deepEqual(c.reported, ['listener sentinel']);
  console.log('PASS policy driver finite reentrancy, outer-tail deferral, quiescence and error unwind');
}

function operation({ stage, control }) {
  const host = document.querySelector('.win-host'), layer = document.querySelector('[data-win-layer]');
  const data = window.policyHistory;
  const restore = () => data.style === null ? host.removeAttribute('style') : host.setAttribute('style', data.style);
  const snapshot = () => {
    const state = pudlWindows.state(), group = document.querySelector('[data-dock-edge="left"]');
    const front = document.querySelector('.win[data-win="' + state.docks.left.selected + '"]');
    return { at: performance.now(), width: layer.clientWidth, height: layer.clientHeight,
      style: host.getAttribute('style'), state, rail: group.hasAttribute('data-dock-rail'),
      pressed: group.querySelector('.win-dock-toggle').getAttribute('aria-pressed'),
      selected: [...group.querySelectorAll('[aria-selected="true"]')].map(tab => tab.getAttribute('data-dock-key')),
      front: front.getAttribute('data-win'), connected: front.isConnected, hidden: front.hidden,
      sameGroup: group === data.group, sameFront: front === data.front,
      room: [...document.querySelectorAll('[data-win-room]')].map(node => node.getAttribute('data-win-room')),
      focus: document.activeElement && document.activeElement.id };
  };
  if (stage === 'narrow') {
    data.marker = data.sequence;
    host.style.setProperty('width', '800px', 'important');
    if (layer.clientWidth !== 800) throw new Error('Narrow priming geometry');
    pudlWindows.dockMode('left', 'auto'); window.dispatchEvent(new Event('resize'));
    return;
  }
  if (stage === 'wide') { data.marker = data.sequence; restore(); window.dispatchEvent(new Event('resize')); return; }
  if (stage === 'snapshot') return snapshot();
  if (stage === 'restore') { restore(); return host.getAttribute('style') === data.style; }
  if (stage !== 'experiment') throw new Error('Unknown operation');
  const before = snapshot();
  const records = [{ stage: 'before', value: before }];
  try {
    host.style.setProperty('width', '800px', 'important');
    if (layer.clientWidth !== 800) throw new Error('Narrow stimulus geometry');
    pudlWindows.dockMode('left', 'auto');
    records.push({ stage: 'narrow', value: snapshot() });
    if (control) window.dispatchEvent(new Event('resize'));
    restore();
    if (layer.clientWidth !== 1400) throw new Error('Restored stimulus geometry');
    window.dispatchEvent(new Event('resize'));
    records.push({ stage: 'immediate', value: snapshot() });
  } finally { restore(); }
  const started = performance.now();
  return new Promise((resolve, reject) => setTimeout(() => {
    try { resolve({ records, terminal: snapshot(), elapsed: performance.now() - started,
      events: data.events, dropped: data.dropped }); } catch (error) { reject(error); }
  }, 30000));
}

function signature(row) {
  return JSON.stringify({ height: row.height, state: row.state, pressed: row.pressed,
    selected: row.selected, front: row.front, room: row.room, focus: row.focus });
}

function valid(row) {
  assert.equal(row.sameGroup, true); assert.equal(row.sameFront, true);
  assert.equal(row.connected, true); assert.equal(row.pressed, 'false');
  assert.equal(row.state.docks.left.mode, 'auto');
  assert.deepEqual(row.selected, [row.state.docks.left.selected]);
  assert.equal(row.front, row.state.docks.left.selected);
  assert.deepEqual(row.state.min, {}); assert.deepEqual(row.room, []);
}

async function arm(browser, control) {
  const record = { control, cleanup: [] };
  const context = await browser.newContext({ viewport: { width: 1400, height: 850 }, reducedMotion: 'reduce' });
  let page, primary;
  try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    page = await context.newPage();
    await page.goto(ROOT + '/samples/shared-docks.html');
    await page.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.length === 6 && document.querySelectorAll('.win[data-win]').length === 6);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      const host = document.querySelector('.win-host'), layer = document.querySelector('[data-win-layer]');
      const data = window.policyHistory = { style: host.getAttribute('style'), sequence: 0, events: [], dropped: 0,
        group: document.querySelector('[data-dock-edge="left"]') };
      const retain = row => { row.sequence = ++data.sequence; if (data.events.length < 512) data.events.push(row); else data.dropped++; };
      document.addEventListener('pudl:windows-policy', () => retain({ kind: 'policy', at: performance.now() }));
      data.observer = new ResizeObserver(entries => entries.forEach(entry => retain({ kind: 'box', width: entry.contentRect.width, at: performance.now() })));
      data.observer.observe(layer);
      pudlWindows.raise('note'); pudlWindows.dockMode('left', 'auto');
      data.front = document.querySelector('.win[data-win="' + pudlWindows.state().docks.left.selected + '"]');
    });
    for (const [stage, width, rail] of [['narrow', 800, true], ['wide', 1400, false]]) {
      await page.evaluate(operation, { stage });
      await page.waitForFunction(({ width, rail }) => {
        const data = window.policyHistory, rows = data.events.filter(row => row.sequence > data.marker);
        return rows.some(row => row.kind === 'policy') && rows.some(row => row.kind === 'box' && row.width === width) &&
          document.querySelector('[data-dock-edge="left"]').hasAttribute('data-dock-rail') === rail;
      }, { width, rail }, { timeout: 30000 });
    }
    record.baseline = await page.evaluate(operation, { stage: 'snapshot' });
    valid(record.baseline); assert.equal(record.baseline.rail, false); assert.equal(record.baseline.width, 1400);
    record.observation = await page.evaluate(operation, { stage: 'experiment', control });
    for (const row of record.observation.records) { valid(row.value); assert.equal(signature(row.value), signature(record.baseline)); }
    assert.equal(record.observation.records[1].value.rail, true);
    assert.equal(record.observation.records[1].value.width, 800);
    valid(record.observation.terminal); assert.equal(signature(record.observation.terminal), signature(record.baseline));
    assert.equal(record.observation.terminal.width, 1400);
    record.restored = await page.evaluate(operation, { stage: 'restore' });
    assert.equal(record.restored, true);
    await page.screenshot({ path: out('policy-history-' + (control ? 'control' : 'candidate') + '.png') });
  } catch (error) { primary = error; record.error = String(error.stack || error); }
  finally {
    for (const [name, run] of [['trace', () => context.tracing.stop({ path: out('policy-history-' + (control ? 'control' : 'candidate') + '.zip') })], ['context', () => context.close()]]) {
      try { await run(); record.cleanup.push({ name, ok: true }); } catch (error) { record.cleanup.push({ name, ok: false, error: String(error) }); primary ||= error; }
    }
  }
  if (primary) throw Object.assign(primary, { record });
  return record;
}

async function publicFollowUp(browser) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 850 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), results = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const expanded = () => page.evaluate(() => !document.querySelector('[data-dock-edge="left"]').hasAttribute('data-dock-rail'));
  try {
    await page.goto(ROOT + '/samples/shared-docks.html');
    await page.waitForSelector('[data-dock-key="workspace"]'); await settle();
    await page.evaluate(() => {
      window.policyCompletions = 0;
      document.addEventListener('pudl:windows-policy', () => policyCompletions++);
      pudlWindows.retitle('workspace', 'Workspace policy history');
      window.dispatchEvent(new Event('resize'));
    });
    await settle();
    const before = await page.evaluate(() => policyCompletions);
    await page.evaluate(() => { window.dispatchEvent(new Event('resize')); window.dispatchEvent(new Event('resize')); });
    await settle();
    assert.ok(before > 0); assert.equal(await page.evaluate(() => policyCompletions), before);
    results.push('direct group redraw reconciles and unchanged notifications quiesce');
    await page.evaluate(() => {
      document.addEventListener('pudl:windows-policy', () => {
        window.dispatchEvent(new Event('resize'));
      }, { once: true });
      pudlWindows.retitle('workspace', 'Workspace nested notification'); window.dispatchEvent(new Event('resize'));
    });
    await settle(); assert.equal(await expanded(), true);
    results.push('finite completion resize reconciles');
    await page.evaluate(() => {
      document.addEventListener('pudl:windows-policy', () => {
        const host = document.querySelector('.win-host'), style = host.getAttribute('style');
        host.style.setProperty('width', '800px', 'important');
        if (document.querySelector('[data-win-layer]').clientWidth !== 800) throw new Error('Listener narrow geometry');
        pudlWindows.dockMode('left', 'auto');
        if (style === null) host.removeAttribute('style'); else host.setAttribute('style', style);
      }, { once: true });
      pudlWindows.retitle('workspace', 'Workspace direct completion'); window.dispatchEvent(new Event('resize'));
    });
    await settle(); assert.equal(await expanded(), true);
    const complete = await page.evaluate(() => policyCompletions);
    await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await settle();
    assert.equal(await page.evaluate(() => policyCompletions), complete);
    results.push('finite direct completion invalidation needs no nested resize and quiesces');

    await page.route('**/samples/shared-docks.html*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('data-win-required="workspace"', '') });
    });
    await page.goto(ROOT + '/samples/shared-docks.html');
    await page.waitForSelector('[data-dock-key="workspace"]'); await settle();
    const deferred = await page.evaluate(async () => {
      pudlWindows.state().open.slice().forEach(key => pudlWindows.close(key));
      if (pudlWindows.state().open.length) throw new Error('Empty deferral prerequisite');
      window.dispatchEvent(new Event('resize'));
      let completions = 0;
      document.addEventListener('pudl:windows-policy', function listener() {
        completions++;
        if (completions === 1) pudlWindows.retitle('workspace', 'Restored completion title');
        else document.removeEventListener('pudl:windows-policy', listener);
      });
      await pudlWindows.open('workspace');
      return { completions, title: document.querySelector('.win[data-win="workspace"]').getAttribute('data-win-title'),
        selected: pudlWindows.state().docks.left.selected };
    });
    await settle();
    assert.ok(deferred.completions >= 2); assert.equal(deferred.selected, 'workspace');
    assert.equal(await page.evaluate(() => document.querySelector('[data-dock-key="workspace"]').textContent.includes('Restored completion title')), true);
    results.push('empty/open restoration preserves finite completion listener work past the outer render tail');
    assert.deepEqual(errors, []);
    results.forEach(name => console.log('PASS ' + name));
    return results;
  } finally { await context.close(); }
}

async function main() {
  await captureLifecycleChecks();
  if (process.env.PUDL_CAPTURE_UNIT === '1') { driverContractChecks(); return; }
  const records = []; let browser, primary;
  try {
    browser = await launch();
    for (const control of [false, true]) records.push(await arm(browser, control));
    assert.equal(signature(records[0].baseline), signature(records[1].baseline));
    for (const record of records) {
      const expanded = !record.observation.records[2].value.rail && !record.observation.terminal.rail;
      console.log((expanded ? 'PASS ' : 'FAIL ') + 'public policy history expands the ' + (record.control ? 'control' : 'candidate') + ' dock after width restoration');
      if (!expanded) process.exitCode = 1;
    }
    if (!process.exitCode) { driverContractChecks(); await publicFollowUp(browser); }
  } catch (error) { primary = error; if (error.record) records.push(error.record); console.error(error); process.exitCode = 1; }
  finally {
    if (browser) try { await browser.close(); } catch (error) { console.error(error); process.exitCode = 1; }
    fs.writeFileSync(out('policy-history.json'), JSON.stringify({ records, primary: primary ? String(primary.stack || primary) : null }, null, 2));
  }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
