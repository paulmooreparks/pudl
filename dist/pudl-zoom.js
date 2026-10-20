/* PUDL zoom. Load with defer.

   A zoom group scales a picture larger than the viewport it scrolls in:

     <div class="zoom" role="group" aria-label="Chart zoom" data-zoom-for="chart">
       <button type="button" class="icon-btn" data-zoom="out" aria-label="Zoom Out"><span class="glyph" style="--glyph: var(--glyph-minus)" aria-hidden="true"></span></button>
       <output class="zoom-scale" aria-live="polite">100%</output>
       <button type="button" class="icon-btn" data-zoom="in" aria-label="Zoom In"><span class="glyph" style="--glyph: var(--glyph-plus)" aria-hidden="true"></span></button>
       <button type="button" class="btn btn-sm" data-zoom="fit">Fit</button>
     </div>
     <div class="zoom-viewport" id="chart" tabindex="0" aria-label="Flow chart"
          data-zoom-min="0.05" data-zoom-max="8" data-zoom-step="1.25">
       <svg …></svg>
     </div>

   The group belongs to the viewport data-zoom-for names, or to the next
   .zoom-viewport after it. The viewport's first svg or img is drawn at its
   own size times the scale. Zoom Out and Zoom In divide and multiply the
   scale by the step, within the limits, keeping the viewport's middle in
   place; Fit fills the viewport's width, no larger than the picture's own
   size, and scrolls to the start. While the viewport has focus, Ctrl with
   Plus, Minus and 0 zoom, and Ctrl with the wheel zooms about the pointer.

   pudl:zoom fires on the viewport with detail.scale and detail.fit after
   each change. A page restores a scale with data-zoom-scale, or
   data-zoom-fit, on the viewport, or with pudlZoom.set(viewport, scale)
   and pudlZoom.fit(viewport). pudlZoom.enhance(root) takes in viewports a
   host has added, and pudlZoom.refresh(viewport) lays one out again after
   its picture changed. */
(function () {
  'use strict';
  var records = new WeakMap();

  function number(el, name, fallback) {
    var n = parseFloat(el.getAttribute(name));
    return isFinite(n) && n > 0 ? n : fallback;
  }

  function picture(viewport) { return viewport.querySelector(':scope > svg, :scope > img'); }

  /* A picture's own size: an SVG's viewBox or attributes, an image's
     natural size, or else its box as first laid out. */
  function ownSize(pic) {
    if (pic.tagName.toLowerCase() === 'img') return { w: pic.naturalWidth, h: pic.naturalHeight };
    var vb = pic.viewBox && pic.viewBox.baseVal;
    if (vb && vb.width && vb.height) return { w: vb.width, h: vb.height };
    var w = parseFloat(pic.getAttribute('width')), h = parseFloat(pic.getAttribute('height'));
    if (w > 0 && h > 0) return { w: w, h: h };
    var r = pic.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  function record(viewport) {
    var p = records.get(viewport);
    if (p) return p;
    p = { viewport: viewport, scale: 1, fit: true, size: null, groups: [] };
    records.set(viewport, p);
    return p;
  }

  function groupsFor(viewport) {
    var out = [];
    document.querySelectorAll('.zoom').forEach(function (g) {
      var id = g.getAttribute('data-zoom-for');
      if (id ? viewport.id === id : nextViewport(g) === viewport) out.push(g);
    });
    return out;
  }
  function nextViewport(g) {
    for (var n = g.nextElementSibling; n; n = n.nextElementSibling) {
      if (n.matches('.zoom-viewport')) return n;
      var inner = n.querySelector && n.querySelector('.zoom-viewport');
      if (inner) return inner;
    }
    return null;
  }

  function limits(p) {
    return { min: number(p.viewport, 'data-zoom-min', 0.05), max: number(p.viewport, 'data-zoom-max', 8), step: number(p.viewport, 'data-zoom-step', 1.25) };
  }

  function fitScale(p) {
    var inner = p.viewport.clientWidth;
    return p.size && p.size.w && inner ? Math.min(1, inner / p.size.w) : 1;
  }

  /* Lays the picture out at the scale, keeping the point at a fraction of
     the viewport, its middle unless told otherwise, where it was. */
  function layout(p, at, scale) {
    var pic = picture(p.viewport);
    if (!pic) return;
    if (!p.size) p.size = ownSize(pic);
    if (!p.size.w || !p.size.h) return;
    var l = limits(p), v = p.viewport;
    var old = p.scale;
    if (p.fit) p.scale = Math.max(l.min, Math.min(l.max, fitScale(p)));
    else p.scale = Math.max(l.min, Math.min(l.max, scale != null ? scale : p.scale));
    at = at || { x: 0.5, y: 0.5 };
    var px = (v.scrollLeft + v.clientWidth * at.x) / old, py = (v.scrollTop + v.clientHeight * at.y) / old;
    pic.style.width = p.size.w * p.scale + 'px';
    pic.style.height = p.size.h * p.scale + 'px';
    if (p.fit) { v.scrollLeft = 0; v.scrollTop = 0; }
    else { v.scrollLeft = px * p.scale - v.clientWidth * at.x; v.scrollTop = py * p.scale - v.clientHeight * at.y; }
    p.groups.forEach(function (g) {
      var out = g.querySelector('[data-zoom="out"]'), inn = g.querySelector('[data-zoom="in"]'), scale = g.querySelector('.zoom-scale');
      if (out) out.disabled = p.scale <= l.min + 1e-9;
      if (inn) inn.disabled = p.scale >= l.max - 1e-9;
      if (scale) scale.textContent = Math.round(p.scale * 100) + '%';
    });
  }

  function change(p, scale, fit, at) {
    p.fit = !!fit;
    layout(p, at, fit ? null : scale);
    p.viewport.dispatchEvent(new CustomEvent('pudl:zoom', { bubbles: true, detail: { scale: p.scale, fit: p.fit } }));
  }

  function step(p, factor, at) { change(p, p.scale * factor, false, at); }

  function enhance(root) {
    (root || document).querySelectorAll('.zoom-viewport').forEach(function (v) {
      var p = record(v);
      p.groups = groupsFor(v);
      if (p.ready) return;
      p.ready = true;
      if (!v.hasAttribute('tabindex')) v.tabIndex = 0;
      if (v.hasAttribute('data-zoom-scale')) { p.fit = false; p.scale = number(v, 'data-zoom-scale', 1); }
      else p.fit = v.getAttribute('data-zoom-fit') !== 'false';
      var pic = picture(v);
      if (pic && pic.tagName.toLowerCase() === 'img' && !pic.complete) pic.addEventListener('load', function () { p.size = null; layout(p); }, { once: true });
      layout(p);
      if (window.ResizeObserver) new ResizeObserver(function () { if (p.fit) layout(p); }).observe(v);
      v.addEventListener('keydown', function (e) {
        if (!e.ctrlKey && !e.metaKey) return;
        var l = limits(p);
        if (e.key === '+' || e.key === '=') { e.preventDefault(); step(p, l.step); }
        else if (e.key === '-' || e.key === '_') { e.preventDefault(); step(p, 1 / l.step); }
        else if (e.key === '0') { e.preventDefault(); change(p, 1, true); }
      });
      v.addEventListener('wheel', function (e) {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        var r = v.getBoundingClientRect(), l = limits(p);
        var at = { x: (e.clientX - r.left) / (r.width || 1), y: (e.clientY - r.top) / (r.height || 1) };
        step(p, e.deltaY < 0 ? l.step : 1 / l.step, at);
      }, { passive: false });
    });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.zoom [data-zoom]');
    if (!b || b.disabled) return;
    var g = b.closest('.zoom'), id = g.getAttribute('data-zoom-for');
    var v = id ? document.getElementById(id) : nextViewport(g);
    if (!v) return;
    var p = record(v), l = limits(p), what = b.getAttribute('data-zoom');
    if (what === 'in') step(p, l.step);
    else if (what === 'out') step(p, 1 / l.step);
    else if (what === 'fit') change(p, 1, true);
  });

  window.pudlZoom = {
    enhance: enhance,
    refresh: function (v) { var p = records.get(v); if (p) { p.size = null; layout(p); } },
    set: function (v, scale) { var p = records.get(v); if (p && isFinite(scale) && scale > 0) change(p, scale, false); },
    fit: function (v) { var p = records.get(v); if (p) change(p, 1, true); },
    state: function (v) { var p = records.get(v); return p ? { scale: p.scale, fit: p.fit } : null; }
  };
  /* Viewports the page adds, and zoom controls that may belong to one
     already there, are noticed among the nodes it adds, not by searching
     the whole page after every change in it (0.69.3). */
  new MutationObserver(function (records) {
    var again = false;
    records.forEach(function (r) {
      Array.prototype.forEach.call(r.addedNodes, function (n) {
        if (n.nodeType === 1 && (n.matches('.zoom-viewport, .zoom') || (n.firstElementChild && n.querySelector('.zoom-viewport, .zoom')))) again = true;
      });
    });
    if (again) enhance();
  }).observe(document.documentElement, { subtree: true, childList: true });
  document.addEventListener('pudl:regions-swap', function () { enhance(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enhance(); }); else enhance();
})();
