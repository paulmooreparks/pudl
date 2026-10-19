/* A dialog's head and actions stay in view while the content between them
   scrolls, a line marks a band only while content is hidden beneath it,
   focus is scrolled clear of both bands, and a dialog that fits looks as
   it did (0.65.0). Run on the reference page's two dialogs. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}
const near = (a, b) => Math.abs(a - b) <= 1;

async function measure(p) {
  return p.evaluate(() => {
    const d = document.querySelector('dialog[open]');
    const r = el => el.getBoundingClientRect();
    const head = d.querySelector('.dialog-head') || d.querySelector('.dialog-title');
    const foot = d.querySelector('.dialog-actions');
    return {
      top: r(d).top, bottom: r(d).bottom, scroll: d.scrollTop,
      scrolls: d.scrollHeight > d.clientHeight + 1,
      headTop: r(head).top, headBottom: r(head).bottom,
      footTop: r(foot).top, footBottom: r(foot).bottom,
      above: d.hasAttribute('data-dialog-more-above'), below: d.hasAttribute('data-dialog-more-below'),
      headLine: getComputedStyle(head).borderBottomColor, footLine: getComputedStyle(foot).borderTopColor,
      border: getComputedStyle(d).borderTopColor
    };
  });
}
const settle = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

(async () => {
  const browser = await launch();
  for (const [label, viewport] of [['desktop', { width: 1280, height: 640 }], ['phone', { width: 390, height: 700 }]]) {
    const p = await browser.newPage({ viewport });
    await p.goto(ROOT + '/reference.html#dialogs');

    /* The short dialog fits, so it has no lines and keeps its spacing. */
    await p.locator('button[commandfor="demo-dialog"]').click();
    await settle(p);
    const s = await measure(p);
    const gap = await p.evaluate(() => {
      const d = document.querySelector('dialog[open]');
      const body = d.querySelector('.dialog-body').getBoundingClientRect();
      const btn = d.querySelector('.dialog-actions .btn').getBoundingClientRect();
      const title = d.querySelector('.dialog-title');
      const range = document.createRange(); range.selectNodeContents(title);
      return { above: btn.top - body.bottom, below: d.getBoundingClientRect().bottom - 1 - btn.bottom,
        titleTop: range.getBoundingClientRect().top - d.getBoundingClientRect().top - 1,
        titleToBody: body.top - title.getBoundingClientRect().bottom + parseFloat(getComputedStyle(title).paddingBottom) + 1 };
    });
    check(label + ': a dialog that fits does not scroll and draws no lines', !s.scrolls && !s.above && !s.below, JSON.stringify(s));
    check(label + ': its buttons are 24px below the body and 24px above the panel\'s edge', near(gap.above, 24) && near(gap.below, 24), JSON.stringify(gap));
    check(label + ': its title is 24px from the panel\'s top and 8px above the body', gap.titleTop >= 23 && gap.titleTop <= 29 && near(gap.titleToBody, 8), JSON.stringify(gap));
    await p.keyboard.press('Escape');

    /* The long dialog scrolls between its head and its actions. */
    await p.locator('button[commandfor="demo-dialog-long"]').click();
    await settle(p);
    let m = await measure(p);
    check(label + ': the long dialog scrolls', m.scrolls, JSON.stringify(m));
    check(label + ': at the start, the head is at the top and the actions at the foot', near(m.headTop, m.top + 1) && near(m.footBottom, m.bottom - 1), JSON.stringify(m));
    check(label + ': at the start, only the actions have a line', !m.above && m.below && m.footLine === m.border, JSON.stringify(m));

    await p.evaluate(() => { const d = document.querySelector('dialog[open]'); d.scrollTop = (d.scrollHeight - d.clientHeight) / 2; });
    await settle(p);
    m = await measure(p);
    check(label + ': halfway, the head and the actions are still in view', near(m.headTop, m.top + 1) && near(m.footBottom, m.bottom - 1), JSON.stringify(m));
    check(label + ': halfway, both have a line', m.above && m.below && m.headLine === m.border && m.footLine === m.border, JSON.stringify(m));

    await p.evaluate(() => { const d = document.querySelector('dialog[open]'); d.scrollTop = d.scrollHeight; });
    await settle(p);
    m = await measure(p);
    check(label + ': at the end, only the head has a line', m.above && !m.below && m.footLine !== m.border, JSON.stringify(m));

    /* Focus from the top: Tab through to the last field, which must come
       out clear of both bands, then on to Cancel, which scrolls nothing. */
    await p.evaluate(() => { document.querySelector('dialog[open]').scrollTop = 0; document.getElementById('demo-dialog-long-digest').focus(); });
    await settle(p);
    await p.keyboard.press('Tab');
    await settle(p);
    const field = await p.evaluate(() => {
      const d = document.querySelector('dialog[open]');
      const f = document.activeElement.getBoundingClientRect();
      return { id: document.activeElement.id, top: f.top, bottom: f.bottom,
        head: (d.querySelector('.dialog-head')).getBoundingClientRect().bottom,
        foot: d.querySelector('.dialog-actions').getBoundingClientRect().top, scroll: d.scrollTop };
    });
    check(label + ': Tab to the last field brings it clear of both bands', field.id === 'demo-dialog-long-quiet' && field.top >= field.head - 0.5 && field.bottom <= field.foot + 0.5, JSON.stringify(field));
    await p.keyboard.press('Tab');
    await settle(p);
    const btn = await p.evaluate(() => ({ text: document.activeElement.textContent.trim(), scroll: document.querySelector('dialog[open]').scrollTop }));
    check(label + ': Tab on to Cancel scrolls nothing', btn.text === 'Cancel' && near(btn.scroll, field.scroll), JSON.stringify({ btn, before: field.scroll }));
    await p.keyboard.press('Escape');
    await p.close();
  }
  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
