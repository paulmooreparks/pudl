/* This adapter owns URL navigation. It never minimizes windows or keeps a
   hidden restoration set. Width remains a reader preference. */
(function () {
  'use strict';
  var layout = document.querySelector('[data-md-persistent]');
  function render() {
    var url = new URL(location.href);
    pudlMd.setPane(layout, url.searchParams.get('article') && url.searchParams.get('pane') === 'detail' ? 'detail' : 'list');
  }
  layout.addEventListener('pudl:md-request', function (e) {
    var url = new URL(location.href);
    if (e.detail.pane === 'detail' && !url.searchParams.has('article')) return;
    url.searchParams.set('pane', e.detail.pane);
    history.pushState(null, '', url);
    pudlMd.setPane(layout, e.detail.pane, e.detail.requestId);
  });
  layout.addEventListener('click', function (e) {
    var link = e.target.closest('[data-article], [data-pane-link]');
    if (!link || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); history.pushState(null, '', link.href); render();
  });
  document.getElementById('theme').addEventListener('click', function () { pudlToggleTheme(); });
  window.addEventListener('popstate', render);
  render();
})();
