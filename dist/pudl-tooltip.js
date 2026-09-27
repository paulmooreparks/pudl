/* PUDL tooltips. Load with defer.

   A tooltip names a control that shows only a glyph. It appears for any
   element with data-tooltip, and for the glyph-only controls PUDL knows,
   icon buttons, window buttons, dismiss buttons and a filter's apply
   button, from their aria-label. It appears after a moment of hover, or at
   once when keyboard focus arrives; it stays while the pointer moves onto
   it; and Escape dismisses it, as WCAG 1.4.13 asks. It sits above the
   control, or below when there is no room above.

   A native title on the same control would show a second, unstyled
   tooltip, so the script moves a title into data-tooltip. When the
   tooltip's text is not the control's accessible name, the control is
   described by it through aria-describedby. */
(function () {
  'use strict';

  var SHOW_DELAY = 450;
  var HIDE_DELAY = 150;
  var GAP = 6, EDGE = 8;
  var SUBJECTS = '[data-tooltip], .icon-btn[aria-label], .win-btn[aria-label], .notice-close[aria-label], ' +
                 '.toast-close[aria-label], .md-filter-go[aria-label], .filter-chip-x[aria-label]';

  var tip = null, owner = null, showTimer = 0, hideTimer = 0;

  function el() {
    if (tip) return tip;
    tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.id = 'pudl-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.setAttribute('popover', 'manual');
    tip.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
    tip.addEventListener('mouseleave', scheduleHide);
    document.body.appendChild(tip);
    return tip;
  }

  function textFor(target) {
    return target.getAttribute('data-tooltip') || target.getAttribute('aria-label') || '';
  }

  function place(target) {
    var r = target.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    tip.style.margin = '0';
    tip.style.inset = 'auto';
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var top = r.top - GAP - h;
    if (top < EDGE) top = r.bottom + GAP;
    var left = Math.max(EDGE, Math.min(r.left + r.width / 2 - w / 2, vw - w - EDGE));
    tip.style.top = Math.round(top) + 'px';
    tip.style.left = Math.round(left) + 'px';
  }

  function show(target) {
    clearTimeout(hideTimer);
    var text = textFor(target);
    if (!text) return;
    var t = el();
    t.textContent = text;
    owner = target;
    if (text !== target.getAttribute('aria-label')) {
      var d = (target.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (d.indexOf(t.id) < 0) target.setAttribute('aria-describedby', d.concat(t.id).join(' '));
    }
    t.classList.add('placing');
    if (!t.matches(':popover-open')) t.showPopover();
    place(target);
    t.classList.remove('placing');
  }

  function hide() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    if (tip && tip.matches(':popover-open')) tip.hidePopover();
    owner = null;
  }

  function scheduleHide() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, HIDE_DELAY);
  }

  function subjectOf(node) {
    var s = node && node.closest && node.closest(SUBJECTS);
    if (!s) return null;
    if (s.hasAttribute('title')) {
      if (!s.hasAttribute('data-tooltip') && s.getAttribute('title') !== s.getAttribute('aria-label')) {
        s.setAttribute('data-tooltip', s.getAttribute('title'));
      }
      s.removeAttribute('title');
    }
    return s;
  }

  document.addEventListener('mouseover', function (e) {
    var s = subjectOf(e.target);
    if (!s) return;
    if (s === owner) { clearTimeout(hideTimer); return; }
    clearTimeout(showTimer);
    showTimer = setTimeout(function () { show(s); }, owner ? 0 : SHOW_DELAY);
  });

  document.addEventListener('mouseout', function (e) {
    var s = subjectOf(e.target);
    if (!s) return;
    if (e.relatedTarget && (s.contains(e.relatedTarget) || (tip && tip.contains(e.relatedTarget)))) return;
    scheduleHide();
  });

  document.addEventListener('focusin', function (e) {
    var s = subjectOf(e.target);
    if (s && s.matches(':focus-visible')) show(s);
  });
  document.addEventListener('focusout', function (e) {
    if (subjectOf(e.target)) hide();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && tip && tip.matches(':popover-open')) {
      hide();
      e.stopPropagation();
    }
  }, true);

  document.addEventListener('pointerdown', hide, true);
  window.addEventListener('scroll', hide, true);
})();
