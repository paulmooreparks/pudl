/* PUDL host launcher presentation. Load after pudl-start.js and pudl-split.js.
   Catalog content, activation, URLs and storage belong to the host.
   See docs/proposals/host-launcher.md for the public contract. */
(function () {
  'use strict';
  var controls = new WeakMap();
  function enhance(root, options) {
    if (controls.has(root)) return true;
    options = options || {};
    var pane = options.pane, layout = options.layout, invoker = options.invoker;
    if (!root || !root.id || !pane || !layout || !root.isConnected || !pane.isConnected || pane.parentNode !== layout || layout.querySelector(':scope > .split-pane') !== pane || root.contains(pane) ||
        !window.pudlStart || !pudlStart.enhance(root) || !window.pudlSplit || !invoker) return false;
    var firstInvoker = typeof invoker === 'function' ? invoker() : invoker;
    if (!firstInvoker || firstInvoker.nodeType !== 1 || (options.popupHost && (!options.popupHost.isConnected || root.contains(options.popupHost)))) return false;
    var parent = root.parentNode, sibling = root.nextSibling, original = {};
    ['style', 'role', 'popover', 'data-launcher', 'data-launcher-presentation'].forEach(function (name) { original[name] = root.getAttribute(name); });
    var originalPane = layout.getAttribute('data-split-pane'), invokers = new Map(), listeners = [];
    var current = 'closed', returnPopup = false, destroyed = false, signature = '';
    var feedback = null, clickAction = null;
    var size = { width: 720, height: 600 }, popupHost = options.popupHost || document.body;
    var pin = root.querySelector('[data-launcher-pin]'), sizeButton = root.querySelector('[data-launcher-size]');
    var widthField = root.querySelector('[data-launcher-width]'), heightField = root.querySelector('[data-launcher-height]');
    var sizePanel = root.querySelector('[data-launcher-size-panel]');
    var originalControls = new Map();
    [pin, sizeButton, widthField, heightField].filter(Boolean).forEach(function (control) {
      var values = {}; ['disabled', 'title', 'aria-pressed'].forEach(function (name) { values[name] = control.getAttribute(name); }); originalControls.set(control, values);
    });
    function button() { return typeof invoker === 'function' ? invoker() : invoker; }
    function anchor() { return typeof options.anchor === 'function' ? options.anchor() : options.anchor || button(); }
    function pinned() { return current === 'pane' || current === 'collapsed'; }
    function popup() { return root.hasAttribute('popover') && root.matches(':popover-open'); }
    function state() { return { presentation: current, pinned: pinned(), width: size.width, height: size.height }; }
    function on(el, type, fn, capture) { el.addEventListener(type, fn, capture); listeners.push(function () { el.removeEventListener(type, fn, capture); }); }
    function attr(el, name, value) { if (el && el.getAttribute(name) !== value) el.setAttribute(name, value); }
    function style(name, value) { if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value); }
    function remember(button) {
      if (!button || invokers.has(button)) return;
      var attrs = {};
      ['popovertarget', 'aria-controls', 'aria-expanded', 'aria-haspopup'].forEach(function (name) { attrs[name] = button.getAttribute(name); });
      invokers.set(button, attrs);
    }
    function sync() {
      attr(root, 'data-launcher-presentation', current);
      var control = button(); remember(control);
      if (control) {
        attr(control, 'aria-controls', root.id); attr(control, 'aria-expanded', String(current === 'pane' || current === 'popup'));
        if (pinned()) { control.removeAttribute('popovertarget'); control.removeAttribute('aria-haspopup'); }
        else { attr(control, 'popovertarget', root.id); attr(control, 'aria-haspopup', 'dialog'); }
      }
      if (pin) { attr(pin, 'aria-pressed', String(pinned())); attr(pin, 'title', pinned() ? 'Unpin launcher' : 'Pin launcher'); }
      [sizeButton, widthField, heightField].forEach(function (field) { if (field && field.disabled !== pinned()) field.disabled = pinned(); });
      if (sizeButton) attr(sizeButton, 'title', pinned() ? 'Resize the pinned launcher with its divider' : 'Set launcher size');
      if (widthField && document.activeElement !== widthField) widthField.value = Math.round(size.width);
      if (heightField && document.activeElement !== heightField) heightField.value = Math.round(size.height);
    }
    function changed(reason) {
      sync();
      var next = state(), key = JSON.stringify(next);
      if (key === signature) return;
      signature = key; next.reason = reason;
      root.dispatchEvent(new CustomEvent('pudl:launcher-change', { bubbles: true, detail: next }));
    }
    function place() {
      if (!popup()) return;
      var button = anchor(), rect = button && button.getBoundingClientRect();
      var height = root.getBoundingClientRect().height, width = root.getBoundingClientRect().width;
      var below = rect ? rect.bottom + 6 : 8, above = rect ? rect.top - height - 6 : 8;
      var top = options.placement === 'above' || (options.placement !== 'below' && rect && innerHeight - below < height && rect.top > innerHeight - rect.bottom) ? above : below;
      top = Math.max(8, Math.min(top, Math.max(8, innerHeight - height - 8)));
      style('top', top + 'px'); style('--launcher-top', top + 'px');
      style('left', Math.max(8, Math.min(rect ? rect.left : 8, innerWidth - width - 8)) + 'px');
      if (window.pudlMenu && sizePanel) pudlMenu.place(sizePanel);
    }
    function applySize() {
      style('width', Math.max(Math.min(280, innerWidth - 16), Math.min(size.width, innerWidth - 16)) + 'px');
      style('height', Math.max(Math.min(260, innerHeight - 16), Math.min(size.height, innerHeight - 16)) + 'px');
    }
    function focusInvoker() { var button = anchor(); if (button && button.isConnected) button.focus({ preventScroll: true }); }
    function present(next, settings) {
      if (destroyed || ['popup', 'pane', 'collapsed', 'closed'].indexOf(next) < 0) return false;
      settings = settings || {};
      cancelFeedback();
      if (!settings.reason || settings.reason === 'api' || settings.reason === 'init') returnPopup = false;
      if (signature && current === next && (next !== 'popup' || popup())) {
        if (settings.focus) { if (next === 'pane' || next === 'popup') root.querySelector('[data-start-query]').focus({ preventScroll: true }); else focusInvoker(); }
        return true;
      }
      current = next;
      if (popup()) root.hidePopover();
      if (sizePanel && sizePanel.matches(':popover-open')) sizePanel.hidePopover();
      if (pinned()) {
        root.removeAttribute('popover'); attr(root, 'role', 'region');
        if (root.parentNode !== pane) pane.appendChild(root);
        root.style.removeProperty('width'); root.style.removeProperty('height');
        if (next === 'pane') layout.removeAttribute('data-split-pane'); else attr(layout, 'data-split-pane', 'second');
      } else {
        attr(layout, 'data-split-pane', 'second');
        if (root.parentNode !== popupHost) popupHost.appendChild(root);
        attr(root, 'popover', 'auto'); attr(root, 'role', 'dialog'); applySize();
      }
      sync();
      if (next === 'popup') { pudlStart.open(root, anchor()); place(); }
      pudlSplit.refresh(layout); pudlSplit.refresh(root);
      if (settings.focus && next === 'pane') root.querySelector('[data-start-query]').focus({ preventScroll: true });
      if (settings.focus && (next === 'closed' || next === 'collapsed')) focusInvoker();
      changed(settings.reason || 'api'); return true;
    }
    function open() {
      if (current === 'pane' || popup()) { root.querySelector('[data-start-query]').focus({ preventScroll: true }); return true; }
      return present(current === 'collapsed' ? 'pane' : 'popup', { focus: true, reason: 'open' });
    }
    function toggle() {
      return current === 'pane' ? present('collapsed', { focus: true, reason: 'toggle' }) : popup() ? present('closed', { focus: true, reason: 'toggle' }) : open();
    }
    function setPinned(value) {
      if (typeof value !== 'boolean') return false;
      if (value === pinned()) return true;
      if (value) { returnPopup = popup(); return present('pane', { focus: true, reason: 'pin' }); }
      var next = returnPopup ? 'popup' : 'closed'; returnPopup = false;
      return present(next, { focus: true, reason: 'unpin' });
    }
    function resize(value) {
      if (!value || (value.width != null && !(Number.isFinite(value.width) && value.width > 0)) ||
          (value.height != null && !(Number.isFinite(value.height) && value.height > 0))) return false;
      if (value.width != null) size.width = value.width;
      if (value.height != null) size.height = value.height;
      if (!pinned()) { applySize(); place(); }
      changed('resize'); return true;
    }
    function cancelFeedback() {
      clickAction = null;
      if (!feedback) return;
      clearTimeout(feedback.timer);
      if (feedback.previous === null) feedback.mark.removeAttribute('data-launcher-selected');
      else feedback.mark.setAttribute('data-launcher-selected', feedback.previous);
      feedback = null;
    }
    function destination(target) {
      var action = target && target.closest && target.closest('a[href],button');
      if (!action || action.closest('[data-start]') !== root) return null;
      var row = action.closest('[data-start-item]');
      return (row && row.querySelector('a[href],button') === action) || action.hasAttribute('data-launcher-activate') ? action : null;
    }
    function eligible(action) {
      if (!action || !root.contains(action) || action.disabled || action.closest('[aria-disabled="true"], [hidden], [data-start-filtered]')) return false;
      if (action.tagName !== 'A') return true;
      var base = document.querySelector('base[target]'), target = action.getAttribute('target') || (base && base.getAttribute('target')) || '_self';
      return !action.hasAttribute('download') && target.toLowerCase() === '_self';
    }
    function activated(action) {
      if (destroyed) return false;
      action = action || clickAction;
      if (action && !root.contains(action)) action = null;
      if (action && !eligible(action)) return false;
      returnPopup = false;
      if (feedback) return true;
      if (!action || (current !== 'pane' && !popup())) { if (popup()) present('closed', { reason: 'activate' }); return true; }
      var mark = action.closest('[data-start-item]') || action;
      feedback = { mark: mark, previous: mark.getAttribute('data-launcher-selected'), timer: 0 };
      attr(mark, 'data-launcher-selected', '');
      feedback.timer = setTimeout(function () {
        cancelFeedback();
        if (!destroyed && popup()) present('closed', { reason: 'activate' });
      }, 180);
      return true;
    }
    attr(root, 'data-launcher', '');
    if (options.size) {
      if (Number.isFinite(options.size.width) && options.size.width > 0) size.width = options.size.width;
      if (Number.isFinite(options.size.height) && options.size.height > 0) size.height = options.size.height;
    }
    on(document, 'click', function (e) {
      if (pinned() && !(pin && pin.contains(e.target)) && !root.contains(e.target)) returnPopup = false;
    }, true);
    /* Guard repeated plain activation before a host's destination handler runs.
       The original event and its default action otherwise remain synchronous. */
    on(root, 'click', function (e) {
      var action = destination(e.target);
      if (action && (action.disabled || action.closest('[aria-disabled="true"], [hidden], [data-start-filtered]'))) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || !eligible(action)) return;
      if (feedback || clickAction) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      clickAction = action;
      queueMicrotask(function () {
        if (clickAction !== action) return;
        clickAction = null;
        if (!e.defaultPrevented && !destroyed && eligible(action)) activated(action);
      });
    }, true);
    on(root, 'click', function (e) {
      if (e.target.closest('[data-start]') !== root) return;
      var button = e.target.closest('button'); if (!button || button.disabled) return;
      if (button.hasAttribute('data-launcher-pin')) { e.preventDefault(); setPinned(!pinned()); }
      if (button.hasAttribute('data-launcher-close')) { e.preventDefault(); present(pinned() ? 'collapsed' : 'closed', { focus: true, reason: 'close' }); }
    });
    on(document, 'click', function (e) {
      if (e.defaultPrevented || e.target.closest('button') !== button() || root.hasAttribute('popover')) return;
      e.preventDefault(); toggle();
    });
    on(document, 'keydown', function (e) {
      if (e.defaultPrevented || e.target !== button() || e.key !== 'ArrowDown' || e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault(); open();
    });
    on(document, 'pudl:menubar-launcher', function (e) {
      if (e.detail.target !== root) return;
      e.preventDefault(); if (e.detail.toggle) toggle(); else open();
    });
    on(root, 'beforetoggle', function (e) {
      if (e.target !== root || !root.hasAttribute('popover')) return;
      var control = button(); if (control) attr(control, 'aria-expanded', String(e.newState === 'open'));
      if (e.newState === 'open') { current = 'popup'; changed('open'); }
      else if (current === 'popup') { cancelFeedback(); current = 'closed'; changed('dismiss'); }
    });
    on(root, 'toggle', function (e) {
      if (e.target !== root || !root.hasAttribute('popover')) return;
      if (popup()) { current = 'popup'; place(); changed('open'); }
      else if (current === 'popup') { cancelFeedback(); current = 'closed'; changed('dismiss'); }
    });
    on(root, 'pudl:start-change', cancelFeedback);
    on(window, 'resize', function () { if (popup()) { applySize(); place(); } });
    [widthField, heightField].forEach(function (field, index) {
      if (field) on(field, 'input', function () { var value = Number(field.value); if (value > 0) { var request = {}; request[index ? 'height' : 'width'] = value; resize(request); } });
    });
    var observer = new ResizeObserver(function () {
      if (destroyed || !popup()) return;
      var rect = root.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) { size.width = rect.width; size.height = rect.height; place(); changed('resize'); }
    });
    observer.observe(root);
    observer.observe(layout);
    controls.set(root, {
      state: state, present: present, open: open, toggle: toggle, pin: setPinned, resize: resize, activated: activated,
      destroy: function () {
        var restoreFocus = root.contains(document.activeElement);
        cancelFeedback(); destroyed = true; observer.disconnect(); listeners.forEach(function (off) { off(); });
        if (popup()) root.hidePopover();
        if (sizePanel && sizePanel.matches(':popover-open')) sizePanel.hidePopover();
        if (parent.isConnected) parent.insertBefore(root, sibling && sibling.parentNode === parent ? sibling : null);
        Object.keys(original).forEach(function (name) { if (original[name] === null) root.removeAttribute(name); else root.setAttribute(name, original[name]); });
        if (originalPane === null) layout.removeAttribute('data-split-pane'); else layout.setAttribute('data-split-pane', originalPane);
        invokers.forEach(function (attrs, button) { Object.keys(attrs).forEach(function (name) { if (attrs[name] === null) button.removeAttribute(name); else button.setAttribute(name, attrs[name]); }); });
        originalControls.forEach(function (attrs, control) { Object.keys(attrs).forEach(function (name) { if (attrs[name] === null) control.removeAttribute(name); else control.setAttribute(name, attrs[name]); }); });
        controls.delete(root); pudlSplit.refresh(layout);
        if (restoreFocus) focusInvoker();
      }
    });
    present(options.presentation || 'closed', { reason: 'init' });
    return true;
  }
  function call(root, method, argument, second) { var control = controls.get(root); return control ? control[method](argument, second) : false; }
  window.pudlLauncher = {
    enhance: enhance,
    state: function (root) { var c = controls.get(root); return c ? c.state() : null; },
    present: function (root, mode, options) { return call(root, 'present', mode, options); },
    open: function (root) { return call(root, 'open'); },
    close: function (root) { var c = controls.get(root); return !!c && c.present(c.state().pinned ? 'collapsed' : 'closed', { focus: true, reason: 'close' }); },
    toggle: function (root) { return call(root, 'toggle'); },
    pin: function (root, value) { return call(root, 'pin', value); },
    resize: function (root, size) { return call(root, 'resize', size); },
    activated: function (root, action) { return call(root, 'activated', action); },
    destroy: function (root) { var c = controls.get(root); if (!c) return false; c.destroy(); return true; }
  };
})();
