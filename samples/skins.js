/* Preview selection only. The release skin registry and persistence API
   are separate work; this page exposes its selection in the URL. */
(function () {
  'use strict';
  var root = document.documentElement, skin = document.getElementById('skin'), theme = document.getElementById('theme'), palette = document.getElementById('palette');
  function restore() {
    var query = new URLSearchParams(location.search);
    skin.value = Array.prototype.some.call(skin.options, function (option) { return option.value === query.get('skin'); }) ? query.get('skin') : 'bevel';
    theme.value = query.get('theme') === 'dark' ? 'dark' : 'light';
    palette.value = ['bevel', 'gel', 'glaze'].indexOf(query.get('palette')) >= 0 ? query.get('palette') : 'standard';
    root.setAttribute('data-skin', skin.value);
    root.setAttribute('data-theme', theme.value);
    root.setAttribute('data-palette', palette.value);
    document.querySelector('h1').textContent = skin.options[skin.selectedIndex].text;
    var glassNote = document.getElementById('glass-transparency');
    glassNote.hidden = skin.value !== 'glass';
    glassNote.textContent = window.matchMedia('(prefers-reduced-transparency: reduce)').matches
      ? 'Glass title preview 3. Your browser requests reduced transparency, so the title bars are opaque.'
      : window.matchMedia('(prefers-reduced-transparency: no-preference)').matches && CSS.supports('backdrop-filter', 'blur(2px)')
        ? 'Glass title preview 3. Translucent title bars are enabled. Overlap a title bar with text in the other window to see through it.'
        : 'Glass title preview 3. Transparency is unavailable in this browser, so the title bars are opaque.';

  }
  function select() {
    var address = new URL(location.href);
    address.searchParams.set('skin', skin.value);
    address.searchParams.set('theme', theme.value);
    address.searchParams.set('palette', palette.value);
    history.replaceState(history.state, '', address);
    restore();
  }
  skin.addEventListener('change', select);
  theme.addEventListener('change', select);
  palette.addEventListener('change', select);
  window.addEventListener('popstate', restore);
  window.matchMedia('(prefers-reduced-transparency: reduce)').addEventListener('change', restore);
  restore();
})();
