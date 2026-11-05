/* The host owns routing and theme choices. The control owns interaction. */
(function () {
  'use strict';
  var root = document.getElementById('launcher');
  function restore() {
    var params = new URL(location.href).searchParams;
    pudlStart.setState(root, { query: params.get('q') || '', category: params.get('category') || '' });
  }
  var restoring = false;
  function readAddress() { restoring = true; restore(); restoring = false; }
  root.addEventListener('pudl:start-change', function (e) {
    if (restoring) return;
    var url = new URL(location.href), s = e.detail;
    if (s.query) url.searchParams.set('q', s.query); else url.searchParams.delete('q');
    if (s.category) url.searchParams.set('category', s.category); else url.searchParams.delete('category');
    if (url.href !== location.href) history[s.reason === 'category' ? 'pushState' : 'replaceState'](null, '', url);
  });
  window.addEventListener('popstate', readAddress);
  document.getElementById('theme').addEventListener('click', function (e) {
    var light = document.documentElement.getAttribute('data-theme') !== 'light';
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    e.currentTarget.textContent = light ? 'Dark theme' : 'Light theme';
  });
  readAddress();
  pudlStart.open(root, document.getElementById('start'));
})();
