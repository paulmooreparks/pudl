// Compare the complete old/new stylesheet in a headless, script-free fixture.
const fs = require('fs');
const path = require('path');
const { launch } = require('./lib');
const root = path.resolve(__dirname, '..'), assets = process.env.PUDL_MIN === '1' ? 'dist/min' : 'dist';
(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  try {
    const result = await page.evaluate(({base, newCSS}) => {
      document.head.innerHTML = '<style></style><style id="subject"></style>';
      document.head.firstChild.textContent = base;
      const sheet = document.getElementById('subject');
      const oldSelector = '.win-layer:not(:has(> .win-dock-group)) > .win[data-win-dock-shared]';
      const newSelector = '.win-layer > .win[data-win-dock-shared]:not(:where(.win-dock-group, .win-dock-group ~ *)):not(:has(~ .win-dock-group))';
      /* Reconstruct the previous five selectors with their declaration
         bodies unchanged. All other rules come from the candidate, so this
         comparison remains focused when unrelated window styles evolve. */
      const normalize = selector => {
        const parsed = new CSSStyleSheet(); parsed.replaceSync(selector + '{}');
        return parsed.cssRules[0].selectorText;
      };
      const replacements = new Map([
        [normalize(newSelector + ':is([data-win-edge="left"], [data-win-edge="right"])'), oldSelector + ':is([data-win-edge="left"], [data-win-edge="right"])'],
        [normalize(newSelector), oldSelector],
        [normalize(newSelector + ':not([data-win-dock-only]) > .win-head'), oldSelector + ':not([data-win-dock-only]) > .win-head'],
        [normalize('.win[data-win-chrome="compact"] .win-head:has([data-win-action="menu"]) [data-win-action]:not([data-win-action="menu"])'), '.win[data-win-chrome="compact"]:has([data-win-action="menu"]) .win-head [data-win-action]:not([data-win-action="menu"])'],
        [normalize('.win > :where(.win-head):has(~ .win-menu:popover-open) .win-btn[data-win-action="menu"], .win > .win-menu:popover-open ~ :where(.win-head) .win-btn[data-win-action="menu"]'), '.win:has(> .win-menu:popover-open) .win-btn[data-win-action="menu"]']
      ]);
      const parsed = new CSSStyleSheet(); parsed.replaceSync(newCSS);
      let replaced = 0;
      const oldCSS = [...parsed.cssRules].map(rule => {
        const selector = replacements.get(rule.selectorText);
        if (!selector) return rule.cssText;
        replaced++;
        return selector + ' {' + rule.style.cssText + '}';
      }).join('\n');
      if (replaced !== 5) throw new Error('Expected five candidate selector rules, found ' + replaced);
      const failures = [];
      let checks = 0;
      function verify(label) {
        const a = Array.from(document.querySelectorAll(oldSelector));
        const b = Array.from(document.querySelectorAll(newSelector));
        if (a.length !== b.length || a.some((el, i) => el !== b[i])) failures.push(label + ': match set');
        const elements = Array.from(document.querySelectorAll('.win, .win-head, .win-btn'));
        function snapshot(css) {
          sheet.textContent = css;
          return elements.map(el => {
            const s = getComputedStyle(el);
            return ['display', 'position', 'top', 'height', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'backgroundColor', 'boxShadow'].map(k => s[k]);
          });
        }
        if (JSON.stringify(snapshot(oldCSS)) !== JSON.stringify(snapshot(newCSS))) failures.push(label + ': computed layout');
        checks++;
      }
      for (const edge of ['left','right','top','bottom']) {
        for (const only of [false,true]) {
          for (let mask = 0; mask < 32; mask++) {
            document.body.innerHTML = '<div class="win-host" style="width:1000px;height:700px"><div class="win-layer"></div></div>';
            const layer = document.querySelector('.win-layer');
            for (let i = 0; i < 5; i++) {
              const el = document.createElement('section');
              el.className = 'win' + (mask & (1 << i) ? ' win-dock-group' : '');
              el.dataset.winDockShared = ''; el.dataset.winEdge = edge;
              if (only) el.dataset.winDockOnly = '';
              el.innerHTML = '<header class="win-head">Title</header><div class="win-body"><div class="win-dock-group">Nested group must not count</div></div>';
              layer.append(el);
            }
            verify(edge + '/' + only + '/' + mask);
          }
        }
      }
      const layer = document.querySelector('.win-layer');
      Array.from(layer.children).forEach(el => el.classList.remove('win-dock-group'));
      verify('clear groups');
      const group = document.createElement('div'); group.className = 'win-dock-group';
      layer.prepend(group); verify('prepend group');
      layer.append(group); verify('move group after');
      group.className = ''; verify('remove group class');
      group.className = 'win-dock-group'; verify('restore group class');
      group.remove(); verify('remove group');
      for (const before of [false, true]) for (const compact of [false, true]) {
        document.body.innerHTML = '<section class="win"><header class="win-head"><button class="win-btn" data-win-action="menu">Menu</button><button class="win-btn" data-win-action="close">Close</button></header><div class="win-body">Streaming content</div><div class="win-menu" popover>Menu contents</div></section>';
        const win = document.querySelector('.win'), head = document.querySelector('.win-head'), menu = document.querySelector('.win-menu');
        if (compact) win.dataset.winChrome = 'compact';
        if (before) head.before(menu);
        verify('menu closed/' + before + '/' + compact);
        menu.showPopover(); verify('menu open/' + before + '/' + compact);
        menu.hidePopover(); verify('menu dismissed/' + before + '/' + compact);
        const button = head.querySelector('[data-win-action="menu"]');
        button.remove(); verify('menu control removed/' + before + '/' + compact);
        head.prepend(button); verify('menu control restored/' + before + '/' + compact);
      }
      return {checks, failures};
    }, {
      base: fs.readFileSync(path.join(root, assets, 'pudl.css'), 'utf8'),
      newCSS: fs.readFileSync(path.join(root, assets, 'pudl-windows.css'), 'utf8'),
    });
    console.log((result.failures.length ? 'FAIL ' : 'PASS ') + result.checks + ' selector and computed-style parity cases ' + JSON.stringify(result.failures));
    if (result.failures.length) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
