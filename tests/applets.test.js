const { launch, ROOT, out, engine } = require('./lib');
const path = require('path');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const watch = p => {
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') { if (!/favicon|404/.test(m.text())) errors.push(m.text()); } });
  };

  /* === The article reader =============================================== */
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  watch(p);
  const SAMPLE = ROOT + '/samples/article-reader.html';
  await p.goto(SAMPLE);
  const q = () => p.evaluate(() => decodeURIComponent(location.search));
  await p.evaluate(() => {
    window.__closed = [];
    document.addEventListener('pudl:window-close', e => window.__closed.push(e.detail.key + ':' + e.target.isConnected));
  });

  await p.click('.md-sidebar a[data-win-open="mixing"]');
  await p.waitForSelector('.win[data-win="mixing"] [data-applet-state="running"]');
  check('applet starts when its window opens', true);
  const share = await p.getAttribute('.win[data-win="mixing"] .mixer-foot a', 'href');
  check('in a window its link points at its own page', /^colour-mixer\.html\?a=6b9bd1&b=121417&p=24$/.test(share), share);
  const before = await q();
  await p.evaluate(() => {
    const r = document.querySelector('.win[data-win="mixing"] input[type="range"]');
    r.value = '70'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true }));
  });
  check('in a window it leaves the URL alone', (await q()) === before, await q());
  check('in a window its link follows the mix', /p=70$/.test(await p.getAttribute('.win[data-win="mixing"] .mixer-foot a', 'href')));
  await p.locator('.win[data-win="mixing"]').screenshot({ path: out('applet-window.png') });

  await p.click('.win[data-win="mixing"] [data-win-action="close"]');
  const closed = await p.evaluate(() => window.__closed);
  check('pudl:window-close fires before removal', JSON.stringify(closed) === '["mixing:true"]', JSON.stringify(closed));

  // Replace in place, then Back.
  await p.click('.md-sidebar a[data-win-open="elevation"]');
  await p.waitForSelector('.win[data-win="elevation"]');
  await p.click('.win[data-win="elevation"] a[data-win-replace]');
  await p.waitForSelector('.win[data-win="url-state"]');
  let s = await q();
  check('Next replaces the window', /open=url-state(&|$)/.test(s) && !/elevation/.test(s) &&
    await p.locator('.win[data-win="elevation"]').count() === 0, s);
  check('replacement keeps the placement', /p\.url-state=maximized:/.test(s), s);
  await p.goBack();
  await p.waitForSelector('.win[data-win="elevation"]');
  s = await q();
  check('Back returns to the replaced window', /open=elevation(&|$)/.test(s) &&
    await p.locator('.win[data-win="url-state"]').count() === 0, s);

  // Replacing with a window that is already open.
  await p.click('.md-sidebar a[data-win-open="numerals"]');
  await p.waitForSelector('.win[data-win="numerals"]');
  await p.click('.md-sidebar a[data-win-open="mixing"]');
  await p.waitForSelector('.win[data-win="mixing"] [data-applet-state="running"]');
  await p.click('.win[data-win="mixing"] a[data-win-replace]');
  await p.waitForFunction(() => !document.querySelector('.win[data-win="mixing"]'));
  s = await q();
  check('replacing with an open window raises it and closes this one', /top=numerals/.test(s) && !/mixing/.test(s), s);

  // The script interface.
  const api = await p.evaluate(async () => {
    const W = window.pudlWindows;
    W.close('numerals'); W.close('elevation');
    W.open('url-state');
    await new Promise(r => setTimeout(r, 100));
    const a = W.state();
    W.minimize('url-state');
    const bb = W.state();
    W.raise('url-state');
    const c = W.state();
    return { a: a.open.join(','), top: a.top, min: Object.keys(bb.min).join(','), raised: c.top, minAfter: Object.keys(c.min).length };
  });
  check('pudlWindows.open, minimize, raise, state', api.a === 'url-state' && api.top === 'url-state' && api.min === 'url-state' &&
    api.raised === 'url-state' && api.minAfter === 0, JSON.stringify(api));

  /* === The applet in its own page ======================================= */
  const m = await b.newPage({ viewport: { width: 1000, height: 800 } });
  watch(m);
  await m.goto(ROOT + '/samples/colour-mixer.html?a=ff0000&b=0000ff&p=50');
  await m.waitForSelector('[data-applet-state="running"]');
  const hex = await m.textContent('.mixer .kv-table tr:nth-child(2) code');
  check('in a page it reads its state from the URL', hex === '#800080', hex);
  await m.evaluate(() => {
    const r = document.querySelector('input[type="range"]');
    r.value = '25'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true }));
  });
  check('in a page a change goes into the URL', /p=25/.test(await m.evaluate(() => location.search)));
  await m.goBack();
  await m.waitForFunction(() => document.querySelector('input[type="range"]').value === '50');
  check('in a page Back undoes the change', true);
  await m.screenshot({ path: out('applet-page.png') });

  const torn = await m.evaluate(async () => {
    const root = document.querySelector('[data-applet]');
    pudlApplets.destroy(root);
    const empty = root.children.length === 0 && !root.hasAttribute('data-applet-state');
    history.pushState(null, '', '?a=00ff00&b=ffffff&p=10');
    history.back();
    await new Promise(r => setTimeout(r, 200));
    return { empty, still: root.children.length === 0 };
  });
  check('destroy takes the applet down', torn.empty, JSON.stringify(torn));
  check('destroy removes its window listeners too', torn.still, JSON.stringify(torn));

  /* === Embedded in an article, named by the registry ===================== */
  const a = await b.newPage({ viewport: { width: 1000, height: 900 } });
  watch(a);
  await a.goto(ROOT + '/samples/applet-article.html');
  await a.waitForSelector('[data-applet-state="running"]');
  const art = await a.evaluate(() => ({
    fit: document.querySelector('[data-applet]').getAttribute('data-applet-fit'),
    src: [...document.scripts].map(s => s.src).find(s => /mixer\.js/.test(s)),
    css: [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.href).find(h => /mixer\.css/.test(h)),
    len: history.length
  }));
  check('registry: a mount with only a name starts, defined after the runtime ran', true);
  check('registry: the version reaches the script and the stylesheet', /mixer\.js\?v=2$/.test(art.src) && /mixer\.css\?v=2$/.test(art.css), JSON.stringify(art));
  check('fit: an applet in an article flows', art.fit === 'flow');
  const setMix = (pg, v) => pg.evaluate(v => {
    const r = document.querySelector('[data-applet] input[type="range"]');
    r.value = String(v); r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true }));
  }, v);
  await setMix(a, 30);
  const after = await a.evaluate(() => ({ mix: new URLSearchParams(location.search).get('mix'), len: history.length }));
  check('param: the state goes into the article\'s query', after.mix === 'a=2c5282&b=ffffff&p=30', JSON.stringify(after));
  check('param: replaced, not pushed', after.len === art.len, JSON.stringify(after));
  await a.goto(ROOT + '/samples/applet-article.html?mix=a%3Dff0000%26b%3D0000ff%26p%3D50');
  await a.waitForSelector('[data-applet-state="running"]');
  check('param: the article\'s address restores the state', (await a.textContent('.mixer .kv-table tr:nth-child(2) code')) === '#800080');
  await a.evaluate(() => history.pushState(null, '', '?mix=a%3D000000%26b%3Dffffff%26p%3D0'));
  await a.evaluate(() => history.back());
  await a.waitForTimeout(150);
  await a.evaluate(() => history.forward());
  await a.waitForFunction(() => document.querySelector('.mixer .kv-table tr:nth-child(2) code').textContent === '#ffffff');
  await a.evaluate(() => history.back());
  await a.waitForFunction(() => document.querySelector('.mixer .kv-table tr:nth-child(2) code').textContent === '#800080');
  check('param: Back and Forward hand the state to setState', true);
  /* Preset links hand their state to the running applet. */
  await a.goto(ROOT + '/samples/applet-article.html');
  await a.waitForSelector('[data-applet-state="running"]');
  const lenBefore = await a.evaluate(() => { window.__samePage = true; return history.length; });
  await a.click('a[data-applet-preset] >> nth=2');
  await a.waitForFunction(() => document.querySelector('.mixer input[type="range"]').value === '22');
  const pre = await a.evaluate(() => ({ mix: new URLSearchParams(location.search).get('mix'), len: history.length, same: window.__samePage === true }));
  check('preset: a click sets the running applet without leaving the page', pre.mix === 'a=b86e1c&b=fbfbfc&p=22' && pre.same, JSON.stringify(pre));
  check('preset: it is a step in the history', pre.len === lenBefore + 1, JSON.stringify(pre));
  await a.evaluate(() => history.back());
  await a.waitForFunction(() => document.querySelector('.mixer input[type="range"]').value === '60');
  check('preset: Back undoes it, still without a reload', await a.evaluate(() => window.__samePage === true));
  const [nav] = await Promise.all([
    a.waitForEvent('framenavigated'),
    a.evaluate(() => { const d = document.querySelector('[data-applet]'); pudlApplets.destroy(d); document.querySelector('a[data-applet-preset]').click(); })
  ]);
  await a.waitForSelector('[data-applet-state="running"]');
  check('preset: with no running applet, the link navigates and boots the preset', (await a.evaluate(() => document.querySelector('.mixer input[type="range"]').value)) === '12');

  const swapped = await a.evaluate(async () => {
    const old = document.querySelector('[data-applet]');
    const fresh = document.createElement('div');
    fresh.setAttribute('data-applet', 'mixer');
    old.parentNode.replaceWith(fresh);
    document.dispatchEvent(new CustomEvent('pudl:regions-swap', { detail: { regions: [] } }));
    await new Promise(r => setTimeout(r, 300));
    return { old: old.hasAttribute('data-applet-state') || old.children.length > 0, fresh: fresh.getAttribute('data-applet-state') };
  });
  check('regions: a swap destroys the applets it removed and starts those it brought', swapped.old === false && swapped.fresh === 'running', JSON.stringify(swapped));

  /* The owner test: not the applet's own page, so not its address. */
  const own = await a.evaluate(async () => {
    const d = document.createElement('div');
    d.setAttribute('data-applet', 'mixer');
    document.querySelector('article').append(d);
    const len = history.length, before = location.search;
    pudlApplets.boot(d);
    await new Promise(r => setTimeout(r, 200));
    const r = d.querySelector('input[type="range"]');
    r.value = '90'; r.dispatchEvent(new Event('change', { bubbles: true }));
    return { same: history.length === len && location.search === before, share: d.querySelector('.mixer-foot a').textContent };
  });
  check('ownsUrl: an applet on another page leaves the address alone', own.same && /own page/.test(own.share), JSON.stringify(own));

  /* In a window, an applet fills unless its mount says otherwise, and the
     reader's host keeps its state through pudl:applet-state. */
  await p.goto(SAMPLE + '?open=mixing');
  await p.waitForSelector('.win[data-win="mixing"] [data-applet-state="running"]');
  check('fit: the windowed article\'s mount keeps flow', (await p.getAttribute('.win[data-win="mixing"] [data-applet]', 'data-applet-fit')) === 'flow');
  const winFit = await p.evaluate(async () => {
    const d = document.createElement('div');
    d.setAttribute('data-applet', 'mixer');
    d.setAttribute('data-applet-src', 'applets/mixer.js');
    document.querySelector('.win[data-win="mixing"] .win-body').append(d);
    pudlApplets.boot(d);
    await new Promise(r => setTimeout(r, 200));
    const fit = d.getAttribute('data-applet-fit');
    pudlApplets.destroy(d); d.remove();
    return fit;
  });
  check('fit: an applet in a window fills by default', winFit === 'fill', winFit);
  check('state: the host hands back the state it kept', /p=70$/.test(await p.getAttribute('.win[data-win="mixing"] .mixer-foot a', 'href')),
    await p.getAttribute('.win[data-win="mixing"] .mixer-foot a', 'href'));

  /* Regions leave an applet's parameter to the applet. */
  let fetched = 0;
  p.on('request', r => { if (/article-reader\.html/.test(r.url()) && r.resourceType() === 'fetch') fetched++; });
  await p.evaluate(async () => {
    const d = document.createElement('div');
    d.setAttribute('data-applet', 'mixer');
    d.setAttribute('data-applet-param', 'mix');
    d.setAttribute('data-applet-src', 'applets/mixer.js');
    document.body.append(d);
    pudlApplets.boot(d);
    await new Promise(r => setTimeout(r, 200));
    const r = d.querySelector('input[type="range"]');
    r.value = '40'; r.dispatchEvent(new Event('change', { bubbles: true }));
    history.pushState(null, '', location.search.replace(/mix=[^&]*/, 'mix=a%3D000000%26b%3Dffffff%26p%3D5'));
    history.back();
    await new Promise(r => setTimeout(r, 400));
  });
  check('regions: Back over an applet\'s parameter fetches no regions', fetched === 0, String(fetched));
  const carried = await p.evaluate(() => [...document.querySelectorAll('[data-region] a[href]')].some(l => /mix=/.test(l.getAttribute('href'))));
  check('regions: same-page links carry the applet\'s parameter', carried);

  check('no errors or warnings', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
