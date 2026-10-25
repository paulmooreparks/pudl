/* PUDL menu bar. Load with defer, after pudl-menu.js, and after
   pudl-windows.js and pudl-applets.js if the page has them.

   An application's menu bar, in the topbar, as a Mac's is: one bar in the
   page however many windows are open, showing the menus of what the
   reader is in. It holds at most two menus. The host menu is always
   there; the host renders it as a hidden list in the bar:

     <nav class="menubar" data-menubar aria-label="Example">
       <ul data-menubar-source hidden>
         <li><img src="/logo.svg" alt=""> Example
           <ul><li><a href="/">Home</a></li><li>-</li><li>Elsewhere</li>…</ul></li>
         <li>View<ul>…</ul></li>
         <li data-menubar-if="windows">Window<ul>…</ul></li>
       </ul>
       …what shows without script…
     </nav>

   Each top item is a title, its words or content before its list. In a
   list, an item holding a link or a button is a command, "-" is a
   separator, plain words are a heading for the rows below, and an item
   with a list of its own is a submenu. A button's aria-pressed or
   aria-checked makes it a command that switches, and pressing the row
   presses the button, so the host's own script runs. data-shortcut on a
   link or button gives it a shortcut.

   The front menu stands to the right of the host menu, for whatever is in
   front: the applet or article in the front window, or with no window in
   front, the one on the page. An applet gives it through menus(), or
   commands() alone; an article through a hidden nav[data-page-menu] of
   the same lists, whose commands are links. A front menu may add commands
   to the host's titles through menus().into, and may not use a title the
   host has; what breaks a rule is left out, with a warning naming it.

   A host may give the bar a pins group, for the few things its readers go
   to most, as a second hidden list. It stands between the host menu and
   the front menu, so it stays put as the front changes:

     <ul data-menubar-pins hidden>
       <li>Pins<ul><li><button type="button">Pin “About”</button></li></ul></li>
       <li><a href="/page/about"><img src="/about.png" alt=""> About</a></li>
       <li><a href="/page/terminal"><span class="glyph" style="--glyph: var(--glyph-app)"
             aria-hidden="true"></span> Terminal</a></li>
     </ul>

   Its first item is the Pins menu, the host's pinning commands, read as
   any title is. Each later item is a pin: a link, whose content, an icon
   and a title, becomes a button in the bar. A command in any menu may
   carry a picture the same way, an <img> or a glyph span before its
   words, and the row shows it before them (0.64.0). A plain press on it presses
   the host's link, so the host's own script may open the item its own
   way; a press with a modifier is the browser's. When the buttons do not
   fit they give way, all together, to one Items menu listing them. The
   list is the host's to change: the bar redraws when it changes, and
   pudl:pins-menu is sent on the list as the Pins menu opens, so the host
   can set its commands for what is in front at that moment.

   The bar is one tab stop and follows the WAI-ARIA menu bar pattern. When
   it does not fit, it becomes one menu button whose panel lists each
   menu's titles, opening one level at a time. Shortcuts are written
   Mod+S, meaning Ctrl, or Command on a Mac. */
(function () {
  'use strict';

  var MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
  /* Keys a page cannot have, or that every field needs: the browser's
     window and tab keys, and the editing keys. A desktop host, which has
     no browser around it, may take the browser's; the rest stay reserved
     everywhere. */
  var BROWSER_KEYS = ['Mod+N', 'Mod+T', 'Mod+W', 'Mod+Shift+N', 'Mod+Shift+T', 'Mod+Shift+W'];
  var RESERVED = ['Mod+Q', 'Mod+Tab', 'Mod+Shift+Q', 'Mod+Shift+Tab', 'Mod+A', 'Mod+C', 'Mod+X', 'Mod+V'];
  function desktop() { return !!bar && bar.getAttribute('data-menubar-host') === 'desktop'; }
  /* The chord that opens a title by its letter from anywhere, under a
     desktop host: the platform's access-key modifier, Alt on Windows and
     Linux and Ctrl+Option on a Mac, which is what browsers give accesskey. */
  function titleChord(letter) { return (MAC ? 'Ctrl+Alt+' : 'Alt+') + letter.toUpperCase(); }
  var titleLetters = {};   // letter -> the title's label, for the bar as built

  var bar, source, pinsSource, built, panel, sub, frontSrc = null, menus = [], openTitle = null, returnTo = null;
  var menuScope = null;
  var STANDARD = ['site', 'go', 'applets', 'view', 'window', 'help'];
  var SHARED = ['go', 'view', 'help'];
  function menuId(label, explicit) {
    if (explicit) return String(explicit);
    var id = String(label).toLowerCase();
    return STANDARD.concat(['file', 'edit']).indexOf(id) >= 0 ? id : '';
  }

  var collapsed = false, level = 0, needed = 0, uid = 0, warned = {};

  function text(name, fallback) { return (bar && bar.getAttribute('data-menubar-text-' + name)) || fallback; }

  function warn(msg) {
    if (warned[msg]) return;
    warned[msg] = true;
    if (window.console) console.warn('pudl-menubar: ' + msg);
  }

  /* === Reading menus ===================================================== */

  /* The words of some nodes as a reader hears them: what is hidden from
     assistive technology, such as a logo's mark, is left out. */
  function words(nodes) {
    return nodes.map(function (n) {
      if (n.nodeType === 1 && (n.getAttribute('aria-hidden') === 'true' || n.tagName === 'UL')) return '';
      if (n.nodeType === 1 && n.tagName === 'IMG') return n.getAttribute('alt') || '';
      return n.nodeType === 1 ? words(Array.prototype.slice.call(n.childNodes)) : n.textContent;
    }).join('').replace(/\s+/g, ' ').trim();
  }

  /* A list of the markup's: its commands, separators, headings and
     submenus, in order. */
  function readList(ul) {
    var out = [];
    /* A list marked data-menu-radio holds rows of which one is on. */
    var radio = ul.hasAttribute('data-menu-radio') ? 'markup-' + (++uid) : null;
    Array.prototype.forEach.call(ul.children, function (li) {
      if (li.tagName !== 'LI') return;
      var nested = li.querySelector(':scope > ul');
      var cmd = li.querySelector(':scope > a, :scope > button');
      var said = words(Array.prototype.filter.call(li.childNodes, function (n) { return n !== nested; }));
      if (nested) out.push({ label: said, items: readList(nested), mnemonic: li.getAttribute('data-mnemonic') || undefined });
      else if (cmd) {
        var item = { label: words([cmd]), el: cmd };
        if (cmd.tagName === 'A') item.href = cmd.getAttribute('href');
        /* A picture in the command, an <img> or a glyph span, is the row's
           icon, as a pin's is: an applet's own icon beside its name. */
        var pictures = Array.prototype.filter.call(cmd.childNodes, function (n) {
          return n.nodeType === 1 && (n.tagName === 'IMG' || (n.tagName === 'SPAN' && n.classList.contains('glyph')));
        });
        if (pictures.length) item.icon = pictures;
        var on = cmd.getAttribute('aria-pressed') || cmd.getAttribute('aria-checked');
        if (on === 'true' || on === 'false') { item.checked = on === 'true'; if (radio && cmd.hasAttribute('aria-checked')) item.radio = radio; }
        if (cmd.disabled || cmd.getAttribute('aria-disabled') === 'true') item.disabled = true;
        if (cmd.hasAttribute('data-shortcut')) item.shortcut = cmd.getAttribute('data-shortcut');
        /* More of a markup row (pudl-host-row-extras.md): dangerous, a
           glyph, a second line, and why it is disabled. */
        if (cmd.hasAttribute('data-menu-danger')) item.danger = true;
        if (cmd.hasAttribute('data-menu-glyph')) item.glyph = cmd.getAttribute('data-menu-glyph');
        if (cmd.hasAttribute('data-menu-detail')) item.detail = cmd.getAttribute('data-menu-detail');
        if (cmd.hasAttribute('data-menu-reason')) item.reason = cmd.getAttribute('data-menu-reason');
        if (cmd.hasAttribute('data-mnemonic')) item.mnemonic = cmd.getAttribute('data-mnemonic');
        if (cmd.hasAttribute('data-menu-glyph-only')) item.glyphOnly = true;
        out.push(item);
      } else if (said === '-') out.push('-');
      else if (said) out.push({ heading: said });
    });
    return out;
  }

  function hostMenu() {
    var windows = !!document.querySelector('[data-win-layer]');
    var titles = [];
    Array.prototype.forEach.call(source.children, function (li, i) {
      if (li.tagName !== 'LI') return;
      if (li.getAttribute('data-menubar-if') === 'windows' && !windows) return;
      var nested = li.querySelector(':scope > ul');
      var content = Array.prototype.filter.call(li.childNodes, function (n) { return n !== nested; });
      titles.push({
        id: i === 0 ? 'site' : menuId(words(content), li.getAttribute('data-menubar-id')),
        generatedWindows: li.hasAttribute('data-menubar-windows'),
        mnemonic: li.getAttribute('data-mnemonic') || undefined,
        glyph: i === 0 ? null : li.getAttribute('data-menu-glyph') || null,
        label: words(content),
        content: i === 0 ? content : null,
        items: nested ? readList(nested) : []
      });
    });
    return { kind: 'host', name: titles.length ? titles[0].label : '', titles: titles };
  }

  /* The pins group: the Pins menu's commands, and each pin's link, words
     and content. */
  function pinsMenu() {
    if (!pinsSource) return null;
    var name = text('pins', 'Pins'), commands = [], pins = [];
    Array.prototype.forEach.call(pinsSource.children, function (li, i) {
      if (li.tagName !== 'LI') return;
      var nested = li.querySelector(':scope > ul');
      if (i === 0 && nested) {
        var said = words(Array.prototype.filter.call(li.childNodes, function (n) { return n !== nested; }));
        if (said) name = said;
        commands = readList(nested);
        return;
      }
      var a = li.querySelector(':scope > a[href]');
      if (!a) { warn('a pin is a link; an item of the pins list that is not one is left out'); return; }
      pins.push({ label: words([a]), href: a.getAttribute('href'), el: a, content: Array.prototype.slice.call(a.childNodes) });
    });
    /* The group's glyph is the menu glyph, as every group's is, so the pins
       are known for a menu; the pin is the Pins title's own glyph. */
    return { kind: 'pins', name: name, titles: [{ id: 'pins', label: name, glyph: 'pin', items: commands }], pins: pins };
  }

  /* What is in front, and the scope a front menu is found in. */
  function frontScope() {
    if (window.pudlWindows && document.querySelector('[data-win-layer]')) {
      var st = window.pudlWindows.state();
      var k = st.top;
      if (k && !st.min[k]) {
        var w = document.querySelector('.win[data-win="' + k + '"]');
        if (w && !w.hidden) return { scope: w, key: k };
      }
    }
    return { scope: document, key: null };
  }

  function titleOfScope(f) {
    if (f.key) {
      var t = f.scope.querySelector('.win-title');
      if (t) return t.textContent.trim();
    }
    var h = document.querySelector('main h1, h1');
    return (h && h.textContent.trim()) || document.title;
  }

  function findFront() {
    var f = frontScope();
    var outside = !f.key;
    var applet = window.pudlApplets && window.pudlApplets.menuSourceIn ? window.pudlApplets.menuSourceIn(f.scope, outside) : null;
    if (applet) return { kind: 'applet', scope: f, applet: applet };
    var navs = Array.prototype.filter.call(f.scope.querySelectorAll('nav[data-page-menu]'), function (n) {
      return !outside || !n.closest('.win');
    });
    if (navs.length) return { kind: 'article', scope: f, nav: navs[0] };
    /* A window whose content offers no menu still has what every window
       offers, under its title. */
    if (f.key) return { kind: 'window', scope: f };
    return null;
  }

  /* An applet's menus() or commands(), or an article's list, as titles,
     with what it adds to the host's titles. */
  function frontMenu(src) {
    if (!src) return null;
    var name, titles = [], into = {};
    if (src.kind === 'applet') {
      var m = src.applet.menus ? src.applet.menus() : null;
      if (m && Array.isArray(m.titles) && m.titles.length) {
        titles = m.titles.map(function (t) { return { id: menuId(t.label, t.id), label: String(t.label || ''), items: normal(t.items || []), mnemonic: t.mnemonic ? String(t.mnemonic) : undefined, glyph: t.glyph ? String(t.glyph) : null }; });
        if (m.into) Object.keys(m.into).forEach(function (k) { into[k] = normal(m.into[k] || []); });
        name = titles[0].label;
      } else {
        name = src.scope.key ? titleOfScope(src.scope) : (src.applet.root.getAttribute('aria-label') || src.applet.name);
        titles = [{ label: name, items: articleItems(src) }];
        var commands = normal(src.applet.commands ? src.applet.commands() : []);
        if (commands.length) titles.push({ id: 'actions', label: text('actions', 'Actions'), items: commands });
      }
    } else if (src.kind === 'window') {
      name = titleOfScope(src.scope);
      titles = [{ label: name, items: articleItems(src) }];
    } else {
      name = titleOfScope(src.scope);
      /* An article has no File title of PUDL's: its one command, Print,
         is in its own menu, and only where the host marks its page menu
         data-page-print, since printing a page of windows prints the
         desktop rather than the article. */
      titles = [{ label: name, items: articleItems(src) }].concat(
        readList(src.nav.querySelector(':scope > ul') || document.createElement('ul')).filter(function (t) { return t.items; }));
    }
    titles.forEach(function (t) { own(t.items, src); });
    Object.keys(into).forEach(function (k) { own(into[k], src); });
    return { kind: 'front', name: name, titles: titles, into: into, src: src };
  }

  /* The resident applets' menus (preview), each a group of its own after
     the site's, whatever is in front. What they add to the site's titles
     is not taken. */
  function residentMenus() {
    var list = window.pudlApplets && window.pudlApplets.residentSources ? window.pudlApplets.residentSources() : [];
    return list.map(function (a) {
      var m = frontMenu({ kind: 'applet', scope: { scope: a.root, key: null }, applet: a, resident: true });
      if (!m) return null;
      m.kind = 'resident';
      m.into = {};
      return m;
    }).filter(Boolean);
  }

  function normal(list) {
    return list.map(function (c) {
      if (c === '-') return '-';
      if (c && c.heading) return { heading: String(c.heading) };
      if (!c || typeof c.label !== 'string') return null;
      var item = { label: c.label, run: c.run, disabled: !!c.disabled, danger: !!c.danger };
      if (c.checked != null) item.checked = !!c.checked;
      if (c.radio != null) item.radio = String(c.radio);
      if (c.shortcut) item.shortcut = String(c.shortcut);
      /* bind: false shows the key and leaves it to whatever binds it (0.69.0). */
      if (c.bind === false) item.bind = false;
      if (c.mnemonic) item.mnemonic = String(c.mnemonic);
      if (c.glyph) item.glyph = String(c.glyph);
      if (c.detail) item.detail = String(c.detail);
      if (c.reason) item.reason = String(c.reason);
      /* How the command shows in the bar unfolded into a ribbon (0.79.0):
         its glyph alone, or not at all. */
      if (c.glyphOnly) item.glyphOnly = true;
      if (c.items) item.items = normal(c.items);
      if (!item.run && !item.items) return null;
      return item;
    }).filter(Boolean);
  }

  /* What every article's first title offers. */
  function articleItems(src) {
    var key = src.scope.key, items = [];
    var win = key ? src.scope.scope : null;
    var page = win && win.querySelector('.win-head a[data-win-action="page"]');
    if (page) items.push({ label: text('page', 'Open as a page'), run: function () { page.click(); } });
    if (win && window.pudlWindows && window.pudlWindows.shareURL) {
      if (window.pudlWindows.shareURL(key)) items.push({ label: text('copy-link', 'Copy link to this content'), run: function () {
        window.pudlWindows.copyLink(key);
      } });
    } else {
      items.push({ label: text('copy-link', 'Copy link to this content'), run: function () {
        var href = page ? page.href : location.href;
        if (navigator.clipboard) navigator.clipboard.writeText(href).catch(function () {});
      } });
    }
    if (src.nav && src.nav.hasAttribute('data-page-print')) items.push({ label: text('print', 'Print'), run: function () { window.print(); } });
    var close = key && window.pudlWindows.menuCommands(key).find(function (c) { return c.id === 'close'; });
    if (close) {
      if (items.length) items.push('-');
      items.push({ label: text('close', 'Close window'), run: close.run });
    }
    return items;
  }

  /* The host's titles, with the front menu's additions, and the front
     menu, each command checked against the rules. */
  function own(items, src) {
    items.forEach(function (c) {
      if (!c || typeof c !== 'object') return;
      c.owner = src;
      if (c.items) own(c.items, src);
    });
  }

  function sameSource(a, b) {
    if (!a || !b) return a === b;
    return a.kind === b.kind && a.scope.key === b.scope.key && a.scope.scope === b.scope.scope &&
      (a.applet ? b.applet && a.applet.root === b.applet.root && a.applet._instance === b.applet._instance : a.nav === b.nav);
  }

  function currentTarget() {
    var f = frontScope();
    return sameSource(frontSrc, findFront()) && (!menuScope || (menuScope.key === f.key && menuScope.scope === f.scope));
  }

  function assemble() {
    var host = hostMenu();
    var front = frontMenu(frontSrc);
    var seen = Object.create(null);
    host.titles = host.titles.filter(function (t) {
      if (t.id && seen[t.id]) { warn('duplicate site menu ID "' + t.id + '" is left out'); return false; }
      if (t.id) seen[t.id] = true;
      if (t.generatedWindows) {
        if (t.id !== 'window') warn('data-menubar-windows requires the window menu ID');
        else t.items = t.items.concat(windowItems());
      }
      return true;
    });
    function hostRank(t) { var n = STANDARD.indexOf(t.id); return n < 0 ? 2.5 : n; }
    host.titles.sort(function (a, b) { return hostRank(a) - hostRank(b); });
    if (front) {
      var frontIds = Object.create(null);
      front.titles = front.titles.filter(function (t, i) {
        if (i && t.id && frontIds[t.id]) { warn(front.name + ': duplicate applet menu ID "' + t.id + '" is left out'); return false; }
        if (i && t.id) frontIds[t.id] = true;
        if (i && (STANDARD.indexOf(t.id) >= 0 || host.titles.some(function (h) { return h.label === t.label; }))) {
          warn(front.name + ': the title "' + t.label + '" is the host\'s, and is left out'); return false;
        }
        return true;
      });
      var identity = front.titles.shift();
      front.titles.sort(function (a, b) {
        function rank(t) { return t.id === 'file' ? 0 : t.id === 'edit' ? 1 : 2; }
        return rank(a) - rank(b);
      });
      front.titles.unshift(identity);
      Object.keys(front.into).forEach(function (k) {
        var target = host.titles.find(function (t) { return t.id === k; }) || host.titles.find(function (t) { return t.label === k; });
        if (!target) { warn(front.name + ': there is no host title "' + k + '" to add to; declare its shared slot'); return; }
        if (SHARED.indexOf(target.id) < 0) { warn(front.name + ': contributions to "' + k + '" are not allowed'); return; }
        var add = front.into[k].filter(function (c) {
          if (c.label && target.items.some(function (h) { return h.label === c.label; })) {
            warn(front.name + ': "' + c.label + '" is already in ' + target.label + ', and is left out'); return false;
          }
          return true;
        });
        if (add.length) target.items = target.items.concat(target.items.length ? ['-', { heading: front.name }] : [{ heading: front.name }], add);
      });
    }
    var all = [host].concat(residentMenus(), [pinsMenu(), front]).filter(Boolean);
    all.forEach(function (m) {
      m.titles = m.titles.filter(function (t, i) { return (i === 0 && m.kind !== 'front') || t.items.some(function (c) { return c && c.label; }); });
    });
    all = all.filter(function (m) { return m.titles.length; });
    /* The titles' letters first, since a shortcut may not take one of
       their chords; then each panel's rows, and its shortcuts. */
    titleLetters = {};
    var taken = {};
    all.forEach(function (m) { m.titles.forEach(function (t) { t.letter = letterFor(t, taken, m.name + ': the title'); if (t.letter) titleLetters[t.letter] = t.label; }); });
    bound = [];
    all.forEach(function (m) {
      var keys = {};
      m.titles.forEach(function (t) { check(t.items, m.name); letters(t.items, m.name + ': ' + t.label); listKeys(t.items, m, t, keys); });
    });
    return all;
  }

  /* === Letters =========================================================== */

  /* A title's or row's letter: the
     one it declares, if it is in the label and not already taken where it
     stands, or else the first letter of its first word, then of a later
     word, then any letter of the label, the first not taken; a label
     beginning with a digit and a full stop takes the digit. taken is the
     letters already given in that bar or panel. */
  function letterFor(c, taken, who) {
    var label = String(c.label || ''), lower = label.toLowerCase();
    var declared = c.mnemonic ? String(c.mnemonic).toLowerCase().charAt(0) : '';
    if (declared) {
      if (lower.indexOf(declared) < 0) warn(who + ' "' + label + '" declares the letter "' + declared + '", which is not in its label, and gets another');
      else if (taken[declared]) warn(who + ' "' + label + '" declares the letter "' + declared + '", which "' + taken[declared] + '" has already, and gets another');
      else { taken[declared] = label; return declared; }
    }
    var digit = /^(\d)\./.exec(lower);
    var candidates = digit ? [digit[1]] : [];
    lower.split(/\s+/).forEach(function (w) { var ch = (w.match(/[a-z0-9]/) || [''])[0]; if (ch) candidates.push(ch); });
    candidates = candidates.concat(lower.replace(/[^a-z0-9]/g, '').split(''));
    for (var i = 0; i < candidates.length; i++) {
      if (!taken[candidates[i]]) { taken[candidates[i]] = label; return candidates[i]; }
    }
    return '';
  }

  /* Each panel's rows get their letters; a submenu is a panel of its own. */
  function letters(items, who) {
    var taken = {};
    items.forEach(function (c) {
      if (!c || c === '-' || c.heading) return;
      c.letter = letterFor(c, taken, who + ': the row');
      if (c.items) letters(c.items, who + ' > ' + c.label);
    });
  }

  /* === The listing of keys ================================================
     Every key bound in the bar as built (pudl-shortcut-listing.md), and a
     warning when two rows of one source bind the same key. A front row
     with a host row's key is not a clash: the front's wins by the rule. */
  var bound = [];
  function listKeys(items, m, t, keys) {
    items.forEach(function (c) {
      if (!c || c === '-' || c.heading) return;
      if (c.shortcut) {
        if (keys[c.shortcut]) warn(m.name + ': ' + shown(c.shortcut) + ' is bound to both "' + keys[c.shortcut] + '" and "' + c.label + '"; the first wins');
        else keys[c.shortcut] = c.label;
        bound.push({ key: c.shortcut, shown: shown(c.shortcut), label: c.label, title: t.label, source: m.kind, disabled: !!c.disabled });
      }
      if (c.items) listKeys(c.items, m, t, keys);
    });
  }

  function windowItems() {
    var api = window.pudlWindows;
    if (!api || !api.menuCommands) return [];
    var st = api.state(), result = [];
    var active = st.top && !st.min[st.top] ? st.top : null;
    if (active) {
      var commands = api.menuCommands(active).filter(function (c) { return ['page', 'copy-link', 'close'].indexOf(c.id) < 0; });
      if (commands.length) result = result.concat([{ heading: text('active-window', 'Active window') }], commands, ['-']);
    }
    var windows = st.open.map(function (key) {
      var node = document.querySelector('.win[data-win="' + CSS.escape(key) + '"]');
      return { key: key, node: node };
    }).filter(function (w) { return w.node; });
    if (!windows.length) return [];
    result.push({ label: text('minimize-all', 'Minimize all'), run: function () { api.minimizeAll(); } },
      { label: text('restore-all', 'Restore all'), run: function () { api.restoreAll(); } },
      { label: text('close-all', 'Close all windows'), danger: true, run: function () {
        windows.forEach(function (w) { if (w.node.isConnected && document.querySelector('.win[data-win="' + CSS.escape(w.key) + '"]') === w.node) api.close(w.key); });
      } }, '-', { heading: text('open-windows', 'Open windows') });
    windows.forEach(function (w, i) {
      var title = w.node.querySelector('.win-title');
      var detail = (w.node.getAttribute('data-win-detail') || '').trim();
      var layer = document.querySelector('[data-win-layer]'), sep = (layer && layer.getAttribute('data-win-text-title-sep')) || ' · ';
      result.push({ label: (i + 1) + '. ' + (title ? title.textContent.trim() : w.key) + (detail ? sep + detail : ''), checked: w.key === st.top && !st.min[w.key], run: function () {
        if (w.node.isConnected && document.querySelector('.win[data-win="' + CSS.escape(w.key) + '"]') === w.node) api.raise(w.key);
      } });
    });
    return result;
  }

  /* Unique labels in a panel, and shortcuts off the reserved keys. */
  function check(items, who) {
    var seen = {};
    for (var i = items.length - 1; i >= 0; i--) {
      var c = items[i];
      if (!c || c === '-' || c.heading) continue;
      if (seen[c.label]) { warn(who + ': "' + c.label + '" appears twice in one panel, and the second is left out'); items.splice(i, 1); continue; }
      seen[c.label] = true;
      if (c.shortcut) {
        var k = combo(c.shortcut);
        if (!k || RESERVED.indexOf(k) >= 0 || (!desktop() && BROWSER_KEYS.indexOf(k) >= 0)) { warn(who + ': ' + c.shortcut + ' on "' + c.label + '" is a key a page may not take, and the command keeps no shortcut'); delete c.shortcut; }
        else if (desktop() && /^(Ctrl\+)?Alt\+[A-Z0-9]$/.test(k) && k === titleChord(k.slice(-1)) && titleLetters[k.slice(-1).toLowerCase()]) {
          warn(who + ': ' + c.shortcut + ' on "' + c.label + '" is the letter that opens the title "' + titleLetters[k.slice(-1).toLowerCase()] + '", and the command keeps no shortcut'); delete c.shortcut;
        }
        else c.shortcut = k;
      }
      if (c.items) check(c.items, who);
    }
  }

  /* === Shortcuts ========================================================= */

  /* A shortcut in one spelling: Mod for Ctrl, or Command on a Mac, then
     Alt and Shift, then the key, as Mod+Shift+S. */
  function combo(s) {
    var parts = String(s).split('+').map(function (p) { return p.trim(); }).filter(Boolean);
    if (!parts.length) return null;
    var key = parts.pop(), mods = {};
    parts.forEach(function (p) {
      var l = p.toLowerCase();
      if (l === 'mod' || l === 'cmd' || l === 'command' || (l === 'ctrl' && !MAC)) mods.Mod = true;
      else if (l === 'ctrl' || l === 'control') mods.Ctrl = true;
      else if (l === 'alt' || l === 'option') mods.Alt = true;
      else if (l === 'shift') mods.Shift = true;
    });
    if (key.length === 1) key = key.toUpperCase();
    return ['Mod', 'Ctrl', 'Alt', 'Shift'].filter(function (m) { return mods[m]; }).concat(key).join('+');
  }

  function comboOf(e) {
    var key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    var mods = [];
    if (MAC ? e.metaKey : e.ctrlKey) mods.push('Mod');
    if (MAC && e.ctrlKey) mods.push('Ctrl');
    if (e.altKey) mods.push('Alt');
    if (e.shiftKey) mods.push('Shift');
    return mods.concat(key).join('+');
  }

  /* How a shortcut is shown: Ctrl+Shift+S, or the Mac's ⇧⌘S. */
  function shown(k) {
    var parts = k.split('+'), key = parts.pop();
    if (MAC) {
      var sym = { Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Mod: '⌘' };
      return ['Ctrl', 'Alt', 'Shift', 'Mod'].filter(function (m) { return parts.indexOf(m) >= 0; }).map(function (m) { return sym[m]; }).join('') + key;
    }
    return parts.map(function (m) { return m === 'Mod' ? 'Ctrl' : m; }).concat(key).join('+');
  }

  function ariaKeys(k) {
    return k.split('+').map(function (p) { return p === 'Mod' ? (MAC ? 'Meta' : 'Control') : p === 'Ctrl' ? 'Control' : p; }).join('+');
  }

  function editable(el) {
    return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }

  function findShortcut(items, k) {
    for (var i = 0; i < items.length; i++) {
      var c = items[i];
      if (!c || c === '-' || c.heading) continue;
      /* A resident applet's shortcuts, like the site's, work anywhere. */
      if (c.owner && !c.owner.resident) {
        var root = c.owner.applet ? c.owner.applet.root : c.owner.scope.scope;
        if (!sameSource(c.owner, findFront()) || (root !== document && !root.contains(document.activeElement))) continue;
      }
      if (c.shortcut === k && c.bind !== false) return c;
      if (c.items) { var f = findShortcut(c.items, k); if (f) return f; }
    }
    return null;
  }

  function onShortcut(e) {
    if (e.defaultPrevented || e.isComposing || !bar || !built) return;
    if (/^(Control|Shift|Alt|Meta)$/.test(e.key)) return;
    var k = comboOf(e);
    /* A key with no modifier is a field's while one has focus, except a
       function key, which types nothing (pudl-function-keys-as-chords.md). */
    var plain = (k.indexOf('+') < 0 || /^Shift\+.$/.test(k)) && !/^(Shift\+)?F([1-9]|1[0-2])$/.test(k);
    if (plain && editable(document.activeElement)) return;
    if (!sameSource(frontSrc, findFront())) render();
    var all = assemble();
    /* A front menu's shortcuts work while focus is in what it belongs to;
       the host's, and its Pins menu's, work anywhere. */
    var front = all.find(function (m) { return m.kind === 'front'; });
    var inFront = front && front.src.scope && (front.src.kind === 'applet' ? front.src.applet.root : front.src.scope.scope);
    var hit = null;
    if (front && inFront && (inFront === document || inFront.contains(document.activeElement))) {
      front.titles.forEach(function (t) { hit = hit || findShortcut(t.items, k); });
    }
    all.forEach(function (m) {
      if (m !== front) m.titles.forEach(function (t) { hit = hit || findShortcut(t.items, k); });
    });
    if (!hit || hit.disabled) return;
    e.preventDefault();
    act(hit, false);
  }

  /* === Building the bar ================================================== */

  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (a) { n.setAttribute(a, attrs[a]); });
    return n;
  }

  /* The bar's items in the arrow keys' order: its titles, and its pins. */
  function titles() { return Array.prototype.slice.call(built.querySelectorAll('.menubar-title, .menubar-pin')).filter(function (t) { return t.offsetParent !== null; }); }

  function titleButton(t, m) {
    var b = el('button', 'menubar-title', { type: 'button', role: 'menuitem', 'aria-haspopup': 'menu', 'aria-expanded': 'false', tabindex: '-1', id: 'menubar-t' + (++uid) });
    b.setAttribute('title', t.label);
    b.setAttribute('data-tooltip', t.label);
    if (t.id) b.setAttribute('data-menu-id', t.id);
    if (t.content) t.content.forEach(function (n) {
      var c = n.cloneNode(true);
      /* Words of its own are wrapped, so they can give way to its glyph. */
      if (c.nodeType === 3) {
        if (!c.textContent.trim()) return;
        var s = el('span', 'menubar-words');
        s.textContent = c.textContent;
        c = s;
      }
      b.appendChild(c);
    });
    else {
      /* A title may have a glyph before its words (0.79.0). */
      if (t.glyph && /^[a-z][a-z0-9-]*$/.test(t.glyph)) {
        var tg = el('span', 'glyph', { 'aria-hidden': 'true' });
        tg.style.setProperty('--glyph', 'var(--glyph-' + t.glyph + ')');
        b.appendChild(tg);
      }
      /* The words stay one child of the button, which lays its children
         out as a row with a gap, so the letter's span splits nothing. */
      var w = el('span', 'menubar-words');
      lettered(w, t.label, t.letter);
      b.appendChild(w);
    }
    if (t.content) b.classList.add('menubar-brand');
    /* A title with a glyph and words gives way to its glyph alone before
       the bar folds further, keeping its words as its name. */
    if (b.querySelector(':scope > :is(.glyph, img, svg)') && b.querySelector(':scope > .menubar-words')) {
      b.classList.add('menubar-glyphed');
      b.setAttribute('aria-label', t.label);
    }
    if (t.letter) {
      b.setAttribute('data-letter', t.letter);
      if (desktop()) b.setAttribute('aria-keyshortcuts', ariaKeys(titleChord(t.letter)));
    }
    b._menu = { menu: m, title: t };
    return b;
  }

  /* Words with their letter wrapped, so the stylesheet can underline it. */
  function lettered(node, label, letter) {
    node.textContent = '';
    var i = letter ? label.toLowerCase().indexOf(letter) : -1;
    if (i < 0) { node.textContent = label; return; }
    node.appendChild(document.createTextNode(label.slice(0, i)));
    var u = el('span', 'mnemonic');
    u.textContent = label.charAt(i);
    node.appendChild(u);
    node.appendChild(document.createTextNode(label.slice(i + 1)));
  }

  /* A pin in the bar: a link to the item, with the host's icon and words. */
  function pinLink(p) {
    var a = el('a', 'menubar-pin', { role: 'menuitem', tabindex: '-1', href: p.href, title: p.label });
    p.content.forEach(function (n) {
      var c = n.cloneNode(true);
      if (c.nodeType === 3) {
        if (!c.textContent.trim()) return;
        var s = el('span');
        s.textContent = c.textContent.trim();
        c = s;
      }
      a.appendChild(c);
    });
    a._pin = p;
    return a;
  }

  /* A pin as a menu row, in Items and in the collapsed bar's panel. */
  function pinRow(p) {
    return { label: p.label, href: p.href, el: p.el, icon: p.content.filter(function (n) { return n.nodeType === 1; }) };
  }

  var lastSig = null;
  /* The existing title buttons, in the order the menus give their titles,
     take the menus just assembled. */
  function rebind() {
    var groups = built.querySelectorAll(':scope > .menubar-menu:not(.menubar-one)');
    menus.forEach(function (m, i) {
      var g = groups[i];
      if (!g) return;
      var buttons = g.querySelectorAll(':scope > .menubar-title:not(.menubar-pins-more)');
      m.titles.forEach(function (t, j) { if (buttons[j]) buttons[j]._menu = { menu: m, title: t }; });
      var more = g.querySelector(':scope > .menubar-pins-more');
      if (more && m.pins) more._menu = { menu: m, title: { id: 'pins-items', label: text('items', 'Items'), items: m.pins.map(pinRow) } };
    });
  }

  /* force builds it again whatever it reads as: after the pins change, the
     bar collapses or opens out, or the page's regions or policy change. */
  function render(force) {
    if (!bar) return;
    var previous = openTitle && panel && panel.matches(':popover-open') ? openTitle._menu : null;
    var previousSource = frontSrc;
    var panelFocus = panel && panel.contains(document.activeElement);
    function survivingTitle() {
      if (!previous) return null;
      return titles().find(function (t) {
        var m = t._menu;
        if (previous.all) return m.all;
        return m.menu && m.menu.kind === previous.menu.kind && m.menu.name === previous.menu.name &&
          (previous.title.id ? m.title.id === previous.title.id : m.title.label === previous.title.label) &&
          (m.menu.kind !== 'front' || sameSource(previousSource, frontSrc));
      });
    }
    if (force) lastSig = null;
    frontSrc = findFront();
    menuScope = frontScope();
    menus = assemble();
    /* A bar whose menus, titles and pins read as they did is not built
       again (0.69.3): its title buttons take the new menus, whose rows are
       read afresh as each opens, and nothing is laid out. Bringing another
       window to the front often leaves the bar as it was, and building
       and measuring it again each time cost startup the most. */
    var sig = menus.map(function (m) {
      return [m.kind, m.name, m.titles.map(function (t) { return (t.id || '') + ':' + t.label + ':' + (t.letter || '') + ':' + (t.content ? t.content.length : '') + ':' + (t.glyph || ''); }).join(','),
        (m.pins || []).map(function (p) { return p.label + '@' + p.href; }).join(',')].join('|');
    }).join(';');
    if (sig === lastSig && built.firstChild) {
      rebind(); syncRibbon();
      if (previous) {
        var surviving = survivingTitle();
        var selectedLabel = document.activeElement && document.activeElement._item && document.activeElement._item.label;
        if (!surviving) closeAll(false);
        else {
          open(surviving, null);
          if (panelFocus) {
            var row = items(panel).find(function (r) { return r._item && r._item.label === selectedLabel; }) || items(panel)[0];
            if (row) row.focus();
          }
        }
      }
      return;
    }
    closeAll(false);
    lastSig = sig;
    var focusedIndex = -1;
    if (built && built.contains(document.activeElement)) focusedIndex = titles().indexOf(document.activeElement);
    built.textContent = '';

    /* The full bar: each menu a raised group, its glyph first. */
    menus.forEach(function (m) {
      var g = el('div', 'menubar-menu' + (m.kind === 'front' ? ' menubar-front' : m.kind === 'pins' ? ' menubar-pins' : m.kind === 'resident' ? ' menubar-resident' : ''), { role: 'group', 'aria-label': m.name });
      var glyph = el('button', 'menubar-glyph', { type: 'button', tabindex: '-1', role: 'menuitem', 'aria-label': m.name, 'aria-haspopup': 'menu', 'aria-expanded': 'false' });      /* Open after the pointer gesture, so popover light dismiss cannot
         close a panel that was opened during the same pointer-down. */
      glyph.addEventListener('click', function (e) {
        e.preventDefault();
        var first = g.querySelector('.menubar-title');
        if (first) toggle(first, true);
      });
      g.appendChild(glyph);
      m.titles.forEach(function (t) { g.appendChild(titleButton(t, m)); });
      if (m.kind === 'pins' && m.pins.length) {
        m.pins.forEach(function (p) { g.appendChild(pinLink(p)); });
        var more = titleButton({ id: 'pins-items', label: text('items', 'Items'), items: m.pins.map(pinRow) }, m);
        more.classList.add('menubar-pins-more');
        g.appendChild(more);
      }
      built.appendChild(g);
    });

    /* The bar collapsed: one menu button whose panel lists every menu's
       titles. */
    var one = el('div', 'menubar-menu menubar-one', { role: 'group', 'aria-label': text('menu', 'Menu') });
    var ob = el('button', 'menubar-title', { type: 'button', role: 'menuitem', 'aria-haspopup': 'menu', 'aria-expanded': 'false', tabindex: '-1', id: 'menubar-t' + (++uid), 'aria-label': text('menu', 'Menu') });
    ob.appendChild(el('span', 'menubar-glyph', { 'aria-hidden': 'true' }));
    ob._menu = { all: true };
    one.appendChild(ob);
    built.appendChild(one);

    fitStale = true;
    fit();
    var list = titles();
    var keep = list[Math.max(0, Math.min(focusedIndex, list.length - 1))] || list[0];
    list.forEach(function (t) { t.tabIndex = t === keep ? 0 : -1; });
    var key = bar.getAttribute('data-menubar-key');
    if (key !== '' && list[0]) list[0].setAttribute('accesskey', key || 'm');
    if (focusedIndex >= 0 && keep) keep.focus();
    syncRibbon();
    var reopen = survivingTitle();
    if (reopen) open(reopen, panelFocus ? 'first' : null);
  }

  /* Whether the full bar fits, measured with it showing, in one pass, so
     nothing is painted in between. */
  /* First the pins' buttons give way to Items, all together; then, if
     the bar still does not fit, it collapses to one menu. */
  /* It measures only when the bar has been drawn again, has changed size,
     or the fonts have arrived since it last measured (0.69.3); otherwise
     what it measured still holds, and measuring would make the browser lay
     out a page an application may still be building. */
  var fitStale = true;
  function fit() {
    if (!fitStale) return;
    fitStale = false;
    built.classList.remove('menubar-collapsed', 'menubar-pins-collapsed', 'menubar-title-glyphs');
    /* The bar is measured in the shape it is in, folded or unfolded. Then,
       in order, Show as ribbon gives way to its glyph alone, unless the bar
       keeps its words with data-menubar-ribbon-words; the titles with
       glyphs give way to their glyphs alone (0.79.0); the pins' buttons
       give way to Items; and last the bar collapses. A bar sized to its
       content gives way as the content grows, so its room is read again
       after each change. The toggle is measured shown, as the collapsed
       bar hides it. */
    var unfolded = ribbonOn && !!ribbonRow;
    built.classList.toggle('menubar-ribbon-on', unfolded);
    if (ribbonToggle) { ribbonToggle.hidden = false; ribbonToggle.classList.remove('menubar-ribbon-toggle-glyph'); }
    var pinsCollapsed = false, room;
    needed = width();
    var top = bar.parentNode && bar.parentNode.classList && bar.parentNode.classList.contains('topbar') ? bar.parentNode : null;
    if (top && sharesRoom(top)) {
      /* In a topbar shared with other things that fold, the topbar
         decides how much room the bar has. */
      built.classList.add('menubar-collapsed');
      var low = built.getBoundingClientRect().width;
      built.classList.remove('menubar-collapsed');
      room = arrange(top, needed, low);
    } else {
      bar.style.flex = '';
      room = bar.getBoundingClientRect().width;
      if (needed > room + 0.5 && ribbonToggle && !bar.hasAttribute('data-menubar-ribbon-words')) {
        ribbonToggle.classList.add('menubar-ribbon-toggle-glyph');
        room = bar.getBoundingClientRect().width;
      }
    }
    var shared = !!top && sharesRoom(top), glyphsOnly = false;
    if (needed > room + 0.5 && built.querySelector('.menubar-glyphed')) {
      built.classList.add('menubar-title-glyphs');
      glyphsOnly = true;
      needed = width();
      if (!shared) room = bar.getBoundingClientRect().width;
    }
    if (needed > room + 0.5 && built.querySelector('.menubar-pin')) {
      built.classList.add('menubar-pins-collapsed');
      pinsCollapsed = true;
      needed = width();
      if (!shared) room = bar.getBoundingClientRect().width;
    }
    collapsed = needed > room + 0.5;
    if (collapsed) built.classList.remove('menubar-ribbon-on', 'menubar-title-glyphs');
    /* Title tips remain available in every folding stage, including
       ribbon tabs whose words are still visible. */
    level = collapsed ? 3 : pinsCollapsed ? 2 : glyphsOnly ? 1 : 0;
    built.classList.toggle('menubar-pins-collapsed', pinsCollapsed && !collapsed);
    built.classList.toggle('menubar-collapsed', collapsed);
    if (ribbonToggle) ribbonToggle.hidden = collapsed;
  }

  /* === Folding the topbar (0.79.0) ========================================
     A topbar holding other things that fold beside the bar, a folding
     toolbar such as a command bar, or Show as ribbon, shares its room
     among them in an order: each gives way as far as it goes before the
     next starts. A page sets the order with data-fold-order on the
     topbar's children, lower first, or none for one that never folds; by
     default Show as ribbon gives way first (100), down to its glyph, then
     each folding toolbar (200), down to its More menu, then the bar
     (300), down to its pins' Items and then one menu button. Show as
     ribbon takes its order from data-menubar-ribbon-fold-order on the bar,
     and data-menubar-ribbon-words is the same as none. Everything else in
     the topbar keeps its width. */
  function sharesRoom(top) {
    return Array.prototype.some.call(top.children, function (k) {
      return k !== bar && (k === ribbonToggle || k.hasAttribute('data-fold-order') || k.matches('.toolbar[data-toolbar-fold]'));
    });
  }

  function orderOf(v, dflt) {
    if (v === 'none') return null;
    var n = parseFloat(v);
    return isNaN(n) ? dflt : n;
  }

  /* Shares the topbar's room, sizes each thing that folds, and says how
     much the bar has. */
  function arrange(top, full, low) {
    var kids = Array.prototype.filter.call(top.children, function (k) { return !k.hidden && k.getClientRects().length && getComputedStyle(k).position !== 'absolute'; });
    var parts = [];
    kids.forEach(function (k, i) {
      var p = null;
      if (k === bar) p = { full: full, low: low, order: orderOf(k.getAttribute('data-fold-order'), 300) };
      else if (k === ribbonToggle) {
        var words = bar.hasAttribute('data-menubar-ribbon-words') ? 'none' : bar.getAttribute('data-menubar-ribbon-fold-order');
        k.classList.add('menubar-ribbon-toggle-glyph');
        var g = k.getBoundingClientRect().width;
        k.classList.remove('menubar-ribbon-toggle-glyph');
        p = { full: k.getBoundingClientRect().width, low: g, order: orderOf(words, 100), all: true };
      } else if (k.matches('.toolbar[data-toolbar-fold]')) {
        var most = parseFloat(getComputedStyle(k).getPropertyValue('--toolbar-most'));
        var least = parseFloat(getComputedStyle(k).getPropertyValue('--toolbar-least'));
        if (!isNaN(most) && !isNaN(least)) p = { full: most, low: Math.min(least, most), order: orderOf(k.getAttribute('data-fold-order'), 200) };
      }
      if (p && p.order != null) { p.el = k; p.i = i; parts.push(p); }
    });
    /* How far the topbar's contents run past its end with everything at
       full size, where any auto margin has nothing left to take. */
    parts.forEach(function (p) {
      if (p.el === ribbonToggle) p.el.classList.remove('menubar-ribbon-toggle-glyph');
      else p.el.style.flex = '0 0 ' + Math.ceil(p.full) + 'px';
    });
    var cs = getComputedStyle(top);
    var rtl = cs.direction === 'rtl', bounds = top.getBoundingClientRect();
    var end = rtl ? bounds.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft) : bounds.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
    var reach = rtl ? Infinity : -Infinity;
    kids.forEach(function (k) {
      var rect = k.getBoundingClientRect(), style = getComputedStyle(k);
      reach = rtl ? Math.min(reach, rect.left - (parseFloat(style.marginLeft) || 0)) : Math.max(reach, rect.right + (parseFloat(style.marginRight) || 0));
    });
    var deficit = rtl ? end - reach : reach - end;
    parts.slice().sort(function (a, b) { return (a.order - b.order) || (a.i - b.i); }).forEach(function (p) {
      var give = deficit > 0.5 ? (p.all ? p.full - p.low : Math.min(deficit, p.full - p.low)) : 0;
      p.size = p.full - give;
      deficit -= give;
    });
    var room = full;
    parts.forEach(function (p) {
      if (p.el === ribbonToggle) { p.el.classList.toggle('menubar-ribbon-toggle-glyph', p.size < p.full); return; }
      var size = p.size < p.full ? Math.floor(p.size) : Math.ceil(p.full);
      p.el.style.flex = '0 0 ' + size + 'px';
      if (p.el === bar) room = size;
    });
    return room;
  }

  function width() {
    /* Only the groups showing, as an unfolded bar hides its pins. */
    var groups = Array.prototype.filter.call(built.querySelectorAll('.menubar-menu:not(.menubar-one)'), function (g) { return g.getClientRects().length > 0; });
    var gap = parseFloat(getComputedStyle(built).columnGap) || 0;
    return Array.prototype.reduce.call(groups, function (s, g) { return s + g.getBoundingClientRect().width; }, 0) + gap * Math.max(0, groups.length - 1);
  }

  /* === Panels ============================================================ */

  function ensurePanel() {
    if (panel) return;
    panel = el('div', 'menu-panel menubar-panel', { popover: '', role: 'menu', id: 'menubar-panel' });
    panel.addEventListener('toggle', function (e) {
      /* A close whose event arrives after the panel was opened again, by
         a key pressed within the same tick, must not undo the reopening. */
      if (e.newState === 'closed' && openTitle && !panel.matches(':popover-open')) {
        associate(openTitle, false);
        openTitle = null;
        soon();
      }
    });
    bar.appendChild(panel);
  }

  function row(c, inPanel, depth) {
    if (c === '-') return el('div', 'menu-sep', { role: 'separator' });
    if (c.heading) {
      var h = el('div', 'md-section-label', { role: 'presentation' });
      h.textContent = c.heading;
      return h;
    }
    var r;
    if (c.href != null && !c.items) {
      r = el('a', 'menu-action', { role: 'menuitem', href: c.href });
    } else {
      r = el('button', 'menu-action', { type: 'button', role: 'menuitem' });
    }
    if (c.icon && c.icon.length) {
      var icon = el('span', 'menubar-icon', { 'aria-hidden': 'true' });
      c.icon.forEach(function (n) { icon.appendChild(n.cloneNode(true)); });
      r.appendChild(icon);
    } else if (c.glyph && /^[a-z][a-z0-9-]*$/.test(c.glyph)) {
      var g = el('span', 'glyph menubar-icon', { 'aria-hidden': 'true' });
      g.style.setProperty('--glyph', 'var(--glyph-' + c.glyph + ')');
      r.appendChild(g);
    }
    var label = el('span', 'menubar-label');
    var wordsEl = el('span', 'menubar-words');
    lettered(wordsEl, c.label, c.letter);
    label.appendChild(wordsEl);
    /* A second line: a disabled row's reason, else its detail. */
    var second = c.disabled && c.reason ? c.reason : c.detail;
    if (second) {
      var d = el('span', 'menubar-detail', { id: 'menubar-d' + (++uid) });
      d.textContent = second;
      label.appendChild(d);
      if (c.disabled && c.reason) { r.setAttribute('aria-describedby', d.id); r.title = c.reason; }
    }
    r.appendChild(label);
    if (c.letter) r.setAttribute('data-letter', c.letter);
    if (c.checked != null) {
      r.setAttribute('role', c.radio ? 'menuitemradio' : 'menuitemcheckbox');
      r.setAttribute('aria-checked', c.checked ? 'true' : 'false');
    }
    /* A disabled command stays in the arrow keys' reach, as the menu
       pattern asks, and is only refused when chosen. */
    if (c.disabled) r.setAttribute('aria-disabled', 'true');
    if (c.danger) r.classList.add('danger');
    if (c.shortcut) {
      var s = el('span', 'menubar-shortcut', { 'aria-hidden': 'true' });
      s.textContent = shown(c.shortcut);
      r.appendChild(s);
      r.setAttribute('aria-keyshortcuts', ariaKeys(c.shortcut));
    }
    if (c.items) {
      r.setAttribute('aria-haspopup', 'menu');
      r.setAttribute('aria-expanded', 'false');
      r.classList.add('menubar-has-sub');
    }
    r._item = c;
    return r;
  }

  function fill(p, items, back) {
    p.textContent = '';
    if (back) {
      var b = el('button', 'menu-action menubar-back', { type: 'button', role: 'menuitem' });
      b.textContent = text('back', 'Back');
      b._back = back;
      p.appendChild(b);
      p.appendChild(el('div', 'menu-sep', { role: 'separator' }));
    }
    items.forEach(function (c) { p.appendChild(row(c)); });
  }

  /* The collapsed bar's panel: each menu a section of its titles, each
     title leading to its commands. */
  function fillAll(p) {
    p.textContent = '';
    menus.forEach(function (m, mi) {
      if (mi) p.appendChild(el('div', 'menu-sep', { role: 'separator' }));
      var h = el('div', 'md-section-label', { role: 'presentation' });
      h.textContent = m.name;
      p.appendChild(h);
      /* The Pins menu is short, so its commands stand in the section
         itself, and the pins after them, each one press away. */
      if (m.kind === 'pins') {
        m.titles[0].items.forEach(function (c) { p.appendChild(row(c)); });
        if (m.titles[0].items.length && m.pins.length) p.appendChild(el('div', 'menu-sep', { role: 'separator' }));
        m.pins.forEach(function (pin) { p.appendChild(row(pinRow(pin))); });
        return;
      }
      m.titles.forEach(function (t) {
        var r = row({ label: t.label, items: t.items, letter: t.letter });
        r._title = t;
        p.appendChild(r);
      });
    });
  }

  /* The group glyph is another native invoker for its first title. */
  function associate(title, expanded) {
    var glyph = title.previousElementSibling;
    var controls = glyph && glyph.classList.contains('menubar-glyph') ? [title, glyph] : [title];
    controls.forEach(function (control) {
      control.setAttribute('aria-expanded', String(expanded));
      if (expanded) control.setAttribute('popovertarget', panel.id);
      else control.removeAttribute('popovertarget');
    });
  }

  function open(title, focusWhere) {
    if (!currentTarget()) {
      var prior = title._menu;
      render();
      title = titles().find(function (t) {
        var info = t._menu;
        return prior.all ? info.all : info.menu && prior.menu.kind === info.menu.kind && prior.menu.name === info.menu.name && prior.title.label === info.title.label;
      });
      if (!title || !currentTarget()) return;
    }
    /* Unfolded into a ribbon, a title is a tab: it chooses its row of
       tools rather than opening a menu, whatever way it was reached. */
    if (ribbonActive() && !title._menu.all && hasTools(title)) { chooseTab(title, focusWhere); return; }
    ensurePanel();
    closeSub();
    if (openTitle && openTitle !== title) {
      associate(openTitle, false);
    }
    var info = title._menu;
    /* The host sets its pinning commands for what is in front now, before
       the list is read. */
    if (pinsSource && (info.all || (info.menu.kind === 'pins' && info.title.id === 'pins'))) {
      pinsSource.dispatchEvent(new CustomEvent('pudl:pins-menu', { bubbles: true }));
    }
    menus = assemble();
    if (info.all) fillAll(panel);
    else if (info.title.id === 'pins-items') {
      var pins = menus.find(function (m) { return m.kind === 'pins'; });
      fill(panel, pins ? pins.pins.map(pinRow) : []);
    } else {
      var fresh = findTitle(info.menu.kind, info.title.label);
      fill(panel, fresh ? fresh.items : info.title.items);
    }
    panel.setAttribute('aria-labelledby', title.id);
    panel.setAttribute('data-menu-anchor', title.id);
    openTitle = title;
    /* Native light dismiss treats the active title as part of its popup.
       Move the association on hover too, so clicking that title toggles
       the still-open panel instead of dismissing it before click runs. */
    associate(title, true);
    titles().forEach(function (t) { t.tabIndex = t === title ? 0 : -1; });
    /* The panel is placed and focus moved at once, not on the toggle event,
       which a quick close and reopen can merge away. */
    if (!panel.matches(':popover-open')) panel.showPopover();
    if (window.pudlMenu && window.pudlMenu.place) window.pudlMenu.place(panel);
    /* A panel opened from the keyboard shows its letters; one opened with
       the pointer does not. */
    panel.toggleAttribute('data-keyboard', !!focusWhere);
    var rows = items(panel);
    var target = focusWhere === 'last' ? rows[rows.length - 1] : focusWhere === 'first' ? rows[0] : null;
    if (target) target.focus();
  }

  function findTitle(kind, label) {
    for (var i = 0; i < menus.length; i++) {
      if (menus[i].kind !== kind) continue;
      for (var j = 0; j < menus[i].titles.length; j++) if (menus[i].titles[j].label === label) return menus[i].titles[j];
    }
    return null;
  }

  function toggle(title, keyboard) {
    if (openTitle === title && panel && panel.matches(':popover-open')) { closeAll(true); return; }
    open(title, keyboard ? 'first' : null);
  }

  function closeSub() {
    if (sub && sub.matches(':popover-open')) sub.hidePopover();
    if (panel) panel.querySelectorAll('.menubar-has-sub[aria-expanded="true"]').forEach(function (r) { r.setAttribute('aria-expanded', 'false'); });
  }

  function closeAll(focusTitle) {
    var t = openTitle;
    closeSub();
    if (panel && panel.matches(':popover-open')) panel.hidePopover();
    if (focusTitle && t && t.isConnected) t.focus();
  }

  /* A submenu opens beside its row on a wide screen, and in place of the
     panel's rows, with a Back row, in a sheet or in the collapsed bar. */
  function openSub(r, focusFirst) {
    var c = r._item;
    var inPlace = panel.classList.contains('sheet') || (openTitle && openTitle._menu.all);
    if (inPlace) {
      var host = r.closest('.menu-panel');
      var prev = Array.prototype.slice.call(host.childNodes);
      fill(host, c.items, function () {
        host.textContent = '';
        prev.forEach(function (n) { host.appendChild(n); });
        r.focus();
      });
      var first = items(host)[1] || items(host)[0];
      if (first) first.focus();
      return;
    }
    if (!sub) {
      sub = el('div', 'menu-panel menubar-panel menubar-sub', { popover: 'manual', role: 'menu', id: 'menubar-sub' });
      /* pudl-menu.js places a panel as it opens, on the way down; this
         listener on the panel itself runs after it, and puts the submenu
         beside its row instead. */
      sub.addEventListener('toggle', function (e) { if (e.newState === 'open') placeSub(); });
    }
    if (sub.parentNode !== panel) panel.appendChild(sub);
    closeSub();
    fill(sub, c.items);
    sub.setAttribute('aria-label', c.label);
    r.setAttribute('aria-expanded', 'true');
    sub._from = r;
    if (!r.id) r.id = 'menubar-row-' + (++uid);
    sub.setAttribute('data-menu-anchor', r.id);
    sub.setAttribute('data-menu-placement', 'beside');
    sub.showPopover();
    placeSub();
    if (focusFirst) { var f = items(sub)[0]; if (f) f.focus(); }
  }

  function placeSub() {
    if (!sub._from || !sub.matches(':popover-open')) return;
    if (window.pudlMenu) window.pudlMenu.place(sub);
  }

  function items(p) {
    return Array.prototype.filter.call(p.querySelectorAll(':scope > .menu-action'), function (n) { return n.getClientRects().length > 0; });
  }

  /* Carrying out a command: a host button is pressed, a link followed as
     a reader's click on it would be, an applet's run called. Focus goes
     back first to where it was before the bar, so a command that acts on
     the focused thing finds it. */
  function act(c, fromMenu) {
    if (c.disabled || c.items) return;
    if ((fromMenu && !currentTarget()) || (c.owner && !c.owner.resident && !sameSource(c.owner, findFront()))) { render(); return; }
    var scopeEl = c.owner ? c.owner.scope.scope : document;
    if (fromMenu) {
      closeAll(false);
      restoreFocus('command');
    }
    if (c.run) { try { c.run(); } catch (err) { if (window.console) console.warn('pudl-menubar:', err); } return; }
    if (c.href != null && c.href.charAt(0) === '#' && c.href.length > 1) {
      var id = decodeURIComponent(c.href.slice(1));
      var target = (scopeEl === document ? document : scopeEl).querySelector('#' + CSS.escape(id)) || document.getElementById(id);
      if (target) {
        target.scrollIntoView({ block: 'start' });
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        return;
      }
    }
    if (c.el && c.el.isConnected) c.el.click();
    else if (c.href != null) location.assign(c.href);
  }

  /* === Events ============================================================ */

  function onBarPointer(e) {
    var pin = e.target.closest('.menubar-pin');
    if (pin && built.contains(pin)) {
      /* A plain press is the host's, through its own link; a press with a
         modifier, or another button, is the browser's to follow. */
      if (e.type !== 'click' || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      closeAll(false);
      act(pin._pin, false);
      return;
    }
    var t = e.target.closest('.menubar-title');
    if (!t || !built.contains(t)) return;
    if (e.type === 'click') {
      /* This handler owns the toggle; suppress the button's native one. */
      e.preventDefault();
      toggle(t, e.detail === 0);
      return;
    }
    /* With a panel open, moving to another title opens its panel. */
    if (e.type === 'pointerover' && openTitle && openTitle !== t && panel.matches(':popover-open') && !t._menu.all && !openTitle._menu.all) open(t, null);
  }

  /* A row's click is the bar's alone: pudl-menu.js would close the panel
     on a submenu or Back row, and pudl-windows.js would act on a link the
     row only stands for. */
  function onPanelClick(e) {
    var r = e.target.closest('.menu-action');
    if (!r || !(panel.contains(r))) return;
    if (!currentTarget()) { e.preventDefault(); render(); return; }
    e.stopPropagation();
    if (r._back) { e.preventDefault(); r._back(); return; }
    var c = r._item;
    if (!c) return;
    if (c.items) { e.preventDefault(); openSub(r, e.detail === 0); return; }
    /* A link row opened in a new tab is the browser's to follow. */
    if (r.tagName === 'A' && (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) return;
    e.preventDefault();
    act(c, true);
  }

  function onPanelOver(e) {
    var r = e.target.closest('.menu-action');
    if (!r || !panel.contains(r) || panel.classList.contains('sheet') || (openTitle && openTitle._menu.all)) return;
    if (sub && sub.contains(r)) return;
    if (r.classList.contains('menubar-has-sub')) { if (!sub || sub._from !== r || !sub.matches(':popover-open')) openSub(r, false); }
    else closeSub();
  }

  /* From an open panel the arrows go from menu to menu, past the pins. */
  function menuTitles(list) { return list.filter(function (x) { return !x.classList.contains('menubar-pin'); }); }

  function step(list, cur, d) {
    var i = list.indexOf(cur);
    return list[(i + d + list.length) % list.length];
  }

  function onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    var title = t.closest && t.closest('.menubar-title, .menubar-pin');
    var inSub = sub && sub.contains(t);
    var r = t.closest && t.closest('.menubar-panel .menu-action');
    var list = titles();

    if (title && built.contains(title)) {
      var isPin = title.classList.contains('menubar-pin');
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var next = step(list, title, e.key === 'ArrowRight' ? 1 : -1);
        list.forEach(function (x) { x.tabIndex = x === next ? 0 : -1; });
        next.focus();
        /* Moving onto a pin closes an open menu, since a pin has none. */
        if (openTitle && panel.matches(':popover-open')) {
          if (next.classList.contains('menubar-pin')) closeAll(false);
          else open(next, null);
        }
      } else if (isPin) {
        /* Enter follows the link as a press does; Space does too, as it
           would on a button. */
        if (e.key === ' ') { e.preventDefault(); title.click(); }
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        var to = e.key === 'Home' ? list[0] : list[list.length - 1];
        list.forEach(function (x) { x.tabIndex = x === to ? 0 : -1; });
        to.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(title, 'first');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        open(title, 'last');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (openTitle && panel.matches(':popover-open')) closeAll(true);
        /* With no panel open, Escape leaves the bar for where focus was. */
        else restoreFocus('escape');
      } else if (!isPin && e.key.length === 1 && /\S/.test(e.key) && !e.shiftKey) {
        /* A letter opens the title that has it. */
        var hit = list.filter(function (x) { return x.getAttribute('data-letter') === e.key.toLowerCase(); })[0];
        if (hit) { e.preventDefault(); hit.focus(); open(hit, 'first'); }
      }
      return;
    }
    if (!r) return;
    var host = r.closest('.menu-panel');
    var rows = items(host);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (r.classList.contains('menubar-has-sub')) { openSub(r, true); return; }
      if (openTitle && !openTitle._menu.all) { var n = step(menuTitles(list), openTitle, 1); n.focus(); open(n, 'first'); }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (inSub) { var from = sub._from; closeSub(); if (from) from.focus(); return; }
      var back = host.querySelector(':scope > .menubar-back');
      if (back) { back._back(); return; }
      if (openTitle && !openTitle._menu.all) { var p = step(menuTitles(list), openTitle, -1); p.focus(); open(p, 'first'); }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (inSub) { var f = sub._from; closeSub(); if (f) f.focus(); return; }
      closeAll(true);
    } else if (e.key === 'Tab') {
      closeAll(false);
      if (openTitle) openTitle.focus();
    } else if (e.key === ' ' && r.tagName === 'A') {
      e.preventDefault();
      r.click();
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      /* A letter runs the one row that has it, or opens its submenu; where
         several rows share it, it moves focus from one to the next, and
         Enter runs; where none has it, nothing happens. */
      e.preventDefault();
      var ch = e.key.toLowerCase();
      var with_ = rows.filter(function (x) { return x.getAttribute('data-letter') === ch; });
      if (!with_.length) return;
      if (with_.length > 1) { with_[(with_.indexOf(r) + 1) % with_.length].focus(); return; }
      var one = with_[0], c = one._item;
      if (!c || c.disabled) { one.focus(); return; }
      if (c.items) { one.focus(); openSub(one, true); return; }
      if (one._title) { one.click(); return; }
      act(c, true);
    }
  }

  /* === A desktop host's accelerators =======================================
     Under data-menubar-host="desktop" the keys a browser would own are the
     bar's: Alt pressed and released alone, on every platform, moves focus
     to the first title, as does F10 where macOS does not keep it; and the
     platform's access-key modifier with a title's letter opens that title
     from anywhere, a field included. Alt alone is a press and a release
     with no other key between and no loss of focus between, so Alt+Tab
     does nothing on its return. While the modifier is held the titles
     show their letters. */
  var altArmed = false, enteringBar = false;
  function ownsFocus(target) {
    return target && (bar.contains(target) || (panel && panel.contains(target)) || (sub && sub.contains(target)));
  }
  function usableReturnTarget(target) {
    if (!target || target.nodeType !== 1 || target.ownerDocument !== document || !target.isConnected || typeof target.focus !== 'function' || target.matches(':disabled') || target.closest('[inert],[hidden]') || !target.getClientRects().length) return false;
    var style = getComputedStyle(target);
    return style.visibility !== 'hidden' && style.visibility !== 'collapse';
  }
  function restoreFocus(reason) {
    var target = returnTo;
    returnTo = null;
    if (target !== document.body && usableReturnTarget(target)) {
      target.focus({ preventScroll: true });
      if (document.activeElement === target) bar.dispatchEvent(new CustomEvent('pudl:menubar-return-focus', { bubbles: true, detail: { target: target, reason: reason } }));
    } else if (ownsFocus(document.activeElement)) document.activeElement.blur();
  }
  function focusBar(options) {
    if (!bar || !built || !usableReturnTarget(bar)) return false;
    var list = titles().filter(usableReturnTarget);
    if (!list.length) return false;
    var a = document.activeElement;
    var explicit = options && options.returnTo;
    if (!ownsFocus(a)) {
      if (explicit != null && (!usableReturnTarget(explicit) || ownsFocus(explicit))) return false;
      returnTo = explicit || a;
    }
    list.forEach(function (x) { x.tabIndex = x === list[0] ? 0 : -1; });
    enteringBar = true;
    try { list[0].focus(); } finally { enteringBar = false; }
    var focused = document.activeElement === list[0];
    if (!focused) returnTo = null;
    return focused;
  }
  function chordHeld(e) { return MAC ? (e.ctrlKey && e.altKey && !e.metaKey && !e.shiftKey) : (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey); }
  function onAccelDown(e) {
    if (!bar || !built) return;
    var alone = e.key === 'Alt' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.repeat;
    altArmed = desktop() && alone;
    if (!desktop()) return;
    if (e.key === 'Alt' || (MAC && e.key === 'Control')) { if (chordHeld(e) || alone) built.classList.add('menubar-letters'); return; }
    if (e.key === 'F10' && !MAC && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.defaultPrevented) {
      e.preventDefault(); focusBar(); return;
    }
    if (!chordHeld(e) || e.key.length !== 1 || e.defaultPrevented) return;
    var letter = e.key.toLowerCase();
    if (!titleLetters[letter]) return;
    e.preventDefault();
    if (!currentTarget()) render();
    var a = document.activeElement;
    if (a && !ownsFocus(a)) returnTo = a;
    if (collapsed) {
      var one = built.querySelector('.menubar-one .menubar-title');
      open(one, 'first');
      var rowFor = items(panel).filter(function (x) { return x._title && x._title.letter === letter; })[0];
      if (rowFor) rowFor.click();
      return;
    }
    var t = titles().filter(function (x) { return x.getAttribute('data-letter') === letter; })[0];
    if (t) { t.focus(); open(t, 'first'); }
  }
  function onAccelUp(e) {
    if (!bar || !built) return;
    if (e.key === 'Alt' || e.key === 'Control') built.classList.remove('menubar-letters');
    if (e.key === 'Alt' && altArmed && desktop()) {
      altArmed = false;
      e.preventDefault();
      var a = document.activeElement;
      if (a && bar.contains(a)) return;
      focusBar();
    }
  }

  /* === Unfolding into a ribbon (0.79.0) ===================================
     Show as ribbon, a toggle at the far right of the topbar, unfolds every
     menu in the bar at once into a ribbon, and folds them back. Unfolded,
     each title stays where it stands and is a tab: pressing it, or
     reaching it by its letter or the keys, chooses it, drawn pressed in,
     and one row of tools under the topbar holds its menu's commands. The
     row is a folding toolbar built from the same rows a menu holds: a
     heading or a separator starts a group, named by the heading; a command
     is a button with its glyph and words, or its glyph alone where it says
     glyphOnly; a command that switches is a toggle; rows of one radio
     group are a segmented control; and a submenu is a menu button. It is a
     ribbon all the way across: every title is a tab and every command a
     tool. Every command runs as it does from its menu. Switching windows changes the applet's tabs and
     keeps the bar unfolded. Whether it is unfolded is the reader's choice,
     kept for the site. Where the bar has collapsed to one menu button,
     on a narrow window, it stays folded and the toggle is hidden. Anything
     else in the topbar, beside the bar, keeps its place either way. */
  /* The pins are not a tab: they stand in the bar unfolded as they do
     folded, and the Pins menu stays a menu. Each side keeps the tab chosen
     on it, so going back to a site's tab, or to an applet's, finds the one
     left there. */
  var ribbonOn = false, ribbonRow = null, ribbonToggle = null, ribbonUid = 0;
  var chosen = { host: null, front: {}, last: 'front' };
  function frontName(t) { return t._menu.menu.name || ''; }
  function ribbonKey() { return 'pudl-menubar-ribbon:' + (bar.getAttribute('aria-label') || location.pathname); }
  function ribbonActive() { return ribbonOn && !collapsed && !!ribbonRow; }

  function setupRibbon() {
    /* A preview, so a bar asks for it: data-menubar-ribbon. */
    if (!bar.hasAttribute('data-menubar-ribbon')) return;
    var top = bar.closest('.topbar');
    ribbonToggle = el('button', 'btn btn-sm menubar-ribbon-toggle', { type: 'button', 'aria-pressed': 'false', 'aria-label': text('ribbon', 'Show as ribbon'), 'data-tooltip': text('ribbon', 'Show as ribbon') });
    var g = el('span', 'glyph', { 'aria-hidden': 'true' });
    g.style.setProperty('--glyph', 'var(--glyph-ribbon)');
    var w = el('span', 'toolbar-words');
    w.textContent = text('ribbon', 'Show as ribbon');
    ribbonToggle.append(g, w);
    ribbonToggle.addEventListener('click', function () { setRibbon(!ribbonOn, true); });
    var slot = document.querySelector('[data-menubar-ribbon-slot]');
    (slot || top || bar.parentNode).appendChild(ribbonToggle);
    ribbonRow = el('div', 'menubar-ribbon', { hidden: '' });
    var chooser = el('button', 'btn btn-sm menu-btn menubar-ribbon-tabs', { type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false' });
    chooser.textContent = text('ribbon-tabs', 'Ribbon tabs');
    chooser.addEventListener('click', function () { openRibbonTabs(chooser); });
    chooser.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); openRibbonTabs(chooser); }
    });
    ribbonRow.appendChild(chooser);
    (top || bar).insertAdjacentElement('afterend', ribbonRow);
    ribbonRow.addEventListener('click', onRibbonClick);
    /* A press on a command keeps focus where the reader was working, so a
       command that acts on the focused thing finds it. */
    ribbonRow.addEventListener('mousedown', function (e) {
      if (e.target.closest('button, a') && !e.target.closest('.menu-panel') && !e.target.closest('.menu-btn')) e.preventDefault();
    });
    var kept = null;
    try { kept = localStorage.getItem(ribbonKey()); } catch (err) { /* not kept */ }
    ribbonOn = kept === 'ribbon';
    ribbonToggle.setAttribute('aria-pressed', ribbonOn ? 'true' : 'false');
  }

  function setRibbon(on, remember) {
    ribbonOn = on;
    if (ribbonToggle) ribbonToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (remember) { try { localStorage.setItem(ribbonKey(), on ? 'ribbon' : 'menus'); } catch (err) { /* not kept */ } }
    closeAll(false);
    render(true);
    bar.dispatchEvent(new CustomEvent('pudl:menubar-ribbon', { bubbles: true, detail: { ribbon: on } }));
  }

  function barTitles() {
    return Array.prototype.slice.call(built.querySelectorAll('.menubar-menu:not(.menubar-one) > .menubar-title:not(.menubar-pins-more)'));
  }

  function openRibbonTabs(button) {
    if (!ribbonActive() || !window.pudlMenu || !window.pudlMenu.openAt) return;
    var rows = barTitles().filter(hasTools).map(function (t) {
      return { label: t._menu.title.label, radio: true, checked: t.getAttribute('aria-selected') === 'true', run: function () {
        if (t.isConnected) chooseTab(t, false);
      } };
    });
    var r = button.getBoundingClientRect();
    var panel = window.pudlMenu.openAt(getComputedStyle(button).direction === 'rtl' ? r.right : r.left, r.bottom + 4, rows,
      { owner: button, 'for': button, label: text('ribbon-tabs', 'Ribbon tabs'), edges: { top: r.top - 4, bottom: r.bottom + 4 } });
    if (!panel) return;
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-controls', panel.id);
    panel.addEventListener('toggle', function closed(e) {
      if (e.newState !== 'closed') return;
      button.setAttribute('aria-expanded', 'false');
      button.removeAttribute('aria-controls');
      panel.removeEventListener('toggle', closed);
    });
  }

  function sideOf(t) { return t._menu.menu.kind === 'front' ? 'front' : 'host'; }

  function chooseTab(t, focusWhere) {
    var side = sideOf(t);
    if (side === 'front') chosen.front[frontName(t)] = t._menu.title.label;
    else chosen.host = t._menu.title.label;
    chosen.last = side;
    syncRibbon();
    titles().forEach(function (x) { x.tabIndex = x === t ? 0 : -1; });
    if (focusWhere) {
      var tb = document.getElementById(t.getAttribute('aria-controls'));
      var first = tb && tb.querySelector('[tabindex="0"]:not(:disabled), button:not(:disabled), a[href], select');
      if (first) first.focus(); else t.focus();
    }
  }

  /* Unfolded, the bar is a ribbon all the way across: every title is a
     tab and every command a tool, except the Pins menu, which stays a
     menu at the start of the pins. */
  function hasTools(t) {
    var info = t && t._menu;
    return !!(info && !info.all && info.menu.kind !== 'pins');
  }

  /* A side's chosen tab: the site's chosen before if it is still in the
     bar; for the applet in front, the one last chosen in it, so each
     applet keeps its own; else the side's first. */
  function chosenTitle(list, side) {
    list = list.filter(function (t) { return hasTools(t) && sideOf(t) === side; });
    var was = side === 'front' ? list[0] && chosen.front[frontName(list[0])] : chosen.host;
    var hit = was && list.filter(function (t) { return t._menu.title.label === was; })[0];
    return hit || list[0];
  }

  function syncRibbon() {
    if (!ribbonRow) return;
    if (ribbonToggle) ribbonToggle.hidden = collapsed;
    var on = ribbonActive();
    built.classList.toggle('menubar-ribbon-on', on);
    /* The page's root says so while the ribbon shows, so a page can style
       for it, and a toolbar marked data-toolbar-ribbon="hide", such as a
       window's own that repeats the ribbon's commands, gives way (0.80.0). */
    if (document.documentElement.hasAttribute('data-menubar-ribbon-on') !== on) document.documentElement.toggleAttribute('data-menubar-ribbon-on', on);
    var top = bar.closest('.topbar');
    if (top) {
      top.classList.toggle('menubar-ribbon-host', on);
      ribbonRow.style.setProperty('--menubar-ribbon-pad', getComputedStyle(top).paddingInlineStart);
    }
    ribbonRow.hidden = !on;
    var list = barTitles();
    var chooser = ribbonRow.querySelector('.menubar-ribbon-tabs');
    var needsChooser = on && built.classList.contains('menubar-title-glyphs') && list.some(function (x) { return hasTools(x) && x.classList.contains('menubar-glyphed'); });
    if (chooser && !needsChooser) {
      var chooserPanel = document.getElementById(chooser.getAttribute('aria-controls'));
      var returnFocus = document.activeElement === chooser || (chooserPanel && chooserPanel.contains(document.activeElement));
      if (chooserPanel && chooserPanel.matches(':popover-open')) chooserPanel.hidePopover();
      if (returnFocus) {
        var selected = chosenTitle(list, chosen.last) || chosenTitle(list, 'front') || chosenTitle(list, 'host') || list[0];
        if (selected) selected.focus();
      }
    }
    if (chooser) chooser.hidden = !needsChooser;
    var groups = built.querySelectorAll(':scope > .menubar-menu:not(.menubar-one)');
    function asMenu(x) {
      x.setAttribute('role', 'menuitem');
      x.setAttribute('aria-haspopup', 'menu');
      x.removeAttribute('aria-selected');
      x.removeAttribute('aria-controls');
      if (x.getAttribute('aria-expanded') == null) x.setAttribute('aria-expanded', 'false');
    }
    if (!on) {
      built.setAttribute('role', 'menubar');
      groups.forEach(function (g) { g.setAttribute('role', 'group'); });
      list.forEach(asMenu);
      return;
    }
    /* The site's and the applet's titles together are one tab list; the
       pins stay a group. */
    built.setAttribute('role', 'tablist');
    groups.forEach(function (g) { g.setAttribute('role', g.classList.contains('menubar-pins') ? 'group' : 'presentation'); });
    var picks = { host: chosenTitle(list, 'host'), front: chosenTitle(list, 'front') };
    if (picks.host) chosen.host = picks.host._menu.title.label;
    if (picks.front) chosen.front[frontName(picks.front)] = picks.front._menu.title.label;
    var t = picks[chosen.last] || picks.front || picks.host;
    var rowId = 'menubar-ribbon-row';
    list.forEach(function (x) {
      if (!hasTools(x)) { asMenu(x); return; }
      x.setAttribute('role', 'tab');
      x.removeAttribute('aria-haspopup');
      x.removeAttribute('aria-expanded');
      x.setAttribute('aria-selected', x === t ? 'true' : 'false');
      if (x === t) x.setAttribute('aria-controls', rowId); else x.removeAttribute('aria-controls');
    });
    if (!t) return;
    /* The row is built afresh each time, as its menu would be, so its
       states are read now; a new toolbar is folded by pudl-toolbar.js as
       it arrives. Focus inside it stays on the same control. */
    var old = ribbonRow.querySelector(':scope > .toolbar');
    var focusIndex = -1;
    if (old && old.contains(document.activeElement)) focusIndex = Array.prototype.indexOf.call(old.querySelectorAll('button, a[href], select'), document.activeElement);
    menus = assemble();
    var label = t._menu.title.label;
    var fresh = findTitle(t._menu.menu.kind, label);
    var tb = el('div', 'toolbar', { role: 'toolbar', id: rowId, 'aria-label': label, 'data-toolbar-fold': '', 'data-toolbar-captions': bar.getAttribute('data-menubar-ribbon-captions') || 'none' });
    ribbonGroups(fresh ? fresh.items : t._menu.title.items, label).forEach(function (g) { tb.appendChild(g); });
    if (old) old.replaceWith(tb); else ribbonRow.appendChild(tb);
    if (focusIndex >= 0) {
      var again = tb.querySelectorAll('button, a[href], select')[focusIndex];
      if (again) again.focus();
    }
  }

  /* A menu's rows as the groups of a folding toolbar. */
  function ribbonGroups(items, title) {
    var groups = [], g = null, radio = null;
    function start(name) { g = { name: name, parts: [] }; groups.push(g); radio = null; }
    items.forEach(function (c) {
      if (c === '-') { g = null; radio = null; return; }
      if (!c) return;
      if (c.heading) { start(c.heading); return; }
      if (typeof c.label !== 'string') return;
      if (!g) start('');
      if (c.radio && c.checked != null) {
        if (!radio || radio.key !== c.radio) { radio = { key: c.radio, rows: [] }; g.parts.push({ seg: radio.rows }); }
        radio.rows.push(c);
        return;
      }
      radio = null;
      g.parts.push(c);
    });
    return groups.filter(function (x) { return x.parts.length; }).map(function (x, i) {
      var group = el('div', 'toolbar-group', { role: 'group', 'aria-label': x.name || title, 'data-toolbar-group': x.name || title });
      var glyph = null;
      x.parts.forEach(function (p) {
        if (p.seg) { group.appendChild(ribbonSeg(p.seg, x.name || title)); return; }
        if (!glyph && p.glyph) glyph = p.glyph;
        group.appendChild(ribbonControl(p));
      });
      if (glyph) group.setAttribute('data-toolbar-glyph', glyph);
      /* A choice under a heading shows the heading, with captions off or
         on, since its positions are answers to that heading's question. */
      if (x.name && x.parts.some(function (p) { return p.seg; })) group.setAttribute('data-toolbar-captioned', '');
      group.setAttribute('data-toolbar-priority', String(100 - i));
      return group;
    });
  }

  function ribbonLook(node, c) {
    if (c.icon && c.icon.length) {
      var icon = el('span', 'toolbar-icon', { 'aria-hidden': 'true' });
      c.icon.forEach(function (n) { icon.appendChild(n.cloneNode(true)); });
      node.appendChild(icon);
    } else if (c.glyph && /^[a-z][a-z0-9-]*$/.test(c.glyph)) {
      var g = el('span', 'glyph', { 'aria-hidden': 'true' });
      g.style.setProperty('--glyph', 'var(--glyph-' + c.glyph + ')');
      node.appendChild(g);
    }
    var w = el('span', 'toolbar-words');
    w.textContent = c.label;
    node.appendChild(w);
    if (c.glyphOnly && (c.glyph || (c.icon && c.icon.length))) {
      node.setAttribute('data-toolbar-glyph-only', '');
      node.setAttribute('aria-label', c.label);
    }
    var tip = c.label + (c.shortcut ? ' (' + shown(c.shortcut) + ')' : '') + (c.disabled && c.reason ? ': ' + c.reason : '');
    if (tip !== c.label || c.glyphOnly) node.setAttribute('data-tooltip', tip);
    if (c.shortcut) node.setAttribute('aria-keyshortcuts', ariaKeys(c.shortcut));
    /* A command that destroys something is a danger button, which leads
       with the warning glyph, so its danger never rests on colour. */
    if (c.danger) node.classList.add('btn-danger');
  }

  function ribbonControl(c) {
    if (c.items) {
      var wrap = el('div', 'menu');
      var id = 'menubar-ribbon-menu-' + (++ribbonUid);
      var b = el('button', 'btn btn-sm menu-btn', { type: 'button', popovertarget: id });
      ribbonLook(b, c);
      var p = el('div', 'menu-panel', { popover: '', id: id, role: 'menu', 'aria-label': c.label });
      /* A submenu's own submenus stand in it under their names. */
      var flat = [];
      c.items.forEach(function (x) {
        if (x && x.items) { flat.push({ heading: x.label }); x.items.forEach(function (y) { if (!y || !y.items) flat.push(y); }); }
        else flat.push(x);
      });
      fill(p, flat);
      wrap.append(b, p);
      return wrap;
    }
    var n;
    if (c.href != null) n = el('a', 'btn btn-sm', { href: c.href });
    else n = el('button', 'btn btn-sm', { type: 'button' });
    ribbonLook(n, c);
    if (c.checked != null) n.setAttribute('aria-pressed', c.checked ? 'true' : 'false');
    if (c.disabled) { if (n.tagName === 'BUTTON') n.disabled = true; else n.setAttribute('aria-disabled', 'true'); }
    n._item = c;
    return n;
  }

  function ribbonSeg(rows, name) {
    var seg = el('div', 'seg sm', { role: 'group', 'aria-label': name });
    rows.forEach(function (c) {
      var b = el('button', '', { type: 'button', 'aria-pressed': c.checked ? 'true' : 'false' });
      b.textContent = c.label;
      if (c.disabled) b.disabled = true;
      b._item = c;
      seg.appendChild(b);
    });
    return seg;
  }

  function onRibbonClick(e) {
    var n = e.target;
    while (n && n !== ribbonRow && !n._item) n = n.parentNode;
    if (!n || n === ribbonRow) return;
    var c = n._item;
    if (!c || c.items) return;
    if (n.tagName === 'A' && (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) return;
    e.preventDefault();
    e.stopPropagation();
    var p = n.closest('.menu-panel');
    if (p && p.matches(':popover-open')) p.hidePopover();
    act(c, false);
    /* What the command changed, such as a switch's state, shows next. */
    setTimeout(function () { if (ribbonActive()) syncRibbon(); }, 0);
  }

  /* === Starting ========================================================== */

  var pending = 0, pinsChanged = false;
  function soon() {
    if (pending) return;
    pending = requestAnimationFrame(function () {
      pending = 0;
      if (!currentTarget()) { render(); return; }
      /* Retain a valid open menu. Command state is read afresh on opening,
         and a change to the pins is drawn once it closes. */
      if (panel && panel.matches(':popover-open')) return;
      if (pinsChanged) { pinsChanged = false; render(true); return; }
      var wasLevel = level;
      fit();
      if (wasLevel !== level) render(true);
    });
  }

  function init() {
    bar = document.querySelector('[data-menubar]');
    if (!bar) return;
    source = bar.querySelector('[data-menubar-source]');
    if (!source) return;
    pinsSource = bar.querySelector('[data-menubar-pins]');
    built = el('div', 'menubar-row', { role: 'menubar', 'aria-label': bar.getAttribute('aria-label') || text('menu', 'Menu') });
    Array.prototype.forEach.call(bar.children, function (c) { if (c !== source && c !== pinsSource) c.setAttribute('data-menubar-fallback', ''); });
    bar.appendChild(built);
    bar.classList.add('menubar-ready');
    ensurePanel();
    setupRibbon();
    /* Where focus was before the bar, which a command gives it back to. A
       press on a title is noted before it moves focus, and the keyboard's
       arrival by what focus left. */
    built.addEventListener('pointerdown', function () {
      var a = document.activeElement;
      if (a && !ownsFocus(a)) returnTo = a;
    });
    bar.addEventListener('focusin', function (e) {
      var from = e.relatedTarget;
      if (!enteringBar && from && !ownsFocus(from)) returnTo = from;
    });
    built.addEventListener('click', onBarPointer);
    built.addEventListener('pointerover', onBarPointer);
    bar.addEventListener('keydown', onKey);
    panel.addEventListener('click', onPanelClick);
    panel.addEventListener('pointerover', onPanelOver);
    document.addEventListener('keydown', onShortcut);
    document.addEventListener('keydown', onAccelDown, true);
    document.addEventListener('keyup', onAccelUp, true);
    window.addEventListener('blur', function () { altArmed = false; built.classList.remove('menubar-letters'); });
    render();

    document.addEventListener('pudl:windows-change', soon);
    /* A resident applet's menus join the bar as it starts. */
    document.addEventListener('pudl:applet-start', function (e) {
      if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-applet-resident')) render(true);
    });
    document.addEventListener('pudl:windows-policy', function () { closeAll(false); render(true); });
    document.addEventListener('pudl:regions-swap', function () { render(true); });
    /* Only what can change the menus counts (0.69.3): an applet, a window
     or a page's menu coming, going, starting or being hidden. Any other
     change in the page, such as an application drawing its content, no
     longer makes the bar measure itself. */
    var MENU_SOURCES = '[data-applet], .win, [data-page-menu]';
    var concerns = function (n) { return n.nodeType === 1 && (n.matches(MENU_SOURCES) || (!!n.firstElementChild && !!n.querySelector(MENU_SOURCES))); };
    new MutationObserver(function (records) {
      if (records.some(function (r) {
        if (bar.contains(r.target)) return false;
        if (r.type === 'attributes') return r.target.matches(MENU_SOURCES);
        if (r.target.closest && r.target.closest('[data-page-menu]')) return true;
        return Array.prototype.some.call(r.addedNodes, concerns) || Array.prototype.some.call(r.removedNodes, concerns);
      })) soon();
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-applet-state', 'hidden'] });
    /* The host changes its pins list as the reader pins and unpins. */
    if (pinsSource) new MutationObserver(function () { pinsChanged = true; soon(); })
      .observe(pinsSource, { subtree: true, childList: true, characterData: true, attributes: true });
    /* Measured on the next frame, not in the observer, since measuring
       shows the full bar for a moment and that changes what is observed. */
    var measuring = 0;
    var refit = function () {
      if (measuring) return;
      measuring = requestAnimationFrame(function () {
        measuring = 0;
        var was = level;
        fitStale = true;
        fit();
        if (was !== level) render(true);
        else if (panel && panel.matches(':popover-open') && window.pudlMenu) window.pudlMenu.place(panel);
      });
    };
    var ro = window.ResizeObserver ? new ResizeObserver(refit) : null;
    var direction = new MutationObserver(refit);
    direction.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
    if (ro) ro.observe(bar);
    /* A topbar that shares its room is shared again as it changes width,
       and as a toolbar in it comes to need more room or less. */
    var top = bar.parentNode && bar.parentNode.classList && bar.parentNode.classList.contains('topbar') ? bar.parentNode : null;
    if (top) {
      direction.observe(top, { attributes: true, attributeFilter: ['dir'] });
      if (ro) ro.observe(top);
      top.addEventListener('pudl:toolbar-fit', function (e) {
        var k = e.target;
        if (k.parentNode !== top) return;
        var cs = getComputedStyle(k);
        var sig = cs.getPropertyValue('--toolbar-most') + '/' + cs.getPropertyValue('--toolbar-least');
        if (sig === k.__foldSig) return;
        k.__foldSig = sig;
        refit();
      });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
      if (panel && panel.matches(':popover-open')) return;
      var was = level;
      fitStale = true;
      fit();
      if (was !== level) render(true);
    });
  }

  window.pudlMenubar = {
    focus: function (options) { return focusBar(options); },
    /* Rows are read afresh as each menu opens, so a refresh builds the bar
       again only when its menus, titles or pins read differently (0.69.3);
       an applet may call it whenever its commands change. */
    refresh: function () { if (bar) render(); },
    /* Unfold the bar into a ribbon, or fold it back (0.79.0). */
    ribbon: function (on) { if (bar && ribbonRow) { if (on == null) return ribbonOn; setRibbon(!!on, true); } return ribbonOn; },
    /* Every key bound in the bar now: its key in PUDL's spelling and as
       shown, the row's label and title, its source and whether disabled. */
    shortcuts: function () {
      if (bar && !currentTarget()) render();
      var list = bound.map(function (b) { return Object.assign({}, b); });
      /* The window switcher's keys, which are the windows script's and not
         rows of the bar, are listed with it. */
      if (window.pudlWindows && window.pudlWindows.switcherKeys) window.pudlWindows.switcherKeys().forEach(function (k) {
        list.push({ key: k.key, shown: k.key, label: k.label, title: text('window', 'Window'), source: 'windows', disabled: false });
      });
      return list;
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
