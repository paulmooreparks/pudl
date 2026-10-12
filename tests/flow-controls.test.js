/* The controls an application's Flow window built for itself (specification
   0.21.0, docs/proposals/flow-ui-controls.md): disclosure cards, the zoom
   group, the arrow glyphs, row editors, a command on a label's line, row
   lists with a tree's keys, and window buttons sized to the title. */
const { launch, ROOT, out } = require('./lib');
const { AxeBuilder } = require('@axe-core/playwright');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  for (const theme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' });
    await ctx.addInitScript(t => { try { localStorage.setItem('pudl-theme', t); } catch (e) {} }, theme);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(ROOT + '/tests/fixtures/flow-controls.html');
    await p.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
    await p.waitForSelector('.card.disclose-ready');
    const T = theme + ': ';
    const vis = sel => p.locator(sel).isVisible();
    const box = sel => p.locator(sel).boundingBox();

    /* 1. The disclosure card. */
    check(T + 'a closed card shows its summary and hides its body and foot', await vis('#step-1 .card-summary') && !(await vis('#step-1-body')) && !(await vis('#step-1 .card-actions')));
    check(T + 'an open card shows its body and hides its summary', await vis('#step-2-body') && !(await vis('#step-2 .card-summary')));
    const toggle = await p.evaluate(() => {
      const t = document.querySelector('#step-1 .card-toggle'), tree = document.createElement('span');
      tree.className = 'tree-toggle'; document.body.appendChild(tree);
      const a = getComputedStyle(t), c = getComputedStyle(tree);
      const same = ['width', 'height', 'backgroundImage', 'borderTopColor', 'borderTopLeftRadius', 'boxShadow'].every(k => a[k] === c[k]);
      tree.remove();
      return { same, raised: a.backgroundImage !== 'none', labelled: t.getAttribute('aria-labelledby') === document.querySelector('#step-1 .card-title').id, controls: t.getAttribute('aria-controls') === 'step-1-body' };
    });
    check(T + 'the toggle is the tree toggle, raised, and named for the title', toggle.same && toggle.raised && toggle.labelled && toggle.controls, toggle);
    const head = await box('#step-1 .card-head'), tg = await box('#step-1 .card-toggle');
    check(T + 'the toggle stands at the start of the head', tg.x - head.x < 24 && tg.x - head.x > 8);
    const opened = [];
    await p.exposeFunction('onDisclose_' + theme, d => opened.push(d));
    await p.evaluate(t => document.getElementById('step-1').addEventListener('pudl:disclose', e => window['onDisclose_' + t](e.detail.open)), theme);
    await p.locator('#step-1 .card-toggle').click();
    check(T + 'a press opens the card and hides the summary', await vis('#step-1-body') && await vis('#step-1 .card-actions') && !(await vis('#step-1 .card-summary')));
    check(T + 'pudl:disclose says it opened', opened[0] === true);
    check(T + 'the toggle is exposed as expanded and the summary hidden', await p.evaluate(() => document.querySelector('#step-1 .card-toggle').getAttribute('aria-expanded') === 'true' && document.querySelector('#step-1 .card-summary').getAttribute('aria-hidden') === 'true'));
    await p.locator('#step-1 .card-toggle').focus();
    await p.keyboard.press('Space');
    check(T + 'Space closes it again', !(await vis('#step-1-body')) && opened[1] === false);
    await p.keyboard.press('Enter');
    check(T + 'Enter opens it', await vis('#step-1-body'));
    check(T + 'the title is not a tab stop', await p.evaluate(() => document.querySelector('#step-1 .card-title').tabIndex < 0 && getComputedStyle(document.querySelector('#step-1 .card-title')).cursor !== 'pointer'));

    /* 5. A command on the label's line. */
    const lab = await box('label[for="step-1-text"]'), ins = await box('#insert-1');
    check(T + 'the command sits at the end of the label\'s line', ins.x > lab.x + lab.width && Math.abs((lab.y + lab.height) - (ins.y + ins.height)) < 12, { lab, ins });
    check(T + 'the command is a raised menu button, not a field', await p.evaluate(() => { const s = getComputedStyle(document.getElementById('insert-1')); return s.backgroundImage !== 'none' && document.getElementById('insert-1').tagName === 'BUTTON'; }));
    check(T + 'the label still names only the field', await p.evaluate(() => document.getElementById('step-1-text').labels.length === 1 && document.getElementById('step-1-text').labels[0].textContent.trim() === 'Text'));
    await p.locator('#insert-1').click();
    await p.locator('#answers-1 [data-insert]').first().click();
    check(T + 'choosing a row inserts into the field', await p.locator('#step-1-text').inputValue() === '{{steps.research.summary}}');
    await p.evaluate(() => { document.getElementById('step-1').querySelector('.card-body').style.width = '180px'; });
    const lab2 = await box('label[for="step-1-text"]'), ins2 = await box('#insert-1');
    check(T + 'too narrow for both, the command wraps under the label', ins2.y > lab2.y + lab2.height - 2 && Math.abs(ins2.x - lab2.x) < 4, { lab2, ins2 });
    await p.evaluate(() => { document.getElementById('step-1').querySelector('.card-body').style.width = ''; });

    /* 3. The arrows. */
    const arrows = await p.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const up = cs.getPropertyValue('--glyph-arrow-up'), down = cs.getPropertyValue('--glyph-arrow-down');
      const el = document.querySelector('#step-1 .card-actions .icon-btn .glyph');
      return { up: up.includes('svg'), down: down.includes('svg'), differ: up !== down, noturn: getComputedStyle(el).transform === 'none' };
    });
    check(T + 'arrow-up and arrow-down are glyphs of their own, and nothing turns them', arrows.up && arrows.down && arrows.differ && arrows.noturn, arrows);

    /* 2. Zoom. */
    const scale = () => p.locator('.zoom-scale').textContent();
    const svgW = () => p.evaluate(() => document.querySelector('#chart svg').getBoundingClientRect().width);
    check(T + 'the picture opens fitted to the viewport\'s width', Math.abs(await svgW() - 398) < 4 && await scale() === '50%', { w: await svgW(), s: await scale() });
    check(T + 'the zoom buttons hold glyphs, not characters', await p.evaluate(() => [...document.querySelectorAll('.zoom .icon-btn')].every(b => b.textContent.trim() === '' && b.querySelector('.glyph'))));
    const zooms = [];
    await p.exposeFunction('onZoom_' + theme, d => zooms.push(d));
    await p.evaluate(t => document.getElementById('chart').addEventListener('pudl:zoom', e => window['onZoom_' + t](e.detail)), theme);
    await p.evaluate(() => { const v = document.getElementById('chart'); v.scrollLeft = 100; v.scrollTop = 50; });
    const middle = () => p.evaluate(() => { const v = document.getElementById('chart'), s = pudlZoom.state(v).scale; return { x: (v.scrollLeft + v.clientWidth / 2) / s, y: (v.scrollTop + v.clientHeight / 2) / s, s }; });
    const before = await middle();
    await p.locator('[data-zoom="in"]').click();
    const after = await middle();
    check(T + 'Zoom In steps the scale by 1.25 and keeps the middle in place', Math.abs(after.s - before.s * 1.25) < 1e-9 && Math.abs(before.x - after.x) < 2 && Math.abs(before.y - after.y) < 2, { before, after });
    check(T + 'pudl:zoom reports the scale and that it is no longer fitted', zooms.length === 1 && Math.abs(zooms[0].scale - after.s) < 1e-9 && zooms[0].fit === false, zooms);
    for (let i = 0; i < 12; i++) await p.locator('[data-zoom="in"]').click({ force: true });
    check(T + 'the scale stops at the greatest and Zoom In is disabled', await scale() === '400%' && await p.locator('[data-zoom="in"]').isDisabled());
    await p.locator('[data-zoom="fit"]').click();
    check(T + 'Fit returns to the fitted scale at the start', await scale() === '50%' && await p.evaluate(() => document.getElementById('chart').scrollLeft === 0 && document.getElementById('chart').scrollTop === 0));
    await p.locator('#chart').focus();
    await p.keyboard.press('Control+Minus');
    check(T + 'Ctrl+Minus zooms out while the viewport has focus', await scale() === '40%');
    await p.keyboard.press('Control+0');
    check(T + 'Ctrl+0 fits', await scale() === '50%');
    await p.locator('#step-1-text').focus();
    await p.keyboard.press('Control+Minus');
    check(T + 'the keys do nothing elsewhere', await scale() === '50%');
    for (let i = 0; i < 12; i++) await p.locator('[data-zoom="out"]').click({ force: true });
    check(T + 'the scale stops at the least and Zoom Out is disabled', await scale() === '25%' && await p.locator('[data-zoom="out"]').isDisabled());
    check(T + 'the viewport is sunken and a tab stop', await p.evaluate(() => { const v = document.getElementById('chart'), s = getComputedStyle(v); return v.tabIndex === 0 && s.boxShadow !== 'none' && s.backgroundImage === 'none'; }));

    /* 4. The row editor. */
    const cells = await p.evaluate(() => {
      const t = document.querySelector('#inputs .row-editor');
      const th = getComputedStyle(t.querySelector('th'));
      const r = t.querySelector('td.row-editor-remove').getBoundingClientRect();
      const b = t.querySelector('[data-row-remove]').getBoundingClientRect();
      return { flatHeading: th.backgroundImage === 'none' && th.fontWeight === '600', removeCol: r.width <= b.width + 12, tableRole: t.tagName === 'TABLE', spans: t.querySelector('.row-editor-more td').colSpan === 4 };
    });
    check(T + 'headings are flat, the remove column is no wider than its button, the second line spans', cells.flatHeading && cells.removeCol && cells.tableRole && cells.spans, cells);
    const wide = await box('#inputs'), tbl = await box('#inputs .row-editor');
    check(T + 'a wide editor keeps its rows on one line', tbl.width > 600 && (await box('#inputs tbody tr:first-child td:first-child')).y === (await box('#inputs tbody tr:first-child td:nth-child(2)')).y);
    const removed = [];
    await p.exposeFunction('onRemove_' + theme, d => removed.push(d));
    await p.evaluate(t => document.getElementById('inputs').addEventListener('pudl:row-remove', e => window['onRemove_' + t](e.detail.index)), theme);
    await p.locator('[aria-label="Remove input 1"]').click();
    check(T + 'Remove takes the row and its second line, and focuses the next row\'s first field', removed[0] === 0 && await p.locator('#inputs tbody tr').count() === 1 && await p.evaluate(() => document.activeElement.getAttribute('aria-label') === 'Name of input 2'));
    await p.locator('[aria-label="Remove input 2"]').click();
    check(T + 'removing the last row focuses Add', await p.evaluate(() => document.activeElement === document.querySelector('#inputs [data-row-add]')));
    await p.locator('#inputs [data-row-add]').click();
    check(T + 'Add appends a row and focuses its first field', await p.locator('#inputs tbody tr').count() === 1 && await p.evaluate(() => document.activeElement.getAttribute('aria-label') === 'Name of input 3'));
    await p.evaluate(() => { document.getElementById('inputs').addEventListener('pudl:row-remove', e => e.preventDefault(), { once: true }); });
    await p.locator('[aria-label="Remove input 3"]').click();
    check(T + 'a host can cancel a removal', await p.locator('#inputs tbody tr').count() === 1);
    const narrow = await p.evaluate(() => {
      const t = document.querySelector('#narrow-editor .row-editor');
      const tds = t.querySelectorAll('tbody td'), a = tds[0].getBoundingClientRect(), b2 = tds[1].getBoundingClientRect();
      const label = getComputedStyle(tds[0], '::before').content;
      const rm = t.querySelector('td.row-editor-remove').getBoundingClientRect(), row = t.querySelector('tbody tr').getBoundingClientRect();
      return { stacked: b2.y > a.y + a.height - 1, label, removeAtTopEnd: rm.y - row.y < 16 && rm.right >= row.right - 2, fits: t.getBoundingClientRect().width <= 360, headHidden: t.querySelector('thead').getBoundingClientRect().width <= 1 };
    });
    check(T + 'a narrow editor stacks each row\'s fields under their headings with Remove at the top end', narrow.stacked && narrow.label.includes('Label') && narrow.removeAtTopEnd && narrow.fits && narrow.headHidden, narrow);

    /* 6. The row list. */
    check(T + 'the row list\'s rows are links drawn as sidebar rows', await p.evaluate(() => { const a = document.querySelector('#runs .md-item'); return a.tagName === 'A' && getComputedStyle(a).textDecorationLine === 'none' && getComputedStyle(a.parentElement).borderInlineEndWidth === '3px'; }));
    check(T + 'the current row carries the accent edge and bold', await p.evaluate(() => { const r = document.querySelector('#runs [aria-current="true"]').parentElement; const s = getComputedStyle(r); return s.borderInlineEndColor !== 'rgba(0, 0, 0, 0)' && getComputedStyle(r.querySelector('.md-item')).fontWeight === '700'; }));
    check(T + 'the current row is the list\'s one tab stop', await p.evaluate(() => [...document.querySelectorAll('#runs .md-item')].map(a => a.tabIndex).join() === '-1,0,-1'));
    await p.locator('#runs [aria-current="true"]').focus();
    await p.keyboard.press('ArrowDown');
    check(T + 'Down moves focus to the next row without going anywhere', await p.evaluate(() => document.activeElement.getAttribute('href') === '?run=3' && location.search === ''));
    await p.keyboard.press('Home');
    check(T + 'Home moves to the first row', await p.evaluate(() => document.activeElement.getAttribute('href') === '?run=1'));
    await p.keyboard.press('End');
    check(T + 'End moves to the last row', await p.evaluate(() => document.activeElement.getAttribute('href') === '?run=3'));

    /* 7. Window buttons sized to the title. */
    const win = await p.evaluate(() => {
      function m(key) {
        const w = document.querySelector('.win[data-win="' + key + '"]'), t = w.querySelector('.win-title'), menu = w.querySelector('[data-win-action="menu"]'), close = w.querySelector('[data-win-action="close"]');
        const fs = parseFloat(getComputedStyle(t).fontSize);
        return { fs, btn: close.getBoundingClientRect().width, glyph: parseFloat(getComputedStyle(close, '::before').width), caret: parseFloat(getComputedStyle(menu, '::before').width) };
      }
      return { floating: m('editor'), docked: m('site') };
    });
    check(T + 'a floating window\'s buttons are 1.7 times the title\'s text and its caret 1.2', Math.abs(win.floating.btn - win.floating.fs * 1.7) < 1 && Math.abs(win.floating.glyph - win.floating.fs * 0.85) < 1 && Math.abs(win.floating.caret - win.floating.fs * 1.2) < 1, win.floating);
    check(T + 'a docked window\'s follow its smaller title', win.docked.fs < win.floating.fs && Math.abs(win.docked.btn - win.docked.fs * 1.7) < 1 && Math.abs(win.docked.caret - win.docked.fs * 1.2) < 1, win.docked);
    await p.evaluate(() => { document.documentElement.style.setProperty('--text-md', '20px'); document.documentElement.style.setProperty('--text-sm', '18px'); });
    const grown = await p.evaluate(() => { const close = document.querySelector('.win[data-win="editor"] [data-win-action="close"]'); return close.getBoundingClientRect().width; });
    check(T + 'the buttons grow with the page\'s text', Math.abs(grown - 34) < 1.5, grown);
    await p.evaluate(() => { document.documentElement.style.removeProperty('--text-md'); document.documentElement.style.removeProperty('--text-sm'); });

    await p.screenshot({ path: out('flow-controls-' + theme + '.png'), fullPage: true });
    const axe = await new AxeBuilder({ page: p }).withRules(['color-contrast', 'aria-allowed-attr', 'aria-allowed-role', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'button-name', 'label']).analyze();
    check(T + 'the new components satisfy axe', axe.violations.length === 0, axe.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(', ')));
    await ctx.close();
  }

  /* The arrows and the toggle in a right-to-left page. */
  const rtl = await b.newPage({ viewport: { width: 900, height: 700 } });
  await rtl.goto(ROOT + '/tests/fixtures/flow-controls.html');
  await rtl.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await rtl.waitForSelector('.card.disclose-ready');
  const r = await rtl.evaluate(() => {
    const t = document.querySelector('#step-1 .card-toggle'), head = document.querySelector('#step-1 .card-head');
    const up = document.querySelector('#step-1 .card-actions .icon-btn .glyph');
    return { toggleAtStart: head.getBoundingClientRect().right - t.getBoundingClientRect().right < 24, caretTurn: getComputedStyle(t, '::before').transform, arrowTurn: getComputedStyle(up).transform };
  });
  check('rtl: the toggle stands at the head\'s start and the caret turns the other way, and the arrows do not turn', r.toggleAtStart && r.caretTurn !== 'none' && r.arrowTurn === 'none', r);
  await rtl.close();

  check('no page errors occurred', !errors.length, errors);
  await b.close();
  process.exit(failures ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
