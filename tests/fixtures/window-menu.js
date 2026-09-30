/* The applet and plain content of window-menu.html and its page. */
pudlApplets.define('counter', { page: 'window-menu-page.html' });
pudlApplets.register('counter', {
  init: function (root) {
    var n = 0, wrap = false;
    function show() { root.setAttribute('data-count', String(n)); root.setAttribute('data-wrap', String(wrap)); }
    show();
    return {
      commands: function () {
        return [
          { label: 'Add one', run: function () { n++; show(); } },
          { label: 'Wrap lines', checked: wrap, run: function () { wrap = !wrap; show(); } },
          { label: 'Clear', disabled: n === 0, run: function () { n = 0; show(); } }
        ];
      },
      destroy: function () {}
    };
  }
});
document.addEventListener('pudl:window-menu', function (e) {
  if (e.detail.key !== 'notes') return;
  e.detail.add('Shout', function () { document.getElementById('notes-text').textContent = 'PLAIN CONTENT.'; });
});
