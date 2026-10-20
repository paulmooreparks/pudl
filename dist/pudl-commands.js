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

  function tableOf(scope) {
    var get = scopes.get(scope);
    var t;
    try { t = get ? get() : null; } catch (err) { if (window.console) console.warn('pudl-commands:', err); }
    return Array.isArray(t) ? t : [];
  }

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
      var hit = search(tableOf(list[i]), id);
      if (hit) return { cmd: hit, scope: list[i] };
    }
    return null;
  }

  function search(table, id) {
    for (var i = 0; i < table.length; i++) {
      var c = table[i];
      if (!c || typeof c !== 'object') continue;
      if (c.id === id) return c;
      var items = val(c, 'items');
      if (Array.isArray(items)) { var inner = search(items.filter(function (x) { return typeof x === 'object'; }), id); if (inner) return inner; }
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
    try { return Promise.resolve(cmd.run(value)).then(function (r) { changed(); return r; }); }
    catch (err) { return Promise.reject(err); }
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

  function fill(ctl) {
    var f = find(ctl.getAttribute('data-command'), ctl);
    if (!f) return;
    var cmd = f.cmd, label = val(cmd, 'label') || cmd.id, glyph = glyphOf(cmd);
    var items = itemsOf(cmd, ctl), menu = opensMenu(cmd, ctl);
    if (!ctl.hasAttribute('data-command-own') && !ctl.__pudlFilled && ctl.childNodes.length) ctl.setAttribute('data-command-own', '');
    var own = ctl.hasAttribute('data-command-own');
    if (!own) {
      ctl.__pudlFilled = true;
      ctl.textContent = '';
      if (glyph) ctl.appendChild(glyphEl(glyph));
      var words = document.createElement('span');
      words.className = 'toolbar-words';
      words.textContent = items && val(cmd, 'current') ? val(cmd, 'current') : label.replace(/…$/, '');
      ctl.appendChild(words);
      var badge = val(cmd, 'badge');
      if (badge != null && badge !== '') {
        var b = document.createElement('span');
        b.className = 'toolbar-badge';
        b.textContent = String(badge);
        ctl.appendChild(b);
      }
      if (!ctl.classList.contains('btn') && !ctl.classList.contains('icon-btn')) ctl.classList.add('btn', 'btn-sm');
    }
    var key = val(cmd, 'shortcut'), badgeNow = val(cmd, 'badge'), detail = val(cmd, 'detail');
    /* The name a screen reader hears carries the badge, as the eye sees it. */
    ctl.setAttribute('aria-label', label.replace(/…$/, '') + (items && val(cmd, 'current') ? ': ' + val(cmd, 'current') : '') +
      (badgeNow != null && badgeNow !== '' ? ', ' + badgeNow : ''));
    ctl.title = label + (key ? ' (' + shown(key) + ')' : '') + (detail ? '\n' + detail : '');
    if (key) ctl.setAttribute('aria-keyshortcuts', key.replace(/Mod/g, 'Control')); else ctl.removeAttribute('aria-keyshortcuts');
    ctl.disabled = !!val(cmd, 'disabled');
    if (val(cmd, 'disabled') && val(cmd, 'reason')) ctl.title = label + ': ' + val(cmd, 'reason');
    if (toneOf(cmd)) ctl.setAttribute('data-tone', toneOf(cmd)); else ctl.removeAttribute('data-tone');
    ctl.hidden = !!val(cmd, 'hidden');
    /* A menu button's wrapper goes with it, so it leaves no gap. */
    if (ctl.parentElement && ctl.parentElement.classList.contains('menu') && ctl.parentElement.children[0] === ctl) ctl.parentElement.hidden = ctl.hidden;
    ctl.classList.toggle('btn-danger', !!val(cmd, 'danger') && ctl.classList.contains('btn'));
    var checked = val(cmd, 'checked');
    if (checked != null && !menu) ctl.setAttribute('aria-pressed', String(!!checked)); else ctl.removeAttribute('aria-pressed');
    if (menu) menuFor(ctl, cmd);
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
  function rows(panel, cmds, el, onRun) {
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
        panel.append(ph, box);
        drawPanel(c, box);
        return;
      }
      panel.appendChild(row(c, el, onRun));
    });
  }

  function row(c, el, onRun) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'menu-action';
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
    b.addEventListener('click', function () {
      if (val(c, 'disabled')) return;
      var panel = b.closest('[popover]');
      if (panel && panel.hidePopover) panel.hidePopover();
      if (onRun) onRun(c); else runCmd(c, val(c, 'value')).catch(function () {});
    });
    return b;
  }

  /* A segmented control of a choice: one button per command in it. */
  function fillChoice(seg) {
    var name = seg.getAttribute('data-command-choice');
    var list = chain(seg).reduce(function (all, s) { return all.concat(flat(tableOf(s))); }, []).filter(function (c) { return val(c, 'choice') === name && !val(c, 'hidden'); });
    if (!seg.classList.contains('seg')) seg.classList.add('seg', 'sm');
    seg.setAttribute('role', 'group');
    seg.hidden = !list.length;
    if (!seg.hasAttribute('aria-label') && list[0] && list[0].choiceLabel) seg.setAttribute('aria-label', list[0].choiceLabel);
    var have = Array.prototype.map.call(seg.children, function (b) { return b.getAttribute('data-command'); }).join();
    if (have !== list.map(function (c) { return c.id; }).join()) {
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
      b.textContent = val(f.cmd, 'label');
      b.title = val(f.cmd, 'label');
      b.setAttribute('aria-pressed', String(!!val(f.cmd, 'checked')));
      b.disabled = !!val(f.cmd, 'disabled');
      if (!b.__pudlBound) {
        b.__pudlBound = true;
        b.addEventListener('click', function () { var now = find(b.getAttribute('data-command'), b); if (now) runCmd(now.cmd).catch(function () {}); });
      }
    });
  }

  function flat(table) {
    var out = [];
    table.forEach(function (c) {
      if (!c || typeof c !== 'object') return;
      out.push(c);
      var items = val(c, 'items');
      if (Array.isArray(items)) out = out.concat(flat(items.filter(function (x) { return typeof x === 'object'; })));
    });
    return out;
  }

  /* A toolbar group of commands with nothing to show leaves the row, and
     comes back when one of them shows (0.68.1, from example.com's
     pudl-proposal-toolbar-empty-groups.md), so the folding counts only
     what is there. A group in hand-written markup with no command in it
     is left alone. */
  function emptyGroups(root) {
    (root || document).querySelectorAll('.toolbar-group').forEach(function (g) {
      var parts = Array.prototype.filter.call(g.querySelectorAll('[data-command], [data-command-choice]'), function (c) {
        return !c.closest('.toolbar-fold') && !(c.parentElement && c.parentElement.closest('[data-command-choice]'));
      });
      if (!parts.length) return;
      var any = parts.some(function (c) { return !c.hidden; });
      if (g.hidden === any) g.hidden = !any;
    });
  }

  function draw(root) {
    (root || document).querySelectorAll('[data-command-choice]').forEach(fillChoice);
    (root || document).querySelectorAll('[data-command]').forEach(function (c) { if (!c.closest('[data-command-choice]')) fill(c); });
    emptyGroups(root);
    document.dispatchEvent(new CustomEvent('pudl:commands-change'));
  }

  /* The controls are drawn again once the current task is done, however
     many times it calls changed (0.69.1). An animation frame was used
     before, but a browser runs none in a hidden tab and few in a headless
     one, so a script or an agent reading a control's state just after
     running a command could find the old state. */
  function changed() {
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

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.repeat || document.querySelector('dialog:modal')) return;
    var pressed = spelling(e), el = document.activeElement || document.body;
    var list = chain(el);
    for (var i = 0; i < list.length; i++) {
      var cmds = flat(tableOf(list[i]));
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

  function describe(c, el) {
    var shownBy = 'none';
    document.querySelectorAll('[data-command="' + CSS.escape(c.id) + '"]').forEach(function (ctl) {
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
    if (items) out.items = items.filter(function (x) { return typeof x === 'object'; }).map(function (x) { return describe(x, el); });
    return out;
  }

  function list(el) {
    var seen = {}, out = [];
    chain(el || document.body).forEach(function (s) {
      tableOf(s).forEach(function (c) {
        if (!c || typeof c !== 'object' || seen[c.id]) return;
        seen[c.id] = true;
        out.push(describe(c, s));
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
      scopes.forEach(function (get, s) { if (!f) { var c = search(tableOf(s), id); if (c) f = { cmd: c, scope: s }; } });
    }
    if (!f) return Promise.reject(new Error('there is no command ' + id));
    return runCmd(f.cmd, value, opts || { owner: { kind: 'script' } });
  }

  /* Menu rows from a list that may hold command ids (0.68.1, from
     example.com's pudl-proposal-menu-command-ids.md): an id becomes
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
    changed();
    return function () { if (scopes.get(scope) === get) scopes.delete(scope); changed(); };
  }

  window.pudlCommands = { register: register, changed: changed, list: list, run: run, rows: rows, menuRows: menuRows, find: function (id, el) { var f = find(id, el); return f ? f.cmd : null; }, value: val };

  new MutationObserver(function (records) {
    if (records.some(function (r) { return Array.prototype.some.call(r.addedNodes, function (n) { return n.nodeType === 1 && (n.matches('[data-command], [data-command-choice]') || n.querySelector('[data-command], [data-command-choice]')); }); })) changed();
  }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', changed); else changed();
})();
