const { launch, ROOT, out, engine } = require('./lib');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function bounded(operation, milliseconds, late) {
  let timer, timedOut = false;
  const work = Promise.resolve().then(operation);
  work.then(value => { if (timedOut) late({ ok: true, value }); }, error => { if (timedOut) late({ ok: false, error: String(error.stack || error) }); });
  return Promise.race([work, new Promise((resolve, reject) => {
    timer = setTimeout(() => { timedOut = true; reject(Object.assign(new Error('Capture stage exceeded ' + milliseconds + 'ms'), { captureTimedOut: true })); }, milliseconds);
  })]).finally(() => clearTimeout(timer));
}

async function finishCapture({ primary, stages, limits = {}, onLate }) {
  const report = { primary: primary ? String(primary.stack || primary) : null, outcomes: [], lateSettlements: [],
    unresolved: [], failed: !!primary, recordingCutoff: null,
    qualification: 'Timeouts bound waiting without cancellation. Unresolved operations can settle after the last recorded update or process exit.' };
  for (const stage of stages) {
    let settledLate = false;
    try {
      const value = await bounded(stage.run, limits[stage.name] || stage.milliseconds, result => {
        settledLate = true;
        report.unresolved = report.unresolved.filter(name => name !== stage.name);
        report.lateSettlements.push({ name: stage.name, at: new Date().toISOString(), ...result });
        if (!result.ok) report.failed = true;
        report.recordingCutoff = new Date().toISOString();
        if (onLate) try { onLate(report); } catch (error) {
          report.failed = true; report.lateSettlements.push({ name: 'late-report-write', ok: false, error: String(error) });
          console.error('FAIL late capture record write', error, JSON.stringify(report));
        }
      });
      report.outcomes.push({ name: stage.name, ok: true, value });
    } catch (error) {
      report.failed = true;
      const message = String(error.stack || error);
      report.outcomes.push({ name: stage.name, ok: false, error: message });
      if (error.captureTimedOut && !settledLate) report.unresolved.push(stage.name);
    }
  }
  report.recordingCutoff = new Date().toISOString();
  return report;
}

async function expectedVideo(video, directory, io = fs) {
  if (!video) throw new Error('Missing page video handle');
  const file = await video.path();
  if (typeof file !== 'string' || !file) throw new Error('Missing expected video path');
  const relative = path.relative(path.resolve(directory), path.resolve(file));
  if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error('Expected video path is outside recording directory');
  const bytes = io.readFileSync(file);
  if (!bytes.length) throw new Error('Empty expected video');
  const expected = { file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  const inventory = io.readdirSync(directory).map(name => {
    const data = io.readFileSync(path.join(directory, name));
    return { name, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') };
  });
  return { expected, inventory };
}

function publicHistory() {
  const documentDescriptor = () => ({ url: location.href, timeOrigin: performance.timeOrigin, readyState: document.readyState });
  const initialized = documentDescriptor();
  const records = [], maximum = 512;
  let sequence = 0, dropped = 0, mutationDropped = 0;
  const ids = new WeakMap(); let nextId = 0;
  const identity = node => { if (!ids.has(node)) ids.set(node, ++nextId); return ids.get(node); };
  window.__sharedDockNodeIdentity = identity;
  const record = event => {
    const row = { document: documentDescriptor(), sequence: ++sequence, at: performance.now(), kind: event.type, detail: event.detail || null,
      groups: [...document.querySelectorAll('[data-dock-edge]')].map(group => ({
        id: identity(group), edge: group.getAttribute('data-dock-edge'), rail: group.hasAttribute('data-dock-rail'),
        selected: [...group.querySelectorAll('[aria-selected="true"]')].map(tab => tab.getAttribute('data-dock-key'))
      })) };
    if (records.length === maximum) { records.shift(); dropped++; }
    records.push(row);
  };
  for (const name of ['resize', 'error', 'pudl:windows-policy', 'pudl:windows-change'])
    (name.startsWith('pudl:') ? document : window).addEventListener(name, record);
  const observe = () => {
    const layer = document.querySelector('[data-win-layer]');
    if (!layer) return;
    new ResizeObserver(entries => record({ type: 'resize-observer', detail: entries.map(entry => ({
      id: identity(entry.target), width: entry.contentRect.width, height: entry.contentRect.height
    })) })).observe(layer);
    new MutationObserver(rows => { mutationDropped += Math.max(0, rows.length - 64); record({ type: 'mutation-delivery', detail: rows.slice(0, 64).map(row => ({
      id: identity(row.target), name: row.attributeName, old: row.oldValue, current: row.target.getAttribute(row.attributeName)
    })) }); }).observe(layer, {
      subtree: true, attributes: true, attributeOldValue: true,
      attributeFilter: ['data-dock-rail', 'aria-pressed', 'aria-selected', 'hidden']
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe, { once: true });
  else observe();
  window.__sharedDockHistory = () => ({ document: documentDescriptor(), initialized, records: records.slice(), sequence, dropped, mutationDropped, maximum,
    currentGroups: [...document.querySelectorAll('[data-dock-edge]')].map(group => ({ id: identity(group), edge: group.getAttribute('data-dock-edge') })),
    qualification: 'Mutation current values are callback-delivery observations. Public history does not expose private policy state. Mutation batches retain at most 64 entries.' });
}

function finalPublicState() {
  const layer = document.querySelector('[data-win-layer]');
  const state = window.pudlWindows ? pudlWindows.state() : null;
  const identity = node => window.__sharedDockNodeIdentity ? window.__sharedDockNodeIdentity(node) : null;
  const authored = node => Object.fromEntries([...node.attributes].filter(a => /^(data-win-(narrow|size|dock-rail-width|dock-collapse-height|room)|style)/.test(a.name)).map(a => [a.name, a.value]));
  const member = node => ({ id: identity(node), key: node.getAttribute('data-win'), connected: node.isConnected,
    hidden: node.hidden, restricted: node.hasAttribute('data-win-restricted'), peek: node.hasAttribute('data-win-dock-peek'),
    edge: node.getAttribute('data-win-edge'), inputs: authored(node) });
  const windows = [...document.querySelectorAll('.win[data-win]')].map(member);
  return { document: { url: location.href, timeOrigin: performance.timeOrigin, readyState: document.readyState },
    historyInitialized: typeof window.__sharedDockHistory === 'function',
    missingInitialization: typeof window.__sharedDockHistory === 'function' ? null : 'Document history initialization was not observed',
    viewport: { width: innerWidth, height: innerHeight },
    layer: layer ? { id: identity(layer), clientWidth: layer.clientWidth, clientHeight: layer.clientHeight, bounds: layer.getBoundingClientRect().toJSON(), inputs: authored(layer) } : null,
    state, windows, front: state ? windows.find(node => node.key === state.top) || null : null,
    groups: [...document.querySelectorAll('[data-dock-edge]')].map(group => ({
      id: identity(group), connected: group.isConnected, hidden: group.hidden,
      edge: group.getAttribute('data-dock-edge'), rail: group.hasAttribute('data-dock-rail'),
      selected: windows.filter(node => [...group.querySelectorAll('[aria-selected="true"]')].some(tab => tab.getAttribute('data-dock-key') === node.key)),
      members: windows.filter(node => [...group.querySelectorAll('[data-dock-key]')].some(tab => tab.getAttribute('data-dock-key') === node.key)),
      bounds: group.getBoundingClientRect().toJSON(),
      toggles: [...group.querySelectorAll('.win-dock-toggle')].map(toggle => Object.fromEntries([...toggle.attributes].map(a => [a.name, a.value]))),
      tabs: [...group.querySelectorAll('[data-dock-key]')].map(tab => ({ key: tab.getAttribute('data-dock-key'), selected: tab.getAttribute('aria-selected') }))
    })), focus: document.activeElement && { id: document.activeElement.id, key: document.activeElement.getAttribute('data-dock-key') },
    history: window.__sharedDockHistory ? window.__sharedDockHistory() : null };
}

async function captureLifecycleChecks() {
  const assert = require('assert/strict');
  const vm = require('vm');
  const descriptor = { url: 'https://example.invalid/dock?case=one', timeOrigin: 123456, readyState: 'complete' };
  const fake = { location: { href: descriptor.url }, performance: { timeOrigin: descriptor.timeOrigin },
    document: { readyState: descriptor.readyState, querySelector: () => null, querySelectorAll: () => [], activeElement: null },
    window: {}, innerWidth: 1400, innerHeight: 850 };
  const terminal = vm.runInNewContext('(' + finalPublicState.toString() + ')()', fake);
  assert.deepEqual(JSON.parse(JSON.stringify(terminal.document)), descriptor);
  assert.equal(terminal.historyInitialized, false); assert.match(terminal.missingInitialization, /not observed/);
  fake.document.addEventListener = () => {}; fake.window.addEventListener = () => {};
  vm.runInNewContext('(' + publicHistory.toString() + ')()', fake);
  const history = JSON.parse(JSON.stringify(fake.window.__sharedDockHistory()));
  assert.deepEqual(history.document, descriptor); assert.deepEqual(history.initialized, descriptor);
  const initializedTerminal = vm.runInNewContext('(' + finalPublicState.toString() + ')()', fake);
  assert.equal(initializedTerminal.historyInitialized, true); assert.equal(initializedTerminal.missingInitialization, null);
  const names = ['state', 'trace', 'context', 'video', 'browser'];
  const visited = [];
  const result = await finishCapture({ primary: new Error('primary sentinel'), stages: names.map(name => ({ name, milliseconds: 5,
    run: () => { visited.push(name); if (name !== 'browser') throw new Error(name + ' sentinel'); return true; } })) });
  assert.deepEqual(visited, names);
  assert.match(result.primary, /primary sentinel/);
  assert.equal(result.failed, true);
  for (const operation of [() => Promise.reject(new Error('collector rejection')), () => new Promise(() => {})]) {
    let closed = false;
    const timed = await finishCapture({ stages: [{ name: 'state', milliseconds: 5, run: operation },
      { name: 'browser', milliseconds: 5, run: () => { closed = true; } }] });
    assert.equal(timed.failed, true); assert.equal(closed, true);
    if (timed.outcomes[0].error.includes('Capture stage exceeded')) assert.deepEqual(timed.unresolved, ['state']);
  }
  const clean = await finishCapture({ stages: names.map(name => ({ name, milliseconds: 5, run: () => true })) });
  assert.equal(clean.failed, false);
  let lateRecorded = false, closedAfterTimeout = false;
  const late = await finishCapture({ primary: new Error('original primary'),
    onLate: report => { lateRecorded = report.lateSettlements.some(row => /late rejection sentinel/.test(row.error || '')); },
    stages: [{ name: 'state', milliseconds: 5, run: () => new Promise((resolve, reject) => setTimeout(() => reject(new Error('late rejection sentinel')), 15)) },
      { name: 'browser', milliseconds: 100, run: async () => { closedAfterTimeout = true; await new Promise(resolve => setTimeout(resolve, 25)); } }] });
  assert.equal(closedAfterTimeout, true); assert.equal(lateRecorded, true);
  assert.match(late.primary, /original primary/); assert.match(late.outcomes[0].error, /Capture stage exceeded/);
  assert.match(late.lateSettlements[0].error, /late rejection sentinel/); assert.deepEqual(late.unresolved, []);
  const directory = path.resolve('fake-video'), expected = path.join(directory, 'expected.webm');
  const files = new Map([[expected, Buffer.from('expected video')], [path.join(directory, 'stale.webm'), Buffer.from('stale video')]]);
  const io = { readFileSync: file => { if (!files.has(file)) throw new Error('missing expected file'); return files.get(file); }, readdirSync: () => ['expected.webm', 'stale.webm'] };
  const verified = await expectedVideo({ path: async () => expected }, directory, io);
  assert.equal(verified.expected.sha256, crypto.createHash('sha256').update(files.get(expected)).digest('hex'));
  for (const video of [null, { path: async () => { throw new Error('path sentinel'); } }, { path: async () => '' },
    { path: async () => path.resolve('outside.webm') }, { path: async () => path.join(directory, 'missing.webm') }]) {
    let browserClosed = false;
    const failure = await finishCapture({ primary: new Error('video primary'), stages: [
      { name: 'video', milliseconds: 50, run: () => expectedVideo(video, directory, io) },
      { name: 'browser', milliseconds: 50, run: () => { browserClosed = true; } }] });
    assert.equal(failure.failed, true); assert.match(failure.primary, /video primary/); assert.equal(browserClosed, true);
  }
  files.set(expected, Buffer.alloc(0));
  await assert.rejects(expectedVideo({ path: async () => expected }, directory, io), /Empty expected video/);
  console.log('PASS capture lifecycle preserves primary errors and independently attempts bounded cleanup');
  console.log('PASS capture retains late errors and verifies the expected page video independently of stale files');
}
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
async function main() {
  const media = engine === 'webkit';
  const videoDirectory = out('shared-docks-video');
  const trace = out('shared-docks-trace.zip'), stateFile = out('shared-docks-state.json'), mediaFile = out('shared-docks-media.json');
  if (media) fs.mkdirSync(videoDirectory, { recursive: true });
  const browser = await launch();
  let context, page, video, primary;
  const errors = [];
  try {
  context = await browser.newContext({ viewport: { width: 1400, height: 850 }, reducedMotion: 'reduce',
    ...(media ? { recordVideo: { dir: videoDirectory, size: { width: 1400, height: 850 } } } : {}) });
  if (media) {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    await context.addInitScript(publicHistory);
  }
  page = await context.newPage();
  if (media) video = page.video();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(ROOT + '/samples/shared-docks.html');
  await page.waitForSelector('[data-dock-key="workspace"]');
  check('default docks keep the plain address', await page.evaluate(() => location.search === ''));
  const win = key => page.locator('.win[data-win="' + key + '"]');
  const tab = key => page.locator('[data-dock-key="' + key + '"]');
  const mode = (edge, value) => page.evaluate(([e, v]) => pudlWindows.dockMode(e, v), [edge, value]);
  const box = selector => page.locator(selector).boundingBox();
  check('required windows appear first in their dock', await page.locator('[data-dock-edge="left"] [role="tab"]').first().getAttribute('data-dock-key') === 'workspace');
  check('the two docks select independently', await win('chats').isVisible() || await win('workspace').isVisible());
  const left = await box('[data-dock-edge="left"]'), note = await win('note').boundingBox();
  check('the maximized window leaves room for both docks', note.x >= left.width && note.width < 800, { left, note });
  for (const edge of ['left', 'right']) {
    const toggle = page.locator('[data-dock-edge="' + edge + '"] .win-dock-toggle');
    check('the ' + edge + ' automatic open dock is unpressed', await toggle.getAttribute('aria-pressed') === 'false' && await page.evaluate(e => pudlWindows.state().docks[e].mode === 'auto', edge));
    const before = await toggle.boundingBox();
    await toggle.click();
    check('the ' + edge + ' first activation pins the automatic dock open', await toggle.getAttribute('aria-pressed') === 'true' && await page.evaluate(e => pudlWindows.state().docks[e].mode === 'open', edge));
    await toggle.click();
    check('the ' + edge + ' subsequent activation unpins to rail', await toggle.getAttribute('aria-pressed') === 'false' && await page.evaluate(e => pudlWindows.state().docks[e].mode === 'rail', edge));
    const after = await toggle.boundingBox();
    check('the ' + edge + ' pin button keeps the same position', Math.abs(before.x - after.x) < .5 && Math.abs(before.y - after.y) < .5, { before, after });
    const firstTab = await page.locator('[data-dock-edge="' + edge + '"] [role="tab"]').first().boundingBox();
    check('the ' + edge + ' rail puts Pin above its tabs', after.y + after.height <= firstTab.y);
    await toggle.click();
    await mode(edge, 'auto');
  }
  await tab('chats').click();
  await page.locator('#chat-search').fill('Keep this draft');
  await tab('workspace').click();
  await tab('chats').click();
  check('switching tabs preserves mounted content', await page.locator('#chat-search').inputValue() === 'Keep this draft');
  check('a tabbed dock omits the window title bar', !(await win('chats').locator('.win-head').isVisible()));
  const oldWidth = (await win('chats').boundingBox()).width;
  const grip = await win('chats').locator('.win-rh[data-edge="e"]').boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 + 60, grip.y + grip.height / 2, { steps: 5 });
  await page.mouse.up();
  const sharedWidth = (await win('chats').boundingBox()).width;
  await tab('workspace').click();
  check('resizing one dock tab changes every tab width', sharedWidth > oldWidth + 40 && Math.abs((await win('workspace').boundingBox()).width - sharedWidth) < 2);
  await page.reload();
  await tab('chats').click();
  check('the shared dock width survives reload', Math.abs((await win('chats').boundingBox()).width - sharedWidth) < 2);
  await page.locator('[data-dock-menu="chats"]').click();
  await page.waitForSelector('#win-menu-chats:popover-open');
  check('the tab menu exposes the ordinary window commands', await page.locator('#win-menu-chats [data-win-cmd="close"]').isVisible());
  await page.keyboard.press('Escape');
  check('Escape returns focus to the tab menu button', await page.locator('[data-dock-menu="chats"]').evaluate(el => el === document.activeElement));
  await tab('workspace').click();
  await tab('chats').focus();
  await page.keyboard.press('Shift+F10');
  await page.waitForSelector('#win-menu-chats:popover-open');
  check('the context-menu key reveals an inactive dock tab', await win('chats').isVisible());
  await page.keyboard.press('Escape');
  await page.evaluate(() => { pudlWindows.dock('workspace', null); pudlWindows.snap('workspace', 'right'); });
  check('a dock-only sidebar refuses floating and snapping', await page.evaluate(() => pudlWindows.state().place.workspace.mode === 'dock-left'));
  await tab('workspace').focus();
  await page.keyboard.press('ArrowRight');
  check('arrows move focus without selecting', await tab('chats').evaluate(el => el === document.activeElement));
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  check('Enter selects the focused tab', await win('workspace').isVisible() && !(await win('chats').isVisible()));
  check('required windows have no close affordance', await tab('workspace').locator('.doc-tab-close').count() === 0 && !(await win('workspace').locator('[data-win-action="close"]').isVisible()));
  await page.locator('[data-dock-menu="workspace"]').click();
  await page.waitForSelector('#win-menu-workspace:popover-open');
  check('a required sidebar menu keeps docking commands and omits Close', await page.locator('#win-menu-workspace [data-win-cmd="close"]').count() === 0 && await page.locator('#win-menu-workspace [data-win-cmd="dock:right"]').isVisible());
  await page.keyboard.press('Escape');
  await page.evaluate(() => { pudlWindows.close('workspace'); pudlWindows.replace('workspace', 'note'); pudlWindows.rekey('workspace', 'other'); });
  check('public close, replacement and rekey preserve required windows', await win('workspace').count() === 1 && await page.evaluate(() => !pudlWindows.menuCommands('workspace').some(c => c.id === 'close')));
  await tab('workspace').focus();
  await page.keyboard.press('Delete');
  check('Delete preserves required windows', await win('workspace').count() === 1);
  await tab('chats').focus();
  await page.evaluate(() => {
    const el = document.querySelector('.win[data-win="chats"]');
    el.addEventListener('pudl:window-closing', e => e.preventDefault(), { once: true });
  });
  await page.keyboard.press('Delete');
  check('a dirty applet can refuse tab closure', await win('chats').count() === 1);
  await page.evaluate(() => document.querySelector('.win[data-win="chats"]').setAttribute('data-win-attention', '7'));
  await page.waitForFunction(() => document.querySelector('[data-dock-key="chats"]').getAttribute('aria-label').includes('7'));
  check('live status updates preserve tab focus', await tab('chats').evaluate(el => el === document.activeElement));
  check('taskbar and side tab show the same attention count', await page.locator('[data-win-tab="chats"] .win-item-attention').textContent() === '7');
  await page.evaluate(() => document.querySelector('.win[data-win="chats"]').setAttribute('data-win-progress', '42'));
  await page.waitForFunction(() => document.querySelector('[data-win-tab="chats"] .win-item-progress').textContent === '42%');
  check('progress appears in the taskbar and tab name', (await tab('chats').getAttribute('aria-label')).includes('42%'));
  await tab('workspace').click();
  await page.locator('#editor').click();
  await page.reload();
  await page.waitForSelector('[data-dock-key="workspace"]');
  check('the dock selection survives reloading with a different front window', await win('workspace').isVisible() && !(await win('chats').isVisible()));
  await page.evaluate(() => { pudlWindows.minimizeAll(); });
  check('Minimize All collapses shared docks to rails', await page.locator('[data-dock-rail]').count() === 2 && !(await win('note').isVisible()));
  await page.evaluate(() => { pudlWindows.restoreAll(); });
  check('Restore All preserves the previous dock preferences', await win('workspace').isVisible() && await win('note').isVisible() && await page.evaluate(() => pudlWindows.state().docks.left.mode === 'auto'));
  await page.evaluate(() => document.documentElement.dataset.theme = 'light');
  await page.screenshot({ path: out('shared-docks-light.png') });
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  await page.screenshot({ path: out('shared-docks-dark.png') });
  const accessibility = await new AxeBuilder({ page }).withRules(['aria-allowed-attr', 'aria-allowed-role', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'button-name']).analyze();
  check('shared docks satisfy the ARIA rules', accessibility.violations.length === 0, accessibility.violations.map(v => v.id));
  await page.setViewportSize({ width: 800, height: 700 });
  await page.waitForSelector('[data-dock-edge="left"][data-dock-rail]');
  check('both side docks become icon rails when narrow', await page.locator('[data-dock-rail]').count() === 2 && !(await win('workspace').isVisible()));
  check('rail buttons match Pin in both dimensions', await page.locator('[data-dock-rail]').evaluateAll(groups => groups.every(group => {
    const pin = group.querySelector('.win-dock-toggle').getBoundingClientRect();
    return [...group.querySelectorAll('[role="tab"]')].every(tab => { const r = tab.getBoundingClientRect(); return r.width === pin.width && r.height === pin.height; });
  })));
  check('Workspace has no rail dropdown', !await page.locator('[data-dock-menu="workspace"]').isVisible());
  check('retracted rail buttons are raised', await page.locator('[data-dock-rail] [data-dock-peek]').count() === 0);
  await page.evaluate(() => { window.peekEvents = []; document.addEventListener('pudl:windows-change', () => peekEvents.push(pudlWindows.shown('workspace'))); });
  const before = await win('note').boundingBox();
  const canonical = await page.evaluate(() => JSON.stringify(pudlWindows.state().place));
  await tab('workspace').click();
  check('a rail opens its window over the central area', await win('workspace').isVisible() && JSON.stringify(await win('note').boundingBox()) === JSON.stringify(before));
  check('transient peek leaves automatic preference unpressed', await page.locator('[data-dock-edge="left"] .win-dock-toggle').getAttribute('aria-pressed') === 'false' && await page.evaluate(() => pudlWindows.state().docks.left.mode === 'auto'));
  check('the flyout button remains depressed', await tab('workspace').evaluate(el => el.hasAttribute('data-dock-peek') && getComputedStyle(el).boxShadow.includes('inset')));
  await page.locator('#workspace-search').fill('Still mounted');
  await page.screenshot({ path: out('shared-docks-rail.png') });
  /* A press outside the windows, such as on a menu bar's title, finishes
     before the slideout retracts, so its click lands where it was pressed
     (0.80.0). */
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = 'Outside'; b.id = 'outside-press';
    b.style.cssText = 'position: fixed; right: 8px; top: 8px; z-index: 99999';
    document.body.appendChild(b);
  });
  const press = page.evaluate(() => new Promise(resolve => document.getElementById('outside-press').addEventListener('click', () => resolve(!!document.querySelector('.win[data-win="workspace"][data-win-dock-peek]')), { once: true })));
  await page.click('#outside-press');
  const peekAtClick = await press;
  await page.waitForFunction(() => !document.querySelector('.win[data-win="workspace"][data-win-dock-peek]'));
  check('a press outside the windows lands before the slideout retracts, which it then does', peekAtClick === true);
  check('outside retraction announces the new shown result', await page.evaluate(() => peekEvents[peekEvents.length - 1] === false));
  await page.evaluate(() => document.getElementById('outside-press').remove());
  await tab('workspace').click();
  await page.keyboard.press('Escape');
  check('Escape retracts the slideout and restores its tab focus', !(await win('workspace').isVisible()) && await tab('workspace').evaluate(el => el === document.activeElement));
  check('Escape retraction announces the new shown result', await page.evaluate(() => peekEvents[peekEvents.length - 1] === false));
  check('retracting releases the rail button', !await tab('workspace').evaluate(el => el.hasAttribute('data-dock-peek')));
  await page.evaluate(() => pudlWindows.raise('workspace'));
  check('focus opening a rail peek announces its shown result', await page.evaluate(() => pudlWindows.shown('workspace') && peekEvents[peekEvents.length - 1] === true));
  await page.keyboard.press('Escape');
  await tab('workspace').click();
  check('a sidebar slideout still has no window title bar', !(await win('workspace').locator('.win-head').isVisible()));
  await tab('workspace').focus();
  await page.keyboard.press('Shift+F10');
  await page.waitForSelector('.win-menu:popover-open');
  check('a slideout stays open while using its menu', await win('workspace').isVisible());
  await page.keyboard.press('Escape');
  check('Escape first closes the menu', await win('workspace').isVisible());
  await page.locator('#editor').click();
  check('working elsewhere retracts an unpinned slideout', !(await win('workspace').isVisible()));
  await tab('workspace').click();
  await page.locator('[data-dock-edge="left"] .win-dock-toggle').click();
  await page.locator('#editor').click();
  check('pinning keeps the dock open', await win('workspace').isVisible() && await page.evaluate(() => pudlWindows.state().docks.left.mode === 'open'));
  check('pinning from peek establishes pressed membership', await page.locator('[data-dock-edge="left"] .win-dock-toggle').getAttribute('aria-pressed') === 'true');
  await page.setViewportSize({ width: 1400, height: 850 });
  check('explicit open remains pressed when wide', await page.locator('[data-dock-edge="left"] .win-dock-toggle').getAttribute('aria-pressed') === 'true');
  await page.setViewportSize({ width: 800, height: 700 });
  check('explicit open remains pressed when narrow', await page.locator('[data-dock-edge="left"] .win-dock-toggle').getAttribute('aria-pressed') === 'true');
  await mode('left', 'auto');
  check('rail interactions preserve canonical window placement', canonical === await page.evaluate(() => JSON.stringify(pudlWindows.state().place)));
  await page.setViewportSize({ width: 1400, height: 850 });
  await page.waitForFunction(() => !document.querySelector('[data-dock-edge="left"]').hasAttribute('data-dock-rail'));
  check('automatic widening does not create pinned membership', await page.locator('[data-dock-edge="left"] .win-dock-toggle').getAttribute('aria-pressed') === 'false');
  check('automatic rails reopen when the layer widens', await win('workspace').isVisible() && await page.locator('#workspace-search').inputValue() === 'Still mounted');
  await page.evaluate(() => pudlWindows.dock('workspace', 'right'));
  check('the required window can move to the other side and stays first', await page.locator('[data-dock-edge="right"] [role="tab"]').first().getAttribute('data-dock-key') === 'workspace');
  await page.evaluate(() => { pudlWindows.raise('chats'); pudlWindows.raise('note'); pudlWindows.rekey('chats', 'conversation'); });
  check('rekeying retains a dock selection that is behind the front window', await page.evaluate(() => pudlWindows.state().docks.left.selected === 'conversation'));
  await page.evaluate(() => pudlWindows.rekey('conversation', 'chats'));
  await page.evaluate(() => pudlWindows.dock('chats', null));
  check('undocking restores the window role', await win('chats').getAttribute('role') === 'dialog');
  check('undocking after rekeying preserves a valid accessible label', await win('chats').evaluate(el => !!document.getElementById(el.getAttribute('aria-labelledby'))));
  await page.evaluate(() => pudlWindows.dock('chats', 'left'));
  await tab('chats').focus();
  await page.keyboard.press('Delete');
  check('Delete closes an ordinary tab', await win('chats').count() === 0);
  await page.setViewportSize({ width: 390, height: 720 });
  await tab('workspace').click();
  check('a phone-sized rail and slideout fit without page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: out('shared-docks-phone.png') });
  await page.goto(ROOT + '/samples/shared-docks.html?open=note');
  await page.waitForSelector('[data-dock-key="workspace"]');
  check('an address cannot omit a required window', await win('workspace').count() === 1);
  await page.route('**/samples/shared-docks.html*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('data-win-required="workspace"', '') });
  });
  await page.goto(ROOT + '/samples/shared-docks.html');
  await page.waitForSelector('[data-dock-key="workspace"]');
  await page.evaluate(() => {
    pudlWindows.dockMode('left', 'rail');
    pudlWindows.dockMode('right', 'open');
    pudlWindows.state().open.forEach(key => pudlWindows.close(key));
  });
  await page.reload();
  await page.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.length === 0);
  check('empty docks retain their preferences across reloads', await page.evaluate(() => pudlWindows.state().docks.left.mode === 'rail' && pudlWindows.state().docks.right.mode === 'open'));
  check('no page errors occurred', !errors.length, errors);
  } catch (error) { primary = error; console.error(error); }
  const report = await finishCapture({ primary, onLate: report => {
    if (media) fs.writeFileSync(mediaFile, JSON.stringify(report, null, 2));
    else console.error('Capture late settlement', JSON.stringify(report));
  }, stages: [
    ...(media && page ? [{ name: 'state', milliseconds: 5000, run: async () => {
      const state = await page.evaluate(finalPublicState);
      fs.writeFileSync(stateFile, JSON.stringify({ state, errors }, null, 2)); return true;
    } }] : []),
    ...(media && context ? [{ name: 'trace', milliseconds: 10000, run: async () => {
      await context.tracing.stop({ path: trace });
      if (!fs.statSync(trace).size) throw new Error('Empty trace'); return true;
    } }] : []),
    ...(context ? [{ name: 'context', milliseconds: 10000, run: () => context.close() }] : []),
    ...(media ? [{ name: 'video', milliseconds: 5000, run: () => expectedVideo(video, videoDirectory) }] : []),
    { name: 'browser', milliseconds: 10000, run: () => browser.close() }
  ] });
  if (media) try { fs.writeFileSync(mediaFile, JSON.stringify(report, null, 2)); }
  catch (error) { report.failed = true; report.outcomes.push({ name: 'report-write', ok: false, error: String(error) }); }
  if (report.failed) { failures++; console.error('FAIL shared dock execution or evidence cleanup', JSON.stringify(report)); }
  process.exitCode = failures ? 1 : 0;
}

module.exports = { finishCapture, captureLifecycleChecks };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
