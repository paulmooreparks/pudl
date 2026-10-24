/* Browser demand loading and shaping parity against the retained whole
   fonts, for pudl.css's lean Inter, pudl-fonts-full.css's Inter Full and
   pudl-fonts-system.css, which downloads no font at all (0.70.0). */
const assert = require('assert/strict');
const { launch, ROOT, out } = require('./lib');

const PROBE = '<p id="probe">Quarterly expenses 123.45 ↩</p><h1 id="head">Heading</h1>';

async function renderedFonts(page) {
  await page.locator('#probe').evaluate(el => {
    // Demand loading starts when the changed text is laid out. Do not
    // inspect an already-resolved ready promise from the preceding layout.
    el.getBoundingClientRect();
    return document.fonts.ready;
  });
}

async function probe(browser, sheets) {
  const page = await browser.newPage();
  const requested = [];
  page.on('request', request => {
    if (request.url().endsWith('.woff2')) requested.push(request.url().split('/').pop());
  });
  await page.route('**/font-probe', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html>' + sheets.map(s => `<link rel="stylesheet" href="/dist/${s}">`).join('') + PROBE
  }));
  await page.goto(ROOT + '/font-probe');
  await renderedFonts(page);
  return { page, requested };
}

/* The family's widths against the whole font, to 0.02 pixels, at 400 and
   700. The lean set keeps the optical size of text, which is the whole
   font's default, so it is compared with optical sizing off; the full set
   with it on. Linux Chromium fits outlines to pixels, and at weight 600 it
   draws some Greek and Cyrillic text a pixel narrower from a subset than
   from the whole font, the full set's unchanged 0.44.0 files included, so
   build/fonts.py proves the lean set's advances and outlines at 400, 600
   and 700 in the font data instead. */
async function parity(page, family, opticalSizing, weights) {
  return page.evaluate(async ({ family, opticalSizing, weights }) => {
    for (const italic of [false, true]) {
      const face = new FontFace('WholeInter', `url(/dist/fonts/InterVariable${italic ? '-Italic' : ''}.woff2)`,
        { style: italic ? 'italic' : 'normal', weight: '100 900' });
      document.fonts.add(await face.load());
    }
    const texts = ['office AV To 0123456789 ↩', 'Ấ é', 'Ł́ ἀ й', 'Łąž ệạ',
      'Ωα ἀἁ Жя Ѡѡ ∂∏'];
    const failures = [];
    for (const text of texts) {
      for (const style of ['normal', 'italic']) {
        for (const weight of weights) {
          for (const size of [15, 30]) {
            const widths = [];
            for (const f of [family, 'WholeInter']) {
              await document.fonts.load(`${style} ${weight} ${size}px "${f}"`, text);
              const span = document.createElement('span');
              span.textContent = text;
              span.style.cssText = `display:inline-block;font:${style} ${weight} ${size}px "${f}";font-variant-numeric:tabular-nums;font-optical-sizing:${opticalSizing}`;
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
  }, { family, opticalSizing, weights });
}

(async () => {
  const browser = await launch();
  try {
    let { page, requested } = await probe(browser, ['pudl.css']);
    assert.deepEqual(requested, ['Inter-latin.woff2']);
    console.log('PASS English, headings and footnote arrows download only Latin upright');
    await page.locator('#probe').evaluate(el => { el.style.fontStyle = 'italic'; });
    await renderedFonts(page);
    assert.deepEqual(requested, ['Inter-latin.woff2', 'Inter-Italic-latin.woff2']);
    console.log('PASS italic loads on demand without whole fonts or other scripts');

    const cases = [
      ['latin-ext', 'Łąž'], ['vietnamese', 'ệạ'],
      ['greek', 'Ωα'], ['greek-ext', 'ἀἁ'],
      ['cyrillic', 'Жя'], ['cyrillic-ext', 'Ѡѡ'],
      ['rest', '∂∏']
    ];
    for (const [name, text] of cases) {
      for (const italic of [false, true]) {
        const before = requested.length;
        await page.locator('#probe').evaluate((el, arg) => {
          el.style.fontStyle = arg.italic ? 'italic' : 'normal'; el.textContent = arg.text;
        }, { italic, text });
        await renderedFonts(page);
        assert.deepEqual(requested.slice(before), [`Inter-${italic ? 'Italic-' : ''}${name}.woff2`]);
      }
      console.log(`PASS ${name} loads only its matching upright and italic subsets`);
    }
    assert.deepEqual(await parity(page, 'Inter', 'none', [400, 700]), []);
    console.log('PASS the lean set matches the whole font at the optical size of text');
    await page.screenshot({ path: out('font-subsets.png') });
    await page.close();

    ({ page, requested } = await probe(browser, ['pudl.css', 'pudl-fonts-full.css']));
    assert.deepEqual(requested, ['Inter-Full-latin.woff2']);
    console.log('PASS pudl-fonts-full.css downloads only its own Latin upright, never the lean set');
    assert.deepEqual(await parity(page, 'Inter Full', 'auto', [400, 700]), []);
    console.log('PASS the full set matches the whole font at body and heading sizes, optical size included');
    await page.close();

    ({ page, requested } = await probe(browser, ['pudl.css', 'pudl-fonts-system.css']));
    assert.deepEqual(requested, []);
    const families = await page.evaluate(() => ['probe', 'head'].map(id => getComputedStyle(document.getElementById(id)).fontFamily));
    for (const f of families) assert.ok(!/Inter/.test(f) && /system-ui/.test(f), f);
    console.log('PASS pudl-fonts-system.css sets text and headings in the system face and downloads no font');
    await page.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
