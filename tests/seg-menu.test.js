/* A segmented control marked data-seg-menu becomes a pop-up button on a
   phone, for parkscomputing.com's Window/Classic switcher on its topbar. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];

  /* Wide: the segments show, and the button is not there to see. */
  const wide = await b.newPage({ viewport: { width: 1280, height: 800 } });
  wide.on('pageerror', e => errors.push(e.message));
  await wide.goto(ROOT + '/reference.html');
  await wide.waitForSelector('.seg[data-seg-menu] + .seg-menu', { state: 'attached' });
  const w = await wide.evaluate(() => {
    const seg = document.querySelector('.seg[data-seg-menu]');
    return { seg: getComputedStyle(seg).display, btn: getComputedStyle(seg.nextElementSibling).display };
  });
  check('on a wide screen the segments show and the pop-up button does not', w.seg !== 'none' && w.btn === 'none', JSON.stringify(w));

  /* A phone: a switcher of links on the topbar, and one of buttons. */
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/reference.html');
  await p.evaluate(() => {
    const bar = document.querySelector('.topbar-chrome') || document.querySelector('.topbar');
    const nav = document.createElement('nav');
    nav.className = 'seg'; nav.id = 'views'; nav.setAttribute('data-seg-menu', ''); nav.setAttribute('aria-label', 'View');
    nav.innerHTML = '<a href="#window" aria-current="page">Window</a><a href="#classic">Classic</a>';
    bar.prepend(nav);
    const unit = document.createElement('div');
    unit.className = 'seg'; unit.id = 'unit'; unit.setAttribute('data-seg-menu', ''); unit.setAttribute('aria-label', 'Unit');
    unit.innerHTML = '<button type="button" aria-pressed="true">kg</button><button type="button" aria-pressed="false">lbs</button>';
    unit.addEventListener('click', e => {
      const hit = e.target.closest('button'); if (!hit) return;
      unit.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === hit ? 'true' : 'false'));
      window.__unit = hit.textContent;
    });
    document.querySelector('main, body').prepend(unit);
    pudlMenu.refresh();
  });
  const views = await p.evaluate(() => {
    const seg = document.getElementById('views'), menu = seg.nextElementSibling;
    const btn = menu.querySelector('.menu-btn');
    return { seg: getComputedStyle(seg).display, menu: getComputedStyle(menu).display, label: btn.textContent.trim(), name: btn.getAttribute('aria-label'), width: Math.round(btn.getBoundingClientRect().width) };
  });
  check('on a phone the switcher is a pop-up button showing the current choice', views.seg === 'none' && views.menu !== 'none' && views.label === 'Window' && views.name === 'View: Window', JSON.stringify(views));

  await p.click('#views + .seg-menu .menu-btn');
  await p.waitForFunction(() => { const m = document.querySelector('#views + .seg-menu .menu-panel'); return m.matches(':popover-open') && !m.classList.contains('placing'); });
  const rows = await p.evaluate(() => Array.from(document.querySelectorAll('#views + .seg-menu .seg-choice')).map(r => r.textContent + (getComputedStyle(r, '::before').visibility === 'visible' ? '*' : '') + '@' + r.getAttribute('href')));
  check('its menu lists every choice, the current one ticked, the links still links', rows.join(',') === 'Window*@#window,Classic@#classic', rows.join(','));
  await p.click('#views + .seg-menu .seg-choice >> text=Classic');
  check('choosing a link goes there', /#classic$/.test(p.url()), p.url());

  await p.click('#unit + .seg-menu .menu-btn');
  await p.waitForFunction(() => document.querySelector('#unit + .seg-menu .menu-panel').matches(':popover-open'));
  await p.click('#unit + .seg-menu .seg-choice >> text=lbs');
  const unit = await p.evaluate(() => ({ chose: window.__unit, label: document.querySelector('#unit + .seg-menu .menu-btn').textContent.trim(), open: document.querySelector('#unit + .seg-menu .menu-panel').matches(':popover-open') }));
  check('choosing a button presses its segment, the page\'s handler runs, the button follows and the menu closes', unit.chose === 'lbs' && unit.label === 'lbs' && !unit.open, JSON.stringify(unit));

  const fits = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  check('the page still fits the phone', fits);

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
