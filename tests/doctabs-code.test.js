/* Document tabs, code blocks, editor surfaces and the syntax colours,
   from parkscomputing.com's Architecture/pudl-proposal-tree-crumbs-editor.md.
   Their contrast is checked by the axe suite, on the reference page. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/reference.html');
  await p.waitForFunction(() => window.pudlTabs);
  const TABS = '#docs ~ .demo .doc-tabs';

  const stops = await p.evaluate(t => [...document.querySelectorAll(t + ' > [role="tab"]')].map(x => x.getAttribute('tabindex')).join(','), TABS);
  check('doc tabs: one tab stop, on the selected tab', stops === '0,-1,-1', stops);

  await p.evaluate(t => {
    window.__closed = []; window.__clicked = 0;
    document.addEventListener('pudl:tab-close', e => window.__closed.push(e.target.textContent.replace('unsaved', '').trim()));
    document.querySelectorAll(t + ' > [role="tab"]').forEach(x => x.addEventListener('click', () => window.__clicked++));
  }, TABS);
  await p.focus(TABS + ' > [aria-selected="true"]');
  await p.keyboard.press('ArrowRight');
  const f1 = await p.evaluate(() => document.activeElement.textContent.trim());
  await p.keyboard.press('End');
  const f2 = await p.evaluate(() => document.activeElement.textContent.trim());
  await p.keyboard.press('ArrowRight');
  const f3 = await p.evaluate(() => document.activeElement.textContent.replace('unsaved', '').trim());
  check('doc tabs: the arrow keys and End move focus along the tabs, wrapping', f1 === 'notes.md' && f2 === 'build.sh' && f3 === 'today.md', [f1, f2, f3].join(','));
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('Delete');
  await p.click(TABS + ' > [role="tab"]:nth-child(3) .doc-tab-close');
  const closed = await p.evaluate(() => ({ closed: window.__closed, clicked: window.__clicked }));
  check('doc tabs: Delete and the close button ask the host to close, without choosing the tab',
        closed.closed.join() === 'notes.md,build.sh' && closed.clicked === 0, JSON.stringify(closed));

  const look = await p.evaluate(t => {
    const tab = document.querySelector(t + ' > [aria-selected="true"]');
    const dirty = tab.querySelector('.doc-tab-dirty');
    const x = tab.querySelector('.doc-tab-close');
    return { name: tab.textContent.includes('unsaved'), dirtyFont: getComputedStyle(dirty).fontSize, dirtyMask: /svg/.test(getComputedStyle(dirty).maskImage || getComputedStyle(dirty).webkitMaskImage),
             xRaised: /gradient/.test(getComputedStyle(x).backgroundImage), xHidden: x.getAttribute('aria-hidden') };
  }, TABS);
  check('doc tabs: the unsaved dot is drawn and its word heard', look.name && look.dirtyFont === '0px' && look.dirtyMask, JSON.stringify(look));
  check('doc tabs: the close button is raised and hidden from assistive technology', look.xRaised && look.xHidden === 'true', JSON.stringify(look));

  const code = await p.evaluate(() => {
    const token = n => { const s = document.createElement('span'); s.style.color = 'var(' + n + ')'; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; };
    const pre = document.querySelector('#docs ~ .demo pre.code');
    const ed = document.querySelector('#docs ~ .demo .code-surface');
    return {
      preShadow: getComputedStyle(pre).boxShadow, preFont: getComputedStyle(pre).fontFamily,
      edShadow: getComputedStyle(ed).boxShadow,
      keyword: getComputedStyle(pre.querySelector('.hljs-keyword')).color === token('--syntax-keyword'),
      string: getComputedStyle(pre.querySelector('.hljs-string')).color === token('--syntax-string'),
      comment: getComputedStyle(pre.querySelector('.hljs-comment')).color === token('--syntax-comment')
    };
  });
  check('code: a code block is flat and monospaced', code.preShadow === 'none' && /mono|consolas|cascadia|menlo|courier/i.test(code.preFont), JSON.stringify(code));
  check('code: an editor surface is sunken', /inset/.test(code.edShadow), code.edShadow);
  check('code: highlight.js classes take the syntax colours', code.keyword && code.string && code.comment, JSON.stringify(code));

  /* The dark theme has syntax colours of its own. */
  const dark = await p.evaluate(() => {
    pudlSetTheme('light');
    const light = getComputedStyle(document.documentElement).getPropertyValue('--syntax-keyword').trim();
    pudlSetTheme('dark');
    const d = getComputedStyle(document.documentElement).getPropertyValue('--syntax-keyword').trim();
    return { light, d };
  });
  check('code: the dark theme has its own syntax colours', dark.light && dark.d && dark.light !== dark.d, JSON.stringify(dark));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
