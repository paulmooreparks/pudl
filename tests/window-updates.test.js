/* Window updates and placement, PUDL 0.58.0:
   - a form marked data-win-submit is sent in place, and pudlWindows.reload
     and update change a window's content without the page loading again;
   - data-win-place="own", data-win-opens, data-win-undock, and the link in
     pudl:window-place;
   - data-win-beside, and Ctrl or Cmd on a replacing link where the layer
     asks for it;
   - the narrow rule leaves a docked window docked;
   - a strip the server drew works without script, and the script adopts
     it; without a strip, no empty band;
   - a window's attention count keeps 4.5:1 on the taskbar and the tabs. */
const { launch, ROOT, engine } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
const PAGE = ROOT + '/tests/fixtures/window-updates.html';
const TAGS = n => `<section class="win" data-win="tags" data-win-attention="${n}"><header class="win-head"><h2 class="win-title">Tags (${n})</h2></header>
  <div class="win-body"><div class="notice positive" role="status"><div class="notice-content"><p class="notice-body">Tag added.</p></div></div>
  <ul id="tag-list"><li>travel</li><li>food</li></ul>
  <form method="post" action="/api/tags" data-win-submit id="tag-form"><label class="form-label" for="tag-name">New Tag</label><input class="form-input" id="tag-name" name="tag"><button class="btn" type="submit">Add</button></form></div></section>`;

(async () => {
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 1300, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const win = key => page.locator('.win[data-win="' + key + '"]');
  const place = key => page.evaluate(k => pudlWindows.state().place[k], key);
  const ready = async url => { await page.goto(url); await page.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.length > 0); };

  /* A form sent in place. */
  const posts = [];
  await page.route('**/api/tags', async route => {
    posts.push({ header: route.request().headers()['x-pudl-window'], body: route.request().postData() });
    await route.fulfill({ status: 200, contentType: 'text/html', body: TAGS(3) });
  });
  /* Playwright's WebKit cannot answer a routed request with a redirect, so
     there the redirect is checked as the page loading again instead. */
  const canRedirect = engine !== 'webkit';
  await page.route('**/api/elsewhere', route => canRedirect
    ? route.fulfill({ status: 303, headers: { Location: ROOT + '/tests/fixtures/window-updates.html?open=day' } })
    : route.fulfill({ status: 200, contentType: 'text/plain', body: 'done' }));
  await page.route('**/api/plain', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Plain</title><p id="plain-answer">Posted the ordinary way.</p>' }));
  await ready(PAGE);
  await page.evaluate(() => { window.marker = 'kept'; pudlWindows.raise('tags'); });
  let updated = 0;
  await page.exposeFunction('sawUpdate', () => { updated++; });
  await page.evaluate(() => document.querySelector('.win[data-win="tags"]').addEventListener('pudl:window-update', () => sawUpdate()));
  const before = await page.evaluate(() => JSON.stringify(pudlWindows.state().place));
  await page.locator('#tag-name').fill('food');
  await page.locator('#tag-name').press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('#tag-list li').length === 2);
  check('a data-win-submit form posts with the window named in X-PUDL-Window', posts.length === 1 && posts[0].header === 'tags' && posts[0].body === 'tag=food', posts);
  check('the page did not load again', await page.evaluate(() => window.marker === 'kept'));
  check('the window takes the answer\'s body', await win('tags').locator('.notice').isVisible());
  check('the window keeps its placement and the others theirs', before === await page.evaluate(() => JSON.stringify(pudlWindows.state().place)));
  check('the title and the attention count follow the answer', await win('tags').locator('.win-title').textContent() === 'Tags (3)' && await win('tags').getAttribute('data-win-attention') === '3');
  check('focus stays on the same field', await page.evaluate(() => document.activeElement && document.activeElement.id === 'tag-name'));
  await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some(r => r.textContent.includes('Tag added.') && !r.closest('.win')));
  check('the notice is announced', true);
  check('pudl:window-update fires on the window', updated === 1);
  check('the swapped body is still a tab stop', await win('tags').locator('.win-body').getAttribute('tabindex') === '0');

  await page.evaluate(() => pudlWindows.update('tags', '<p id="replaced">Plain body.</p>'));
  check('update() with markup alone replaces the body and keeps the marks', await page.locator('#replaced').isVisible() && await win('tags').getAttribute('data-win-attention') === '3');
  await page.evaluate(() => pudlWindows.reload('tags'));
  await page.waitForSelector('#tag-form');
  check('reload() takes the content again from its source', await win('tags').getAttribute('data-win-attention') === '2' && await win('tags').locator('.win-title').textContent() === 'Tags');

  if (canRedirect) {
    await Promise.all([page.waitForURL(/open=day/), page.locator('#away-form button').click()]);
    check('an answer that redirects elsewhere is followed', await page.evaluate(() => /[?&]open=day(&|$)/.test(location.search)));
  } else {
    await page.locator('#away-form button').click();
    await page.waitForFunction(() => window.marker === undefined && window.pudlWindows);
    check('an answer that is not the window loads the page again', await page.evaluate(() => window.marker === undefined));
  }
  await ready(PAGE);
  await page.evaluate(() => pudlWindows.raise('tags'));
  await Promise.all([page.waitForSelector('#plain-answer'), page.locator('#plain-form button').click()]);
  check('a form without data-win-submit posts the ordinary way', await page.evaluate(() => location.pathname.endsWith('/api/plain')));

  /* Where windows open. */
  await ready(PAGE);
  const told = [];
  await page.exposeFunction('sawPlace', d => told.push(d));
  await page.evaluate(() => document.querySelector('[data-win-layer]').addEventListener('pudl:window-place', e => sawPlace({ key: e.detail.key, link: e.detail.link && e.detail.link.id })));
  await page.evaluate(() => pudlWindows.raise('report'));
  await page.locator('#day-link').click();
  await page.waitForSelector('.win[data-win="day"]');
  check('pudl:window-place is told the link that was followed', told.some(d => d.key === 'day' && d.link === 'day-link'), told);
  check('data-win-opens puts the windows a window opens in its zone', (await place('day')).mode === 'right');
  await page.evaluate(() => pudlWindows.raise('report'));
  await page.locator('#editor-link').click();
  await page.waitForSelector('.win[data-win="editor"]');
  check('data-win-place="own" keeps the window\'s own placement over its opener\'s', (await place('editor')).mode === 'left');

  /* Open beside. */
  await page.evaluate(() => pudlWindows.raise('drafts'));
  await page.locator('#beside-link').click();
  await page.waitForSelector('.win[data-win="drafts-deleted"]');
  check('a data-win-beside link opens a new window and keeps its opener', await win('drafts').count() === 1 && await win('drafts-deleted').count() === 1);
  check('the new window takes the half the opener\'s middle is not in', (await place('drafts-deleted')).mode === 'right', await place('drafts-deleted'));
  await page.evaluate(() => pudlWindows.close('drafts-deleted'));
  await page.evaluate(() => pudlWindows.raise('drafts'));
  await page.locator('#deleted-tab').click({ modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'] });
  await page.waitForSelector('.win[data-win="drafts-deleted"]');
  check('Ctrl or Cmd on a replacing link opens beside on a layer that asks', await win('drafts').count() === 1 && (await place('drafts-deleted')).mode === 'right');
  await page.evaluate(() => pudlWindows.close('drafts-deleted'));
  await page.evaluate(() => pudlWindows.raise('drafts'));
  await page.locator('#deleted-tab').click();
  await page.waitForSelector('.win[data-win="drafts-deleted"]');
  check('a plain click on a replacing link still replaces', await win('drafts').count() === 0);

  /* The narrow rule and data-win-undock. */
  await page.evaluate(() => pudlWindows.open('site'));
  await page.waitForSelector('.win[data-win="site"]');
  await page.setViewportSize({ width: 500, height: 800 });
  await page.waitForTimeout(200);
  check('the layer\'s narrow policy fills the workspace with its windows', await page.evaluate(() => pudlWindows.effectivePlacement('tags').mode) === 'maximized');
  check('data-win-narrow="keep" leaves a docked strip docked', await win('site').getAttribute('data-win-edge') === 'bottom' && await page.evaluate(() => pudlWindows.effectivePlacement('site').mode) === 'dock-bottom');
  check('a window that keeps its placement has no restricted mark', await win('site').getAttribute('data-win-restricted') === null);
  await page.setViewportSize({ width: 1300, height: 800 });
  await page.waitForTimeout(200);
  await page.evaluate(() => pudlWindows.dock('site', null));
  check('data-win-undock sends a window to its zone when it leaves its dock', (await place('site')).mode === 'left');

  /* A strip the server drew. */
  const STRIP = ROOT + '/tests/fixtures/server-strip.html?open=moderation,pending&top=moderation';
  const noScript = await browser.newContext({ viewport: { width: 1300, height: 800 }, javaScriptEnabled: false });
  const plain = await noScript.newPage();
  await plain.goto(STRIP);
  const strip = await plain.locator('.win-dock-group').boundingBox(), mod = await plain.locator('.win[data-win="moderation"]').boundingBox();
  check('without script, a strip the server drew sits above its window', mod.y >= strip.y + strip.height - 1, { strip, mod });
  check('without script, a strip\'s tab is a link to the address that selects it', await plain.locator('[data-dock-key="pending"]').getAttribute('href') === '?open=moderation,pending&top=pending');
  await plain.route('**/server-strip.html*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(/<div class="win-dock-group"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '') });
  });
  await plain.goto(STRIP);
  const bare = await plain.locator('.win[data-win="moderation"]').boundingBox(), host = await plain.locator('.win-host').boundingBox();
  check('without script or a strip, a shared window leaves no empty band', Math.abs(bare.y - host.y) < 1, { bare, host });
  check('without script or a strip, a shared window keeps its title bar', await plain.locator('.win[data-win="moderation"] .win-head').isVisible());
  await noScript.close();

  await ready(STRIP);
  check('the script adopts the strip the server drew', await page.locator('.win-dock-group[data-dock-edge="left"]').count() === 1 && await page.locator('a[data-dock-key="pending"]').count() === 1);
  await page.locator('a[data-dock-key="pending"]').click();
  check('with script, a tab that is a link selects in place', await win('pending').isVisible() && !(await win('moderation').isVisible()) && await page.evaluate(() => /top=pending/.test(location.search)));
  check('the link follows the state', /top=moderation/.test(await page.locator('a[data-dock-key="moderation"]').getAttribute('href')));
  await page.locator('a[data-dock-key="pending"]').focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press(' ');
  check('Space selects a tab that is a link', await win('moderation').isVisible());
  const adopted = await page.evaluate(() => ({ menus: document.querySelectorAll('[data-dock-menu="pending"]').length, toggles: document.querySelectorAll('.win-dock-group[data-dock-edge="left"] .win-dock-toggle').length, groups: document.querySelectorAll('.win-dock-group').length }));
  check('an adopted strip gains its menu buttons and toggle', adopted.menus === 1 && adopted.toggles === 1, adopted);

  /* Room to ask for. The document asks for 1000px; beside two docks
     of 24% of a 1400px layer it would get 728px, so the widest automatic
     side dock gives way, and one is enough. */
  await page.setViewportSize({ width: 1400, height: 850 });
  await page.route('**/samples/shared-docks.html*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('data-win="note" data-win-mode="maximized"', 'data-win="note" data-win-mode="maximized" data-win-room="1000px"') });
  });
  await ready(ROOT + '/samples/shared-docks.html');
  await page.evaluate(() => pudlWindows.raise('note'));
  const rails = () => page.evaluate(() => [...document.querySelectorAll('.win-dock-group[data-dock-rail]')].map(g => g.getAttribute('data-dock-edge')));
  check('a window asking for room collapses one side dock to a rail', JSON.stringify(await rails()) === '["left"]', await rails());
  check('the document has the room it asked for', (await win('note').boundingBox()).width >= 1000, await win('note').boundingBox());
  check('the room is not written to the address', await page.evaluate(() => !/d\.left=rail/.test(location.search) && pudlWindows.state().docks.left.mode === 'auto'));
  await page.locator('[data-dock-key="chats"]').click();
  check('a rail tab still slides its window out', await win('chats').isVisible());
  await page.evaluate(() => pudlWindows.raise('flows'));
  check('the dock opens again once the window loses the front', JSON.stringify(await rails()) === '[]', await rails());
  await page.evaluate(() => pudlWindows.raise('note'));
  check('and gives way again when it comes back', JSON.stringify(await rails()) === '["left"]');
  await page.evaluate(() => pudlWindows.dockMode('left', 'open'));
  await page.evaluate(() => pudlWindows.raise('note'));
  check('a dock pinned open stays open', JSON.stringify(await rails()) === '["right"]', await rails());
  await page.evaluate(() => pudlWindows.dockMode('right', 'open'));
  check('with both pinned, nothing gives way', JSON.stringify(await rails()) === '[]');
  await page.evaluate(() => { pudlWindows.dockMode('left', 'auto'); pudlWindows.dockMode('right', 'auto'); pudlWindows.close('note'); });
  check('closing the window gives the docks back', JSON.stringify(await rails()) === '[]');
  await page.unroute('**/samples/shared-docks.html*');

  /* The attention count's contrast, on every ground it sits on. */
  for (const theme of ['light', 'dark']) {
    const ratios = await page.evaluate(theme => {
      document.documentElement.dataset.theme = theme;
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const probe = document.createElement('div'); document.body.appendChild(probe);
      const rgba = c => { probe.style.color = c; ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = getComputedStyle(probe).color; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
      const lum = c => c.slice(0, 3).map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
      const over = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
      const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const cs = getComputedStyle(document.documentElement);
      const badge = document.createElement('span');
      badge.className = 'badge warn win-item-attention';
      badge.textContent = '3';
      document.body.appendChild(badge);
      const fg = rgba(getComputedStyle(badge).color), bg = rgba(getComputedStyle(badge).backgroundColor);
      const out = {};
      ['--raise-top', '--surface-alt', '--surface', '--recess-bg', '--raise-active-bg'].forEach(g => { out[g] = Math.round(cr(fg, over(bg, rgba(cs.getPropertyValue(g)))) * 100) / 100; });
      badge.remove(); probe.remove();
      return out;
    }, theme);
    check(theme + ': a window\'s attention count reaches 4.5:1 on every ground it sits on', Object.values(ratios).every(r => r >= 4.5), ratios);
  }

  check('no page errors occurred', !errors.length, errors);
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
