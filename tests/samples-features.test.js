/* The features of 0.24 to 0.26 as the two samples use them: highlighted
   listings, minimise-all and restore-all, and wrapping metadata in the
   article reader, and a receipt dropped on the expense tracker. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];

  /* === Article reader =================================================== */
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/samples/article-reader.html?open=url-state,url-state-parse&top=url-state-parse');
  await p.waitForSelector('.win[data-win="url-state-parse"] pre.code');
  const code = await p.evaluate(() => {
    const token = n => { const s = document.createElement('span'); s.style.color = 'var(' + n + ')'; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; };
    const pre = document.querySelector('.win[data-win="url-state-parse"] pre.code');
    return { flat: getComputedStyle(pre).boxShadow === 'none',
             keyword: getComputedStyle(pre.querySelector('.hljs-keyword')).color === token('--syntax-keyword'),
             text: pre.textContent.indexOf('function parsePlacement(value) {') === 0 };
  });
  check('reader: a listing is a flat code block coloured by the syntax tokens', code.flat && code.keyword && code.text, JSON.stringify(code));

  const pair = () => p.evaluate(() => ({
    min: document.querySelector('.md-toolbar a[data-win-back]').getAttribute('aria-disabled'),
    restore: document.querySelector('.md-toolbar a[data-win-restore]').getAttribute('aria-disabled')
  }));
  let s = await pair();
  check('reader: with windows showing, only minimise-all is live', s.min === null && s.restore === 'true', JSON.stringify(s));
  await p.click('.md-toolbar a[data-win-back]');
  s = await pair();
  check('reader: minimise-all hides them, and restore-all comes alive', s.min === 'true' && s.restore === null &&
        await p.evaluate(() => [...document.querySelectorAll('.win')].every(w => w.hidden)), JSON.stringify(s));
  await p.click('.md-toolbar a[data-win-restore]');
  check('reader: restore-all brings them back with the same one in front',
        await p.evaluate(() => document.querySelector('.win.active').getAttribute('data-win') === 'url-state-parse' &&
                               [...document.querySelectorAll('.win')].every(w => !w.hidden)));

  await p.evaluate(() => document.querySelector('.md-layout').style.setProperty('--md-sidebar-w', '200px'));
  const meta = await p.evaluate(() => {
    const m = document.querySelectorAll('.md-sidebar .md-row')[0].querySelectorAll('.md-meta');
    const last = m[m.length - 1];
    return { n: m.length, lines: Math.round(last.getBoundingClientRect().height / parseFloat(getComputedStyle(last).lineHeight)),
             fits: last.scrollWidth <= last.clientWidth + 1 };
  });
  check('reader: a row\'s date and description both show, the description wrapping', meta.n === 2 && meta.lines >= 2 && meta.fits, JSON.stringify(meta));

  /* === Expense tracker ================================================== */
  const q = await b.newPage({ viewport: { width: 1280, height: 900 } });
  q.on('pageerror', e => errors.push(e.message));
  await q.goto(ROOT + '/samples/expenses.html');
  await q.evaluate(() => localStorage.clear());
  await q.goto(ROOT + '/samples/expense.html?id=8#receipt');
  await q.waitForSelector('.attach-receipt.drop-zone');
  const drag = await q.evaluate(() => {
    const zone = document.querySelector('.attach-receipt.drop-zone');
    const dt = new DataTransfer();
    dt.items.add(new File(['%PDF-1.4 receipt'], 'coffee.pdf', { type: 'application/pdf' }));
    const fire = (type, target) => target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
    fire('dragenter', zone);
    fire('dragover', zone);
    const over = zone.hasAttribute('data-drop-over') && getComputedStyle(zone.querySelector('.drop-hint')).display !== 'none';
    fire('drop', zone);
    return { over, after: zone.hasAttribute('data-drop-over') };
  });
  check('expenses: a file dragged over the attach form rings it and shows the hint, and the drop clears it', drag.over && !drag.after, JSON.stringify(drag));
  await q.waitForFunction(() => /coffee\.pdf/.test(document.body.textContent) && document.querySelector('.receipt-thumb'), null, { timeout: 5000 }).catch(() => {});
  const att = await q.evaluate(() => ({ thumb: !!document.querySelector('.receipt-thumb .glyph'), name: /coffee\.pdf/.test(document.body.textContent) }));
  check('expenses: the dropped receipt is attached, and shown with the document glyph', att.thumb && att.name, JSON.stringify(att));
  await q.evaluate(() => localStorage.clear());

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
