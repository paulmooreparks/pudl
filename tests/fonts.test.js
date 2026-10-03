/* Browser demand loading and shaping parity against the retained whole fonts. */
const assert = require('assert/strict');
const { launch, ROOT, out } = require('./lib');

(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    const requested = [];
    page.on('request', request => {
      if (request.url().endsWith('.woff2')) requested.push(request.url().split('/').pop());
    });
    await page.route('**/font-probe', route => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><link rel="stylesheet" href="/dist/pudl.css"><p id="probe">Quarterly expenses 123.45 \u21a9</p>'
    }));
    await page.goto(ROOT + '/font-probe');
    await page.evaluate(() => document.fonts.ready);
    assert.deepEqual(requested, ['Inter-latin.woff2']);
    console.log('PASS English and footnote arrows download only Latin upright');
    await page.locator('#probe').evaluate(el => { el.style.fontStyle = 'italic'; });
    await page.evaluate(() => document.fonts.ready);
    assert.deepEqual(requested, ['Inter-latin.woff2', 'Inter-Italic-latin.woff2']);
    console.log('PASS italic loads on demand without whole fonts or other scripts');

    const cases = [
      ['latin-ext', '\u0141\u0105\u017e'], ['vietnamese', '\u1ec7\u1ea1'],
      ['greek', '\u03a9\u03b1'], ['greek-ext', '\u1f00\u1f01'],
      ['cyrillic', '\u0416\u044f'], ['cyrillic-ext', '\u0460\u0461'],
      ['rest', '\u2202\u220f']
    ];
    for (const [name, text] of cases) {
      for (const italic of [false, true]) {
        const before = requested.length;
        await page.locator('#probe').evaluate((el, arg) => {
          el.style.fontStyle = arg.italic ? 'italic' : 'normal'; el.textContent = arg.text;
        }, { italic, text });
        await page.evaluate(() => document.fonts.ready);
        assert.deepEqual(requested.slice(before), [`Inter-${italic ? 'Italic-' : ''}${name}.woff2`]);
      }
      console.log(`PASS ${name} loads only its matching upright and italic subsets`);
    }

    const parity = await page.evaluate(async () => {
      for (const italic of [false, true]) {
        const face = new FontFace('WholeInter', `url(/dist/fonts/InterVariable${italic ? '-Italic' : ''}.woff2)`,
          { style: italic ? 'italic' : 'normal', weight: '100 900' });
        document.fonts.add(await face.load());
      }
      const texts = ['office AV To 0123456789 \u21a9', 'A\u0302\u0301 e\u0301', '\u0141\u0301 \u03b1\u0313 \u0438\u0306', '\u0141\u0105\u017e \u1ec7\u1ea1',
        '\u03a9\u03b1 \u1f00\u1f01 \u0416\u044f \u0460\u0461 \u2202\u220f'];
      const failures = [];
      for (const text of texts) {
        for (const style of ['normal', 'italic']) {
          for (const weight of [400, 700]) {
            for (const size of [15, 30]) {
              const widths = [];
              for (const family of ['Inter', 'WholeInter']) {
                await document.fonts.load(`${style} ${weight} ${size}px ${family}`, text);
                const span = document.createElement('span');
                span.textContent = text;
                span.style.cssText = `display:inline-block;font:${style} ${weight} ${size}px ${family};font-variant-numeric:tabular-nums;font-optical-sizing:auto`;
                document.body.append(span);
                widths.push(span.getBoundingClientRect().width);
                span.remove();
              }
              if (Math.abs(widths[0] - widths[1]) > 0.02) failures.push({ text, style, weight, size, widths });
            }
          }
        }
      }
      return failures;
    });
    assert.deepEqual(parity, []);
    console.log('PASS script shaping, tabular numerals, and body/heading metrics match whole fonts');
    await page.screenshot({ path: out('font-subsets.png') });
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
