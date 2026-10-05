/* The status area (specification 0.9.0, from parkscomputing.com's
   proposal): one raised group last in the topbar's chrome, of flat items
   that highlight and press in, each a glyph or a picture with a badge that
   is not shown when it has nothing to say, readable on the topbar whether
   the bar is dark or, with a menu bar, light. */
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
    for (const menubar of [false, true]) {
      const where = theme + (menubar ? ', with a menu bar' : '') + ': ';
      const p = await b.newPage({ viewport: { width: 900, height: 200 } });
      p.on('pageerror', e => errors.push(e.message));
      await p.addInitScript(t => { try { localStorage.setItem('pudl-theme', t); } catch (e) {} }, theme);
      await p.emulateMedia({ reducedMotion: 'reduce' });
      await p.goto(ROOT + '/tests/fixtures/status-area.html');
      const got = await p.evaluate(([t, m]) => {
        document.documentElement.setAttribute('data-theme', t);
        if (m) {
          const n = document.createElement('nav');
          n.setAttribute('data-menubar', '');
          n.innerHTML = '<div class="menubar-row"><div class="menubar-menu" id="group"><button class="menubar-glyph" type="button" aria-label="View"></button><button class="menubar-title" id="title" type="button">View</button></div></div>';
          document.querySelector('.topbar').prepend(n);
        }
        const status = document.querySelector('.status-area');
        const acc = document.createElement('a');
        acc.className = 'status-item';
        acc.href = '#account';
        acc.setAttribute('aria-label', 'Your account');
        acc.innerHTML = '<span class="glyph status-picture" id="placeholder" style="--glyph: var(--glyph-account)" aria-hidden="true"></span><span>Sign in</span>';
        status.appendChild(acc);
        function surface(el) { const s = getComputedStyle(el); return { bg: s.backgroundColor + ' ' + s.backgroundImage, border: s.borderTopColor + ' ' + s.borderTopWidth, shadow: s.boxShadow, height: Math.round(el.getBoundingClientRect().height) }; }
        function rgb(c) {
          const probe = document.createElement('canvas').getContext('2d');
          probe.fillStyle = c; probe.fillRect(0, 0, 1, 1);
          const d = probe.getImageData(0, 0, 1, 1).data;
          return [d[0], d[1], d[2], d[3] / 255];
        }
        function lum(c) { return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]); }
        function ch(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
        function over(fg, bg) { return [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1); }
        function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
        const area = document.querySelector('.status-area'), chrome = document.querySelector('.topbar-chrome');
        const cs = getComputedStyle(area);
        const bar = rgb(getComputedStyle(document.querySelector('.topbar')).backgroundColor);
        const tbBg = rgb(getComputedStyle(document.documentElement).getPropertyValue('--tb-bg') || '#000');
        const ground = bar[3] ? bar : tbBg;
        const badge = document.querySelector('#moderation .badge');
        const badgeBg = over(rgb(getComputedStyle(badge).backgroundColor), ground);
        const item = document.querySelector('#moderation');
        return {
          last: chrome.lastElementChild === area || [...chrome.children].every(c => c === area || +getComputedStyle(c).order < +cs.order),
          raised: cs.boxShadow !== 'none' && !/^inset/.test(cs.boxShadow),
          itemFlat: getComputedStyle(item).boxShadow === 'none' && getComputedStyle(item).backgroundImage === 'none',
          badgeGlyph: getComputedStyle(badge, '::before').content !== 'none',
          badgeContrast: ratio(over(rgb(getComputedStyle(badge).color), badgeBg), badgeBg),
          itemContrast: ratio(rgb(getComputedStyle(item).color), ground),
          emptyHidden: getComputedStyle(document.querySelector('#mail .badge')).display === 'none',
          picture: (() => { const r = document.querySelector('#account img').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })(),
          height: Math.round(item.getBoundingClientRect().height),
          areaHeight: Math.round(area.getBoundingClientRect().height),
          placeholder: (() => { const r = document.getElementById('placeholder').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })(),
          areaLook: surface(area),
          group: m ? surface(document.getElementById('group')) : null,
          titleColor: m ? getComputedStyle(document.getElementById('title')).color : null,
          itemColor: getComputedStyle(item).color
        };
      }, [theme, menubar]);
      check(where + 'the area is last in the chrome', got.last);
      check(where + 'the area is raised', got.raised);
      check(where + 'an item at rest is flat', got.itemFlat);
      check(where + 'an item is 26px tall', got.height === 26, String(got.height));
      check(where + 'a picture is 24px across', got.picture === '24x24', got.picture);
      check(where + 'a badge leads with its status glyph', got.badgeGlyph);
      check(where + 'a badge\'s count reaches 4.5:1 on the bar', got.badgeContrast >= 4.5, got.badgeContrast.toFixed(2));
      check(where + 'an item\'s glyph reaches 3:1 on the bar', got.itemContrast >= 3, got.itemContrast.toFixed(2));
      check(where + 'a badge with nothing to say is not shown', got.emptyHidden);
      check(where + 'the area is 30px tall, as a menu bar\'s group is', got.areaHeight === 30, String(got.areaHeight));
      check(where + 'the account glyph stands in for a picture at 24px', got.placeholder === '24x24', got.placeholder);
      if (menubar) {
        /* Beside a menu bar, exactly a menu bar group and its titles
           (from YAVCHN's PUDL-PROPOSAL.md, B7). */
        const same = ['bg', 'border', 'shadow', 'height'].filter(k => got.group[k] !== got.areaLook[k]);
        check(where + 'the area looks exactly like a menu bar group', !same.length, same.map(k => k + ': ' + got.group[k] + ' / ' + got.areaLook[k]).join('; '));
        check(where + 'an item is in a menu bar title\'s colour', got.titleColor === got.itemColor, got.titleColor + ' / ' + got.itemColor);
      }

      const before = await p.$eval('#moderation', e => getComputedStyle(e).backgroundColor);
      await p.hover('#moderation');
      const hovered = await p.$eval('#moderation', e => getComputedStyle(e).backgroundColor);
      check(where + 'an item highlights under the pointer', before !== hovered, before + ' / ' + hovered);
      await p.mouse.down();
      const pressed = await p.$eval('#moderation', e => /inset/.test(getComputedStyle(e).boxShadow));
      await p.mouse.up();
      check(where + 'an item is pressed in while pressed', pressed);
      await p.close();
    }
  }
  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
