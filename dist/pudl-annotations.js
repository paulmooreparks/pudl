/* Optional selection actions and margin notes. Applications own annotation
   content, permissions and persistence. All ranges belong to this document. */
(function () {
  'use strict';
  var selections = new Map(), notes = new Map(), queued = false;
  function validRange(range, body) {
    return range && body.isConnected && body.contains(range.startContainer) && body.contains(range.endContainer) && !range.collapsed;
  }
  function focus(el) {
    if (!el || !el.isConnected) return;
    var had = el.hasAttribute('tabindex');
    if (!had) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest' });
    if (!had) el.addEventListener('blur', function () { el.removeAttribute('tabindex'); }, { once: true });
  }
  function updateSelection(body, state) {
    var selection = document.getSelection();
    if (selection && selection.rangeCount && !selection.isCollapsed) {
      var candidate = selection.getRangeAt(0);
      if (validRange(candidate, body)) state.range = candidate.cloneRange();
      else state.range = null;
    } else if (!state.actions.contains(document.activeElement)) state.range = null;
    if (!validRange(state.range, body)) { state.actions.hidden = true; state.range = null; return; }
    if (state.dismissed === state.range.toString()) { state.actions.hidden = true; return; }
    state.actions.hidden = false;
    var rects = state.range.getClientRects(), last = rects[rects.length - 1];
    if (!last) { state.actions.hidden = true; return; }
    var bounds = body.getBoundingClientRect();
    var width = document.documentElement.clientWidth;
    state.actions.style.maxWidth = Math.max(0, Math.min(bounds.width, width) - 8) + 'px';
    var box = state.actions.getBoundingClientRect();
    state.actions.style.left = Math.max(4, bounds.left, Math.min(last.right - box.width / 2, bounds.right - box.width, width - box.width - 4)) + 'px';
    state.actions.style.top = Math.max(4, Math.min(last.bottom + 4, window.innerHeight - box.height - 4)) + 'px';
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      selections.forEach(function (s, body) { updateSelection(body, s); });
      notes.forEach(layoutNotes);
    });
  }
  function selectionActions(body) {
    if (selections.has(body)) return;
    var id = (body.getAttribute('data-selection-actions') || '').replace(/^#/, '');
    var actions = document.getElementById(id);
    if (!actions || body.contains(actions)) return;
    var state = { actions: actions, range: null, dismissed: null, originalHidden: actions.hidden };
    state.down = function (e) { if (e.target.closest('button[data-selection-action]')) e.preventDefault(); };
    state.click = function (e) {
      var button = e.target.closest('button[data-selection-action]');
      if (!button || button.disabled || !validRange(state.range, body)) return;
      var range = state.range.cloneRange();
      body.dispatchEvent(new CustomEvent('pudl:selection-action', { bubbles: true, cancelable: true,
        detail: { action: button.getAttribute('data-selection-action'), range: range, text: range.toString(), button: button } }));
    };
    actions.addEventListener('pointerdown', state.down);
    actions.addEventListener('click', state.click);
    selections.set(body, state);
    actions.hidden = true;
  }
  function anchorFor(state, note) {
    var supplied = state.ranges.get(note);
    if (supplied) return validRange(supplied, state.body) ? supplied : null;
    var el = document.getElementById(note.getAttribute('data-note-for'));
    return el && state.body.contains(el) ? el : null;
  }
  function layoutNotes(state) {
    if (!state.container.isConnected) return;
    state.observer.disconnect();
    var container = state.container, bodyBox = state.body.getBoundingClientRect(), bounds = container.getBoundingClientRect();
    var rtl = getComputedStyle(container).direction === 'rtl';
    var rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    var width = 14 * rem, gap = rem, available = rtl ? bodyBox.left - bounds.left : bounds.right - bodyBox.right;
    var beside = available >= width + gap, floor = 0;
    container.toggleAttribute('data-notes-beside', beside);
    state.items.slice().sort(function (a, b) {
      var first = anchorFor(state, a.note), second = anchorFor(state, b.note);
      return (first ? first.getBoundingClientRect().top : Infinity) - (second ? second.getBoundingClientRect().top : Infinity);
    }).forEach(function (item) {
      var anchor = anchorFor(state, item.note);
      item.marker.hidden = !anchor || beside;
      item.back.hidden = !anchor;
      if (!anchor) { item.note.style.position = ''; item.note.style.top = ''; item.note.style.width = ''; return; }
      var rect = anchor.getBoundingClientRect();
      if (beside) {
        item.note.style.position = 'absolute';
        item.note.style.width = width + 'px';
        item.note.style.left = (rtl ? bodyBox.left - bounds.left - width - gap : bodyBox.right - bounds.left + gap) + container.scrollLeft + 'px';
        var top = Math.max(0, rect.top - bounds.top + container.scrollTop, floor);
        item.note.style.top = top + 'px';
        floor = top + item.note.getBoundingClientRect().height + gap / 2;
      } else {
        item.note.style.position = ''; item.note.style.top = ''; item.note.style.left = ''; item.note.style.width = '';
        var node = anchor.startContainer || anchor;
        var el = node.nodeType === 1 ? node : node.parentElement;
        var block = el.closest('p,li,pre,blockquote,h1,h2,h3,h4,h5,h6,table') || el;
        if (block !== state.body && state.body.contains(block)) {
          if (block.tagName === 'LI') block.appendChild(item.marker);
          else block.insertAdjacentElement('afterend', item.marker);
        }
      }
    });
    container.style.minHeight = beside ? floor + 'px' : '';
    state.observer.observe(container, { childList: true, subtree: true, characterData: true });
  }
  function enhanceNotes(container) {
    if (notes.has(container)) return;
    var body = container.querySelector('.noted-body');
    if (!body) return;
    var state = { container: container, body: body, ranges: new Map(), items: [], minHeight: container.style.minHeight };
    container.querySelectorAll('.margin-note').forEach(function (note, i) {
      var marker = document.createElement('button');
      marker.type = 'button'; marker.className = 'btn btn-sm note-marker'; marker.textContent = String(i + 1);
      marker.setAttribute('aria-label', note.getAttribute('data-note-label') || 'Note ' + (i + 1));
      var back = document.createElement('button');
      back.type = 'button'; back.className = 'btn btn-sm note-back';
      back.textContent = container.getAttribute('data-notes-back-text') || 'Show passage';
      note.appendChild(back); container.appendChild(marker);
      marker.addEventListener('click', function () { focus(note); });
      back.addEventListener('click', function () {
        var anchor = anchorFor(state, note), node = anchor && (anchor.startContainer || anchor);
        focus(node && (node.nodeType === 1 ? node : node.parentElement));
      });
      state.items.push({ note: note, marker: marker, back: back, style: note.getAttribute('style') });
    });
    state.observer = new MutationObserver(schedule);
    state.resize = new ResizeObserver(schedule);
    state.resize.observe(container); state.resize.observe(body);
    state.items.forEach(function (item) { state.resize.observe(item.note); });
    notes.set(container, state); layoutNotes(state);
  }
  function enhance(root) {
    root = root || document;
    if (root.matches && root.matches('[data-selection-actions]')) selectionActions(root);
    root.querySelectorAll('[data-selection-actions]').forEach(selectionActions);
    if (root.matches && root.matches('.noted')) enhanceNotes(root);
    root.querySelectorAll('.noted').forEach(enhanceNotes);
    schedule();
  }
  function destroy(root) {
    selections.forEach(function (s, body) {
      if (body !== root && !root.contains(body)) return;
      s.actions.removeEventListener('pointerdown', s.down); s.actions.removeEventListener('click', s.click);
      s.actions.hidden = s.originalHidden;
      ['left', 'top', 'max-width'].forEach(function (p) { s.actions.style.removeProperty(p); });
      selections.delete(body);
    });
    notes.forEach(function (s, container) {
      if (container !== root && !root.contains(container)) return;
      s.observer.disconnect(); s.resize.disconnect();
      s.items.forEach(function (item) {
        item.marker.remove(); item.back.remove();
        if (item.style == null) item.note.removeAttribute('style'); else item.note.setAttribute('style', item.style);
      });
      container.removeAttribute('data-notes-beside'); container.style.minHeight = s.minHeight; notes.delete(container);
    });
  }
  document.addEventListener('selectionchange', function () { selections.forEach(function (s) { s.dismissed = null; }); schedule(); });
  document.addEventListener('focusin', schedule);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    selections.forEach(function (s) { if (s.range) s.dismissed = s.range.toString(); s.actions.hidden = true; });
  });
  window.addEventListener('resize', schedule);
  window.addEventListener('scroll', schedule, true);
  if (document.fonts) document.fonts.addEventListener('loadingdone', schedule);
  window.pudlAnnotations = {
    enhance: enhance, refresh: schedule, destroy: destroy,
    setRange: function (container, note, range) {
      var state = notes.get(container);
      if (!state || !state.items.some(function (item) { return item.note === note; })) return false;
      if (range && !validRange(range, state.body)) return false;
      if (range) state.ranges.set(note, range.cloneRange()); else state.ranges.delete(note);
      schedule(); return true;
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enhance(); }); else enhance();
})();
