/* A disabled button of any kind, however it was disabled, looks like a
   disabled plain button (from YAVCHN's report on 0.43.0: a disabled
   primary button kept its accent text on the neutral face, and a button
   disabled by its fieldset looked enabled). */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  for (const theme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
    p.on('pageerror', e => errors.push(e.message));
    /* Buttons ease their background and border; with reduced motion they
       change at once, so a reading never lands mid-transition after the
       theme switch or a hover. */
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.goto(ROOT + '/reference.html');
    await p.evaluate(t => {
      document.documentElement.setAttribute('data-theme', t);
      const box = document.createElement('div');
      box.id = 'disabled-probe';
      box.style.cssText = 'position: fixed; top: 100px; left: 20px; z-index: 10000; display: flex; gap: 8px; padding: 8px; background: var(--surface)';
      box.innerHTML =
        '<button class="btn" id="plain" disabled>Plain</button>' +
        '<button class="btn btn-primary" id="primary" disabled>Import</button>' +
        '<button class="btn btn-danger" id="danger" disabled>Delete</button>' +
        '<button class="btn btn-primary" id="latched" aria-pressed="true" disabled>Reveal</button>' +
        '<fieldset disabled style="border: 0; padding: 0; margin: 0"><button class="btn" id="fieldset">Block</button></fieldset>' +
        '<a class="btn btn-primary" id="link" href="#x" aria-disabled="true">Next</a>' +
        '<button class="btn btn-primary is-disabled" id="cls">Class</button>';
      document.body.appendChild(box);
    }, theme);

    const look = id => p.evaluate(id => {
      const cs = getComputedStyle(document.getElementById(id));
      return { color: cs.color, opacity: cs.opacity, bg: cs.backgroundImage, border: cs.borderTopColor, shadow: cs.boxShadow, cursor: cs.cursor };
    }, id);
    const same = (a, b) => ['color', 'opacity', 'bg', 'border', 'shadow'].every(k => a[k] === b[k]);

    const plain = await look('plain');
    check(theme + ': a disabled plain button is dimmed, with a not-allowed cursor', plain.opacity === '0.45' && plain.cursor === 'not-allowed', JSON.stringify(plain));
    for (const [id, what] of [['primary', 'primary'], ['danger', 'danger'], ['latched', 'latched primary'],
                              ['fieldset', 'fieldset-disabled'], ['link', 'aria-disabled link'], ['cls', '.is-disabled']]) {
      const got = await look(id);
      check(theme + ': a disabled ' + what + ' button looks like a disabled plain button', same(got, plain), JSON.stringify({ got, plain }));
    }

    /* Under the pointer, nothing a kind sets on hover shows through. */
    await p.hover('#primary', { force: true });
    check(theme + ': a hovered disabled primary button still looks disabled', same(await look('primary'), plain));
    await p.hover('#danger', { force: true });
    check(theme + ': a hovered disabled danger button still looks disabled', same(await look('danger'), plain));

    const linkClick = await p.evaluate(() => getComputedStyle(document.getElementById('link')).pointerEvents);
    check(theme + ': an aria-disabled link button takes no clicks', linkClick === 'none', linkClick);
    await p.close();
  }
  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
