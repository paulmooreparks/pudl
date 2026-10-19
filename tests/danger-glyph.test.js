/* A danger button and a danger menu row lead with the warning glyph,
   drawn by PUDL, unless they hold a picture of their own (0.66.0). */
const { launch, ROOT, engine } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto(ROOT + '/reference.html');
  await p.evaluate(() => {
    const box = document.createElement('div');
    box.id = 'danger-probe';
    box.innerHTML =
      '<button class="btn btn-danger" id="plain">Delete</button>' +
      '<button class="btn btn-danger" id="own"><span class="glyph" aria-hidden="true" style="--glyph: var(--glyph-square)"></span> Stop</button>' +
      '<button class="btn btn-danger" id="typed"><span aria-hidden="true">!</span> Discard</button>' +
      '<div class="menu-panel" style="display:block;position:static">' +
      '  <button class="menu-action" aria-pressed="true" id="toggle">Wrap</button>' +
      '  <button class="menu-action" id="other">Copy</button>' +
      '  <button class="menu-action danger" id="row">Delete</button>' +
      '  <button class="menu-action danger" aria-pressed="false" id="dtoggle">Danger toggle</button>' +
      '</div>' +
      '<div class="menu-panel menubar-panel" style="display:block;position:static">' +
      '  <button class="menu-action danger" id="bar"><span class="menubar-label"><span class="menubar-words">Close all</span></span><span class="menubar-shortcut" aria-hidden="true">Ctrl+W</span></button>' +
      '  <button class="menu-action danger" id="baricon"><span class="glyph menubar-icon" aria-hidden="true" style="--glyph: var(--glyph-square)"></span><span class="menubar-label">Stop</span></button>' +
      '</div>';
    document.querySelector('main, body').prepend(box);
  });
  const g = id => p.evaluate(id => {
    const el = document.getElementById(id), s = getComputedStyle(el, '::before');
    const label = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()) || el.querySelector('.menubar-label');
    let gap = null;
    if (s.content !== 'none' && label) {
      const r = document.createRange(); r.selectNodeContents(label);
      gap = r.getBoundingClientRect().left - el.getBoundingClientRect().left - parseFloat(getComputedStyle(el).paddingLeft);
    }
    return { content: s.content, w: parseFloat(s.width), mask: (s.maskImage || s.webkitMaskImage || '').slice(0, 120), color: s.backgroundColor,
      text: getComputedStyle(el).color, pad: parseFloat(getComputedStyle(el).paddingInlineStart), gap };
  }, id);

  const plain = await g('plain');
  check('a danger button leads with the warning glyph', plain.content !== 'none' && plain.w > 10 && /6\.6 12H1\.4|6.6%2012H1.4/.test(plain.mask), JSON.stringify(plain));
  check('the glyph is in the label\'s colour', plain.color === plain.text, JSON.stringify(plain));
  check('a danger button with a glyph of its own keeps that one alone', (await g('own')).content === 'none');
  check('a danger button with typed decoration hidden from readers keeps it alone', (await g('typed')).content === 'none');

  const row = await g('row'), other = await g('other');
  check('a danger menu row leads with a 12px warning glyph', row.content !== 'none' && row.w === 12, JSON.stringify(row));
  check('in a menu with a tick, the danger row\'s glyph takes the tick\'s column, so its label lines up',
    row.pad === 14 && Math.abs(row.gap - (other.pad - 14)) <= 1, JSON.stringify({ row, other }));
  const dt = await g('dtoggle');
  check('a danger row that switches keeps its tick in place of the glyph', dt.content !== 'none' && !/6\.6 12H1\.4|6.6%2012H1.4/.test(dt.mask), JSON.stringify(dt));
  check('a menu bar\'s danger row with a shortcut still gets the glyph', (await g('bar')).content !== 'none');
  check('a menu bar\'s danger row with its own icon keeps that one alone', (await g('baricon')).content === 'none');

  await p.hover('#plain');
  const hovered = await g('plain');
  check('under the pointer the glyph follows the label\'s colour', hovered.color === hovered.text, JSON.stringify(hovered));

  if (engine === 'chromium') {
    await p.emulateMedia({ forcedColors: 'active' });
    const fc = await g('row');
    check('in forced colours the glyph is drawn in the button text colour', fc.content !== 'none' && fc.color !== 'rgba(0, 0, 0, 0)', JSON.stringify(fc));
  }

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
