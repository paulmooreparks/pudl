/* The applets of menubar.html, and the host's own buttons. */
window.__log = [];
pudlApplets.define('notes', {});
pudlApplets.define('counter', {});
pudlApplets.register('notes', {
  init: function (root) {
    var wrap = false, dirty = true;
    root.innerHTML = '<textarea id="note" class="form-textarea" aria-label="Note"></textarea>';
    root.querySelector('textarea').addEventListener('input', function () { dirty = true; });
    return {
      menus: function () {
        if (window.__menus) return window.__menus(root);
        return {
          titles: [
            { label: 'Notes', items: [{ label: 'About Notes', run: function () { __log.push('about'); } }] },
            { label: 'File', items: [
              { label: 'Save', run: function () { __log.push('save'); dirty = false; }, shortcut: 'Mod+S', disabled: !dirty },
              { label: 'New window', run: function () {}, shortcut: 'Mod+N' },
              '-',
              { label: 'Change case', items: [
                { label: 'Upper case', run: function () { __log.push('upper'); } },
                { label: 'Lower case', run: function () { __log.push('lower'); } }] },
              { heading: 'Danger' },
              { label: 'Clear the note', run: function () { __log.push('clear'); }, danger: true }] },
            { label: 'View', items: [{ label: 'Clashing', run: function () {} }] }],
          into: {
            View: [{ label: 'Wrap lines', run: function () { wrap = !wrap; __log.push('wrap ' + wrap); }, checked: wrap }],
            Help: [{ label: 'Notes keyboard shortcuts', run: function () { __log.push('keys'); } }],
            Nowhere: [{ label: 'Lost', run: function () {} }]
          }
        };
      },
      destroy: function () {}
    };
  }
});
pudlApplets.register('counter', {
  init: function (root) {
    var n = 0;
    root.textContent = '0';
    return {
      commands: function () { return [{ label: 'Add one', run: function () { n++; root.textContent = String(n); } }]; },
      destroy: function () {}
    };
  }
});
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('#wide');
  if (b) { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); __log.push('wide ' + b.getAttribute('aria-pressed')); }
  if (e.target.closest && e.target.closest('#all-min')) { pudlWindows.minimizeAll(); __log.push('min all'); }
});
