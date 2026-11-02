/* 0.96.9: documented hooks in place of reaching into generated markup. A
   popover anchored to a folded control is placed against what shows it;
   the menu bar says whether it is open; a row's detail is a second line;
   a detail equal to the title is not drawn; tree toggles may be named
   buttons. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 800 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/tests/fixtures/contract-hooks.html');
  await p.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.length === 4 && document.querySelector('.tree-ready') && document.querySelector('#tb .toolbar-more'));
  const settle = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => setTimeout(r, 150))));

  /* 4. A popover anchored to a control the toolbar folds. */
  const popAt = async () => {
    await p.evaluate(() => document.getElementById('share-pop').showPopover());
    await p.waitForSelector('#share-pop:popover-open:not(.placing)');
    const r = await p.evaluate(() => {
      const pop = document.getElementById('share-pop').getBoundingClientRect();
      const near = sel => { const el = document.querySelector(sel); if (!el || !el.getClientRects().length) return false; const b = el.getBoundingClientRect(); return Math.abs(pop.left - b.left) < 2 || (pop.left <= b.right && pop.right >= b.left); };
      return { ctl: near('#share'), fold: near('#tb .toolbar-group[data-toolbar-group="Share"] > .toolbar-fold > .menu-btn'), more: near('#tb > .toolbar-more > .menu-btn'), ctlShown: !!document.getElementById('share').getClientRects().length };
    });
    await p.evaluate(() => document.getElementById('share-pop').hidePopover());
    return r;
  };
  let at = await popAt();
  check('with room, the popover is placed against its own control', at.ctlShown && at.ctl, at);
  /* Narrow the bar until the control folds into its group, then until
     the group goes into More. */
  const stageOf = () => p.evaluate(() => ({ st: document.querySelector('#tb .toolbar-group[data-toolbar-group="Share"]').getAttribute('data-toolbar-stage'), shown: !!document.getElementById('share').getClientRects().length }));
  let w = 900, st = await stageOf();
  while (w > 60 && (st.shown || Number(st.st) >= 5)) { w -= 40; await p.evaluate(w => { document.getElementById('tb-wrap').style.width = w + 'px'; }, w); await settle(); st = await stageOf(); }
  at = await popAt();
  check('with the control folded into its group, the popover is placed against the group\'s fold button', !at.ctlShown && at.fold, { at, st, w });
  while (w > 40 && Number(st.st) < 5) { w -= 40; await p.evaluate(w => { document.getElementById('tb-wrap').style.width = w + 'px'; }, w); await settle(); st = await stageOf(); }
  at = await popAt();
  check('with the group in More, the popover is placed against the More button', !at.ctlShown && at.more, { at, st, w });
  await p.evaluate(() => { document.getElementById('tb-wrap').style.width = '900px'; }); await settle();

  /* 5. The menu bar's open state and events. */
  check('isOpen is false before any menu opens', await p.evaluate(() => pudlMenubar.isOpen() === false));
  await p.locator('.menubar-title').first().click();
  await p.waitForSelector('#menubar-panel:popover-open');
  /* The toggle event is a task after the popover opens. */
  await p.waitForFunction(() => __bar.length > 0);
  check('isOpen is true with a menu open, and the bar said so', await p.evaluate(() => pudlMenubar.isOpen() === true && __bar.join() === 'open'), await p.evaluate(() => __bar));
  /* 6. A row's detail as a second line that wraps. */
  const detail = await p.evaluate(() => { const r = [...document.querySelectorAll('#menubar-panel .menu-action')].find(x => /Recent one/.test(x.textContent)); const d = r && r.querySelector('.menubar-detail'); return d ? { text: d.textContent.slice(0, 8), lines: Math.round(d.getBoundingClientRect().height / parseFloat(getComputedStyle(d).lineHeight)), under: d.getBoundingClientRect().top > r.querySelector('.menubar-words').getBoundingClientRect().top } : null; });
  check('a row with data-menu-detail shows it under its words, wrapping to more than one line', detail && detail.text === 'C:\\Users' && detail.lines >= 2 && detail.under, detail);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => !pudlMenubar.isOpen() && __bar.length > 1);
  check('closing the menu makes isOpen false and the bar said close', await p.evaluate(() => __bar.join() === 'open,close'), await p.evaluate(() => __bar));

  /* 1. A detail that repeats the title is not drawn. */
  const tabs = await p.evaluate(() => {
    const out = {};
    const lone = document.querySelector('.win-bar [data-win-tab="lone"]');
    out.lone = { detailHidden: lone.querySelector('.win-item-detail').hidden, name: lone.getAttribute('aria-label') };
    return out;
  });
  check('a taskbar button whose detail repeats its title draws no detail, and its name still says both', tabs.lone.detailHidden && /Gamma.*Gamma/.test(tabs.lone.name), tabs);
  await p.locator('.win-bar [data-win-stack="g"]').click();
  await p.waitForSelector('.win-stack-panel:popover-open');
  const rows = await p.evaluate(() => [...document.querySelectorAll('.win-stack-panel [data-stack-row]')].map(r => ({ key: r.getAttribute('data-stack-row'), detailHidden: r.firstChild.querySelector('.win-item-detail').hidden, detail: r.firstChild.querySelector('.win-item-detail').textContent, name: r.firstChild.getAttribute('aria-label') })));
  check('a stack row whose detail repeats its title draws no detail; one whose detail differs draws it', rows.find(r => r.key === 's1').detailHidden && !rows.find(r => r.key === 's2').detailHidden && rows.find(r => r.key === 's2').detail === 'Customers', rows);
  check('a stack row whose detail repeats the stack\'s label draws no detail, and its name still says it', rows.find(r => r.key === 's3').detailHidden && /Delta.*Chats/.test(rows.find(r => r.key === 's3').name), rows.find(r => r.key === 's3'));
  check('the same window\'s taskbar presence outside a stack is not affected by the stack rule', await p.evaluate(() => { const t = document.querySelector('.win-bar [data-win-tab="s3"]'); return !t || !t.querySelector('.win-item-detail').hidden; }));
  await p.keyboard.press('Escape');
  await p.evaluate(() => pudlWindows.retitle('lone', 'Gamma', 'Elsewhere'));
  await p.waitForFunction(() => !document.querySelector('.win-bar [data-win-tab="lone"] .win-item-detail').hidden);
  check('a detail changed to differ from the title is drawn again', true);

  /* 3. Tree toggles as named buttons. */
  const tree = await p.evaluate(() => {
    const t = (sel) => { const m = document.querySelector(sel).firstElementChild; return { role: m.getAttribute('role'), label: m.getAttribute('aria-label'), hidden: m.getAttribute('aria-hidden'), tab: m.getAttribute('tabindex'), expanded: m.getAttribute('aria-expanded') }; };
    return { a: t('#named a[href="#a"]'), b: t('#named a[href="#b"]'), plain: t('#plain a[href="#d"]') };
  });
  check('on a tree marked for buttons, a toggle is a named button out of the Tab order, using data-tree-label', tree.a.role === 'button' && tree.a.label === 'Collapse Documents folder' && tree.a.hidden === null && tree.a.tab === '-1' && tree.a.expanded === 'true', tree.a);
  check('a node without a label is named by its words', tree.b.role === 'button' && tree.b.label === 'Expand Reports' && tree.b.expanded === 'false', tree.b);
  check('a tree without the attribute keeps decorative toggles', tree.plain.role === null && tree.plain.hidden === 'true' && tree.plain.label === null, tree.plain);
  await p.locator('#named a[href="#b"] .tree-toggle').click();
  await p.waitForFunction(() => document.querySelector('#named a[href="#b"]').getAttribute('aria-expanded') === 'true');
  const after = await p.evaluate(() => { const m = document.querySelector('#named a[href="#b"]').firstElementChild; return { label: m.getAttribute('aria-label'), expanded: m.getAttribute('aria-expanded') }; });
  check('the name follows the node as it opens', after.label === 'Collapse Reports' && after.expanded === 'true', after);
  const tabStops = await p.evaluate(() => [...document.querySelectorAll('#named [tabindex="0"]')].map(e => e.tagName + (e.className ? '.' + e.className : '')));
  check('the tree still has one Tab stop, a node and not a toggle', tabStops.length === 1 && tabStops[0] === 'A', tabStops);

  check('no page errors', !errors.length, errors);
  await b.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
