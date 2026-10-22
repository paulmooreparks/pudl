/* Specification 0.23.0: the window switcher
   on Ctrl+Tab, long text in a notice, disabled rows faded, and two
   glyphs. */
const { launch, ROOT, out } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
const FIX = ROOT + '/tests/fixtures/window-switcher.html';
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1300, height: 800 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(FIX);
  await p.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.length === 4);
  const top = () => p.evaluate(() => pudlWindows.state().top);
  const recent = () => p.evaluate(() => pudlWindows.state().recent.join(','));
  const listOpen = () => p.evaluate(() => { const l = document.querySelector('.win-switcher'); return !!l && l.matches(':popover-open'); });
  const raise = async k => { await p.evaluate(k => pudlWindows.raise(k), k); };

  /* The order the windows were last in front. */
  await raise('a'); await raise('b'); await raise('c');
  check('state().recent lists the windows, the one last in front first', await recent() === 'c,b,a,side', await recent());
  await raise('a');
  check('recent follows a raise', await recent() === 'a,c,b,side', await recent());

  /* A quick Ctrl+Tab flips between the last two windows, without the list. */
  await p.keyboard.press('Control+Tab');
  check('a quick Ctrl+Tab brings the window used before to the front', await top() === 'c', await top());
  check('the list did not show', !(await listOpen()));
  await p.keyboard.press('Control+Tab');
  check('and again flips back', await top() === 'a');

  /* Ctrl held: Tab walks the list, Shift goes back, the list shows. */
  await p.keyboard.down('Control');
  await p.keyboard.press('Tab');
  await p.keyboard.press('Tab');
  await p.waitForFunction(() => document.querySelector('.win-switcher') && document.querySelector('.win-switcher').matches(':popover-open'));
  const picked = await p.evaluate(() => [...document.querySelectorAll('.win-switcher li')].map(r => r.getAttribute('data-switch-key') + (r.classList.contains('active') ? '*' : '')).join(','));
  check('Ctrl held shows the list with the pick marked, docked windows left out', picked === 'a,c,b*', picked);
  check('a row shows the glyph, title and detail', await p.evaluate(() => { const r = document.querySelector('.win-switcher li[data-switch-key="a"]'); return r.querySelector('.glyph').style.getPropertyValue('--glyph') === 'var(--glyph-document)' && r.textContent.includes('Alpha') && r.querySelector('.md-meta').textContent === 'Customers'; }));
  await p.keyboard.press('Shift+Tab');
  check('Ctrl+Shift+Tab goes back', await p.evaluate(() => document.querySelector('.win-switcher li.active').getAttribute('data-switch-key')) === 'c');
  await p.keyboard.press('ArrowDown');
  check('the arrow keys move the pick', await p.evaluate(() => document.querySelector('.win-switcher li.active').getAttribute('data-switch-key')) === 'b');
  await p.keyboard.up('Control');
  check('letting go of Ctrl brings the picked window to the front and closes the list', await top() === 'b' && !(await listOpen()));

  /* Escape lets go; Enter finishes; a press outside lets go. */
  await p.keyboard.down('Control');
  await p.keyboard.press('Tab');
  await p.keyboard.press('Escape');
  await p.keyboard.up('Control');
  check('Escape lets go without switching', await top() === 'b' && !(await listOpen()));
  await p.keyboard.down('Control');
  await p.keyboard.press('Tab');
  await p.keyboard.press('Enter');
  await p.keyboard.up('Control');
  check('Enter switches at once', await top() === 'a');
  await p.keyboard.down('Control');
  await p.keyboard.press('Tab');
  await p.waitForFunction(() => document.querySelector('.win-switcher').matches(':popover-open'));
  await p.mouse.click(1200, 700);
  await p.keyboard.up('Control');
  check('a press outside the list lets go', await top() === 'a' && !(await listOpen()));
  await p.keyboard.down('Control');
  await p.keyboard.press('Tab');
  await p.waitForFunction(() => document.querySelector('.win-switcher').matches(':popover-open'));
  await p.click('.win-switcher li[data-switch-key="c"]');
  await p.keyboard.up('Control');
  check('a click on a row brings that window to the front', await top() === 'c');

  /* A minimised window is restored; a docked window with focus does not count as the front. */
  await p.evaluate(() => pudlWindows.minimize('a'));
  await p.keyboard.down('Control'); await p.keyboard.press('Tab'); await p.keyboard.up('Control');
  check('a minimised window is in the list and is restored when picked', await top() === 'a' && await p.evaluate(() => !pudlWindows.state().min.a));
  await p.locator('#side-field').focus();
  check('the docked window is in front', await top() === 'side');
  await p.keyboard.press('Control+Tab');
  check('the first Tab from a focused docked window picks the undocked window used last', await top() === 'a');

  /* The keys reach neither a text field nor a page listener; a modal dialog keeps them; Ctrl+PageDown is untouched. */
  await p.locator('#text-a').focus();
  await p.evaluate(() => { window.__seen = 0; document.getElementById('text-a').addEventListener('keydown', e => { if (e.key === 'Tab' && e.ctrlKey) window.__seen++; }); });
  await p.keyboard.press('Control+Tab');
  check('a focused text field never sees Ctrl+Tab', await p.evaluate(() => window.__seen === 0) && await top() !== 'a');
  await raise('a');
  await p.evaluate(() => document.getElementById('modal').showModal());
  await p.keyboard.press('Control+Tab');
  check('a modal dialog keeps the keys', await top() === 'a' && !(await listOpen()));
  await p.evaluate(() => document.getElementById('modal').close());
  const listed = await p.evaluate(() => pudlWindows.switcherKeys().map(k => k.key).join(','));
  check('the switcher\'s keys are offered for a listing', listed === 'Ctrl+Tab,Ctrl+Shift+Tab', listed);

  /* Off without the attribute. */
  await p.evaluate(() => document.querySelector('[data-win-layer]').removeAttribute('data-win-switcher'));
  await raise('b');
  await p.keyboard.press('Control+Tab');
  check('without data-win-switcher the keys do nothing', await top() === 'b');
  check('recent is reported whether or not the switcher is on', await p.evaluate(() => Array.isArray(pudlWindows.state().recent)));

  /* Long text in a notice. */
  const notice = await p.evaluate(() => {
    const n = document.getElementById('long-notice').getBoundingClientRect(), box = document.getElementById('narrow').getBoundingClientRect();
    const body = document.getElementById('long-body'), pre = document.getElementById('long-pre'), act = document.getElementById('act-2');
    const acts = [...document.querySelectorAll('.notice-actions .btn')].map(b => b.getBoundingClientRect());
    return { inside: n.right <= box.right + 0.5 && body.scrollWidth <= body.clientWidth + 1 && act.getBoundingClientRect().right <= n.right, breaks: body.getBoundingClientRect().height > 40, preScrolls: pre.scrollWidth > pre.clientWidth && getComputedStyle(pre).overflowX === 'auto', ellipsis: getComputedStyle(act).textOverflow === 'ellipsis' && act.scrollWidth > act.clientWidth, wrapped: acts.some(r => r.y !== acts[0].y), prose: document.getElementById('prose').textContent.split(' ').every(w => w.length < 20) };
  });
  check('long text stays inside the notice: the identifier breaks, the code scrolls, the long button ends in an ellipsis, the buttons wrap', notice.inside && notice.breaks && notice.preScrolls && notice.ellipsis && notice.wrapped, notice);

  /* Disabled rows faded; placeholders not. */
  const muted = await p.evaluate(() => ({ off: getComputedStyle(document.getElementById('row-off')).opacity, live: getComputedStyle(document.getElementById('row-live')).opacity, ph: getComputedStyle(document.getElementById('ph'), '::placeholder').opacity }));
  check('a disabled menu row is faded to half and a live one is not', muted.off === '0.5' && muted.live === '1', muted);
  check('a placeholder keeps its full opacity, as the specification requires', muted.ph === '1', muted);
  const glyphs = await p.evaluate(() => ['image', 'clip'].filter(g => !/svg/.test(getComputedStyle(document.documentElement).getPropertyValue('--glyph-' + g))));
  check('the image and clip glyphs are tokens', glyphs.length === 0, glyphs);

  await p.screenshot({ path: out('window-switcher.png') });
  check('no page errors occurred', !errors.length, errors);
  await b.close();
  process.exit(failures ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
