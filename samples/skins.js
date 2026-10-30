/* Preview selection only. The release skin registry and persistence API
   are separate work; this page exposes its selection in the URL. */
(function () {
  'use strict';
  var root = document.documentElement, skin = document.getElementById('skin'), theme = document.getElementById('theme');
  function restore() {
    var query = new URLSearchParams(location.search);
    skin.value = ['standard', 'bevel', 'gel', 'glaze'].indexOf(query.get('skin')) >= 0 ? query.get('skin') : 'bevel';
    theme.value = query.get('theme') === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-skin', skin.value);
    root.setAttribute('data-theme', theme.value);
    document.querySelector('h1').textContent = skin.options[skin.selectedIndex].text;
  }
  function select() {
    var address = new URL(location.href);
    address.searchParams.set('skin', skin.value);
    address.searchParams.set('theme', theme.value);
    history.replaceState(history.state, '', address);
    restore();
  }
  skin.addEventListener('change', select);
  theme.addEventListener('change', select);
  window.addEventListener('popstate', restore);
  restore();
})();
