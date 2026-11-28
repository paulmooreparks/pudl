/* Text put into one part of a page must restyle that part, and not every
   badge and every row with actions in the page (0.108.0). Two rules had
   asked, from each badge and each actions button, whether an ancestor held
   a menu bar or a selected link, and Chromium answered that by restyling
   all of them for any insertion anywhere. The status area now reads the
   topbar's scoped values. Row actions stay visible under the approved
   0.108.1 contract. This checks that visibility and retained styling in
   every engine, and in Chromium, from its trace, how many elements one
   insertion restyles. */
const { launch, ROOT, engine, settled } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await p.goto(ROOT + '/tests/fixtures/restyle-scope.html');
  await settled(p);

  const look = await p.evaluate(() => {
    const cs = el => getComputedStyle(el);
    const item = id => document.querySelector('#' + id + ' .md-item');
    const actions = id => cs(document.querySelector('#' + id + ' [data-row-actions]')).visibility;
    /* What a value comes to where it is used, from a probe put there. */
    function probe(parent, style, prop) {
      const el = document.createElement('span');
      el.setAttribute('style', style);
      parent.appendChild(el);
      const v = cs(el)[prop];
      el.remove();
      return v;
    }
    const withBar = document.getElementById('with-bar'), plain = document.getElementById('plain');
    const barItem = document.getElementById('item-0'), barArea = document.getElementById('status');
    const barBadge = barItem.querySelector('.badge');
    return {
      weights: ['row-0', 'row-1', 'row-2', 'row-3'].map(id => cs(item(id)).fontWeight),
      actions: ['row-0', 'row-1', 'row-2', 'row-3'].map(actions),
      barColor: cs(barItem).color,
      barColorWanted: probe(withBar, 'color: color-mix(in srgb, var(--text) 80%, var(--surface-alt))', 'color'),
      plainColor: cs(document.getElementById('plain-item')).color,
      plainColorWanted: probe(plain, 'color: var(--tb-chrome-fg)', 'color'),
      barBg: cs(barArea).backgroundImage,
      barBgWanted: probe(withBar, 'background: var(--raise-grad)', 'backgroundImage'),
      badge: cs(barBadge).color,
      /* The badge's own status colour is the badge's, so the probe is a
         badge of the same kind. */
      badgeWanted: (() => {
        const b = document.createElement('span');
        b.className = 'badge warn';
        b.setAttribute('style', 'color: color-mix(in srgb, var(--badge-color) 62%, var(--text))');
        barItem.appendChild(b);
        const v = cs(b).color;
        b.remove();
        return v;
      })()
    };
  });
  check('the current row\'s link is bold and the others are not', look.weights[1] === '700' && look.weights[0] !== '700' && look.weights[3] !== '700', JSON.stringify(look.weights));
  check('all row actions stay visible at rest', look.actions.join() === 'visible,visible,visible,visible', look.actions.join());
  check('a status item beside a menu bar takes the titles\' colour', look.barColor === look.barColorWanted, look.barColor + ' vs ' + look.barColorWanted);
  check('a status item with no menu bar keeps the topbar\'s colour', look.plainColor === look.plainColorWanted, look.plainColor + ' vs ' + look.plainColorWanted);
  check('the status area beside a menu bar takes the group\'s surface', look.barBg === look.barBgWanted && look.barBg !== 'none', look.barBg + ' vs ' + look.barBgWanted);
  check('a badge beside a menu bar mixes into the titles\' colour', look.badge === look.badgeWanted, look.badge + ' vs ' + look.badgeWanted);

  /* With the old rules, a word put into one status item restyled every
     item and badge beside it, over 900 elements here. */
  if (engine === 'chromium') {
    const cdp = await p.context().newCDPSession(p);
    const inserts = 10;
    async function restyled(where) {
      const events = [], on = e => events.push(...e.value);
      cdp.on('Tracing.dataCollected', on);
      await cdp.send('Tracing.start', { categories: 'devtools.timeline', transferMode: 'ReportEvents' });
      await p.evaluate(async ([selector, n]) => {
        const target = document.querySelector(selector);
        for (let i = 0; i < n; i++) {
          const words = document.createElement('span');
          words.textContent = ' more ' + i;
          target.appendChild(words);
          getComputedStyle(words).color;
          await new Promise(r => setTimeout(r, 0));
        }
      }, [where, inserts]);
      const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
      await cdp.send('Tracing.end');
      await done;
      cdp.off('Tracing.dataCollected', on);
      const counts = events.filter(e => e.name === 'UpdateLayoutTree' && e.args && e.args.elementCount != null).map(e => e.args.elementCount);
      return counts.length ? counts.reduce((s, n) => s + n, 0) : null;
    }
    for (const [where, name] of [['#item-5', 'a status item beside the menu bar'], ['#row-5 .md-item', 'a row\'s link'], ['#box', 'the page outside both']]) {
      const total = await restyled(where);
      if (total === null) { console.log('SKIP the trace had no style counts to read'); break; }
      check('words put into ' + name + ' restyle a few elements, not every badge and row', total / inserts < 40, total + ' elements over ' + inserts + ' insertions');
    }
  }

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
