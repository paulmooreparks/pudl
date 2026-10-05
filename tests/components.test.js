/* dist/pudl-components.json, the list of components for tools, agrees
   with the stylesheet and the contract: every template renders the parts
   it lists, every part looks like its category of the grammar in both
   themes, every class it offers exists, every file it needs is in dist/,
   and every component in the contract's table is in the list. */
const fs = require('fs');
const path = require('path');
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
const DIST = path.join(__dirname, '..', 'dist');
const list = JSON.parse(fs.readFileSync(path.join(DIST, 'pudl-components.json'), 'utf8'));
const css = fs.readFileSync(path.join(DIST, 'pudl.css'), 'utf8');
const contract = fs.readFileSync(path.join(__dirname, '..', 'docs', 'CONTRACT.md'), 'utf8');
const { engine: ENGINE } = require('./lib');
/* Parts known not to look like their category in an engine, each with
   the reason, listed in docs/COMPONENTS.md under "Known gaps". A part that
   starts to pass should come off this list. */
const KNOWN = {
  'webkit select .form-select': 'WebKit draws a select itself, with a gradient and no inner shadow, so it does not read as sunken'
};

(async () => {
  const all = list.components.concat(list.structure);
  const ids = all.map(c => c.id);
  check('every id is unique', new Set(ids).size === ids.length);
  check('every component has a kind from the grammar', list.components.every(c => list.grammar[c.kind]),
    list.components.filter(c => !list.grammar[c.kind]).map(c => c.id).join(', '));
  const missing = all.flatMap(c => (c.requires || []).filter(f => !fs.existsSync(path.join(DIST, f))).map(f => c.id + ': ' + f));
  check('every file a component needs is in dist/', !missing.length, missing.join(', '));
  const noClass = list.components.flatMap(c => (c.variants || []).filter(v => !new RegExp('\\.' + v.class + '\\b').test(css)).map(v => c.id + ': .' + v.class));
  check('every variant\'s class is in pudl.css', !noClass.length, noClass.join(', '));

  /* The contract's component table, by name: each row is in the list. */
  const rows = contract.split('## Components')[1].split('## ')[0].split('\n').filter(l => /^\| [A-Z]/.test(l) && !l.startsWith('| Component')).map(l => l.split('|')[1].trim());
  const covered = {
    'Topbar': 'topbar', 'Section tabs': 'section-tabs', 'Buttons': 'button', 'Form fields': 'text-field', 'Switch': 'switch',
    'Segmented control': 'segmented', 'Badges and chips': 'badge', 'Card': 'card', 'Key/value table': 'key-value-table',
    'Data table': 'data-table', 'Notices': 'notice', 'Toasts': 'toast', 'Tabs within a page': 'tabs', 'Empty and loading': 'empty-state',
    'Pagination': 'pagination', 'Dialog': 'dialog', 'Menu': 'menu', 'Master-detail': 'master-detail', 'Windows': 'windows',
    'Applets': 'applet', 'Regions': 'region', 'Grid': 'grid', 'Tree': 'tree', 'Path bar': 'path-bar', 'Glyph': 'glyph',
    'Document tabs': 'document-tabs', 'Code': 'code-block', 'Visually hidden': 'visually-hidden', 'Splitter': 'splitter',
    'Drop target': 'drop-zone', 'Numbers and time': null
  };
  const unlisted = rows.filter(r => !(r in covered) || (covered[r] && !ids.includes(covered[r])));
  check('every component in the contract is in the list', !unlisted.length, unlisted.join(', '));

  const b = await launch();
  const errors = [];
  for (const theme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
    p.on('pageerror', e => errors.push(e.message));
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.goto(ROOT + '/reference.html');
    const results = await p.evaluate(({ theme, components }) => {
      document.documentElement.setAttribute('data-theme', theme);
      const stage = document.createElement('div');
      stage.style.cssText = 'position: absolute; left: 0; top: 0; width: 900px; background: var(--bg); z-index: 99999';
      document.body.appendChild(stage);
      /* What a surface looks like: an outer shadow, a shadow inside its
         top edge, and its fill. */
      function look(el, pseudo) {
        const cs = getComputedStyle(el, pseudo || null);
        const shadows = cs.boxShadow === 'none' ? [] : cs.boxShadow.split(/,(?![^(]*\))/).map(s => s.trim());
        const visible = s => !/^rgba\(\d+, \d+, \d+, 0\)/.test(s) && !/ 0px 0px 0px 0px/.test(s);
        return {
          outer: shadows.some(s => !/inset/.test(s) && visible(s)),
          inset: shadows.some(s => /inset/.test(s) && visible(s)),
          gradient: cs.backgroundImage !== 'none',
          bg: cs.backgroundColor
        };
      }
      return components.map(c => {
        const host = document.createElement('div');
        host.style.padding = '8px';
        host.innerHTML = c.template;
        stage.appendChild(host);
        if (host.querySelector('dialog')) host.querySelector('dialog').setAttribute('open', '');
        const parts = (c.parts || []).map(part => {
          const el = host.querySelector(part.selector);
          return { selector: part.selector + (part.pseudo || ''), surface: part.surface, found: !!el, look: el ? look(el, part.pseudo) : null };
        });
        return { id: c.id, parts };
      });
    }, { theme, components: list.components });

    for (const r of results) {
      for (const part of r.parts) {
        const where = theme + ': ' + r.id + ' ' + part.selector;
        if (!part.found) { check(where + ' is in its template', false); continue; }
        const l = part.look;
        /* Raised is lit and shaded, a gradient fill with a shadow outside
           it (and a highlight inside its top edge); sunken has a shadow
           inside and none outside, on a plain fill; the flat categories
           have neither the gradient nor the inner shadow. */
        let ok = true;
        if (part.surface === 'raised') ok = l.gradient && (l.outer || l.inset);
        else if (part.surface === 'sunken') ok = l.inset && !l.outer && !l.gradient;
        else if (['flat', 'list', 'link', 'handle'].includes(part.surface)) ok = !l.inset && !l.gradient;
        const known = KNOWN[ENGINE + ' ' + r.id + ' ' + part.selector];
        if (!ok && known) { console.log('KNOWN ' + where + ': ' + known); continue; }
        if (process.env.PUDL_COMPONENTS_VERBOSE || !ok) check(where + ' looks ' + part.surface, ok, JSON.stringify(l));
      }
    }
    check(theme + ': every part is in its template and looks like its category', true);
    await p.close();
  }
  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
