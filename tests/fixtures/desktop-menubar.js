/* The editor applet of desktop-menubar.html: a text area, a Document
   menu with declared letters, a radio group, and rows with details. */
window.__log = [];
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-menubar-source] button');
  if (b) __log.push(b.id);
});
pudlApplets.define('editor', {});
pudlApplets.register('editor', {
  init: function (root) {
    root.innerHTML = '<textarea id="editor-text" class="form-textarea" aria-label="Text" rows="4">Some text</textarea>';
    var view = 'text';
    return {
      menus: function () {
        return {
          titles: [
            { label: 'Document', mnemonic: 'o', items: [
              { label: 'Save', mnemonic: 's', run: function () { __log.push('save'); }, shortcut: 'Mod+S' },
              { label: 'Save As…', mnemonic: 'v', run: function () { __log.push('save-as'); } },
              { label: 'Publish', mnemonic: 'p', run: function () { __log.push('publish'); }, disabled: true, reason: 'The document has not been saved' },
              { label: 'Stop the Run', run: function () { __log.push('stop'); }, danger: true, glyph: 'stop' },
              { label: 'Continue From', items: [
                { label: 'Draft', run: function () { __log.push('from-draft'); } },
                { label: 'Review', run: function () { __log.push('from-review'); } }] }] },
            { label: 'Edit', mnemonic: 'e', items: [
              { label: 'Undo', run: function () { __log.push('undo'); }, shortcut: 'Mod+Z' },
              { label: 'Text', radio: 'view', checked: view === 'text', run: function () { view = 'text'; } },
              { label: 'Preview', radio: 'view', checked: view === 'preview', run: function () { view = 'preview'; } },
              { label: 'Find Next', run: function () { __log.push('find-next'); }, shortcut: 'F3' }] }]
        };
      },
      destroy: function () {}
    };
  }
});
