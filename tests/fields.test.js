/* Progress bars, meters, sliders, number fields, password fields,
   pictures and avatars (0.74.0): their behaviour, their keys, the wheel,
   what the form sends, and enough of their look to know they read as
   PUDL. Screenshots of the whole fixture in light and dark land in
   tests/output/. */
const { launch, ROOT, out } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  /* A picture that arrives late, so its frame can be measured before it
     does. */
  let release;
  const slowGate = new Promise(r => { release = r; });
  await p.route('**/slow-picture.svg', async route => {
    await slowGate;
    await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100"><rect width="200" height="100" fill="#8aa"/></svg>' });
  });
  await p.goto(ROOT + '/tests/fixtures/fields.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.pudlFields && document.getElementById('guests-text'));
  await p.evaluate(() => {
    window.heard = [];
    ['input', 'change'].forEach(t => document.addEventListener(t, e => window.heard.push(t + ':' + (e.target.id || e.target.name)), true));
  });
  /* What the hidden inputs hear; the visible fields' own input events as
     the reader types are left out. */
  const heard = () => p.evaluate(() => { const h = window.heard.filter(x => !/-text$/.test(x)).join(','); window.heard = []; return h; });
  const css = (sel, prop, pseudo) => p.evaluate(([s, pr, ps]) => getComputedStyle(document.querySelector(s), ps || null).getPropertyValue(pr).trim(), [sel, prop, pseudo]);
  const mask = (sel, pseudo) => p.evaluate(([s, ps]) => { const c = getComputedStyle(document.querySelector(s), ps); return c.maskImage && c.maskImage !== 'none' ? c.maskImage : c.webkitMaskImage; }, [sel, pseudo]);
  const token = name => p.evaluate(n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
  /* Any colour, as hex, rgb() or a token, made rgb() by the browser and
     then compared as its three numbers. */
  const asRgb = value => p.evaluate(v => { const d = document.createElement('i'); d.style.color = v; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; }, value);
  const nums = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number).join(',');
  const rgbOf = async value => nums(await asRgb(value));
  const rgb = nums;
  const colourOf = name => asRgb('var(' + name + ')');

  /* ---- Progress ---- */
  const prog = await p.evaluate(() => {
    const e = document.getElementById('up'), c = getComputedStyle(e), r = e.getBoundingClientRect();
    return { pos: e.position, h: r.height, shadow: c.boxShadow, words: e.parentElement.querySelector('.progress-value').textContent };
  });
  check('a progress bar is 16px tall, flat, and says its value in words beside it', Math.abs(prog.h - 16) < 0.5 && prog.shadow === 'none' && Math.abs(prog.pos - 0.42) < 1e-9 && prog.words === '42%', JSON.stringify(prog));
  check('a bar with no value is indeterminate and its block slides', await p.evaluate(() => document.getElementById('busy').matches(':indeterminate')) && await css('#busy', 'animation-name') === 'pudl-progress-slide');
  await p.emulateMedia({ reducedMotion: 'reduce' });
  check('with reduced motion the block stands still and the words still say it is working',
    await css('#busy', 'animation-name') === 'none' && await p.evaluate(() => document.querySelector('#busy + .progress-value').textContent) === 'Working…');
  await p.emulateMedia({ reducedMotion: 'no-preference' });

  /* ---- Meters ---- */
  const bandOf = id => p.evaluate(id => { const m = document.getElementById(id); return m.getAttribute('data-band') + '/' + (m.parentElement.getAttribute('data-band') || '-'); }, id);
  const setMeter = (id, v) => p.evaluate(([id, v]) => { document.getElementById(id).value = v; }, [id, v]);
  const settle = () => p.evaluate(() => new Promise(r => setTimeout(r, 0)));
  const bands = [];
  for (const [id, v, want] of [['fuel', 35, 'fair'], ['fuel', 80, 'good'], ['fuel', 10, 'poor'],
    ['air', 210, 'poor'], ['air', 100, 'fair'], ['air', 20, 'good'],
    ['temp', 27, 'fair'], ['temp', 15, 'fair'], ['temp', 21, 'good'],
    ['ctx', 31, 'good'], ['ctx', 80, 'fair'], ['ctx', 95, 'poor']]) {
    await setMeter(id, v); await settle();
    bands.push(id + '=' + v + ':' + (await bandOf(id)) + (await bandOf(id) === want + '/' + want ? '' : ' (wanted ' + want + ')'));
  }
  check('the band follows the meter\'s optimum, high being good for fuel and low for pollution, with the row marked too',
    !bands.some(b => b.includes('wanted')), bands.join('; '));
  check('a meter with no low, high or optimum is good wherever it stands', (await bandOf('plain-meter')).startsWith('good'));
  await setMeter('fuel', 35); await setMeter('air', 210); await setMeter('ctx', 31); await settle();
  const warn = rgb(await colourOf('--warn')), danger = rgb(await colourOf('--danger')), positive = rgb(await colourOf('--positive')), accent = rgb(await colourOf('--accent'));
  check('the fill takes the band\'s colour', await rgbOf(await css('#fuel', '--meter-fill')) === warn && await rgbOf(await css('#air', '--meter-fill')) === danger && await rgbOf(await css('#ctx', '--meter-fill')) === positive,
    [await css('#fuel', '--meter-fill'), await css('#air', '--meter-fill'), await css('#ctx', '--meter-fill')].join(' '));
  const fairGlyph = await mask('#fuel-row .meter-value', '::before'), poorGlyph = await mask('#air-row .meter-value', '::before');
  check('the words of a fair level lead with the warning glyph, in warn', fairGlyph.includes('M8 1.8l6.6 12H1.4z') && rgb(await css('#fuel-row .meter-value', 'background-color', '::before')) === warn, fairGlyph.slice(0, 80));
  check('and a poor level\'s with the stop glyph, in danger, a different shape', poorGlyph.includes('M5.4 1.8h5.2') && rgb(await css('#air-row .meter-value', 'background-color', '::before')) === danger, poorGlyph.slice(0, 80));
  check('a good level\'s words have no glyph', await css('#ctx-row .meter-value', 'content', '::before') === 'none');
  const marks = await p.evaluate(() => {
    const row = document.getElementById('store-row'), m = document.getElementById('store');
    const w = m.getBoundingClientRect().width, a = getComputedStyle(row, '::before'), b = getComputedStyle(row, '::after');
    return { low: row.style.getPropertyValue('--meter-low'), high: row.style.getPropertyValue('--meter-high'),
      at: [parseFloat(a.marginLeft) + 1, parseFloat(b.marginLeft) + 1].map(x => Math.round(x / w * 1000) / 10), shown: a.display + ' ' + b.display, h: a.height };
  });
  check('a meter with marks draws them at its low and high thresholds, taller than the track', marks.low === '75%' && marks.high === '90%' && marks.at[0] === 75 && marks.at[1] === 90 && marks.shown === 'block block' && marks.h === '22px', JSON.stringify(marks));
  check('and keeps its fill in the accent, with no glyph', await rgbOf(await css('#store', '--meter-fill')) === accent && await css('#store-row .meter-value', 'content', '::before') === 'none');

  /* ---- Sliders ---- */
  const slider = () => p.evaluate(() => ({ fill: document.getElementById('width').style.getPropertyValue('--range-fill'), out: document.querySelector('output[for="width"]').textContent,
    gfill: document.getElementById('gain').style.getPropertyValue('--range-fill'), gout: document.querySelector('output[for="gain"]').textContent }));
  let s = await slider();
  check('a slider\'s fill variable and output start at its value', s.fill === '25%' && s.out === '50', JSON.stringify(s));
  check('and the output is written in the slider\'s language', s.gfill === '75%' && s.gout === '1,50', JSON.stringify(s));
  await p.focus('#width');
  await p.keyboard.press('ArrowRight');
  await p.focus('#gain');
  await p.keyboard.press('ArrowLeft');
  s = await slider();
  check('the arrow keys move it and the fill and output follow', s.fill === '25.5%' && s.out === '51' && s.gfill === '62.5%' && s.gout === '1,25', JSON.stringify(s));
  const thumb = await p.evaluate(() => { const r = document.getElementById('width').getBoundingClientRect(); return r.height; });
  check('the slider is as tall as its 24px thumb', Math.abs(thumb - 24) < 0.5, thumb);

  /* ---- Number fields ---- */
  const setup = await p.evaluate(() => {
    const o = document.getElementById('guests'), f = document.getElementById('guests-text'), keys = f.parentElement.querySelectorAll('.number-step');
    return { hidden: o.hidden, role: f.getAttribute('role'), label: !!document.querySelector('label[for="guests-text"]'), mode: f.inputMode,
      amode: document.getElementById('amount-text').inputMode, desc: f.getAttribute('aria-describedby'),
      keys: Array.from(keys).map(k => k.getAttribute('aria-label') + ':' + k.tabIndex + ':' + k.hasAttribute('data-toolbar-skip')).join(' ') };
  });
  check('a number input is hidden behind a spin button field with its label, its description and two keys out of the Tab order',
    setup.hidden && setup.role === 'spinbutton' && setup.label && setup.desc === 'guests-help' && setup.keys === 'Decrease:-1:true Increase:-1:true', JSON.stringify(setup));
  check('the keyboard is numeric for whole steps and decimal for fractions', setup.mode === 'numeric' && setup.amode === 'decimal', JSON.stringify(setup));
  const shownAll = await p.evaluate(() => ['guests', 'amount', 'betrag', 'kamiya', 'rashi', 'half'].map(id => document.getElementById(id + '-text').value));
  check('each field writes its number in its own language, plain where there is none', JSON.stringify(shownAll) === JSON.stringify(['3', '1,234.50', '1.234,50', '١٢٫٠', '12,34,567', '2.0']), JSON.stringify(shownAll));

  const typeIn = async (id, text) => {
    await p.click('#' + id + '-text');
    await p.keyboard.press('Control+a');
    await p.keyboard.press('Backspace');
    if (text) await p.keyboard.type(text);
    await p.keyboard.press('Tab');
  };
  const state = id => p.evaluate(id => [document.getElementById(id).value, document.getElementById(id + '-text').value, document.getElementById(id + '-text').getAttribute('aria-invalid')], id);
  await heard();
  await typeIn('betrag', '9.876,5');
  check('German 9.876,5 is read as 9876.5, written back, and sent plainly', JSON.stringify(await state('betrag')) === JSON.stringify(['9876.5', '9.876,50', null]), JSON.stringify(await state('betrag')));
  check('taking it fires input and change on the hidden input once each', await heard() === 'input:betrag,change:betrag');
  await typeIn('betrag', '9876,50');
  check('typing the same number again fires nothing', await heard() === '');
  await typeIn('betrag', '2,75');
  check('a German decimal comma is read', (await state('betrag'))[0] === '2.75');
  await typeIn('betrag', '1.5');
  check('a lone point where no group of three follows is taken as the decimal sign', JSON.stringify(await state('betrag')) === JSON.stringify(['1.5', '1,50', null]), JSON.stringify(await state('betrag')));
  await typeIn('amount', '-1,234.5');
  check('English grouping and a leading minus are read', (await state('amount'))[0] === '-1234.5' && (await state('amount'))[1] === '-1,234.50', JSON.stringify(await state('amount')));
  await typeIn('kamiya', '١٢٣٫٥');
  check('Arabic-Indic digits and the Arabic decimal sign are read, and written back so', JSON.stringify(await state('kamiya')) === JSON.stringify(['123.5', '١٢٣٫٥', null]), JSON.stringify(await state('kamiya')));
  await typeIn('rashi', '१२३४५६');
  check('Devanagari digits are read, and Indian grouping written', JSON.stringify(await state('rashi')) === JSON.stringify(['123456', '1,23,456', null]), JSON.stringify(await state('rashi')));
  await heard();
  await typeIn('guests', '12e3');
  check('letters such as e are refused: the field is marked invalid and the value kept', JSON.stringify(await state('guests')) === JSON.stringify(['3', '12e3', 'true']) && await heard() === '', JSON.stringify(await state('guests')));
  await typeIn('guests', '1,2,3');
  check('so is grouping that is not the language\'s', (await state('guests'))[2] === 'true');
  await typeIn('guests', '5');
  check('the next good entry clears the mark', JSON.stringify(await state('guests')) === JSON.stringify(['5', '5', null]));
  for (const [typed, want] of [['3.3', '3.5'], ['12', '10'], ['0', '1'], ['9.8', '10'], ['1.2', '1']]) {
    await typeIn('half', typed);
    const got = (await state('half'))[0];
    check('a step of 0.5 from min 1 inside 1 to 10 takes ' + typed + ' as ' + want, got === want, got);
  }
  await typeIn('guests', '');
  check('an empty field clears the value', (await state('guests'))[0] === '');
  await typeIn('guests', '3');

  /* Keys. */
  await heard();
  await p.click('#guests-text + .number-step + .number-step');
  check('pressing plus steps up once, fires input and change once, and leaves focus in the field',
    (await state('guests'))[0] === '4' && await heard() === 'input:guests,change:guests' && await p.evaluate(() => document.activeElement.id) === 'guests-text');
  await p.click('#guests-text + .number-step');
  check('pressing minus steps down', (await state('guests'))[0] === '3');
  await p.keyboard.press('ArrowUp');
  const afterUp = (await state('guests'))[0];
  await p.keyboard.press('PageUp');
  const afterPgUp = (await state('guests'))[0];
  await p.keyboard.press('PageDown');
  await p.keyboard.press('ArrowDown');
  check('Up and Down step by one, PageUp and PageDown by ten', afterUp === '4' && afterPgUp === '14' && (await state('guests'))[0] === '3', [afterUp, afterPgUp, (await state('guests'))[0]].join(' '));
  await p.keyboard.press('PageUp'); await p.keyboard.press('PageUp');
  const atTop = await p.evaluate(() => { const k = document.querySelectorAll('#guests-text ~ .number-step'); return [document.getElementById('guests').value, k[0].disabled, k[1].disabled]; });
  check('stepping stops at max, and the plus key is disabled there', JSON.stringify(atTop) === JSON.stringify(['20', false, true]), JSON.stringify(atTop));
  await typeIn('guests', '3');
  const plus = await p.$('#guests-text ~ .number-increase');
  const box = await plus.boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.waitForTimeout(900);
  await p.mouse.up();
  const held = +(await state('guests'))[0];
  await p.waitForTimeout(200);
  check('a held key repeats, and stops when let go', held >= 6 && +(await state('guests'))[0] === held, held + ' then ' + (await state('guests'))[0]);
  await typeIn('guests', '3');

  /* The wheel. */
  const fieldBox = await (await p.$('#guests-text')).boundingBox();
  await p.focus('#guests-text');
  await p.mouse.move(fieldBox.x + 20, fieldBox.y + fieldBox.height / 2);
  await p.mouse.wheel(0, -100);
  await p.waitForTimeout(120);
  await p.mouse.wheel(0, -100);
  await p.waitForTimeout(120);
  const wheeledUp = (await state('guests'))[0];
  await p.mouse.wheel(0, 100);
  await p.waitForTimeout(120);
  check('the wheel steps by one step while the field has focus and the pointer is over it', wheeledUp === '5' && (await state('guests'))[0] === '4', wheeledUp + ' then ' + (await state('guests'))[0]);
  await p.focus('#amount-text');
  await p.mouse.move(fieldBox.x + 20, fieldBox.y + fieldBox.height / 2);
  await p.mouse.wheel(0, -100);
  await p.waitForTimeout(120);
  check('but not while another field has focus, even with the pointer over it', (await state('guests'))[0] === '4');
  await p.focus('#guests-text');
  await p.mouse.move(fieldBox.x + 20, fieldBox.y - 60);
  await p.mouse.wheel(0, -100);
  await p.waitForTimeout(120);
  check('nor while the pointer is elsewhere, though the field has focus', (await state('guests'))[0] === '4');

  /* What the form sends, the input's state, reset and refresh. */
  const sent = await p.evaluate(() => Array.from(new FormData(document.getElementById('form')).entries()).map(e => e.join('=')).join('&'));
  check('the form sends the hidden inputs\' plain numbers and nothing from the fields', sent.includes('guests=4') && sent.includes('betrag=1.5') && sent.includes('kamiya=123.5') && !/-text=/.test(sent), sent);
  const locked = await p.evaluate(() => { const f = document.getElementById('locked-text'); return [f.disabled, ...Array.from(f.parentElement.querySelectorAll('.number-step')).map(k => k.disabled)]; });
  await p.evaluate(() => { const o = document.getElementById('locked'); o.disabled = false; o.setAttribute('aria-label', 'Unlocked'); });
  await settle();
  const unlocked = await p.evaluate(() => { const f = document.getElementById('locked-text'); return [f.disabled, f.getAttribute('aria-label'), ...Array.from(f.parentElement.querySelectorAll('.number-step')).map(k => k.disabled)]; });
  check('disabled and aria-* are copied to the field and its keys, and kept in step', JSON.stringify(locked) === '[true,true,true]' && JSON.stringify(unlocked) === '[false,"Unlocked",false,false]', JSON.stringify([locked, unlocked]));
  await p.click('#reset');
  await p.waitForTimeout(50);
  check('a form reset shows the reset value', JSON.stringify(await p.evaluate(() => ['guests', 'betrag'].map(id => document.getElementById(id + '-text').value))) === JSON.stringify(['3', '1.234,50']));
  await p.evaluate(() => { const o = document.getElementById('guests'); o.value = '9'; pudlFields.refresh(o); });
  check('pudlFields.refresh shows a value a script set', (await state('guests'))[1] === '9');

  /* ---- Password fields ---- */
  const pw = () => p.evaluate(() => { const i = document.getElementById('pw'), k = i.nextElementSibling; return { type: i.type, pressed: k.getAttribute('aria-pressed'), text: k.textContent, btn: k.classList.contains('btn'), focus: document.activeElement.id, caret: [i.selectionStart, i.selectionEnd] }; });
  let w = await pw();
  check('a password field gets a raised Show key at its end, not pressed', w.type === 'password' && w.pressed === 'false' && w.text === 'Show' && w.btn, JSON.stringify(w));
  await p.click('#pw');
  await p.evaluate(() => document.getElementById('pw').setSelectionRange(3, 7));
  await p.click('#pw + .password-toggle');
  w = await pw();
  check('pressing it shows the password, pressed in and reading Hide, with focus and the selection kept in the field',
    w.type === 'text' && w.pressed === 'true' && w.text === 'Hide' && w.focus === 'pw' && w.caret.join() === '3,7', JSON.stringify(w));
  const pressedIn = await css('#pw + .password-toggle', 'box-shadow');
  check('and it looks pressed in', pressedIn.includes('inset'), pressedIn);
  await p.click('#pw + .password-toggle');
  w = await pw();
  check('pressing it again hides the password', w.type === 'password' && w.pressed === 'false' && w.text === 'Show' && w.caret.join() === '3,7', JSON.stringify(w));
  const eye = async () => p.evaluate(() => { const k = document.querySelector('#pw2 + .password-toggle'); return [k.className, k.getAttribute('aria-pressed'), k.getAttribute('aria-label'), document.getElementById('pw2').type]; });
  const e1 = await eye(), m1 = await mask('#pw2 + .password-toggle', '::before');
  await p.click('#pw2 + .password-toggle');
  const e2 = await eye(), m2 = await mask('#pw2 + .password-toggle', '::before');
  check('the glyph key is the eye, labelled for what it does, and the struck-out eye pressed in while the password shows',
    e1.join('|') === 'icon-btn password-toggle|false|Show the password|password' && e2.join('|') === 'icon-btn password-toggle|true|Show the password|text' &&
    !m1.includes('M2.5 13.5l11-11') && m2.includes('M2.5 13.5l11-11'), JSON.stringify([e1, e2]));
  await p.click('#pw2 + .password-toggle');

  const caps = () => p.evaluate(() => { const c = document.querySelector('.password-field:has(#pw) + .password-caps'); return { text: c.textContent, role: c.getAttribute('role'), h: c.getBoundingClientRect().height }; });
  let c = await caps();
  check('the Caps Lock line is a status region that takes no room while Caps Lock is off', c.text === '' && c.role === 'status' && c.h === 0, JSON.stringify(c));
  await p.click('#pw');
  await p.keyboard.press('End');
  await p.keyboard.press('CapsLock');
  await p.keyboard.press('a');
  c = await caps();
  let how = 'with the CapsLock key';
  if (!c.text) {
    /* This engine under Playwright does not report Caps Lock from a key
       press, so a key event is made carrying the modifier. */
    how = 'with a key event carrying the Caps Lock modifier';
    await p.keyboard.press('CapsLock');
    await p.evaluate(() => document.getElementById('pw').dispatchEvent(new KeyboardEvent('keyup', { key: 'A', modifierCapsLock: true, bubbles: true })));
    c = await caps();
  }
  check('while the field has focus and Caps Lock is on, the line says so (' + how + ')', c.text === 'Caps Lock is on' && c.h > 10, JSON.stringify(c));
  const capsGlyph = await mask('.password-field:has(#pw) + .password-caps', '::before');
  check('led by the warning glyph in warn', capsGlyph.includes('M8 1.8l6.6 12H1.4z') && rgb(await css('.password-field:has(#pw) + .password-caps', 'background-color', '::before')) === warn);
  if (how === 'with the CapsLock key') await p.keyboard.press('CapsLock');
  else await p.evaluate(() => document.getElementById('pw').dispatchEvent(new KeyboardEvent('keyup', { key: 'a', modifierCapsLock: false, bubbles: true })));
  await p.keyboard.press('b');
  c = await caps();
  check('and the line empties when Caps Lock goes off', c.text === '' && c.h === 0, JSON.stringify(c));
  await p.keyboard.press('Control+a');
  await p.keyboard.press('Delete');
  const pasted = await p.evaluate(() => {
    const i = document.getElementById('pw'), dt = new DataTransfer();
    dt.setData('text/plain', 'from the manager');
    const e = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    return i.dispatchEvent(e);
  });
  check('paste is never blocked', pasted);

  /* ---- Pictures ---- */
  const slow = await p.evaluate(() => { const i = document.querySelector('#fig-slow img'), r = i.getBoundingClientRect(); return { done: i.complete && i.naturalWidth > 0, w: r.width, h: r.height }; });
  check('a picture\'s frame has its proportion before the picture arrives', !slow.done && Math.abs(slow.h - slow.w / 2) < 1.5, JSON.stringify(slow));
  release();
  await p.waitForFunction(() => document.querySelector('#fig-slow img').naturalWidth > 0);
  const slowAfter = await p.evaluate(() => { const r = document.querySelector('#fig-slow img').getBoundingClientRect(); return r.height; });
  check('and keeps it after, so the page does not jump', Math.abs(slowAfter - slow.h) < 0.5, slowAfter + ' vs ' + slow.h);
  const brk = await p.evaluate(() => {
    const f = document.getElementById('fig-broken'), i = f.querySelector('img'), fb = f.querySelector('.figure-fallback');
    const r = fb && fb.getBoundingClientRect();
    return { broken: f.hasAttribute('data-broken'), text: fb && fb.textContent, img: getComputedStyle(i).display, w: r && r.width, h: r && r.height,
      fill: fb && getComputedStyle(fb).backgroundColor, a11y: fb && fb.getAttribute('role') + ':' + fb.getAttribute('aria-label'),
      good: document.getElementById('fig-good').hasAttribute('data-broken') };
  });
  check('a picture that fails shows its words on the quiet fill, in a frame of its proportion, not the broken-picture icon',
    brk.broken && brk.text === 'The hotel bill for 21 October' && brk.img === 'none' && Math.abs(brk.h - brk.w * 90 / 160) < 1.5 &&
    rgb(brk.fill) === await rgbOf('var(--surface-alt)') && !brk.good, JSON.stringify(brk));
  check('and is still a picture with those words to assistive technology', brk.a11y === 'img:The hotel bill for 21 October', brk.a11y);
  check('under the picture glyph', (await mask('#fig-broken .figure-fallback', '::before')).includes("circle cx='5.6'"));

  /* ---- Avatars ---- */
  const sizes = await p.evaluate(() => Array.from(document.querySelectorAll('#avs .avatar')).slice(0, 4).map(a => Math.round(a.getBoundingClientRect().width)));
  check('avatars come in 24, 32, 40 and 64 pixels', JSON.stringify(sizes) === '[24,32,40,64]', JSON.stringify(sizes));
  const face = await p.evaluate(() => { const a = document.getElementById('av-broken'); return { broken: a.hasAttribute('data-broken'), text: a.textContent, img: getComputedStyle(a.querySelector('img')).display }; });
  check('an avatar whose picture fails shows the initials instead', face.broken && face.text === 'DA' && face.img === 'none', JSON.stringify(face));
  const hues = await p.evaluate(() => {
    function fnv(s) { let h = 0x811c9dc5; s = s.trim().toLowerCase(); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h % 360; }
    return Array.from(document.querySelectorAll('#tints .avatar')).map(a => [a.style.getPropertyValue('--avatar-hue').trim(), String(fnv(a.getAttribute('aria-label')))]);
  });
  check('a tinted avatar takes its hue from its name, and keeps one the page set',
    hues.slice(0, 4).every(h => h[0] === h[1]) && hues[4][0] === '120', JSON.stringify(hues));
  for (const theme of ['light', 'dark']) {
    await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    const worst = await p.evaluate(() => {
      function lum(c) { const v = c.match(/[\d.]+/g).slice(0, 3).map(n => { n = n / 255; return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; }
      const a = document.createElement('span'); a.className = 'avatar tint'; a.textContent = 'XY';
      document.body.appendChild(a);
      let low = 99, at = -1;
      for (let h = 0; h < 360; h += 3) {
        a.style.setProperty('--avatar-hue', h);
        const cs = getComputedStyle(a), l1 = lum(cs.color), l2 = lum(cs.backgroundColor);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        if (ratio < low) { low = ratio; at = h; }
      }
      a.remove();
      return { low: Math.round(low * 100) / 100, at };
    });
    check('a tinted avatar\'s initials reach 4.5:1 at every hue in the ' + theme + ' theme', worst.low >= 4.5, JSON.stringify(worst));
  }
  await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const marksOf = await p.evaluate(() => Array.from(document.querySelectorAll('#statuses .avatar-status')).slice(0, 4).map(s => {
    const c = getComputedStyle(s, '::before'); return { role: s.getAttribute('role'), mask: c.maskImage && c.maskImage !== 'none' ? c.maskImage : c.webkitMaskImage, colour: getComputedStyle(s).color, bg: getComputedStyle(s).backgroundColor };
  }));
  const shapes = { online: "cy='8' r='5'", away: 'M8 2.3a5.7', busy: 'M3.5 8h9', offline: "r='4.2'" };
  const colours = { online: positive, away: warn, busy: danger, offline: rgb(await colourOf('--text-muted')) };
  const surface = rgb(await colourOf('--surface'));
  const bad = Object.keys(shapes).filter((k, i) => !(marksOf[i].role === 'img' && marksOf[i].mask.includes(shapes[k]) && rgb(marksOf[i].colour) === colours[k] && rgb(marksOf[i].bg) === surface));
  check('each status mark has a shape of its own as well as its colour, ringed in the surface colour', !bad.length, bad.join(', '));

  /* ---- Screenshots ---- */
  for (const theme of ['light', 'dark']) {
    await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await p.screenshot({ path: out('fields-' + theme + '.png'), fullPage: true });
  }

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
