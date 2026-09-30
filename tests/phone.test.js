/* Nothing scrolls the whole page sideways on a phone, whatever it holds,
   and a crowded topbar wraps (issue #9). */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
const PAGES = ['/reference.html', '/samples/article-reader.html', '/samples/article-reader.html?open=elevation&top=elevation',
  '/samples/expenses.html', '/samples/expense.html?id=1', '/samples/expense-edit.html', '/samples/trips.html', '/samples/reports.html',
  '/samples/files.html?path=/articles', '/samples/colour-mixer.html', '/samples/applet-article.html', '/samples/editor.html', '/samples/preview.html'];
(async () => {
  const b = await launch();
  const errors = [];
  for (const width of [320, 390]) {
    const ctx = await b.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    const wide = [];
    for (const u of PAGES) {
      await p.goto(ROOT + u);
      await p.waitForTimeout(300);
      const r = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      if (r[0] > r[1]) wide.push(u + ' ' + r.join('>'));
    }
    check('no page scrolls sideways at ' + width + 'px', wide.length === 0, wide.join(' | '));

    /* The issue's topbar: a brand, four pills, a menu button and the toggle. */
    await p.goto(ROOT + '/reference.html');
    const bar = await p.evaluate(() => {
      const chrome = document.querySelector('.topbar .topbar-chrome');
      chrome.insertAdjacentHTML('afterbegin',
        '<a class="topbar-pill" href="#"><span class="glyph" style="--glyph: var(--glyph-home)" aria-hidden="true"></span><span class="topbar-pill-label">Home page</span></a>' +
        '<a class="topbar-pill" href="#"><span class="glyph" style="--glyph: var(--glyph-document)" aria-hidden="true"></span><span class="topbar-pill-label">Articles</span></a>' +
        '<a class="topbar-pill" href="#">Projects</a><a class="topbar-pill" href="#">About the author</a>' +
        '<button class="btn btn-sm menu-btn" type="button">Browse</button>');
      const root = document.documentElement;
      const brand = document.querySelector('.topbar .brand').getBoundingClientRect();
      const labelled = chrome.querySelector('.topbar-pill-label');
      return { fits: root.scrollWidth <= root.clientWidth, wrapped: chrome.getBoundingClientRect().top >= brand.bottom - 1,
               end: Math.round(root.clientWidth - chrome.getBoundingClientRect().right),
               hidden: getComputedStyle(labelled).clipPath, name: labelled.parentElement.textContent,
               pill: Math.round(labelled.parentElement.getBoundingClientRect().width) };
    });
    check('a crowded topbar fits at ' + width + 'px, its chrome wrapping to a line of its own at the end', bar.fits && bar.wrapped && bar.end <= 16, JSON.stringify(bar));
    check('a pill with a glyph shows only the glyph at ' + width + 'px, and keeps its name', /inset\(50%\)/.test(bar.hidden) && bar.name === 'Home page' && bar.pill <= 40, JSON.stringify(bar));
    await ctx.close();
  }

  /* On a wide screen the pill keeps its words. */
  const w = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await w.goto(ROOT + '/reference.html');
  const shown = await w.evaluate(() => {
    document.querySelector('.topbar .topbar-chrome').insertAdjacentHTML('afterbegin',
      '<a class="topbar-pill" href="#" id="p"><span class="glyph" style="--glyph: var(--glyph-home)" aria-hidden="true"></span><span class="topbar-pill-label">Home page</span></a>');
    return getComputedStyle(document.querySelector('#p .topbar-pill-label')).clipPath;
  });
  check('on a wide screen a pill shows its words', shown === 'none', shown);

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
