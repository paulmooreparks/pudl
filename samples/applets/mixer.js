/* A sample PUDL applet: mixes two colours the way PUDL's stylesheet derives
   its raised and sunken surfaces, with CSS color-mix() in sRGB.

   In a page of its own it keeps the mix in the page's URL, and every change
   is a history entry, so Back undoes it. In a window the windows own the
   URL, so it leaves the URL alone, and its link points at its own page with
   the current mix, which works from anywhere. */
(function () {
  'use strict';

  var DEFAULTS = { a: '#2c5282', b: '#ffffff', p: 60 };
  var HEX = /^#[0-9a-f]{6}$/i;

  function read(params) {
    var a = '#' + (params.get('a') || '').replace(/^#/, '');
    var b = '#' + (params.get('b') || '').replace(/^#/, '');
    var p = parseInt(params.get('p'), 10);
    return {
      a: HEX.test(a) ? a.toLowerCase() : DEFAULTS.a,
      b: HEX.test(b) ? b.toLowerCase() : DEFAULTS.b,
      p: p >= 0 && p <= 100 ? p : DEFAULTS.p
    };
  }

  function query(s) {
    return 'a=' + s.a.slice(1) + '&b=' + s.b.slice(1) + '&p=' + s.p;
  }

  /* The same arithmetic as color-mix(in srgb, a p%, b). */
  function mix(s) {
    var out = '#';
    for (var i = 1; i < 7; i += 2) {
      var x = parseInt(s.a.substr(i, 2), 16), y = parseInt(s.b.substr(i, 2), 16);
      var v = Math.round(x * s.p / 100 + y * (100 - s.p) / 100);
      out += (v < 16 ? '0' : '') + v.toString(16);
    }
    return out;
  }

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text) n.textContent = text;
    return n;
  }

  function init(root, opts) {
    var id = 'mixer-' + Math.random().toString(36).slice(2, 8);
    var state = read(opts.ownsUrl ? new URLSearchParams(location.search) : new URLSearchParams(root.getAttribute('data-mix') || ''));
    var off = new AbortController();

    root.textContent = '';
    root.classList.add('mixer');
    var inputs = el('div', { class: 'mixer-inputs' });
    var aLabel = el('label', { class: 'form-label', for: id + '-a' }, 'First colour');
    var aIn = el('input', { type: 'color', id: id + '-a' });
    var bLabel = el('label', { class: 'form-label', for: id + '-b' }, 'Second colour');
    var bIn = el('input', { type: 'color', id: id + '-b' });
    var pLabel = el('label', { class: 'form-label', for: id + '-p' }, 'Share of the first');
    var pIn = el('input', { type: 'range', id: id + '-p', min: '0', max: '100', step: '1' });
    var pOut = el('output', { for: id + '-p', class: 'mixer-pct' });
    inputs.append(aLabel, aIn, bLabel, bIn, pLabel, el('div', { class: 'mixer-range' }));
    inputs.lastChild.append(pIn, pOut);

    var swatch = el('div', { class: 'mixer-swatch', role: 'img' });
    var table = el('table', { class: 'kv-table' });
    var cssRow = el('tr'); cssRow.append(el('th', {}, 'CSS'), el('td')); var cssCell = el('code');
    cssRow.lastChild.append(cssCell);
    var hexRow = el('tr'); hexRow.append(el('th', {}, 'Result'), el('td')); var hexCell = el('code');
    hexRow.lastChild.append(hexCell);
    table.append(cssRow, hexRow);

    var foot = el('p', { class: 'mixer-foot' });
    var share = el('a', {}, opts.ownsUrl ? 'Link to this mix' : 'Open this mix in its own page');
    var note = el('span', {}, opts.ownsUrl ? ' Back undoes each change.' : '');
    foot.append(share, note);

    root.append(inputs, swatch, table, foot);

    function show() {
      aIn.value = state.a; bIn.value = state.b; pIn.value = String(state.p);
      pOut.textContent = state.p + '%';
      var css = 'color-mix(in srgb, ' + state.a + ' ' + state.p + '%, ' + state.b + ')';
      swatch.style.background = css;
      swatch.setAttribute('aria-label', 'The mixed colour, ' + mix(state));
      cssCell.textContent = css;
      hexCell.textContent = mix(state);
      share.href = opts.pageUrl + '?' + query(state);
    }

    function changed(push) {
      state = { a: aIn.value.toLowerCase(), b: bIn.value.toLowerCase(), p: parseInt(pIn.value, 10) };
      show();
      if (push && opts.ownsUrl) {
        var url = location.pathname + '?' + query(state) + location.hash;
        if (url !== location.pathname + location.search + location.hash) history.pushState(null, '', url);
      }
    }

    /* Every listener goes through one AbortController, so destroy() removes
       them all, including the one on window, which would otherwise outlive
       the applet. */
    var sig = { signal: off.signal };
    aIn.addEventListener('input', function () { changed(false); }, sig);
    bIn.addEventListener('input', function () { changed(false); }, sig);
    pIn.addEventListener('input', function () { changed(false); }, sig);
    aIn.addEventListener('change', function () { changed(true); }, sig);
    bIn.addEventListener('change', function () { changed(true); }, sig);
    pIn.addEventListener('change', function () { changed(true); }, sig);
    if (opts.ownsUrl) {
      window.addEventListener('popstate', function () {
        state = read(new URLSearchParams(location.search));
        show();
      }, sig);
    }

    show();
    return {
      destroy: function () {
        off.abort();
        root.textContent = '';
        root.classList.remove('mixer');
      }
    };
  }

  pudlApplets.register('mixer', { init: init });
})();
