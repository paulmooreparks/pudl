/* A select in a .form-select-wrap is drawn by PUDL (specification 0.8.0):
   sunken in every engine, with the caret glyph as its opener in its text
   colour, at its end edge, and no opener on a select showing several rows
   (from the component list's measurement, which found WebKit drawing a
   select raised and clipping its text). */
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
    const p = await b.newPage({ viewport: { width: 800, height: 400 } });
    p.on('pageerror', e => errors.push(e.message));
    /* The page opens in the theme rather than switching to it: after a
       switch, WebKit goes on reporting a select's computed colour and
       colour scheme from the old theme, though it paints the new one. */
    await p.addInitScript(t => { try { localStorage.setItem('pudl-theme', t); } catch (e) {} }, theme);
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.goto(ROOT + '/reference.html');
    const got = await p.evaluate(t => {
      if (document.documentElement.getAttribute('data-theme') !== t) throw new Error('the page did not open in the ' + t + ' theme');
      const box = document.createElement('div');
      box.style.cssText = 'position: fixed; top: 0; left: 0; width: 600px; padding: 16px; background: var(--bg); z-index: 99999';
      box.innerHTML =
        '<span class="form-select-wrap" id="w" style="width: 200px"><select class="form-select" id="s"><option>Manila, October</option></select></span>' +
        '<span class="form-select-wrap" id="wr" dir="rtl" style="width: 200px"><select class="form-select"><option>مانيلا</option></select></span>' +
        '<span class="form-select-wrap" id="wl" style="width: 200px"><select class="form-select" size="3"><option>One</option><option>Two</option></select></span>';
      document.body.appendChild(box);
      const s = document.getElementById('s'), w = document.getElementById('w');
      const cs = getComputedStyle(s), after = getComputedStyle(w, '::after');
      const wr = document.getElementById('wr'), rAfter = getComputedStyle(wr, '::after');
      const sb = s.getBoundingClientRect();
      return {
        appearance: cs.appearance, inset: /inset/.test(cs.boxShadow), gradient: cs.backgroundImage !== 'none', height: sb.height,
        textColor: cs.color, caretColor: after.backgroundColor, caretMask: after.maskImage || after.webkitMaskImage,
        caretRight: sb.right - (sb.left + parseFloat(after.left)) , caretEnd: parseFloat(after.right),
        rtlStart: parseFloat(rAfter.left),
        listOpener: getComputedStyle(document.getElementById('wl'), '::after').content,
        padEnd: parseFloat(cs.paddingRight)
      };
    }, theme);
    check(theme + ': a wrapped select has no drawing of the browser\'s', got.appearance === 'none', got.appearance);
    check(theme + ': it is sunken: an inner shadow, no gradient', got.inset && !got.gradient);
    check(theme + ': it is 36px tall', Math.round(got.height) === 36, String(got.height));
    check(theme + ': its opener is the caret glyph', /svg/.test(got.caretMask) && got.caretMask.includes('M3.5'), got.caretMask.slice(0, 60));
    check(theme + ': in its text colour', got.caretColor === got.textColor, got.caretColor + ' / ' + got.textColor);
    check(theme + ': 11px in from its end edge, with the text stopping short of it', got.caretEnd === 11 && got.padEnd >= 11 + 12, JSON.stringify({ end: got.caretEnd, pad: got.padEnd }));
    check(theme + ': at the start edge, which is its end, in a right-to-left page', got.rtlStart === 11, String(got.rtlStart));
    check(theme + ': a select showing several rows has no opener', got.listOpener === 'none' || got.listOpener === 'normal', got.listOpener);
    await p.close();
  }
  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
