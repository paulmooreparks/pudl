/* PUDL commands (preview, docs/proposals/toolbar-commands.md). Load with
   defer, before pudl-toolbar.js and pudl-applets.js.

   A command is declared once, with an id, and every control and menu row
   that shows it takes its words, glyph, key and state from it:

     pudlCommands.register(scope, function () { return [
       { id: 'bold', label: 'Bold', glyph: 'bold', shortcut: 'Mod+B',
         checked: function () { … }, run: function () { … } },
       …
     ]; });

   scope is the element the commands belong to: an applet's mount, a
   window, or document.body for a page. A command's fields are id, label,
   glyph, shortcut, run(value), disabled, reason, checked, choice, value,
   items, danger, badge, hidden, current and action, and every field but
   id may be a function, read each time the command is drawn. Whatever
   changes a command's state calls pudlCommands.changed(), and every
   control is drawn again once in the next frame; a menu is drawn afresh
   as it opens, so it is never stale.

   A control names its command with data-command and is filled from it:

     <button type="button" data-command="bold"></button>

   gets the glyph, the words in a .toolbar-words span, the accessible name,
   a tooltip with the key, disabled, aria-pressed for a command that
   switches, and the click. A control that already has content keeps it.
   A command with items becomes a menu button with a panel of its items.
   <div class="seg sm" data-command-choice="view"></div> fills a segmented
   control with every command whose choice is "view".

   Its keys work while focus is in its scope, unless something else took
   the key first.

   For agents (chapter 1 of the specification, "Agents"):
     pudlCommands.list(el)        every command in el's scope and the
                                  scopes around it, as plain data with its
                                  state now and whether a toolbar shows it
     pudlCommands.run(id, value, el)
                                  runs it as pressing it would; a promise
                                  that rejects with its reason when it is
                                  disabled or hidden */
(function () {
  'use strict';

  var scopes = new Map();   // element -> function returning the commands
  var frame = 0, uid = 0;

  function val(cmd, field) {
    var v = cmd[field];
    return typeof v === 'function' && field !== 'run' ? v.call(cmd) : v;
  }

  /* === The index ==========================================================
     A scope's table is asked for once per task and indexed by id (0.69.3):
     drawing every control, answering a key, building a menu or listing
     the commands each looks commands up many times, and asking the table
     each time ran the application's commandTable() once a control and
     searched it from the top. The index is dropped once the task is done,
     and at once when a command runs, a scope is registered or something
     calls changed, so it never outlives the state it was built from. */
  var pass = null;          // Map: a scope's table function -> { list, byId, flat }
  function index(scope) {
    var get = scopes.get(scope);
    if (!get) return { list: [], byId: new Map(), flat: [] };
    if (!pass) { pass = new Map(); Promise.resolve().then(function () { pass = null; }); }
    var hit = pass.get(get);
    if (hit) return hit;
    var list;
    try { list = get(); } catch (err) { if (window.console) console.warn('pudl-commands:', err); }
    if (!Array.isArray(list)) list = [];
    var byId = new Map(), flatList = [];
    /* Depth first, a command before its items, so the first of an id
       found is the one a search from the top would find. */
    (function walk(arr) {
      arr.forEach(function (c) {
        if (!c || typeof c !== 'object') return;
        if (typeof c.id === 'string' && !byId.has(c.id)) byId.set(c.id, c);
        flatList.push(c);
        var items = val(c, 'items');
        if (Array.isArray(items)) walk(items.filter(function (x) { return x && typeof x === 'object'; }));
      });
    })(list);
    hit = { list: list, byId: byId, flat: flatList };
    pass.set(get, hit);
    return hit;
  }
  function forget() { pass = null; }

  function tableOf(scope) { return index(scope).list; }

  /* The scopes around el, nearest first, ending at the page. */
  function chain(el) {
    var out = [];
    for (var n = el && el.nodeType === 1 ? el : document.body; n; n = n.parentElement) if (scopes.has(n)) out.push(n);
    if (scopes.has(document.documentElement) && out.indexOf(document.documentElement) < 0) out.push(document.documentElement);
    return out;
  }

  function find(id, el) {
    var list = chain(el);
    for (var i = 0; i < list.length; i++) {
      var hit = index(list[i]).byId.get(id);
      if (hit) return { cmd: hit, scope: list[i] };
    }
    return null;
  }

  /* A command's items, with ids looked up in the scope. */
  function itemsOf(cmd, el) {
    var items = val(cmd, 'items');
    if (!Array.isArray(items)) return null;
    return items.map(function (x) {
      if (typeof x === 'string' && x !== '-') { var f = find(x, el); return f ? f.cmd : null; }
      return x;
    }).filter(Boolean);
  }

  function shown(s) { return String(s || '').split('+').map(function (p) { return p === 'Mod' ? (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl') : p; }).join('+'); }

  function glyphEl(name) {
    var g = document.createElement('span');
    g.className = 'glyph';
    g.setAttribute('aria-hidden', 'true');
    g.style.setProperty('--glyph', 'var(--glyph-' + name + ')');
    return g;
  }

  /* === Running ============================================================ */

  /* A command without run that names an action runs the action, with the
     input its input field gives. Pressed by a person, it holds every
     capability, since the person chose it; run by a script or an agent
     through pudlCommands.run, it holds only the grant it is given. */
  function runCmd(cmd, value, opts) {
    if (val(cmd, 'hidden')) return Promise.reject(new Error((val(cmd, 'label') || cmd.id) + ' is not available here'));
    if (val(cmd, 'disabled')) return Promise.reject(new Error(val(cmd, 'reason') || (val(cmd, 'label') || cmd.id) + ' cannot run now'));
    if (typeof cmd.run !== 'function') {
      var action = val(cmd, 'action');
      if (action && window.pudlApplets && window.pudlApplets.run) {
        opts = opts || { grant: 'all', owner: { kind: 'person' } };
        var input = val(cmd, 'input');
        return window.pudlApplets.run(action, input == null ? {} : input, opts).then(function (r) { changed(); return r; });
      }
      return Promise.reject(new Error((val(cmd, 'label') || cmd.id) + ' has nothing to run'));
    }
    /* What it ran may change the table, so the index goes with it. */
    try { var r = cmd.run(value); forget(); return Promise.resolve(r).then(function (v) { changed(); return v; }); }
    catch (err) { forget(); return Promise.reject(err); }
  }

  /* === Controls =========================================================== */

  /* A tone colours a command's control and row with a status colour and
     nothing else (0.69.0). Colour is never the only signal, so a toned
     command without a glyph of its own takes the status's glyph. */
  var TONES = { danger: 'stop', warn: 'warning', positive: 'check' };
  function toneOf(cmd) { var t = val(cmd, 'tone'); return Object.prototype.hasOwnProperty.call(TONES, t) ? t : null; }
  function glyphOf(cmd) {
    return val(cmd, 'glyph') || (val(cmd, 'danger') ? 'warning' : null) || (toneOf(cmd) ? TONES[toneOf(cmd)] : null);
  }
  /* A command opens a menu when it has items or draws its own panel. */
  function opensMenu(cmd, el) { return !!itemsOf(cmd, el) || typeof cmd.panel === 'function'; }

  /* Drawing touches the page only where something changed (0.69.3): an
     attribute is set only when its value differs, and a control's glyph,
     words and badge are built again only when one of them differs. Every
     change to the page wakes whatever watches it, and a toolbar measures
     itself again after a change, so a redraw that changes nothing must
     leave nothing changed. touched says whether a drawing changed any. */
  var touched = false;
  function attr(el, name, value) {
    if (value == null || value === false) { if (el.hasAttribute(name)) { el.removeAttribute(name); touched = true; } return; }
    value = value === true ? '' : String(value);
    if (el.getAttribute(name) !== value) { el.setAttribute(name, value); touched = true; }
  }
  function prop(el, name, value) { if (el[name] !== value) { el[name] = value; touched = true; } }

  function fill(ctl) {
    var f = find(ctl.getAttribute('data-command'), ctl);
    if (!f) return;
    var cmd = f.cmd, label = val(cmd, 'label') || cmd.id, glyph = glyphOf(cmd);
    var items = itemsOf(cmd, ctl), menu = opensMenu(cmd, ctl);
    if (!ctl.hasAttribute('data-command-own') && !ctl.__pudlFilled && ctl.childNodes.length) ctl.setAttribute('data-command-own', '');
    var own = ctl.hasAttribute('data-command-own');
    var badge = val(cmd, 'badge');
    if (!own) {
      var words = items && val(cmd, 'current') ? val(cmd, 'current') : label.replace(/…$/, '');
      var sig = (glyph || '') + '\n' + words + '\n' + (badge == null ? '' : badge);
      if (ctl.__pudlSig !== sig) {
        ctl.__pudlSig = sig;
        ctl.__pudlFilled = true;
        touched = true;
        ctl.textContent = '';
        if (glyph) ctl.appendChild(glyphEl(glyph));
        var w = document.createElement('span');
        w.className = 'toolbar-words';
        w.textContent = words;
        ctl.appendChild(w);
        if (badge != null && badge !== '') {
          var b = document.createElement('span');
          b.className = 'toolbar-badge';
          b.textContent = String(badge);
          ctl.appendChild(b);
        }
      }
      if (!ctl.classList.contains('btn') && !ctl.classList.contains('icon-btn')) { ctl.classList.add('btn', 'btn-sm'); touched = true; }
    }
    var key = val(cmd, 'shortcut'), detail = val(cmd, 'detail');
    /* The name a screen reader hears carries the badge, as the eye sees it. */
    attr(ctl, 'aria-label', label.replace(/…$/, '') + (items && val(cmd, 'current') ? ': ' + val(cmd, 'current') : '') +
      (badge != null && badge !== '' ? ', ' + badge : ''));
    var title = val(cmd, 'disabled') && val(cmd, 'reason') ? label + ': ' + val(cmd, 'reason') : label + (key ? ' (' + shown(key) + ')' : '') + (detail ? '\n' + detail : '');
    attr(ctl, 'title', title);
    attr(ctl, 'aria-keyshortcuts', key ? key.replace(/Mod/g, 'Control') : null);
    prop(ctl, 'disabled', !!val(cmd, 'disabled'));
    attr(ctl, 'data-tone', toneOf(cmd));
    prop(ctl, 'hidden', !!val(cmd, 'hidden'));
    /* A menu button's wrapper goes with it, so it leaves no gap. */
    if (ctl.parentElement && ctl.parentElement.classList.contains('menu') && ctl.parentElement.children[0] === ctl) prop(ctl.parentElement, 'hidden', ctl.hidden);
    var danger = !!val(cmd, 'danger') && ctl.classList.contains('btn');
    if (ctl.classList.contains('btn-danger') !== danger) { ctl.classList.toggle('btn-danger', danger); touched = true; }
    var checked = val(cmd, 'checked');
    attr(ctl, 'aria-pressed', checked != null && !menu ? String(!!checked) : null);
    if (menu && !ctl.__pudlMenu) { menuFor(ctl, cmd); touched = true; }
    if (!ctl.__pudlBound) {
      ctl.__pudlBound = true;
      ctl.addEventListener('mousedown', function (e) { if (ctl.closest('.toolbar')) e.preventDefault(); });
      ctl.addEventListener('click', function () {
        var now = find(ctl.getAttribute('data-command'), ctl);
        if (now && !opensMenu(now.cmd, ctl)) runCmd(now.cmd, ctl.getAttribute('data-command-value') || undefined).catch(function () {});
      });
    }
  }

  /* A command's own content in a menu: panel(container) draws into the
     container each time the menu opens (0.69.0), such as a grid of
     swatches or a searchable list. */
  function drawPanel(cmd, container) {
    try { cmd.panel(container); } catch (err) { if (window.console) console.warn('pudl-commands: ' + cmd.id + '.panel():', err); }
  }

  /* A command with items is a menu button: its panel is made beside it
     once, and its rows are drawn as it opens. */
  var commandMenus = [];
  function menuFor(ctl, cmd) {
    if (ctl.__pudlMenu) return;
    var wrap = ctl.parentElement && ctl.parentElement.classList.contains('menu') ? ctl.parentElement : null;
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'menu';
      ctl.parentNode.insertBefore(wrap, ctl);
      wrap.appendChild(ctl);
    }
    var panel = document.createElement('div');
    panel.className = 'menu-panel';
    panel.id = 'pudl-cmd-menu-' + (++uid);
    panel.setAttribute('popover', '');
    wrap.appendChild(panel);
    ctl.classList.add('menu-btn');
    ctl.setAttribute('popovertarget', panel.id);
    ctl.__pudlMenu = panel;
    var m = { ctl: ctl, panel: panel, bar: ctl.closest('.toolbar, [role=toolbar]'), focusIn: false };
    commandMenus.push(m);
    panel.addEventListener('focusin', function () { m.focusIn = true; });
    /* Focus leaving with the menu itself, as when its host takes it out of
       the page, still counts as in it, so it can be given to the toolbar. */
    panel.addEventListener('focusout', function (e) {
      if (e.relatedTarget) { if (!panel.contains(e.relatedTarget)) m.focusIn = false; return; }
      queueMicrotask(function () { if (panel.isConnected && !panel.contains(document.activeElement)) m.focusIn = false; });
    });
    panel.addEventListener('beforetoggle', function (e) {
      if (e.newState !== 'open') return;
      var now = find(ctl.getAttribute('data-command'), ctl);
      panel.textContent = '';
      if (!now) return;
      if (typeof now.cmd.panel === 'function') drawPanel(now.cmd, panel);
      else rows(panel, itemsOf(now.cmd, ctl) || [], ctl);
    });
  }

  /* Menu rows for commands: the glyph, the words, the key, a tick or a
     radio for a command that switches or chooses, the badge or the reason
     as a second line, a heading before each set of choices. */
  function rows(panel, cmds, el, onRun, keepPanels) {
    var lastChoice = null;
    cmds.forEach(function (c) {
      if (c === '-') { var hr = document.createElement('hr'); hr.className = 'menu-sep'; panel.appendChild(hr); lastChoice = null; return; }
      if (val(c, 'hidden')) return;
      if (c.heading) { var hd = document.createElement('div'); hd.className = 'md-section-label'; hd.textContent = c.heading; panel.appendChild(hd); return; }
      var choice = val(c, 'choice');
      if (choice && choice !== lastChoice && c.choiceLabel) {
        var h = document.createElement('div');
        h.className = 'md-section-label';
        h.textContent = c.choiceLabel;
        panel.appendChild(h);
      }
      lastChoice = choice || null;
      /* A command with a panel of its own draws it under its name, in
         place, as a folded group's menu shows a command's items. */
      if (typeof c.panel === 'function') {
        var ph = document.createElement('div');
        ph.className = 'md-section-label';
        ph.textContent = val(c, 'label') || c.id;
        var box = document.createElement('div');
        box.className = 'menu-command-panel';
        box._pudlPanelOf = c;
        panel.append(ph, box);
        /* Drawn again for an open menu, a panel already there is kept as
           the reader has it (redrawOpenMenus); only a new one is drawn. */
        if (!keepPanels) drawPanel(c, box);
        return;
      }
      panel.appendChild(row(c, el, onRun));
    });
  }

  function row(c, el, onRun) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'menu-action';
    b._pudlCommand = c;
    b._pudlScope = el;
    var checked = val(c, 'checked'), choice = val(c, 'choice');
    if (checked != null) {
      b.setAttribute('role', choice ? 'menuitemradio' : 'menuitemcheckbox');
      b.setAttribute('aria-pressed', String(!!checked));
      b.setAttribute('aria-checked', String(!!checked));
    } else {
      var g = glyphOf(c);
      if (g) b.appendChild(glyphEl(g));
    }
    if (toneOf(c)) b.setAttribute('data-tone', toneOf(c));
    var words = document.createElement('span');
    words.className = 'menu-words';
    words.textContent = val(c, 'label') || c.id;
    /* The second line: why it is disabled, else what it does, else its badge. */
    var second = val(c, 'disabled') && val(c, 'reason') ? val(c, 'reason') : val(c, 'detail') ? String(val(c, 'detail')) : (val(c, 'badge') != null ? String(val(c, 'badge')) : null);
    if (second) {
      var box = document.createElement('span');
      box.className = 'menu-row-text';
      var d = document.createElement('span');
      d.className = 'menu-row-detail';
      d.textContent = second;
      box.append(words, d);
      b.appendChild(box);
    } else b.appendChild(words);
    var key = val(c, 'shortcut');
    if (key) { var k = document.createElement('span'); k.className = 'menu-row-key'; k.textContent = shown(key); b.appendChild(k); }
    if (val(c, 'danger')) b.classList.add('danger');
    if (val(c, 'disabled')) b.setAttribute('aria-disabled', 'true');
    /* The row runs its command as it is now: a menu kept open through an
       update gives the row the command read then (redrawOpenMenus). */
    b.addEventListener('click', function () {
      var cur = b._pudlCommand || c;
      if (val(cur, 'disabled')) return;
      var panel = b.closest('[popover]');
      if (panel && panel.hidePopover) panel.hidePopover();
      if (onRun) onRun(cur); else runCmd(cur, val(cur, 'value')).catch(function () {});
    });
    return b;
  }

  /* A segmented control of a choice: one button per command in it. */
  function fillChoice(seg) {
    var name = seg.getAttribute('data-command-choice');
    var list = chain(seg).reduce(function (all, s) { return all.concat(index(s).flat); }, []).filter(function (c) { return val(c, 'choice') === name && !val(c, 'hidden'); });
    if (!seg.classList.contains('seg')) { seg.classList.add('seg', 'sm'); touched = true; }
    attr(seg, 'role', 'group');
    prop(seg, 'hidden', !list.length);
    if (!seg.hasAttribute('aria-label') && list[0] && list[0].choiceLabel) attr(seg, 'aria-label', list[0].choiceLabel);
    var have = Array.prototype.map.call(seg.children, function (b) { return b.getAttribute('data-command'); }).join();
    if (have !== list.map(function (c) { return c.id; }).join()) {
      touched = true;
      seg.textContent = '';
      list.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-command', c.id);
        seg.appendChild(b);
      });
    }
    Array.prototype.forEach.call(seg.children, function (b) {
      var f = find(b.getAttribute('data-command'), b);
      if (!f) return;
      var label = String(val(f.cmd, 'label'));
      var glyph = glyphOf(f.cmd), sig = (glyph || '') + '\n' + label;
      if (b.__pudlChoiceSig !== sig) {
        b.__pudlChoiceSig = sig;
        b.textContent = '';
        if (glyph) b.appendChild(glyphEl(glyph));
        var words = document.createElement('span');
        words.className = 'toolbar-words';
        words.textContent = label;
        b.appendChild(words);
        touched = true;
      }
      attr(b, 'aria-label', label);
      attr(b, 'title', label);
      attr(b, 'aria-pressed', String(!!val(f.cmd, 'checked')));
      prop(b, 'disabled', !!val(f.cmd, 'disabled'));
      if (!b.__pudlBound) {
        b.__pudlBound = true;
        b.addEventListener('click', function () { var now = find(b.getAttribute('data-command'), b); if (now) runCmd(now.cmd).catch(function () {}); });
      }
    });
  }


  /* A toolbar group of commands with nothing to show leaves the row, and
     comes back when one of them shows (0.68.1), so the folding counts only
     what is there. A group in hand-written markup with no command in it
     is left alone. */
  function emptyGroups(root) {
    (root || document).querySelectorAll('.toolbar-group').forEach(function (g) {
      var parts = Array.prototype.filter.call(g.querySelectorAll('[data-command], [data-command-choice]'), function (c) {
        return !c.closest('.toolbar-fold') && !(c.parentElement && c.parentElement.closest('[data-command-choice]'));
      });
      if (!parts.length) return;
      var any = parts.some(function (c) { return !c.hidden; });
      if (g.hidden === any) { g.hidden = !any; touched = true; }
    });
  }

  /* pudl:commands-change fires after every drawing, and its detail.changed
     says whether the drawing changed the page, so a toolbar measures
     itself again only when it did. */
  /* A command menu open while its commands change stays open and is drawn
     again in place, so its ticks, words and disabled rows are current and
     each row runs its command as it is now. Focus on a row stays on it
     while its command is there and enabled; when that command has gone or
     been disabled, focus moves to the menu's first enabled row, then to
     the menu's button, never to a row that has left the page. A command's
     own panel, such as a search field, is kept as the reader has it, with
     its input, caret and selection, while the rows around it are brought
     up to date; a panel that comes while the menu is open is drawn, one
     that goes is removed. When the menu's command goes, is disabled or
     hidden, or its button leaves the page, the menu closes, and focus that
     was in it goes to its button or to another enabled control of its
     toolbar. */
  function openRows(panel) {
    return Array.prototype.filter.call(panel.querySelectorAll(':scope > .menu-action'), function (r) { return r.getClientRects().length > 0; });
  }
  function enabledRow(r) { return !!r && r.isConnected && r.getAttribute('aria-disabled') !== 'true' && !r.disabled && r.getClientRects().length > 0; }
  /* A control that can still be used: in the page, shown, enabled, and
     if it is a command's control, its command still registered. A button
     whose command has gone is left in the page by its host but does
     nothing, so focus is never given to it. */
  function usable(n) {
    if (!n || !n.isConnected || n.hidden || n.disabled || n.getAttribute('aria-disabled') === 'true' || !n.getClientRects().length) return false;
    var id = n.getAttribute('data-command');
    return !id || !!find(id, n);
  }
  function spareIn(m) {
    if (usable(m.ctl)) return m.ctl;
    var bar = m.bar && m.bar.isConnected ? m.bar : null;
    return bar ? Array.prototype.filter.call(bar.querySelectorAll('button, a[href], input, select, [tabindex]:not([tabindex="-1"])'), function (n) {
      return !n.closest('[popover]') && usable(n);
    })[0] || null : null;
  }
  /* Focus moved by the script to a row it chose, shown: a panel whose rows
     changed has its scroll put back by pudl-menu.js once this task is done
     (__pudlKeepScroll), so the row is brought into sight after that. */
  function focusShown(n) {
    n.focus({ preventScroll: true });
    queueMicrotask(function () { if (document.activeElement === n && n.scrollIntoView) n.scrollIntoView({ block: 'nearest' }); });
  }
  function redrawOpenMenus() {
    commandMenus.forEach(function (m) {
      var panel = m.panel, ctl = m.ctl;
      /* The menu left the page with focus in it: focus goes to a control
         of its toolbar still there. */
      if (!panel.isConnected) {
        if (m.focusIn) {
          m.focusIn = false;
          var a0 = document.activeElement;
          if (!a0 || a0 === document.body) { var s0 = spareIn(m); if (s0) focusShown(s0); }
        }
        return;
      }
      if (!panel.matches(':popover-open')) return;
      var now = ctl.isConnected ? find(ctl.getAttribute('data-command'), ctl) : null, list = now && itemsOf(now.cmd, ctl);
      if (!now || !opensMenu(now.cmd, ctl) || !ctl.isConnected || ctl.hidden || ctl.disabled) {
        var inside = panel.contains(document.activeElement) || m.focusIn;
        panel.hidePopover();
        m.focusIn = false;
        var a1 = document.activeElement;
        if (!inside || (a1 && a1 !== document.body && !panel.contains(a1) && a1 !== ctl)) return;
        var spare = spareIn(m);
        if (spare) focusShown(spare);
        return;
      }
      if (typeof now.cmd.panel === 'function') return;
      var fresh = document.createElement('div');
      rows(fresh, list, ctl, null, true);
      var a = document.activeElement, had = panel.contains(a);
      if (!reconcileRows(panel, Array.prototype.slice.call(fresh.childNodes))) return;
      touched = true;
      a = document.activeElement;
      if (!had || (a && a !== document.body && !panel.contains(a))) return;
      if (panel.contains(a) && (!a.classList.contains('menu-action') || enabledRow(a))) return;
      var target = openRows(panel).filter(enabledRow)[0] || spareIn(m);
      if (target) focusShown(target);
    });
    commandMenus = commandMenus.filter(function (m) { return m.ctl.isConnected || m.panel.isConnected; });
    refreshOtherRows();
  }
  /* Rows of commands drawn by pudlCommands.rows into any other popup, such
     as a folded toolbar group's menu, stay current while it is open: each
     row's words and state follow its command, a row whose command has gone
     or been hidden is removed, and focus on a row that went or was
     disabled moves to the popup's first enabled row. Rows added to the
     commands while it is open show when it next opens, as its owner draws
     it then. */
  function refreshOtherRows() {
    var mine = new Set(commandMenus.map(function (m) { return m.panel; }));
    Array.prototype.forEach.call(document.querySelectorAll('[popover]'), function (pop) {
      if (mine.has(pop) || !pop.matches(':popover-open')) return;
      var rs = Array.prototype.filter.call(pop.querySelectorAll(':scope > .menu-action'), function (r) { return r._pudlCommand && r._pudlCommand.id; });
      if (!rs.length) return;
      var a = document.activeElement, had = pop.contains(a), changed = false;
      rs.forEach(function (o) {
        var f = find(o._pudlCommand.id, o._pudlScope || o);
        if (!f || val(f.cmd, 'hidden')) { o.remove(); changed = true; return; }
        if (syncRow(o, row(f.cmd, o._pudlScope))) changed = true;
      });
      if (!changed) return;
      touched = true;
      a = document.activeElement;
      if (!had || (a && a !== document.body && !pop.contains(a))) return;
      if (pop.contains(a) && (!a.classList.contains('menu-action') || enabledRow(a))) return;
      var target = openRows(pop).filter(enabledRow)[0];
      if (target) focusShown(target);
    });
  }
  /* A row brought to a freshly drawn one in place; whether it changed. */
  function syncRow(o, f) {
    var changed = false;
    Array.prototype.slice.call(f.attributes).forEach(function (at) { if (o.getAttribute(at.name) !== at.value) { o.setAttribute(at.name, at.value); changed = true; } });
    Array.prototype.slice.call(o.attributes).forEach(function (at) { if (!f.hasAttribute(at.name) && !/^(id|tabindex)$/.test(at.name)) { o.removeAttribute(at.name); changed = true; } });
    if (o.innerHTML !== f.innerHTML) { o.replaceChildren.apply(o, Array.prototype.slice.call(f.childNodes)); changed = true; }
    o._pudlCommand = f._pudlCommand;
    o._pudlScope = f._pudlScope;
    return changed;
  }
  /* The open panel's nodes brought to fresh in place: a row whose command
     is still there is the same element, its words and state updated, so
     focus on it and the scroll stay; a command's own panel is kept as it
     is; separators and headings are matched in order. A node holding focus
     is never moved, since moving an element takes focus from it; the nodes
     around it move instead. Whether anything changed. */
  function reconcileRows(panel, fresh) {
    var olds = Array.prototype.slice.call(panel.childNodes), used = new Set(), wanted = [], made = [], changed = false;
    function kind(n) {
      if (n.nodeType !== 1) return '#';
      if (n._pudlCommand) return 'row:' + n._pudlCommand.id;
      if (n._pudlPanelOf) return 'panel:' + n._pudlPanelOf.id;
      return n.tagName + ':' + n.className + ':' + (n.classList.contains('md-section-label') ? n.textContent : '');
    }
    fresh.forEach(function (f) {
      var k = kind(f), o = olds.filter(function (x) { return !used.has(x) && kind(x) === k; })[0];
      if (!o) { wanted.push(f); made.push(f); return; }
      used.add(o);
      if (o.nodeType === 1 && o._pudlCommand && syncRow(o, f)) changed = true;
      if (o.nodeType === 1 && o._pudlPanelOf) o._pudlPanelOf = f._pudlPanelOf;
      wanted.push(o);
    });
    var gone = olds.filter(function (o) { return !used.has(o); });
    var kept = olds.filter(function (o) { return used.has(o); });
    var moved = made.length > 0 || !kept.every(function (o, i) { return o === wanted[i]; });
    if (!gone.length && !moved) return changed;
    panel.__pudlKeepScroll = panel.scrollTop;
    gone.forEach(function (o) { o.remove(); });
    if (moved) {
      var a = document.activeElement, pin = wanted.findIndex(function (n) { return n === a || (n.nodeType === 1 && n.contains(a)); });
      if (pin < 0) wanted.forEach(function (n, i) { var at = i ? wanted[i - 1].nextSibling : panel.firstChild; if (n !== at) panel.insertBefore(n, at); });
      else {
        for (var i = pin - 1; i >= 0; i--) if (wanted[i].nextSibling !== wanted[i + 1]) panel.insertBefore(wanted[i], wanted[i + 1]);
        for (var j = pin + 1; j < wanted.length; j++) if (wanted[j - 1].nextSibling !== wanted[j]) panel.insertBefore(wanted[j], wanted[j - 1].nextSibling);
      }
    }
    made.forEach(function (n) { if (n.nodeType === 1 && n._pudlPanelOf) drawPanel(n._pudlPanelOf, n); });
    return true;
  }

  function draw(root) {
    touched = false;
    (root || document).querySelectorAll('[data-command-choice]').forEach(fillChoice);
    (root || document).querySelectorAll('[data-command]').forEach(function (c) { if (!c.closest('[data-command-choice]')) fill(c); });
    emptyGroups(root);
    redrawOpenMenus();
    document.dispatchEvent(new CustomEvent('pudl:commands-change', { detail: { changed: touched } }));
  }

  /* The controls are drawn again once the current task is done, however
     many times it calls changed (0.69.1). An animation frame was used
     before, but a browser runs none in a hidden tab and few in a headless
     one, so a script or an agent reading a control's state just after
     running a command could find the old state. */
  function changed() {
    forget();
    if (frame) return;
    frame = 1;
    Promise.resolve().then(function () { frame = 0; draw(); });
  }

  /* === Keys =============================================================== */

  function spelling(e) {
    var mods = [];
    if (e.ctrlKey || e.metaKey) mods.push('Mod');
    if (e.altKey) mods.push('Alt');
    if (e.shiftKey) mods.push('Shift');
    var k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    return mods.concat(k).join('+');
  }
  function normal(s) {
    var parts = String(s).split('+'), key = parts.pop();
    var m = { mod: false, alt: false, shift: false };
    parts.forEach(function (p) { var l = p.toLowerCase(); m[l === 'ctrl' || l === 'cmd' || l === 'meta' ? 'mod' : l] = true; });
    return (m.mod ? 'Mod+' : '') + (m.alt ? 'Alt+' : '') + (m.shift ? 'Shift+' : '') + (key.length === 1 ? key.toUpperCase() : key);
  }

  /* The scopes a key goes to when nothing is focused (0.96.7): the page's
     focus is on the body after a window is activated by its title bar, a
     fullscreen show ends or a page is drawn, and the chain from the body
     holds only the page's scopes, so a window's applet never saw its key.
     The front window's scopes come first then, or, on a page with no
     window layer and one applet, that applet's; two applets and nothing
     focused is no one's key. */
  function unfocusedScopes() {
    var front = document.querySelector('.win.active');
    var within = [], tables = new Set();
    scopes.forEach(function (get, s) {
      if (s === document.body || s === document.documentElement) return;
      if (front ? front.contains(s) : !document.querySelector('[data-win-layer]')) { within.push(s); tables.add(get); }
    });
    return front || tables.size === 1 ? within : [];
  }

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.repeat || document.querySelector('dialog:modal')) return;
    var pressed = spelling(e), el = document.activeElement || document.body;
    var list = chain(el);
    if (el === document.body || el === document.documentElement) list = unfocusedScopes().concat(list);
    for (var i = 0; i < list.length; i++) {
      var cmds = index(list[i]).flat;
      for (var j = 0; j < cmds.length; j++) {
        var key = val(cmds[j], 'shortcut');
        /* bind: false shows a key that something else binds (0.69.0). */
        if (key && normal(key) === pressed && !val(cmds[j], 'hidden') && val(cmds[j], 'bind') !== false) {
          e.preventDefault();
          runCmd(cmds[j]).catch(function () {});
          return;
        }
      }
    }
  });

  /* === For agents ========================================================= */

  /* Whether a toolbar shows a command, counting only the controls whose
     command is this scope's, so two windows with a command of one id
     never answer for each other (0.69.0). Two scopes are the same when
     they were registered with the same table, as an applet's mount and
     the toolbars drawn beside it are. */
  function sameScope(a, b) { return a === b || (scopes.has(a) && scopes.get(a) === scopes.get(b)); }

  /* controls is the page's command controls by id, gathered once for the
     whole listing rather than searched for once a command. */
  function controlsById() {
    var m = new Map();
    document.querySelectorAll('[data-command]').forEach(function (ctl) {
      var id = ctl.getAttribute('data-command');
      if (!m.has(id)) m.set(id, []);
      m.get(id).push(ctl);
    });
    return m;
  }

  function describe(c, el, controls) {
    var shownBy = 'none';
    controls = controls || controlsById();
    (controls.get(c.id) || []).forEach(function (ctl) {
      if (shownBy === 'toolbar') return;
      var mine = find(c.id, ctl);
      if (!mine || !sameScope(mine.scope, el)) return;
      var group = ctl.closest('.toolbar-group');
      if (group && +(group.getAttribute('data-toolbar-stage') || 1) >= 3) shownBy = 'folded';
      else if (ctl.getClientRects().length) shownBy = 'toolbar';
    });
    var out = { id: c.id, label: val(c, 'label') || c.id };
    ['glyph', 'shortcut', 'disabled', 'reason', 'detail', 'checked', 'choice', 'value', 'current', 'badge', 'tone', 'hidden', 'danger', 'action'].forEach(function (f) {
      var v = val(c, f);
      if (v != null && v !== false && v !== '') out[f] = v;
    });
    if (val(c, 'bind') === false) out.bind = false;
    if (typeof c.panel === 'function') out.panel = true;
    out.shown = val(c, 'hidden') ? 'hidden' : shownBy;
    var items = itemsOf(c, el);
    if (items) out.items = items.filter(function (x) { return typeof x === 'object'; }).map(function (x) { return describe(x, el, controls); });
    return out;
  }

  function list(el) {
    var seen = {}, out = [], controls = controlsById();
    chain(el || document.body).forEach(function (s) {
      tableOf(s).forEach(function (c) {
        if (!c || typeof c !== 'object' || seen[c.id]) return;
        seen[c.id] = true;
        out.push(describe(c, s, controls));
      });
    });
    return out;
  }

  /* A caller that names an element runs only a command in that element's
     scopes, so a script or an agent asking about one window never runs
     another's (0.69.0). One that names none is looked for where focus is,
     and then in every scope. */
  function run(id, value, el, opts) {
    var f = find(id, el || document.activeElement || document.body);
    if (!f && !el) {
      scopes.forEach(function (get, s) { if (!f) { var c = index(s).byId.get(id); if (c) f = { cmd: c, scope: s }; } });
    }
    if (!f) return Promise.reject(new Error('there is no command ' + id));
    return runCmd(f.cmd, value, opts || { owner: { kind: 'script' } });
  }

  /* Menu rows from a list that may hold command ids (0.68.1): an id becomes
     the row the menu bar draws, with the command's words, glyph, key,
     tick or radio, danger, and disabled state with its reason, read now; a
     hidden command leaves no row, and a separator left at an end or
     doubled by that goes; a command with items is a submenu of them; an
     id the scope does not have is reported once and left out. Objects
     pass through as they are. */
  var warnedIds = {};
  function menuRows(list, scope) {
    if (!Array.isArray(list)) return list;
    var out = [];
    list.forEach(function (x) {
      /* A command given as an object, such as an item of another command,
         is turned into a row as one named by its id is (0.69.1), so its
         choice is a radio row and its state is read now. A plain row
         without an id passes through as it is. */
      if (x && typeof x === 'object' && typeof x.id === 'string' && !x.heading) { toRow(x); return; }
      if (x === '-' || (x && typeof x === 'object')) {
        if (x && typeof x === 'object' && Array.isArray(x.items)) x = Object.assign({}, x, { items: menuRows(x.items, scope) });
        out.push(x);
        return;
      }
      if (typeof x !== 'string') return;
      var f = find(x, scope);
      if (!f) {
        if (!warnedIds[x] && window.console) { warnedIds[x] = true; console.warn('pudl-commands: a menu names the command ' + x + ', which its scope does not have'); }
        return;
      }
      toRow(f.cmd);
    });
    function toRow(c) {
      /* A panel of the command's own is not a row the menu bar can draw. */
      if (val(c, 'hidden') || typeof c.panel === 'function') return;
      var row = { id: c.id, label: val(c, 'label') || c.id };
      if (val(c, 'detail')) row.detail = String(val(c, 'detail'));
      if (val(c, 'bind') === false) row.bind = false;
      var glyph = val(c, 'glyph'), key = val(c, 'shortcut'), checked = val(c, 'checked'), choice = val(c, 'choice');
      if (glyph) row.glyph = glyph;
      /* How the row shows on a ribbon, its glyph alone (0.79.1). */
      if (val(c, 'glyphOnly')) row.glyphOnly = true;
      if (key) row.shortcut = key;
      if (checked != null) row.checked = !!checked;
      if (choice) row.radio = choice;
      if (val(c, 'danger')) row.danger = true;
      if (val(c, 'disabled')) { row.disabled = true; if (val(c, 'reason')) row.reason = val(c, 'reason'); }
      var items = val(c, 'items');
      if (Array.isArray(items)) row.items = menuRows(items, scope);
      else row.run = function () { runCmd(c, val(c, 'value')).catch(function () {}); };
      out.push(row);
    }
    /* No separator first, last or twice running. */
    return out.filter(function (r, i, all) {
      if (r !== '-') return true;
      var prev = all.slice(0, i).filter(function (x) { return x !== '-'; }).length;
      return prev > 0 && i < all.length - 1 && all[i + 1] !== '-' && all.slice(i + 1).some(function (x) { return x !== '-'; });
    });
  }

  function register(scope, table) {
    var get = typeof table === 'function' ? table : function () { return table; };
    scopes.set(scope, get);
    forget();
    changed();
    return function () { if (scopes.get(scope) === get) scopes.delete(scope); changed(); };
  }

  window.pudlCommands = { register: register, changed: changed, list: list, run: run, rows: rows, menuRows: menuRows, find: function (id, el) { var f = find(id, el); return f ? f.cmd : null; }, value: val };

  new MutationObserver(function (records) {
    if (records.some(function (r) { return Array.prototype.some.call(r.addedNodes, function (n) { return n.nodeType === 1 && (n.matches('[data-command], [data-command-choice]') || n.querySelector('[data-command], [data-command-choice]')); }); })) changed();
  }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', changed); else changed();
})();
