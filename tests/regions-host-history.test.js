/* A page with no regions that loads pudl-regions.js keeps its document
   when Back or Forward crosses a history entry the host wrote, such as a
   launcher's start and start-mode fields. Before this fix the script loaded
   the address, which redrew the whole desktop. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await page.goto(ROOT + '/tests/fixtures/regions-host-history.html?open=notes');
  await page.evaluate(() => {
    window.__same = true;
    history.pushState(null, '', '?open=notes&start=open&start-mode=pinned');
    document.getElementById('state').textContent = 'open';
  });
  const state = () => page.evaluate(() => ({ same: window.__same === true, state: document.getElementById('state').textContent, search: location.search, length: history.length }));
  const before = await state();

  await page.evaluate(() => new Promise(resolve => { window.addEventListener('popstate', () => setTimeout(resolve, 0), { once: true }); history.back(); }));
  let now = await state();
  check('Back over the host\'s entry keeps the document', now.same, now);
  check('the host\'s own popstate listener put its state right', now.state === 'closed' && now.search === '?open=notes', now);
  check('Back added no history entry', now.length === before.length, { before, now });

  await page.evaluate(() => new Promise(resolve => { window.addEventListener('popstate', () => setTimeout(resolve, 0), { once: true }); history.forward(); }));
  now = await state();
  check('Forward returns to the host\'s entry in the same document', now.same && now.state === 'open' && /start-mode=pinned/.test(now.search), now);

  await browser.close();
  if (failures) { console.log('FAIL ' + failures + ' checks'); process.exit(1); }
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
