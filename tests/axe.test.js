/* axe on the reference page and the samples, in both themes, for the rules
   PUDL's own stylesheet and scripts answer for: text contrast, scrolling
   from the keyboard, and ARIA that is allowed where it is used. The page
   structure of the samples (landmarks and the like) is theirs, and is not
   checked here. Issues #5 and #6. */
const { launch, ROOT } = require('./lib');
const { AxeBuilder } = require('@axe-core/playwright');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
const RULES = ['color-contrast', 'scrollable-region-focusable', 'aria-allowed-attr', 'aria-allowed-role', 'aria-valid-attr-value', 'button-name', 'link-name'];
const PAGES = [
  ['/reference.html', { width: 1280, height: 900 }],
  ['/samples/expenses.html', { width: 1280, height: 900 }],
  ['/samples/expense.html?id=1', { width: 1280, height: 900 }],
  ['/samples/trips.html', { width: 1280, height: 900 }],
  /* A short window, so the article's body scrolls with nothing in it to focus. */
  ['/samples/article-reader.html?open=numerals&top=numerals', { width: 1280, height: 420 }],
  ['/samples/files.html?path=/notes&open=editor,preview&top=preview', { width: 1280, height: 900 }]
];

(async () => {
  const b = await launch();
  for (const theme of ['light', 'dark']) {
    for (const [path, viewport] of PAGES) {
      const ctx = await b.newContext({ viewport });
      await ctx.addInitScript(t => { try { localStorage.setItem('pudl-theme', t); } catch (e) { /* none */ } }, theme);
      const p = await ctx.newPage();
      await p.goto(ROOT + path);
      await p.waitForLoadState('networkidle');
      const r = await new AxeBuilder({ page: p }).withRules(RULES).analyze();
      const found = r.violations.map(v => v.id + ' ' + v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(', '));
      check(theme + ' ' + path, found.length === 0, found.join(' | '));
      await ctx.close();
    }
  }
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
