/* PUDL Start catalogs. Load with defer, after pudl-split.js.
   Markup and host-owned URL/storage policy: docs/proposals/start-control.md. */
(function () {
  'use strict';
  var controls = new WeakMap();

  function attr(el, name, value) {
    if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
  }
  function text(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }
  function enhance(root) {
    if (!root || !root.matches('.start-menu[data-start]')) return false;
    if (controls.has(root)) return true;
    function all(selector) {
      return Array.prototype.filter.call(root.querySelectorAll(selector), function (el) {
        return el.closest('[data-start]') === root;
      });
    }
    function one(selector) { return all(selector)[0] || null; }
    var input = one('[data-start-query]');
    var list = one('[data-start-items]');
    var nav = one('[data-start-categories]');
    if (!input || !list || !nav) return false;
    if (!all('[data-start-category-key=""]').some(function (c) { return nav.contains(c); })) return false;
    var category = '', rows = [], categories = [], count = 0, opener = null;
    var previous = null, destroyed = false, listeners = [], explicitOpener = false;
    function hidden(el) { return !!el.closest('[hidden]'); }
    function enabled(el) { return el && !el.disabled && el.getAttribute('aria-disabled') !== 'true' && !hidden(el); }
    function action(row) { return row.querySelector('a[href],button'); }
    function state() { return { query: input.value, category: category, count: count }; }
    function read() {
      rows = all('[data-start-item]').filter(function (r) { return list.contains(r); });
      categories = all('[data-start-category-key]').filter(function (c) { return nav.contains(c); });
    }
    function draw(reason, initial) {
      read();
      if (!categories.some(function (c) { return c.getAttribute('data-start-category-key') === category; })) category = '';
      var words = input.value.trim().toLocaleLowerCase().split(/\s+/);
      var matches = rows.map(function (r) {
        var haystack = (r.textContent + ' ' + (r.getAttribute('data-start-keywords') || '')).toLocaleLowerCase();
        return !hidden(r) && words.every(function (w) { return haystack.indexOf(w) >= 0; });
      });
      function member(r, key) {
        return !key || (r.getAttribute('data-start-category') || '').split(/\s+/).indexOf(key) >= 0;
      }
      count = 0;
      var focused = document.activeElement;
      rows.forEach(function (r, i) {
        var show = matches[i] && member(r, category);
        if (r.hasAttribute('data-start-filtered') === show) r.toggleAttribute('data-start-filtered', !show);
        if (show) count++;
        if (!show && r.contains(focused)) input.focus({ preventScroll: true });
      });
      var label = '';
      categories.forEach(function (c) {
        var key = c.getAttribute('data-start-category-key'), selected = key === category;
        if (selected) {
          attr(c, 'aria-current', 'page');
          label = (c.querySelector('[data-start-label]') || c).textContent.trim();
        } else if (c.hasAttribute('aria-current')) c.removeAttribute('aria-current');
        var n = rows.reduce(function (sum, r, i) { return sum + (matches[i] && member(r, key) ? 1 : 0); }, 0);
        text(c.querySelector('[data-start-category-count]'), String(n));
      });
      text(one('[data-start-heading]'), label);
      text(one('[data-start-count]'), String(count));
      text(one('[data-start-announcement]'), String(count));
      var empty = one('[data-start-empty]');
      if (empty && empty.hidden !== (count !== 0)) empty.hidden = count !== 0;
      all('[data-start-clear]').forEach(function (c) { if (c.disabled !== !input.value) c.disabled = !input.value; });
      var next = state(), changed = previous && (previous.query !== next.query || previous.category !== next.category || previous.count !== next.count);
      previous = next;
      if (changed && !initial) root.dispatchEvent(new CustomEvent('pudl:start-change', {
        bubbles: true, detail: { query: next.query, category: next.category, count: next.count, reason: reason }
      }));
    }
    function on(el, type, fn) { el.addEventListener(type, fn); listeners.push(function () { el.removeEventListener(type, fn); }); }
    function available() {
      return rows.filter(function (r) { return !r.hasAttribute('data-start-filtered') && !hidden(r); })
        .map(action).filter(enabled);
    }
    function popup() { return root.hasAttribute('popover') && root.matches(':popover-open'); }
    function close() {
      if (!popup()) return false;
      root.hidePopover();
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      return true;
    }
    on(input, 'input', function () { category = ''; draw('query'); });
    on(root, 'click', function (e) {
      var hit = e.target.closest('a[href],button');
      if (hit && hit.closest('[data-start]') === root && !enabled(hit)) { e.preventDefault(); return; }
      var target = e.target.closest('[data-start-clear],[data-start-close],[data-start-category-key]');
      if (!target || target.closest('[data-start]') !== root || !enabled(target)) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (target.hasAttribute('data-start-clear')) {
        e.preventDefault(); input.value = ''; category = ''; draw('clear'); input.focus();
      } else if (target.hasAttribute('data-start-close')) {
        e.preventDefault(); close();
      } else {
        e.preventDefault(); category = target.getAttribute('data-start-category-key'); draw('category'); list.scrollTop = 0;
      }
    });
    on(root, 'keydown', function (e) {
      if (e.target.closest('[data-start]') !== root || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
      if (e.key === 'Escape' && popup() && e.target.closest('[popover]:popover-open') === root) { e.preventDefault(); e.stopPropagation(); close(); return; }
      var items = available();
      if (e.target === input && e.key === 'ArrowDown' && items.length) { e.preventDefault(); items[0].focus(); return; }
      var inNav = nav.contains(e.target), choices = inNav ? categories.filter(enabled) : items;
      var at = choices.indexOf(e.target), next;
      if (at < 0) return;
      if (e.key === 'ArrowDown') next = Math.min(at + 1, choices.length - 1);
      else if (e.key === 'ArrowUp') next = inNav ? Math.max(0, at - 1) : at - 1;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = choices.length - 1;
      else return;
      e.preventDefault(); (next < 0 ? input : choices[next]).focus();
    });
    var form = input.closest('form');
    if (form && root.contains(form)) on(form, 'submit', function (e) {
      e.preventDefault(); var first = available()[0]; if (first) first.click();
    });
    on(root, 'beforetoggle', function (e) {
      if (e.target === root && e.newState === 'open') {
        if (!explicitOpener && !root.contains(document.activeElement)) opener = document.activeElement;
        explicitOpener = false;
      }
    });
    on(root, 'toggle', function (e) {
      if (e.target !== root) return;
      if (e.newState === 'open') { draw('refresh'); input.focus({ preventScroll: true }); if (window.pudlSplit) window.pudlSplit.refresh(root); }
    });
    on(document, 'keydown', function (e) {
      var button = e.target.closest && e.target.closest('[popovertarget]');
      if (!button || button.getAttribute('popovertarget') !== root.id || !enabled(button) || e.key !== 'ArrowDown' || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault(); opener = button;
      if (!popup()) root.showPopover();
      input.focus({ preventScroll: true });
    });
    /* Pointer activation need not focus a button in every engine. Remember
       the native invoker before its click default opens the popover. */
    on(document, 'click', function (e) {
      var button = e.target.closest && e.target.closest('[popovertarget]');
      if (button && !root.contains(button) && button.getAttribute('popovertarget') === root.id && enabled(button) && !popup()) {
        opener = button; explicitOpener = true;
      }
    });
    var observer = new MutationObserver(function (records) {
      if (destroyed) return;
      var relevant = records.some(function (r) {
        var el = r.target.nodeType === 1 ? r.target : r.target.parentElement;
        if (!el || el.closest('[data-start]') !== root || el.closest('[data-start-category-count]')) return false;
        return list.contains(el) || nav.contains(el) || (r.attributeName === 'hidden' && el === root);
      });
      if (relevant) draw('refresh');
    });
    controls.set(root, {
      state: state, refresh: function () { draw('refresh'); },
      setState: function (s) {
        if (!s || typeof s !== 'object') return false;
        if (typeof s.query === 'string') input.value = s.query;
        if (typeof s.category === 'string') category = s.category;
        draw('api'); return true;
      },
      open: function (from) {
        if (!root.hasAttribute('popover') || !root.showPopover || !root.isConnected) return false;
        if (from && typeof from.focus === 'function') { opener = from; explicitOpener = !popup(); }
        if (!popup()) root.showPopover();
        input.focus({ preventScroll: true }); return true;
      }, close: close,
      destroy: function () {
        destroyed = true; observer.disconnect(); listeners.forEach(function (off) { off(); });
        rows.forEach(function (r) { r.removeAttribute('data-start-filtered'); }); controls.delete(root);
      }
    });
    draw('refresh', true);
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['hidden', 'disabled', 'aria-disabled', 'data-start-category', 'data-start-keywords', 'data-start-category-key'] });
    return true;
  }
  function get(root) { return controls.get(root); }
  window.pudlStart = {
    enhance: enhance,
    refresh: function (root) { var c = get(root); if (!c) return false; c.refresh(); return true; },
    state: function (root) { var c = get(root); return c ? c.state() : null; },
    setState: function (root, s) { var c = get(root); return !!c && c.setState(s); },
    open: function (root, from) { var c = get(root); return !!c && c.open(from); },
    close: function (root) { var c = get(root); return !!c && c.close(); },
    destroy: function (root) { var c = get(root); if (!c) return false; c.destroy(); return true; }
  };
  function boot() { document.querySelectorAll('.start-menu[data-start]').forEach(enhance); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
