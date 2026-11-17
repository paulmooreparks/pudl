/* What one change costs among many windows (0.108.0). Bringing a window to
   the front reads the layer's size once, not once a window; a change to
   one window's state draws that window's marks and no other window's; a
   write that changes nothing costs nothing; a key that runs no command,
   and drawing the command controls, search no part of the page beyond the
   controls. These are counted, not timed, so the test is exact. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/tests/fixtures/window-scaling.html');
  await p.waitForSelector('#dock [data-win-tab="w23"]');
  await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 100)))));

  /* Every count is of calls made from the PUDL scripts named. */
  await p.evaluate(() => {
    window.__counts = {};
    const from = re => re.test(new Error().stack.split('\n').slice(2).join('\n'));
    const count = label => { window.__counts[label] = (window.__counts[label] || 0) + 1; };
    const layer = document.querySelector('[data-win-layer]');
    ['clientWidth', 'clientHeight'].forEach(name => {
      const d = Object.getOwnPropertyDescriptor(Element.prototype, name);
      Object.defineProperty(Element.prototype, name, { configurable: true, get() { if (this === layer && from(/pudl-windows/)) count('layer ' + name); return d.get.call(this); } });
    });
    ['querySelector', 'querySelectorAll'].forEach(name => {
      const doc = Document.prototype[name], el = Element.prototype[name];
      Document.prototype[name] = function () {
        if (from(/pudl-commands/)) count('commands page-wide ' + name);
        if (from(/pudl-windows/)) count('windows page-wide ' + name);
        return doc.apply(this, arguments);
      };
      Element.prototype[name] = function () {
        if (from(/pudl-windows/)) {
          const win = this.closest && this.closest('.win[data-win]');
          if (win) count('in window ' + win.getAttribute('data-win'));
          count('windows element ' + name);
        }
        return el.apply(this, arguments);
      };
    });
    window.__take = () => { const c = window.__counts; window.__counts = {}; return c; };
  });
  const take = () => p.evaluate(() => window.__take());
  const settle = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50)))));

  /* Bringing a window to the front. */
  await take();
  await p.evaluate(() => window.pudlWindows.raise('w3'));
  let c = await take();
  check('bringing a window to the front reads the layer\'s width at most once', (c['layer clientWidth'] || 0) <= 1, JSON.stringify(c['layer clientWidth']));
  check('the window raised is in front', await p.evaluate(() => window.pudlWindows.top() === 'w3' && window.pudlWindows.state().top === 'w3'));
  check('isOpen says which windows are open', await p.evaluate(() => window.pudlWindows.isOpen('w7') && !window.pudlWindows.isOpen('nope')));
  await p.evaluate(() => window.pudlWindows.raise('w4'));
  check('a child window stays above its parent when the parent is raised', await p.evaluate(() => {
    const z = k => Number(document.querySelector('[data-win="' + k + '"]').style.zIndex);
    return z('w5') > z('w4') && z('w4') > z('w3');
  }));
  await settle();

  /* A change to one window's state. */
  await take();
  await p.evaluate(() => { document.querySelector('[data-win="w9"]').setAttribute('data-win-state', 'working'); });
  await settle();
  c = await take();
  const others = Object.keys(c).filter(k => k.indexOf('in window ') === 0 && k !== 'in window w9');
  check('a change to one window\'s state looks into no other window', others.length === 0, others.join(', '));
  check('its taskbar button shows the state', await p.evaluate(() => document.querySelector('#dock [data-win-tab="w9"] .win-state').getAttribute('data-state') === 'working'));
  check('another window\'s button shows none', await p.evaluate(() => document.querySelector('#dock [data-win-tab="w8"] .win-state').getAttribute('data-state') === ''));
  check('its title bar shows the state', await p.evaluate(() => {
    const mark = document.querySelector('[data-win="w9"] .win-head .win-state');
    return !mark || mark.getAttribute('data-state') === 'working';
  }));

  /* A write of the value an attribute already has. */
  await take();
  await p.evaluate(() => { document.querySelector('[data-win="w9"]').setAttribute('data-win-state', 'working'); });
  await settle();
  c = await take();
  const windowWork = Object.keys(c).filter(k => /^(windows|in window)/.test(k));
  check('a write that changes nothing costs the window layer nothing', windowWork.length === 0, JSON.stringify(c));

  /* A change to a window's group still redraws the docks. */
  await p.evaluate(() => { document.querySelector('[data-win="w9"]').setAttribute('data-win-state', 'waiting'); });
  await settle();
  check('a later change of state is drawn too', await p.evaluate(() => document.querySelector('#dock [data-win-tab="w9"] .win-state').getAttribute('data-state') === 'waiting'));

  /* Keys and commands. */
  await p.locator('#dock [data-win-tab="w2"]').focus();
  await take();
  await p.keyboard.press('KeyQ');
  c = await take();
  check('a key that runs no command searches nothing page-wide', !c['commands page-wide querySelector'] && !c['commands page-wide querySelectorAll'], JSON.stringify(c));
  await p.keyboard.press('Control+KeyS');
  check('a key that runs a command still runs it', await p.evaluate(() => window.__saved === 1));
  await take();
  await p.evaluate(() => { window.pudlCommands.changed(); return new Promise(r => setTimeout(r, 50)); });
  c = await take();
  check('drawing the command controls searches nothing page-wide', !c['commands page-wide querySelectorAll'], JSON.stringify(c));
  await p.evaluate(() => {
    const b = document.createElement('button');
    b.className = 'btn'; b.id = 'late'; b.setAttribute('data-command', 'print');
    document.querySelector('#tools .toolbar-group').appendChild(b);
    return new Promise(r => setTimeout(r, 50));
  });
  check('a control added later is drawn', await p.evaluate(() => (document.getElementById('late').textContent || '').trim() === 'Print' || document.getElementById('late').hasAttribute('aria-label')));
  /* A modal dialog still takes the keys. */
  await p.evaluate(() => {
    const d = document.createElement('dialog');
    d.innerHTML = '<input id="modal-field">';
    document.body.appendChild(d);
    d.showModal();
  });
  await p.keyboard.press('Control+KeyS');
  check('a modal dialog still takes a command\'s key', await p.evaluate(() => window.__saved === 1));

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
