/* Native application chrome. The host supplies authoritative state and
   native actions; this module never invokes browser window APIs. */
(function () {
  'use strict';
  var attached = new WeakMap(), uid = 0;
  function attach(topbar, options) {
    if (!topbar || !topbar.matches('.topbar') || topbar.ownerDocument !== document) throw new TypeError('A topbar in this document is required.');
    if (attached.has(topbar)) throw new Error('This topbar already has native controls.');
    options = options || {};
    if (options.icon !== undefined && (typeof options.icon !== 'string' || !options.icon.trim())) throw new TypeError('An application icon must be a nonempty image URL.');
    var actions = Object.assign({}, options.actions), words = Object.assign({ menu: 'Application window menu', minimize: 'Minimize application window', restore: 'Leave full screen', close: 'Close application window' }, options.words);
    var state = Object.assign({ fullscreen: false, active: true, title: options.title || 'Application', canMinimize: true, canRestore: true, canClose: true }, options.state);
    function validate(snapshot) {
      ['fullscreen', 'active', 'canMinimize', 'canRestore', 'canClose'].forEach(function (key) {
        if (typeof snapshot[key] !== 'boolean') throw new TypeError(key + ' must be a boolean.');
      });
      if (typeof snapshot.title !== 'string' || !snapshot.title.trim()) throw new TypeError('An application title is required.');
      return snapshot;
    }
    validate(state);
    var disposed = false, busy = false, remembered = null;
    var menu = document.createElement('div'), trigger = document.createElement('button'), panel = document.createElement('div'), controls = document.createElement('div');
    menu.className = 'menu native-window-menu';
    controls.className = 'native-window-controls';
    controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', words.menu);
    [menu, controls].forEach(function (el) { el.setAttribute('data-native-chrome-slot', ''); el.hidden = true; });
    trigger.type = 'button'; trigger.className = 'icon-btn menu-btn';
    var icon = document.createElement(options.icon ? 'img' : 'span');
    if (options.icon) {
      icon.alt = ''; icon.className = 'native-window-icon';
      icon.addEventListener('error', function () {
        var fallback = document.createElement('span'); fallback.className = 'glyph'; fallback.style.setProperty('--glyph', 'var(--glyph-window)'); fallback.setAttribute('aria-hidden', 'true'); icon.replaceWith(fallback);
      });
      icon.src = options.icon;
    }
    else { icon.className = 'glyph'; icon.style.setProperty('--glyph', 'var(--glyph-window)'); }
    icon.setAttribute('aria-hidden', 'true');
    trigger.appendChild(icon);
    panel.className = 'menu-panel'; panel.id = 'pudl-native-menu-' + (++uid); panel.setAttribute('popover', 'auto');
    trigger.setAttribute('popovertarget', panel.id); trigger.setAttribute('aria-haspopup', 'menu'); trigger.setAttribute('aria-expanded', 'false');
    menu.append(trigger, panel);
    var buttons = {}, rows = {};
    function available(action) {
      var capability = 'can' + action.charAt(0).toUpperCase() + action.slice(1);
      return !disposed && state.fullscreen && state[capability] && typeof actions[action] === 'function';
    }
    function allowed(action) { return !busy && available(action); }
    function closeMenu(restore, reason, fromControl) {
      var ownsFocus = menu.contains(document.activeElement) || controls.contains(document.activeElement);
      if (panel.matches(':popover-open')) panel.hidePopover();
      if (restore && (ownsFocus || fromControl) && remembered && remembered.isConnected && remembered.ownerDocument === document && !remembered.matches(':disabled') && !remembered.closest('[hidden],[inert]') && remembered.getClientRects().length && getComputedStyle(remembered).visibility === 'visible') {
        remembered.focus({ preventScroll: true });
        if (document.activeElement === remembered) topbar.dispatchEvent(new CustomEvent('pudl:native-return-focus', { bubbles: true, detail: { target: remembered, reason: reason } }));
      }
      remembered = null;
    }
    function draw() {
      var on = !disposed && !!state.fullscreen;
      topbar.classList.toggle('native-chrome', on);
      topbar.classList.toggle('native-inactive', on && state.active === false);
      menu.hidden = controls.hidden = !on;
      var label = String(state.title) + ': ' + words.menu;
      if (trigger.getAttribute('aria-label') !== label) {
        trigger.setAttribute('aria-label', label); trigger.setAttribute('data-tooltip', label); trigger.title = label;
      }
      trigger.disabled = busy;
      controls.setAttribute('aria-busy', String(busy));
      ['minimize', 'restore', 'close'].forEach(function (action) {
        buttons[action].disabled = !allowed(action);
        rows[action].disabled = !allowed(action);
      });
    }
    function run(action, fromControl) {
      if (!Object.prototype.hasOwnProperty.call(buttons, action) || !allowed(action)) return Promise.resolve(false);
      closeMenu(true, 'action', fromControl);
      busy = true; draw();
      var snapshot = Object.assign({}, state), invoked = false;
      return Promise.resolve().then(function () {
        if (!available(action)) return;
        invoked = true; return actions[action](snapshot);
      }).then(function () {
        return invoked;
      }, function (error) {
        if (!disposed) topbar.dispatchEvent(new CustomEvent('pudl:native-error', { bubbles: true, detail: { action: action, error: error } }));
        return false;
      }).finally(function () { busy = false; if (!disposed) draw(); });
    }
    ['minimize', 'restore', 'close'].forEach(function (action) {
      var button = document.createElement('button'); button.type = 'button'; button.className = 'icon-btn';
      button.setAttribute('data-native-action', action); button.setAttribute('aria-label', words[action]); button.setAttribute('data-tooltip', words[action]); button.title = words[action];
      var glyph = document.createElement('span'); glyph.className = 'glyph'; glyph.style.setProperty('--glyph', 'var(--glyph-' + action + ')'); glyph.setAttribute('aria-hidden', 'true');
      button.appendChild(glyph); button.addEventListener('click', function () { run(action, true); });
      var target = document.createElement('span'); target.className = 'native-window-target'; target.appendChild(button);
      buttons[action] = button; controls.appendChild(target);
    });
    ['restore', 'minimize', 'close'].forEach(function (action) {
      var row = document.createElement('button'); row.type = 'button'; row.className = 'menu-action';
      var glyph = document.createElement('span'); glyph.className = 'glyph'; glyph.style.setProperty('--glyph', 'var(--glyph-' + action + ')'); glyph.setAttribute('aria-hidden', 'true');
      row.append(glyph, document.createTextNode(words[action]));
      row.addEventListener('click', function () { run(action, true); }); rows[action] = row; panel.appendChild(row);
    });
    function remember(target) { if (target && !menu.contains(target) && !controls.contains(target)) remembered = target; }
    [menu, controls].forEach(function (slot) {
      slot.addEventListener('pointerdown', function () { remember(document.activeElement); });
      slot.addEventListener('focusin', function (e) { remember(e.relatedTarget); });
    });
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.matches(':popover-open')) { e.preventDefault(); closeMenu(true, 'escape'); }
    });
    panel.addEventListener('toggle', function () { trigger.setAttribute('aria-expanded', String(panel.matches(':popover-open'))); });
    topbar.prepend(menu); topbar.appendChild(controls);
    var controller = {
      update: function (next) {
        if (disposed) return false;
        var updated = validate(Object.assign({}, state, next));
        if (['title', 'fullscreen', 'active', 'canMinimize', 'canRestore', 'canClose'].some(function (key) { return state[key] !== updated[key]; })) closeMenu(true, 'state');
        state = updated; draw(); return true;
      },
      run: function (action) { return run(action, false); },
      focusMenu: function () {
        if (disposed || !state.fullscreen || busy || !trigger.getClientRects().length) return false;
        var a = document.activeElement;
        if (a && !menu.contains(a)) remembered = a;
        trigger.focus({ preventScroll: true }); return document.activeElement === trigger;
      },
      destroy: function () {
        if (disposed) return;
        closeMenu(true, 'destroy'); disposed = true;
        menu.remove(); controls.remove(); topbar.classList.remove('native-chrome', 'native-inactive'); attached.delete(topbar);
      }
    };
    attached.set(topbar, controller); draw(); return controller;
  }
  window.pudlNative = { attach: attach };
})();
