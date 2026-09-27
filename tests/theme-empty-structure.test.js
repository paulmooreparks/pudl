const { launch, ROOT, out, engine } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/reference.html');

  /* Empty structure. */
  const chips = await p.evaluate(() => {
    const row = document.createElement('div');
    row.className = 'md-chips';
    row.innerHTML = '\n      \n    ';
    const full = document.createElement('div');
    full.className = 'md-chips';
    full.innerHTML = '<span class="filter-chip">x</span>';
    document.body.append(row, full);
    return [getComputedStyle(row).display, getComputedStyle(full).display];
  });
  check('a chips row holding only whitespace is hidden', chips[0] === 'none', chips[0]);
  check('a chips row with a chip shows', chips[1] === 'flex', chips[1]);

  const dock = await p.evaluate(() => {
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;width:600px;gap:8px';
    bar.innerHTML = '<button style="width:100px">left</button><nav class="win-dock" data-win-dock style="flex:1"></nav><button id="right" style="width:100px">right</button>';
    document.body.append(bar);
    const d = bar.querySelector('.win-dock');
    return { display: getComputedStyle(d).display, w: Math.round(d.getBoundingClientRect().width),
             h: Math.round(d.getBoundingClientRect().height),
             right: Math.round(bar.querySelector('#right').getBoundingClientRect().right - bar.getBoundingClientRect().left) };
  });
  check('an empty dock keeps its place in a toolbar', dock.display === 'flex' && dock.w > 300 && dock.right === 600, JSON.stringify(dock));
  check('an empty dock takes no height of its own', dock.h === 0, JSON.stringify(dock));

  /* Theme preference. */
  await p.evaluate(() => localStorage.removeItem('pudl-theme'));
  await p.reload();
  let t = await p.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.themePref, pudlThemePreference()]);
  check('with nothing saved the page starts dark', t[0] === 'dark' && t[1] === 'dark', JSON.stringify(t));

  await p.click('#theme-pref button[data-pref="system"]');
  t = await p.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.themePref, localStorage.getItem('pudl-theme')]);
  check('System follows a light system', t[0] === 'light' && t[1] === 'system' && t[2] === 'system', JSON.stringify(t));
  check('the setting shows System', (await p.getAttribute('#theme-pref button[data-pref="system"]', 'aria-pressed')) === 'true');

  await p.emulateMedia({ colorScheme: 'dark' });
  await p.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  check('System follows the system changing live', true);

  await p.reload();
  t = await p.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.themePref]);
  check('System is applied before paint on reload', t[0] === 'dark' && t[1] === 'system', JSON.stringify(t));

  await p.click('.theme-toggle');
  t = await p.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.themePref, localStorage.getItem('pudl-theme')]);
  check('the toggle flips from System to an explicit choice', t[0] === 'light' && t[1] === 'light' && t[2] === 'light', JSON.stringify(t));
  await p.emulateMedia({ colorScheme: 'light' });
  await p.emulateMedia({ colorScheme: 'dark' });
  check('an explicit choice ignores the system', (await p.evaluate(() => document.documentElement.dataset.theme)) === 'light');

  const other = await ctx.newPage();
  await other.goto(ROOT + '/reference.html');
  await p.click('#theme-pref button[data-pref="dark"]');
  await other.waitForFunction(() => document.documentElement.dataset.theme === 'dark' && document.documentElement.dataset.themePref === 'dark');
  check('a choice in one tab reaches the others', true);

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
