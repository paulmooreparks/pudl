/* The document contributes its identity, working menus and shared View item.
   The page opts into application composition without rewriting this model. */
pudlApplets.define('application-note', {});
pudlApplets.register('application-note', {
  init: function (root) {
    root.innerHTML = '<label for="application-note-text">Document</label><textarea class="form-textarea" id="application-note-text">Write a note here.</textarea><p role="status" class="text-muted">Changes stay in this sample.</p>';
    var area = root.querySelector('textarea'), status = root.querySelector('[role="status"]'), wrap = true, downloads = [];
    return {
      menus: function () {
        return {
          titles: [
            { label: 'Document', items: [{ label: 'About this document', run: function () { status.textContent = 'This document supplies commands to Notebook.'; } }] },
            { id: 'file', label: 'File', items: [{ label: 'Download note', shortcut: 'Mod+S', run: function () {
              var url = URL.createObjectURL(new Blob([area.value], { type: 'text/plain;charset=utf-8' }));
              downloads.push(url);
              var link = document.createElement('a'); link.href = url; link.download = 'note.txt'; link.click();
            } }] },
            { id: 'edit', label: 'Edit', items: [{ label: 'Select document', run: function () { area.focus(); area.select(); } }] }
          ],
          into: { view: [{ label: 'Wrap lines', checked: wrap, run: function () { wrap = !wrap; area.wrap = wrap ? 'soft' : 'off'; } }] }
        };
      },
      destroy: function () { downloads.forEach(function (url) { URL.revokeObjectURL(url); }); }
    };
  }
});
