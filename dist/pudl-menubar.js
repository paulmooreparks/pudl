/* PUDL menu bar. Load with defer, after pudl-menu.js, and after
   pudl-windows.js and pudl-applets.js if the page has them.

   An application's menu bar, in the topbar, as a Mac's is: one bar in the
   page however many windows are open, showing the menus of what the
   reader is in. It holds at most two menus. The host menu is always
   there; the host renders it as a hidden list in the bar:

     <nav class="menubar" data-menubar aria-label="Parks Computing">
       <ul data-menubar-source hidden>
         <li><img src="/logo.svg" alt=""> Parks Computing
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
   and a title, becomes a button in the bar. A plain press on it presses
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
     window and tab keys, and the editing keys. */
  var RESERVED = ['Mod+N', 'Mod+T', 'Mod+W', 'Mod+Q', 'Mod+Tab', 'Mod+Shift+N', 'Mod+Shift+T', 'Mod+Shift+W',
                  'Mod+Shift+Q', 'Mod+Shift+Tab', 'Mod+A', 'Mod+C', 'Mod+X', 'Mod+V'];

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
    Array.prototype.forEach.call(ul.children, function (li) {
      if (li.tagName !== 'LI') return;
      var nested = li.querySelector(':scope > ul');
      var cmd = li.querySelector(':scope > a, :scope > button');
      var said = words(Array.prototype.filter.call(li.childNodes, function (n) { return n !== nested; }));
      if (nested) out.push({ label: said, items: readList(nested) });
      else if (cmd) {
        var item = { label: words([cmd]), el: cmd };
        if (cmd.tagName === 'A') item.href = cmd.getAttribute('href');
        var on = cmd.getAttribute('aria-pressed') || cmd.getAttribute('aria-checked');
        if (on === 'true' || on === 'false') item.checked = on === 'true';
        if (cmd.disabled || cmd.getAttribute('aria-disabled') === 'true') item.disabled = true;
        if (cmd.hasAttribute('data-shortcut')) item.shortcut = cmd.getAttribute('data-shortcut');
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
    return { kind: 'pins', name: name, titles: [{ id: 'pins', label: name, items: commands }], pins: pins };
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
       offers, under its title (from YAVCHN's PUDL-PROPOSAL.md, B6). */
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
        titles = m.titles.map(function (t) { return { id: menuId(t.label, t.id), label: String(t.label || ''), items: normal(t.items || []) }; });
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

  function normal(list) {
    return list.map(function (c) {
      if (c === '-') return '-';
      if (c && c.heading) return { heading: String(c.heading) };
      if (!c || typeof c.label !== 'string') return null;
      var item = { label: c.label, run: c.run, disabled: !!c.disabled, danger: !!c.danger };
      if (c.checked != null) item.checked = !!c.checked;
      if (c.radio != null) item.radio = String(c.radio);
      if (c.shortcut) item.shortcut = String(c.shortcut);
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
    var all = [host, pinsMenu(), front].filter(Boolean);
    all.forEach(function (m) {
      m.titles.forEach(function (t) { check(t.items, m.name); });
      m.titles = m.titles.filter(function (t, i) { return (i === 0 && m.kind !== 'front') || t.items.some(function (c) { return c && c.label; }); });
    });
    return all.filter(function (m) { return m.titles.length; });
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
      result.push({ label: (i + 1) + '. ' + (title ? title.textContent.trim() : w.key), checked: w.key === st.top && !st.min[w.key], run: function () {
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
        if (!k || RESERVED.indexOf(k) >= 0) { warn(who + ': ' + c.shortcut + ' on "' + c.label + '" is a key a page may not take, and the command keeps no shortcut'); delete c.shortcut; }
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
      if (c.owner) {
        var root = c.owner.applet ? c.owner.applet.root : c.owner.scope.scope;
        if (!sameSource(c.owner, findFront()) || (root !== document && !root.contains(document.activeElement))) continue;
      }
      if (c.shortcut === k) return c;
      if (c.items) { var f = findShortcut(c.items, k); if (f) return f; }
    }
    return null;
  }

  function onShortcut(e) {
    if (e.defaultPrevented || e.isComposing || !bar || !built) return;
    if (/^(Control|Shift|Alt|Meta)$/.test(e.key)) return;
    var k = comboOf(e);
    var plain = k.indexOf('+') < 0 || /^Shift\+.$/.test(k);
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
    if (t.id) b.setAttribute('data-menu-id', t.id);
    if (t.content) t.content.forEach(function (n) { b.appendChild(n.cloneNode(true)); });
    else b.textContent = t.label;
    if (t.content) b.classList.add('menubar-brand');
    b._menu = { menu: m, title: t };
    return b;
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

  function render() {
    if (!bar) return;
    closeAll(false);
    frontSrc = findFront();
    menuScope = frontScope();
    menus = assemble();
    var focusedIndex = -1;
    if (built && built.contains(document.activeElement)) focusedIndex = titles().indexOf(document.activeElement);
    built.textContent = '';

    /* The full bar: each menu a raised group, its glyph first. */
    menus.forEach(function (m) {
      var g = el('div', 'menubar-menu' + (m.kind === 'front' ? ' menubar-front' : m.kind === 'pins' ? ' menubar-pins' : ''), { role: 'group', 'aria-label': m.name });
      var glyph = el('button', 'menubar-glyph', { type: 'button', tabindex: '-1', role: 'menuitem', 'aria-label': m.name, 'aria-haspopup': 'menu', 'aria-expanded': 'false' });
      /* Open after the pointer gesture, so popover light dismiss cannot
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

    fit();
    var list = titles();
    var keep = list[Math.max(0, Math.min(focusedIndex, list.length - 1))] || list[0];
    list.forEach(function (t) { t.tabIndex = t === keep ? 0 : -1; });
    var key = bar.getAttribute('data-menubar-key');
    if (key !== '' && list[0]) list[0].setAttribute('accesskey', key || 'm');
    if (focusedIndex >= 0 && keep) keep.focus();
  }

  /* Whether the full bar fits, measured with it showing, in one pass, so
     nothing is painted in between. */
  /* First the pins' buttons give way to Items, all together; then, if
     the bar still does not fit, it collapses to one menu. */
  function fit() {
    built.classList.remove('menubar-collapsed', 'menubar-pins-collapsed');
    var room = bar.getBoundingClientRect().width;
    var pinsCollapsed = false;
    needed = width();
    if (needed > room + 0.5 && built.querySelector('.menubar-pin')) {
      built.classList.add('menubar-pins-collapsed');
      pinsCollapsed = true;
      needed = width();
    }
    collapsed = needed > room + 0.5;
    level = collapsed ? 2 : pinsCollapsed ? 1 : 0;
    built.classList.toggle('menubar-pins-collapsed', pinsCollapsed && !collapsed);
    built.classList.toggle('menubar-collapsed', collapsed);
  }

  function width() {
    var groups = built.querySelectorAll('.menubar-menu:not(.menubar-one)');
    var gap = parseFloat(getComputedStyle(built).columnGap) || 0;
    return Array.prototype.reduce.call(groups, function (s, g) { return s + g.getBoundingClientRect().width; }, 0) + gap * Math.max(0, groups.length - 1);
  }

  /* === Panels ============================================================ */

  function ensurePanel() {
    if (panel) return;
    panel = el('div', 'menu-panel menubar-panel', { popover: '', role: 'menu', id: 'menubar-panel' });
    panel.addEventListener('toggle', function (e) {
      if (e.newState === 'closed' && openTitle) {
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
    }
    var label = el('span', 'menubar-label');
    label.textContent = c.label;
    r.appendChild(label);
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
        var r = row({ label: t.label, items: t.items });
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
    if (!currentTarget()) { render(); return; }
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
    if ((fromMenu && !currentTarget()) || (c.owner && !sameSource(c.owner, findFront()))) { render(); return; }
    var scopeEl = c.owner ? c.owner.scope.scope : document;
    if (fromMenu) {
      closeAll(false);
      if (returnTo && returnTo.isConnected && returnTo !== document.body) returnTo.focus({ preventScroll: true });
      else if (document.activeElement && built.contains(document.activeElement)) document.activeElement.blur();
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
      } else if (e.key === 'Escape' && openTitle) {
        e.preventDefault();
        closeAll(true);
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
      /* A letter moves to the next row whose words start with it. */
      var ch = e.key.toLowerCase();
      var i = rows.indexOf(r);
      for (var k = 1; k <= rows.length; k++) {
        var cand = rows[(i + k) % rows.length];
        if ((cand.textContent || '').trim().toLowerCase().charAt(0) === ch) { e.preventDefault(); cand.focus(); break; }
      }
    }
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
      if (pinsChanged) { pinsChanged = false; render(); return; }
      var wasLevel = level;
      fit();
      if (wasLevel !== level) render();
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
    /* Where focus was before the bar, which a command gives it back to. A
       press on a title is noted before it moves focus, and the keyboard's
       arrival by what focus left. */
    built.addEventListener('pointerdown', function () {
      var a = document.activeElement;
      if (a && !bar.contains(a)) returnTo = a;
    });
    bar.addEventListener('focusin', function (e) {
      var from = e.relatedTarget;
      if (from && !bar.contains(from)) returnTo = from;
    });
    built.addEventListener('click', onBarPointer);
    built.addEventListener('pointerover', onBarPointer);
    bar.addEventListener('keydown', onKey);
    panel.addEventListener('click', onPanelClick);
    panel.addEventListener('pointerover', onPanelOver);
    document.addEventListener('keydown', onShortcut);
    render();

    document.addEventListener('pudl:windows-change', soon);
    document.addEventListener('pudl:windows-policy', function () { closeAll(false); render(); });
    document.addEventListener('pudl:regions-swap', function () { render(); });
    new MutationObserver(function (records) {
      if (records.some(function (r) { return !bar.contains(r.target); })) soon();
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-applet-state', 'hidden'] });
    /* The host changes its pins list as the reader pins and unpins. */
    if (pinsSource) new MutationObserver(function () { pinsChanged = true; soon(); })
      .observe(pinsSource, { subtree: true, childList: true, characterData: true, attributes: true });
    /* Measured on the next frame, not in the observer, since measuring
       shows the full bar for a moment and that changes what is observed. */
    var measuring = 0;
    if (window.ResizeObserver) new ResizeObserver(function () {
      if (measuring) return;
      measuring = requestAnimationFrame(function () {
        measuring = 0;
        if (panel && panel.matches(':popover-open')) return;
        var was = level;
        fit();
        if (was !== level) render();
      });
    }).observe(bar);
  }

  window.pudlMenubar = { refresh: function () { if (bar) render(); } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
