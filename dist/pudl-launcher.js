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
    ['style', 'role', 'popover', 'data-launcher', 'data-launcher-presentation', 'data-launcher-compact'].forEach(function (name) { original[name] = root.getAttribute(name); });
    var originalPane = layout.getAttribute('data-split-pane'), invokers = new Map(), listeners = [];
    var compactAt = options.compactAt === false ? -1 : Number.isFinite(options.compactAt) && options.compactAt >= 0 ? options.compactAt : 650;
    var compactMode = compactAt >= 0 && innerWidth <= compactAt, desktopPresentation = options.presentation || 'closed';
    var paneSizes = Object.assign({}, options.paneSize), splitProp = (layout.querySelector(':scope > .split-handle') || layout).getAttribute('data-split-prop') || '--split-a';
    var originalSplitValue = layout.style.getPropertyValue(splitProp);
    var defaults = Object.assign({ width: 720, height: 600 }, options.defaultSize);
    ['width', 'height'].forEach(function (axis) {
      if (!(Number.isFinite(defaults[axis]) && defaults[axis] > 0)) defaults[axis] = axis === 'width' ? 720 : 600;
      if (!(Number.isFinite(paneSizes[axis]) && paneSizes[axis] > 0)) delete paneSizes[axis];
    });
    var taskbar = options.taskbar || document.querySelector('.win-bar'), generatedTaskbarButton = false, taskbarButton = firstInvoker.closest('.win-bar') ? firstInvoker : null;
    if (taskbar && !taskbarButton) {
      taskbarButton = document.createElement('button'); taskbarButton.type = 'button'; taskbarButton.className = 'icon-btn win-bar-launcher';
      taskbarButton.setAttribute('aria-label', 'Open launcher'); taskbarButton.title = 'Open launcher';
      taskbarButton.innerHTML = '<span class="glyph" aria-hidden="true" style="--glyph:var(--glyph-app)"></span>';
      taskbar.insertBefore(taskbarButton, taskbar.firstChild); generatedTaskbarButton = true;
    }
    var current = 'closed', returnPopup = false, destroyed = false, signature = '';
    var feedback = null, clickAction = null, inputIntent = 'search';
    var size = { width: 720, height: 600 }, popupHost = options.popupHost || document.body;
    var pin = root.querySelector('[data-launcher-pin]'), sizeButton = root.querySelector('[data-launcher-size]');
    var widthField = root.querySelector('[data-launcher-width]'), heightField = root.querySelector('[data-launcher-height]');
    var sizePanel = root.querySelector('[data-launcher-size-panel]');
    var originalControls = new Map(), generatedControls = [];
    var resetButton = root.querySelector('[data-launcher-reset]'), sizeNote = root.querySelector('[data-launcher-size-note]');
    if (sizePanel && !resetButton) { resetButton = document.createElement('button'); resetButton.type = 'button'; resetButton.className = 'btn btn-sm'; resetButton.setAttribute('data-launcher-reset', ''); resetButton.textContent = 'Reset size'; (sizePanel.querySelector('.popover-actions') || sizePanel).appendChild(resetButton); generatedControls.push(resetButton); }
    if (sizePanel && !sizeNote) { sizeNote = document.createElement('p'); sizeNote.className = 'text-muted'; sizeNote.setAttribute('data-launcher-size-note', ''); sizePanel.appendChild(sizeNote); generatedControls.push(sizeNote); }
    [pin, sizeButton, widthField, heightField, resetButton, sizeNote, widthField && widthField.closest('label'), heightField && heightField.closest('label')].filter(Boolean).forEach(function (control) {
      var values = {}; ['disabled', 'hidden', 'min', 'title', 'aria-label', 'aria-pressed'].forEach(function (name) { values[name] = control.getAttribute(name); }); originalControls.set(control, values);
    });
    function button() { return typeof invoker === 'function' ? invoker() : invoker; }
    function titleButton() {
      var title = window.pudlMenubar && pudlMenubar.launcherButton(), bar = title && title.closest('[data-menubar-launcher]');
      return bar && bar.getAttribute('data-menubar-launcher') === root.id && title.getClientRects().length ? title : null;
    }
    function anchor() { var requested = typeof options.anchor === 'function' ? options.anchor() : options.anchor; return compactMode && taskbarButton ? taskbarButton : requested && requested.getClientRects().length ? requested : titleButton() || button(); }
    function paneAxis() { return layout.classList.contains('stacked') ? 'height' : 'width'; }
    function pinned() { return current === 'pane' || current === 'collapsed'; }
    function popup() { return root.hasAttribute('popover') && root.matches(':popover-open'); }
    function state() { return { presentation: compactMode ? desktopPresentation : current, pinned: compactMode ? /^(pane|collapsed)$/.test(desktopPresentation) : pinned(), compact: compactMode, visible: current === 'pane' || current === 'popup', width: size.width, height: size.height, paneAxis: paneAxis(), paneSize: Object.assign({}, paneSizes) }; }
    function on(el, type, fn, capture) { el.addEventListener(type, fn, capture); listeners.push(function () { el.removeEventListener(type, fn, capture); }); }
    function attr(el, name, value) { if (el && el.getAttribute(name) !== value) el.setAttribute(name, value); }
    function style(name, value) { if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value); }
    function remember(button) {
      if (!button || invokers.has(button)) return;
      var attrs = {};
      ['hidden', 'popovertarget', 'aria-controls', 'aria-expanded', 'aria-haspopup'].forEach(function (name) { attrs[name] = button.getAttribute(name); });
      invokers.set(button, attrs);
    }
    function sync() {
      if (!compactMode && pinned() && !paneSizes[paneAxis()]) {
        var measured = pane.getBoundingClientRect()[paneAxis()];
        if (measured > 0) paneSizes[paneAxis()] = measured;
      }
      attr(root, 'data-launcher-presentation', current);
      if (compactMode) attr(root, 'data-launcher-compact', ''); else root.removeAttribute('data-launcher-compact');
      [button(), taskbarButton].filter(Boolean).forEach(function (control) {
        remember(control); attr(control, 'aria-controls', root.id); attr(control, 'aria-expanded', String(current === 'pane' || current === 'popup'));
        if (pinned() && !compactMode) { control.removeAttribute('popovertarget'); control.removeAttribute('aria-haspopup'); }
        else { attr(control, 'popovertarget', root.id); attr(control, 'aria-haspopup', 'dialog'); }
      });
      if (taskbarButton) { var hideTaskbar = !compactMode && !options.taskbarAlways && !!titleButton(); if (taskbarButton.hidden !== hideTaskbar) taskbarButton.hidden = hideTaskbar; }
      if (pin) { if (pin.hidden !== compactMode) pin.hidden = compactMode; attr(pin, 'aria-pressed', String(pinned())); attr(pin, 'title', pinned() ? 'Unpin launcher' : 'Pin launcher'); }
      if (sizeButton) { if (sizeButton.disabled) sizeButton.disabled = false; attr(sizeButton, 'title', 'Set launcher size'); }
      [widthField, heightField].forEach(function (field, index) {
        if (!field) return;
        var axis = index ? 'height' : 'width', applicable = !compactMode && (!pinned() || paneAxis() === axis);
        if (field.disabled !== !applicable) field.disabled = !applicable;
        var label = field.closest('label') || field; if (label.hidden !== !applicable) label.hidden = !applicable;
        attr(field, 'min', String(pinned() ? 80 : index ? 260 : 280));
        if (document.activeElement !== field) field.value = Math.round(pinned() ? paneSizes[axis] || pane.getBoundingClientRect()[axis] : size[axis]);
      });
      if (sizeNote) {
        if (sizeNote.hidden !== !compactMode) sizeNote.hidden = !compactMode;
        if (compactMode && generatedControls.indexOf(sizeNote) >= 0 && !sizeNote.textContent) sizeNote.textContent = 'The launcher uses the available workspace. Reset restores saved desktop sizes.';
      }
      if (resetButton) {
        var label = compactMode ? 'Reset saved desktop size' : pinned() ? 'Reset pane ' + paneAxis() : 'Reset size';
        attr(resetButton, 'aria-label', label); attr(resetButton, 'title', label);
        if (generatedControls.indexOf(resetButton) >= 0 && resetButton.textContent !== label) resetButton.textContent = label;
      }
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
      if (compactMode) {
        var area = layout.getBoundingClientRect(), top = Math.max(0, area.top), left = Math.max(0, area.left);
        style('top', top + 'px'); style('left', left + 'px'); style('width', Math.max(0, Math.min(area.right, innerWidth) - left) + 'px'); style('height', Math.max(0, Math.min(area.bottom, innerHeight) - top) + 'px'); return;
      }
      var button = anchor(), rect = button && button.getBoundingClientRect();
      var height = root.getBoundingClientRect().height, width = root.getBoundingClientRect().width;
      var below = rect ? rect.bottom + 6 : 8, above = rect ? rect.top - height - 6 : 8;
      var placement = taskbarButton === firstInvoker && taskbarButton.hidden && button === titleButton() ? 'below' : options.placement;
      var top = placement === 'above' || (placement !== 'below' && rect && innerHeight - below < height && rect.top > innerHeight - rect.bottom) ? above : below;
      top = Math.max(8, Math.min(top, Math.max(8, innerHeight - height - 8)));
      style('top', top + 'px'); style('--launcher-top', top + 'px');
      style('left', Math.max(8, Math.min(rect ? rect.left : 8, innerWidth - width - 8)) + 'px');
      if (window.pudlMenu && sizePanel) pudlMenu.place(sizePanel);
    }
    function applySize() {
      if (compactMode) return;
      style('width', Math.max(Math.min(280, innerWidth - 16), Math.min(size.width, innerWidth - 16)) + 'px');
      style('height', Math.max(Math.min(260, innerHeight - 16), Math.min(size.height, innerHeight - 16)) + 'px');
    }
    function focusInvoker() {
      var control = [anchor(), button(), window.pudlMenubar && pudlMenubar.launcherButton({ visible: true })].find(function (node) { return node && node.isConnected && node.getClientRects().length; });
      if (control) control.focus({ preventScroll: true });
    }
    function present(next, settings) {
      if (destroyed || ['popup', 'pane', 'collapsed', 'closed'].indexOf(next) < 0) return false;
      settings = settings || {};
      if (compactMode && (!settings.reason || /^(api|init|pin|unpin)$/.test(settings.reason))) desktopPresentation = next;
      cancelFeedback();
      if (!settings.reason || settings.reason === 'api' || settings.reason === 'init') returnPopup = false;
      if (!settings.force && signature && current === next && (next !== 'popup' || popup())) {
        if (settings.focus) { if (next === 'pane' || next === 'popup') pudlStart.focus(root, settings.focus === 'browse' ? 'browse' : 'search'); else focusInvoker(); }
        return true;
      }
      current = next;
      if (popup()) root.hidePopover();
      if (sizePanel && sizePanel.matches(':popover-open')) sizePanel.hidePopover();
      if (pinned() && !compactMode) {
        root.removeAttribute('popover'); attr(root, 'role', 'region');
        if (root.parentNode !== pane) pane.appendChild(root);
        root.style.removeProperty('width'); root.style.removeProperty('height');
        if (paneSizes[paneAxis()]) layout.style.setProperty(splitProp, paneSizes[paneAxis()] + 'px');
        if (next === 'pane') layout.removeAttribute('data-split-pane'); else attr(layout, 'data-split-pane', 'second');
      } else {
        attr(layout, 'data-split-pane', 'second');
        if (root.parentNode !== popupHost) popupHost.appendChild(root);
        attr(root, 'popover', compactMode ? 'manual' : 'auto'); attr(root, 'role', 'dialog'); applySize();
      }
      current = next; sync();
      if (next === 'popup' || compactMode && next === 'pane') { pudlStart.open(root, anchor(), { focus: settings.focus === false ? false : settings.focus === 'browse' ? 'browse' : 'search' }); place(); }
      pudlSplit.refresh(layout); pudlSplit.refresh(root);
      if (settings.focus && next === 'pane') pudlStart.focus(root, settings.focus === 'browse' ? 'browse' : 'search');
      if (settings.focus && (next === 'closed' || next === 'collapsed')) focusInvoker();
      changed(settings.reason || 'api'); return true;
    }
    function open(settings) {
      settings = settings || {};
      var mode = settings.focus === 'browse' ? 'browse' : 'search';
      if ((!compactMode && current === 'pane') || popup()) { pudlStart.focus(root, mode); return true; }
      return present(current === 'collapsed' ? 'pane' : 'popup', { focus: mode, reason: 'open' });
    }
    function toggle(settings) {
      return current === 'pane' ? present('collapsed', { focus: true, reason: 'toggle' }) : popup() ? present('closed', { focus: true, reason: 'toggle' }) : open(settings);
    }
    function setPinned(value) {
      if (typeof value !== 'boolean') return false;
      if (value === pinned()) return true;
      if (value) { returnPopup = popup(); return present('pane', { focus: inputIntent, reason: 'pin' }); }
      var next = returnPopup ? 'popup' : 'closed'; returnPopup = false;
      return present(next, { focus: inputIntent, reason: 'unpin' });
    }
    function resize(value) {
      if (!value || (value.width != null && !(Number.isFinite(value.width) && value.width > 0)) ||
          (value.height != null && !(Number.isFinite(value.height) && value.height > 0))) return false;
      if (pinned() && !compactMode) {
        var axis = paneAxis();
        if (value[axis] != null) { paneSizes[axis] = value[axis]; layout.style.setProperty(splitProp, value[axis] + 'px'); pudlSplit.refresh(layout); }
      } else {
        if (value.width != null) size.width = value.width;
        if (value.height != null) size.height = value.height;
        if (!compactMode) { applySize(); place(); }
      }
      changed('resize'); return true;
    }
    function resetSize() {
      if (compactMode || !pinned()) { size.width = defaults.width; size.height = defaults.height; }
      if (compactMode || pinned()) {
        paneSizes = {};
        if (Number.isFinite(options.defaultPaneSize) && options.defaultPaneSize > 0) layout.style.setProperty(splitProp, options.defaultPaneSize + 'px');
        else layout.style.removeProperty(splitProp);
        pudlSplit.refresh(layout);
      }
      if (!compactMode && !pinned()) { applySize(); place(); }
      changed('reset-size'); return true;
    }
    function responsive() {
      var next = compactAt >= 0 && innerWidth <= compactAt;
      if (next !== compactMode) {
        var focus = document.activeElement;
        if (next) desktopPresentation = current;
        compactMode = next;
        present(next ? current : desktopPresentation, { force: true, focus: false, reason: 'responsive' });
        if (focus && focus.isConnected && focus.getClientRects().length) focus.focus({ preventScroll: true });
        else if (focus === taskbarButton || root.contains(focus)) focusInvoker();
      } else { sync(); if (popup()) { if (!compactMode) applySize(); place(); } }
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
      if (!action || (current !== 'pane' && !popup())) { if (popup()) present(pinned() ? 'collapsed' : 'closed', { reason: 'activate' }); return true; }
      var mark = action.closest('[data-start-item]') || action;
      feedback = { mark: mark, previous: mark.getAttribute('data-launcher-selected'), timer: 0 };
      attr(mark, 'data-launcher-selected', '');
      feedback.timer = setTimeout(function () {
        cancelFeedback();
        if (!destroyed && popup()) present(pinned() ? 'collapsed' : 'closed', { reason: 'activate' });
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
      if (button.hasAttribute('data-launcher-reset')) { e.preventDefault(); resetSize(); }
      if (button.hasAttribute('data-launcher-close')) { e.preventDefault(); present(pinned() ? 'collapsed' : 'closed', { focus: true, reason: 'close' }); }
    });
    on(document, 'pointerdown', function (e) { inputIntent = e.pointerType === 'touch' || e.pointerType === 'pen' ? 'browse' : 'search'; }, true);
    on(document, 'click', function (e) {
      if (!compactMode || !popup() || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      var tab = e.target.closest('[data-win-tab]');
      if (!tab || (!tab.closest('.win-bar') && !tab.hasAttribute('data-win-stack-row'))) return;
      setTimeout(function () {
        if (!destroyed && compactMode && popup() && e.defaultPrevented) present(pinned() ? 'collapsed' : 'closed', { reason: 'activate' });
      }, 0);
    }, true);
    on(document, 'pudl:taskbar-activation-end', function (e) {
      if (compactMode && popup() && e.detail.status === 'completed') present(pinned() ? 'collapsed' : 'closed', { reason: 'activate' });
    });
    on(document, 'keydown', function () { inputIntent = 'search'; }, true);
    on(document, 'click', function (e) {
      if (e.defaultPrevented || (e.target.closest('button') !== button() && e.target.closest('button') !== taskbarButton) || root.hasAttribute('popover')) return;
      e.preventDefault(); toggle({ focus: inputIntent });
    });
    on(document, 'keydown', function (e) {
      if (e.defaultPrevented || (e.target !== button() && e.target !== taskbarButton) || e.key !== 'ArrowDown' || e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault(); open();
    });
    on(document, 'keydown', function (e) {
      if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || !compactMode || !popup()) return;
      /* Menus and dialogs get the first Escape, including native dismissal
         when focus is outside their panel. The remaining manual catalog
         still needs a dismissal path after focus returns to the taskbar. */
      if (document.querySelector('dialog[open]:modal') || Array.from(document.querySelectorAll('[popover]:popover-open')).some(function (panel) { return panel !== root; })) return;
      e.preventDefault(); present(pinned() ? 'collapsed' : 'closed', { focus: true, reason: 'close' });
    });
    on(document, 'pudl:menubar-launcher', function (e) {
      if (e.detail.target !== root) return;
      e.preventDefault(); if (e.detail.toggle) toggle({ focus: inputIntent }); else open({ focus: inputIntent });
    });
    on(root, 'beforetoggle', function (e) {
      if (e.target !== root || !root.hasAttribute('popover')) return;
      var control = button(); if (control) attr(control, 'aria-expanded', String(e.newState === 'open'));
      if (e.newState === 'open') { current = compactMode && pinned() ? 'pane' : 'popup'; changed('open'); }
      else if (current === 'popup' || compactMode && current === 'pane') { cancelFeedback(); current = pinned() ? 'collapsed' : 'closed'; changed('dismiss'); }
    });
    on(root, 'toggle', function (e) {
      if (e.target !== root || !root.hasAttribute('popover')) return;
      if (popup()) { current = compactMode && pinned() ? 'pane' : 'popup'; place(); changed('open'); }
      else if (current === 'popup' || compactMode && current === 'pane') { cancelFeedback(); current = pinned() ? 'collapsed' : 'closed'; changed('dismiss'); }
    });
    on(root, 'pudl:start-change', cancelFeedback);
    on(root, 'keydown', function (e) {
      if (e.key !== 'Escape' || !sizePanel || !sizePanel.matches(':popover-open')) return;
      e.preventDefault(); e.stopImmediatePropagation(); sizePanel.hidePopover();
      if (sizeButton) sizeButton.focus({ preventScroll: true });
    }, true);
    if (sizePanel) on(sizePanel, 'toggle', function () {
      if (!sizePanel.matches(':popover-open')) return;
      requestAnimationFrame(function () {
        if (destroyed || !sizePanel.matches(':popover-open') || sizePanel.contains(document.activeElement)) return;
        var field = [widthField, heightField, resetButton].find(function (control) { return control && !control.disabled && control.getClientRects().length; });
        if (field) field.focus({ preventScroll: true });
      });
    });
    on(window, 'resize', responsive);
    on(layout, 'pudl:split', function (e) {
      if (e.target.parentElement !== layout || compactMode) return;
      if (e.detail.size == null) paneSizes = {};
      else if (current === 'pane') {
        /* A keyboard completion can arrive after a newer pointer resize. */
        var measured = pane.getBoundingClientRect()[paneAxis()];
        if (measured > 0) paneSizes[paneAxis()] = measured;
      }
      changed('pane-resize');
    });
    [widthField, heightField].forEach(function (field, index) {
      if (field) on(field, 'input', function () { var value = Number(field.value); if (value > 0) { var request = {}; request[index ? 'height' : 'width'] = value; resize(request); } });
    });
    var resizeFrame = 0;
    var observer = new ResizeObserver(function () {
      if (destroyed || !popup() || resizeFrame) return;
      /* Placement changes the height limit through --launcher-top. Do
         that work outside resize delivery so nested splits can settle. */
      resizeFrame = requestAnimationFrame(function () {
        resizeFrame = 0;
        if (destroyed || !popup()) return;
        var rect = root.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (!compactMode) {
            var css = getComputedStyle(root), maxWidth = parseFloat(css.maxWidth), maxHeight = parseFloat(css.maxHeight);
            if (!(size.width > maxWidth)) size.width = rect.width;
            if (!(size.height > maxHeight)) size.height = rect.height;
          }
          place(); changed('resize');
        }
      });
    });
    observer.observe(root);
    observer.observe(layout);
    controls.set(root, {
      state: state, present: present, open: open, toggle: toggle, pin: setPinned, resize: resize, resetSize: resetSize, activated: activated,
      destroy: function () {
        var restoreFocus = root.contains(document.activeElement);
        cancelFeedback(); destroyed = true; cancelAnimationFrame(resizeFrame); observer.disconnect(); listeners.forEach(function (off) { off(); });
        if (popup()) root.hidePopover();
        if (sizePanel && sizePanel.matches(':popover-open')) sizePanel.hidePopover();
        if (parent.isConnected) parent.insertBefore(root, sibling && sibling.parentNode === parent ? sibling : null);
        Object.keys(original).forEach(function (name) { if (original[name] === null) root.removeAttribute(name); else root.setAttribute(name, original[name]); });
        if (originalPane === null) layout.removeAttribute('data-split-pane'); else layout.setAttribute('data-split-pane', originalPane);
        invokers.forEach(function (attrs, button) { Object.keys(attrs).forEach(function (name) { if (attrs[name] === null) button.removeAttribute(name); else button.setAttribute(name, attrs[name]); }); });
        originalControls.forEach(function (attrs, control) { Object.keys(attrs).forEach(function (name) { if (attrs[name] === null) control.removeAttribute(name); else control.setAttribute(name, attrs[name]); }); });
        generatedControls.forEach(function (control) { control.remove(); });
        if (generatedTaskbarButton) taskbarButton.remove();
        if (originalSplitValue) layout.style.setProperty(splitProp, originalSplitValue); else layout.style.removeProperty(splitProp);
        controls.delete(root); pudlSplit.refresh(layout);
        if (restoreFocus) focusInvoker();
      }
    });
    var initial = options.presentation || 'closed', visibilityOverride = compactMode && typeof options.compactVisible === 'boolean';
    if (visibilityOverride) initial = options.compactVisible ? /^(pane|collapsed)$/.test(desktopPresentation) ? 'pane' : 'popup' : /^(pane|collapsed)$/.test(desktopPresentation) ? 'collapsed' : 'closed';
    present(initial, { reason: visibilityOverride ? 'responsive' : 'init', focus: compactMode ? 'browse' : undefined });
    return true;
  }
  function call(root, method, argument, second) { var control = controls.get(root); return control ? control[method](argument, second) : false; }
  window.pudlLauncher = {
    enhance: enhance,
    state: function (root) { var c = controls.get(root); return c ? c.state() : null; },
    present: function (root, mode, options) { return call(root, 'present', mode, options); },
    open: function (root, settings) { return call(root, 'open', settings); },
    close: function (root) { var c = controls.get(root); return !!c && c.present(c.state().pinned ? 'collapsed' : 'closed', { focus: true, reason: 'close' }); },
    toggle: function (root, settings) { return call(root, 'toggle', settings); },
    pin: function (root, value) { return call(root, 'pin', value); },
    resetSize: function (root) { return call(root, 'resetSize'); },
    resize: function (root, size) { return call(root, 'resize', size); },
    activated: function (root, action) { return call(root, 'activated', action); },
    destroy: function (root) { var c = controls.get(root); if (!c) return false; c.destroy(); return true; }
  };
})();
