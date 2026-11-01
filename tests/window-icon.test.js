/* A window's picture (0.96.3): data-win-icon is drawn at 16px in the
   glyph's place on the taskbar button, the dock tab, the switcher and the
   Window list; the glyph stands in when the picture fails; the attribute
   is followed live. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
const FIX = ROOT + '/tests/fixtures/window-icon.html';
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1300, height: 800 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(FIX);
  await p.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.length === 4 && document.querySelector('.win-bar [data-win-tab="pic"] .win-item-icon'));
  /* The broken picture's failure arrives from the network; wait for it. */
  await p.waitForFunction(() => !document.querySelector('.win-bar [data-win-tab="broken"] .win-item-icon'), null, { timeout: 10000 }).catch(() => {});

  const mark = sel => p.evaluate(sel => {
    const n = document.querySelector(sel); if (!n) return null;
    const img = n.querySelector('.win-item-icon'), g = n.querySelector('.win-item-glyph');
    const r = img && img.getBoundingClientRect();
    return { img: img ? img.getAttribute('src').slice(0, 14) : null, size: r ? [Math.round(r.width), Math.round(r.height)] : null,
      glyphHidden: g ? g.hidden : null, glyph: g ? g.style.getPropertyValue('--glyph') : null, alt: img ? img.getAttribute('alt') : null,
      before: getComputedStyle(n, '::before').display };
  }, sel);

  let m = await mark('.win-bar [data-win-tab="pic"]');
  check('the taskbar button shows the picture at 16px, the glyph hidden and the dot gone', m && m.img === 'data:image/svg' && m.size[0] === 16 && m.size[1] === 16 && m.glyphHidden && m.alt === '' && m.before === 'none', m);
  m = await mark('.win-bar [data-win-tab="broken"]');
  check('a picture that fails leaves the glyph in its place', m && !m.img && m.glyphHidden === false && m.glyph === 'var(--glyph-comments)', m);
  m = await mark('.win-bar [data-win-tab="plain"]');
  check('a window with a glyph only is unchanged', m && !m.img && m.glyphHidden === false && m.glyph === 'var(--glyph-folder)', m);
  m = await mark('[data-dock-key="side"]');
  check('a shared dock tab shows its window\'s picture', m && m.img === 'data:image/svg' && m.glyphHidden && m.size[0] === 16, m);
  check('iconOf gives the address, and nothing for a failed or absent picture', await p.evaluate(() => pudlWindows.iconOf('pic').startsWith('data:image/svg') && pudlWindows.iconOf('broken') === '' && pudlWindows.iconOf('plain') === ''));

  /* The attribute followed live: a change, a removal, an addition. */
  await p.evaluate(() => document.querySelector('[data-win="plain"]').setAttribute('data-win-icon', "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M0 0h16v16z' fill='%23393'/%3E%3C/svg%3E"));
  await p.waitForFunction(() => document.querySelector('.win-bar [data-win-tab="plain"] .win-item-icon'));
  m = await mark('.win-bar [data-win-tab="plain"]');
  check('a picture set later appears on the button', m && m.img === 'data:image/svg' && m.glyphHidden, m);
  await p.evaluate(() => document.querySelector('[data-win="pic"]').removeAttribute('data-win-icon'));
  await p.waitForFunction(() => !document.querySelector('.win-bar [data-win-tab="pic"] .win-item-icon'));
  m = await mark('.win-bar [data-win-tab="pic"]');
  check('a picture removed gives the glyph back', m && !m.img && m.glyphHidden === false && m.glyph === 'var(--glyph-document)', m);
  const focusKept = await p.evaluate(() => { document.querySelector('.win-bar [data-win-tab="plain"]').focus(); document.querySelector('[data-win="plain"]').setAttribute('data-win-icon', 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27%3E%3C/svg%3E'); return document.activeElement === document.querySelector('.win-bar [data-win-tab="plain"]'); });
  check('changing the picture does not take focus from the button', focusKept);

  /* The switcher's rows. */
  await p.evaluate(() => { pudlWindows.raise('broken'); pudlWindows.raise('plain'); });
  await p.keyboard.down('Control');
  await p.keyboard.press('Tab');
  await p.keyboard.press('Tab');
  await p.waitForFunction(() => document.querySelector('.win-switcher') && document.querySelector('.win-switcher').matches(':popover-open'));
  const rows = await p.evaluate(() => [...document.querySelectorAll('.win-switcher li')].map(r => r.getAttribute('data-switch-key') + ':' + (r.querySelector('.win-item-icon') ? 'img' : r.querySelector('.glyph') ? 'glyph' : 'none')).join(','));
  check('the switcher shows a picture where a window has one and the glyph otherwise', /plain:img/.test(rows) && /broken:glyph/.test(rows) && /pic:glyph/.test(rows), rows);
  await p.keyboard.press('Escape');
  await p.keyboard.up('Control');

  /* The menu bar's Window list. */
  const title = p.locator('.menubar-title').filter({ hasText: /^Window$/ });
  if (await title.count()) {
    await title.first().click();
    await p.waitForSelector('#menubar-panel:popover-open');
    const list = await p.evaluate(() => [...document.querySelectorAll('#menubar-panel .menu-action')].filter(r => /^\d\. /.test(r.textContent.trim())).map(r => r.textContent.trim().replace(/^\d\. /, '') + ':' + (r.querySelector('.menubar-icon img.win-item-icon') ? 'img' : 'none')).join(','));
    check('the Window list shows the picture on its row and nothing new on the others', /Plain:img/.test(list) && /Broken:none/.test(list) && /Pictured:none/.test(list), list);
    await p.keyboard.press('Escape');
  } else check('the fixture has a Window menu', false);

  check('no page errors', !errors.length, errors);
  await b.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
