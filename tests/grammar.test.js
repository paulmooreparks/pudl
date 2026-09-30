/* The web implementation keeps the grammar of PUDL specification 0.2.0,
   as drafting the specification's component sections found it did not:
   the chosen segment pressed in, a field's edge at 3:1, a disabled field
   still sunken, handles that show their grip, glyphs drawn rather than
   typed, and a toast raised over a modal dialog that the reader can
   reach. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errors.push(e.message));

  for (const theme of ['light', 'dark']) {
    await p.goto(ROOT + '/reference.html');
    await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);

    const seg = await p.evaluate(() => {
      const [on, off] = document.querySelectorAll('.seg')[0].querySelectorAll('button');
      const s = el => getComputedStyle(el).boxShadow;
      return { on: s(on), off: s(off) };
    });
    /* Pressed in is one shadow cast inside; raised is the lit edge inside
       and a shadow cast outside. */
    check(theme + ': the chosen segment is pressed in and the others stand raised',
          seg.on.split(',').length === 1 && /inset/.test(seg.on) &&
          seg.off.split(',').length === 2 && /inset/.test(seg.off.split(',')[0]) && !/inset/.test(seg.off.split(',')[1]), JSON.stringify(seg));

    /* The contrast of a field's edge against what it sits on, measured
       from the colours the browser computes. */
    const ratio = await p.evaluate(() => {
      const probe = document.createElement('div');
      document.body.appendChild(probe);
      function rgb(c) { probe.style.color = c; const m = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number); return m[0] <= 1 && /color\(/.test(getComputedStyle(probe).color) ? m.slice(0, 3).map(v => v * 255) : m.slice(0, 3); }
      function lum(c) { return c.map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0); }
      function cr(a, b) { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
      const cs = getComputedStyle(document.documentElement);
      const border = cs.getPropertyValue('--input-border');
      const out = {};
      ['--surface', '--surface-alt', '--bg', '--input-bg'].forEach(t => { out[t] = Math.round(cr(border, cs.getPropertyValue(t)) * 100) / 100; });
      probe.remove();
      return out;
    });
    check(theme + ': a field\'s edge reaches 3:1 on every surface it sits on', Object.values(ratio).every(r => r >= 3), JSON.stringify(ratio));
  }

  await p.goto(ROOT + '/reference.html');
  const placeholder = await p.evaluate(() => {
    const i = document.createElement('input'); i.className = 'form-input'; i.placeholder = 'x'; document.body.appendChild(i);
    const o = getComputedStyle(i, '::placeholder').opacity; i.remove(); return o;
  });
  check('placeholder text is not faded below its colour', placeholder === '1', placeholder);

  /* WebKit draws a native select without the box shadow, enabled or not,
     so the test is that disabling one changes nothing but its dimming. */
  const disabled = await p.evaluate(() => {
    const look = off => {
      const s = document.createElement('select'); s.className = 'form-select'; s.disabled = off; document.body.appendChild(s);
      const cs = getComputedStyle(s); const o = cs.boxShadow + '|' + cs.borderTopColor + '|' + cs.backgroundColor + '|' + cs.paddingLeft; s.remove(); return o;
    };
    return { on: look(false), off: look(true) };
  });
  check('a disabled select keeps the look of an enabled one', disabled.on === disabled.off, JSON.stringify(disabled));

  const grips = await p.evaluate(() => Array.from(document.querySelectorAll('.md-resize, .split-handle')).map(h => {
    const a = getComputedStyle(h, '::after'); return a.content !== 'none' && /glyph|svg/.test(a.maskImage || a.webkitMaskImage || '') ;
  }));
  check('every handle shows its grip at rest', grips.length >= 3 && grips.every(Boolean), JSON.stringify(grips));

  const typed = await p.evaluate(() => Array.from(document.querySelectorAll('.filter-chip-x, .theme-toggle, .icon-btn')).filter(el => el.textContent.trim() !== '').map(el => el.outerHTML.slice(0, 80)));
  check('no chip remove button, theme toggle or glyph button holds a typed character', typed.length === 0, typed.join(' | '));
  const drawn = await p.evaluate(() => { const x = document.querySelector('.filter-chip-x'); const s = getComputedStyle(x, '::before'); return s.content !== 'none' && /svg/.test(s.maskImage || s.webkitMaskImage || ''); });
  check('the chip remove button draws the close glyph', drawn);

  /* A toast raised while a modal dialog is open. */
  await p.evaluate(() => document.getElementById('demo-dialog').showModal());
  await p.evaluate(() => pudlToast('Saved inside', { sticky: true }));
  await p.waitForFunction(() => Array.from(document.querySelectorAll('.toast-text')).some(t => t.textContent === 'Saved inside'), null, { timeout: 3000 }).catch(() => {});
  const inside = await p.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.toast')).find(x => x.textContent.includes('Saved inside'));
    if (!t) return { found: false };
    const r = t.querySelector('.toast-close').getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { found: true, inDialog: !!t.closest('dialog'), reachable: !!hit && !!hit.closest('.toast-close') };
  });
  check('a toast raised over a modal dialog sits in the dialog, above its backdrop, where it can be dismissed', inside.found && inside.inDialog && inside.reachable, JSON.stringify(inside));
  await p.evaluate(() => document.getElementById('demo-dialog').close());
  const home = await p.waitForFunction(() => { const t = Array.from(document.querySelectorAll('.toast')).find(x => x.textContent.includes('Saved inside')); return !!t && !t.closest('dialog') && !document.querySelector('dialog .toast-region'); }, null, { timeout: 3000 }).then(() => true, () => false);
  check('and when the dialog closes it moves back to the page', home);

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
