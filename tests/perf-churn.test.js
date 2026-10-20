/* PUDL's scripts must not make an application pay for changes that are
   none of their business (0.69.3). On the reference page, which loads
   every script, a page that streams text in, lights rows with classes and
   moves things with styles, none of it PUDL's, must cost no page-wide
   search, no measurement and no reading of computed style from PUDL. Time
   is too noisy to test; these are counted, so the test is exact. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  await p.goto(ROOT + '/reference.html');
  await p.waitForTimeout(1000);
  const counts = await p.evaluate(async () => {
    /* Every call counted, with whether it came from a PUDL script. */
    const counts = {};
    const fromPudl = () => /\/dist\/pudl[-.\w]*\.js/.test(new Error().stack.split('\n').slice(2).join('\n'));
    const wrap = (proto, name, label, only) => {
      const orig = proto[name];
      proto[name] = function () {
        if ((!only || only(this)) && fromPudl()) counts[label] = (counts[label] || 0) + 1;
        return orig.apply(this, arguments);
      };
    };
    wrap(Document.prototype, 'querySelectorAll', 'page-wide querySelectorAll');
    wrap(Document.prototype, 'querySelector', 'page-wide querySelector');
    wrap(Element.prototype, 'querySelectorAll', 'body-wide querySelectorAll', el => el === document.body || el === document.documentElement);
    wrap(Element.prototype, 'getBoundingClientRect', 'getBoundingClientRect');
    wrap(Element.prototype, 'getClientRects', 'getClientRects');
    wrap(window, 'getComputedStyle', 'getComputedStyle');
    const tick = () => new Promise(r => setTimeout(r, 0));
    const box = document.createElement('div');
    box.id = 'churn';
    document.body.appendChild(box);
    for (let i = 0; i < 100; i++) {
      const para = document.createElement('p');
      para.innerHTML = '<span>word ' + i + '</span> <em>more</em>';
      box.appendChild(para);
      await tick();
    }
    const rows = Array.from(box.children);
    for (let i = 0; i < 100; i++) { rows[i % rows.length].classList.toggle('active'); await tick(); }
    for (let i = 0; i < 100; i++) { box.style.setProperty('--x', String(i)); box.style.marginLeft = (i % 3) + 'px'; await tick(); }
    for (let i = 0; i < 50; i++) { rows[i].setAttribute('aria-current', String(i % 2 === 0)); await tick(); }
    box.remove();
    await new Promise(r => setTimeout(r, 300));
    return counts;
  });
  const total = Object.keys(counts).reduce((s, k) => s + counts[k], 0);
  check('changes that are not PUDL\'s cost no page-wide search, measurement or computed style from PUDL', total === 0, JSON.stringify(counts));
  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
