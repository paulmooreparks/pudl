/* Code blocks with copy and download, from parkscomputing.com's
   Architecture/pudl-proposal-code-actions.md. The clipboard is stood in for
   by a script, so the test runs the same in every engine. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
const PRE = '#docs ~ .demo pre[data-code-actions]';
(async () => {
  const b = await launch();
  const errors = [];

  /* A clipboard that accepts. */
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => {
    window.__copied = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: t => { window.__copied.push(t); return Promise.resolve(); }
    } });
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/reference.html');
  await p.waitForFunction(() => window.pudlCode && document.querySelector('.code-block'));

  const strip = await p.evaluate(sel => {
    const pre = document.querySelector(sel);
    const wrap = pre.parentElement;
    window.pudlCode.enhance(document);
    window.pudlCode.enhance(pre);
    return {
      wrapped: wrap.classList.contains('code-block'), blocks: document.querySelectorAll('.code-block').length,
      lang: wrap.querySelector('.code-lang').textContent,
      labels: [...wrap.querySelectorAll('.code-actions button')].map(x => x.getAttribute('aria-label')),
      raised: /gradient/.test(getComputedStyle(wrap.querySelector('.code-actions .icon-btn')).backgroundImage),
      status: wrap.querySelector('[role="status"]').className
    };
  }, PRE);
  check('the block gains a strip naming its language, with raised Copy and Download', strip.wrapped && strip.lang === 'JavaScript' &&
        strip.labels.join() === 'Copy code,Download code' && strip.raised && strip.status === 'visually-hidden', JSON.stringify(strip));
  check('enhancing again changes nothing', strip.blocks === 1, String(strip.blocks));

  await p.evaluate(() => { window.__events = []; document.addEventListener('pudl:code-copy', e => window.__events.push(e.detail.ok)); });
  await p.click('#docs ~ .demo [data-code-copy]');
  await p.waitForFunction(() => window.__copied.length === 1);
  await p.waitForTimeout(150);
  const copied = await p.evaluate(sel => {
    const pre = document.querySelector(sel);
    const btn = pre.parentElement.querySelector('[data-code-copy]');
    return { text: window.__copied[0], same: window.__copied[0] === pre.querySelector('code').textContent,
             done: btn.hasAttribute('data-done'), glyph: btn.querySelector('.glyph').style.getPropertyValue('--glyph'),
             said: pre.parentElement.querySelector('[role="status"]').textContent, events: window.__events };
  }, PRE);
  check('Copy puts the code\'s text, without its highlighting, on the clipboard', copied.same && /^\/\/ Keep the window/.test(copied.text) && !/</.test(copied.text), copied.text.slice(0, 40));
  check('the button shows a check, the live region says so, and pudl:code-copy fires', copied.done && /check/.test(copied.glyph) &&
        copied.said === 'Copied' && copied.events.join() === 'true', JSON.stringify(copied));
  await p.waitForTimeout(2200);
  check('the check goes after two seconds', await p.evaluate(sel => !document.querySelector(sel).parentElement.querySelector('[data-code-copy]').hasAttribute('data-done'), PRE));

  /* Download names the file from the block. */
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#docs ~ .demo [data-code-download]')]);
  check('Download saves the code under the block\'s filename', dl.suggestedFilename() === 'restore-all.js', dl.suggestedFilename());
  const names = await p.evaluate(() => {
    const make = (cls, file) => {
      const pre = document.createElement('pre');
      pre.className = 'code';
      if (file) pre.setAttribute('data-code-filename', file);
      pre.innerHTML = '<code' + (cls ? ' class="' + cls + '"' : '') + '>x</code>';
      document.body.append(pre);
      pudlCode.enhance(pre);
      return pre;
    };
    window.__made = [make('language-cpp'), make(''), make('language-pbrain')];
    pudlCode.extensions.pbrain = 'pb';
    return window.__made.map(pre => pre.parentElement.querySelector('.code-lang').textContent);
  });
  const got = [];
  for (let i = 0; i < 3; i++) {
    const [d] = await Promise.all([p.waitForEvent('download'), p.evaluate(i => window.__made[i].parentElement.querySelector('[data-code-download]').click(), i)]);
    got.push(d.suggestedFilename());
  }
  check('a bare pre handed to enhance takes part, named by its language or not at all', names.join('|') === 'C++||pbrain', names.join('|'));
  check('without a filename, a download is named by the language, a project\'s own extension included, or code.txt',
        got.join() === 'code.cpp,code.txt,code.pb', got.join());

  /* A clipboard that refuses: the code is selected and the reader told how. */
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx2.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('refused')) } });
  });
  const q = await ctx2.newPage();
  q.on('pageerror', e => errors.push(e.message));
  await q.goto(ROOT + '/reference.html');
  await q.waitForFunction(() => document.querySelector('.code-block'));
  await q.click('#docs ~ .demo [data-code-copy]');
  await q.waitForTimeout(200);
  const refused = await q.evaluate(sel => {
    const pre = document.querySelector(sel);
    /* Firefox on Windows reports a selection's line breaks as \r\n. */
    return { selected: String(window.getSelection()).replace(/\r\n/g, '\n') === pre.querySelector('code').textContent,
             said: pre.parentElement.querySelector('[role="status"]').textContent,
             done: pre.parentElement.querySelector('[data-code-copy]').hasAttribute('data-done') };
  }, PRE);
  check('a refused copy selects the code and says how to copy it', refused.selected && /Ctrl\+C, or Command\+C/.test(refused.said) && !refused.done, JSON.stringify(refused));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
