/* PUDL row editors. Load with defer.

   A row editor is a table of fields with a remove button at each row's end
   and an Add button beneath:

     <div class="row-editor-wrap">
       <table class="row-editor" aria-label="Inputs">
         <thead><tr><th scope="col">Name</th>…<th scope="col" class="row-editor-remove"><span class="visually-hidden">Remove</span></th></tr></thead>
         <tbody>
           <tr>
             <td data-label="Name"><input class="form-input" aria-label="Name of input 1"></td>
             …
             <td class="row-editor-remove"><button type="button" class="icon-btn danger" data-row-remove aria-label="Remove input 1">…</button></td>
           </tr>
           <tr class="row-editor-more"><td colspan="5" data-label="Value to return">…</td></tr>
         </tbody>
       </table>
       <button type="button" class="btn row-editor-add" data-row-add>…Add an Input</button>
     </div>

   The host builds each row, since only it knows the fields. This script
   keeps focus where a reader expects it. A press on a remove button fires
   pudl:row-remove on its row, cancelable, with detail.index; unless the
   host cancels it, the row goes, with a .row-editor-more row that follows
   it, and focus moves to the first field of the next row, else of the
   previous row, else to Add. A host that redraws the editor from its own
   model cancels the event, redraws, and calls pudlRows.focusAfter(editor,
   index) to put focus where the removal would have. A press on Add fires
   pudl:row-add on the editor; the host appends its row and calls
   pudlRows.added(row), or passes the row to pudlRows.add(editor, row),
   which appends and focuses it. */
(function () {
  'use strict';

  function editorOf(el) { return el.closest('.row-editor-wrap') || el.closest('.row-editor'); }
  function table(editor) { return editor.matches('.row-editor') ? editor : editor.querySelector('.row-editor'); }
  function rows(editor) {
    var t = table(editor);
    return t ? Array.from(t.querySelectorAll(':scope > tbody > tr:not(.row-editor-more)')) : [];
  }
  function firstField(row) {
    return row && row.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([data-row-remove]):not([disabled])');
  }
  function addButton(editor) { return editor.querySelector('[data-row-add], .row-editor-add'); }

  function focusAfter(editor, index) {
    var all = rows(editor);
    var target = firstField(all[index]) || firstField(all[index - 1]) || addButton(editor);
    if (target) target.focus();
  }

  function remove(button) {
    var row = button.closest('tr'), editor = editorOf(button);
    if (!row || !editor) return;
    var all = rows(editor), index = all.indexOf(row);
    var ok = row.dispatchEvent(new CustomEvent('pudl:row-remove', { bubbles: true, cancelable: true, detail: { index: index } }));
    if (!ok) return;
    var more = row.nextElementSibling;
    row.remove();
    if (more && more.matches('.row-editor-more')) more.remove();
    focusAfter(editor, index);
    editor.dispatchEvent(new CustomEvent('pudl:row-removed', { bubbles: true, detail: { index: index } }));
  }

  function added(row) {
    var f = firstField(row);
    if (f) f.focus();
  }

  function add(editor, row) {
    var t = table(editor), body = t && t.querySelector(':scope > tbody');
    if (!body) return;
    body.appendChild(row);
    added(row);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.row-editor [data-row-remove]');
    if (b && !b.disabled) { remove(b); return; }
    var a = e.target.closest && e.target.closest('.row-editor-wrap [data-row-add], .row-editor-wrap .row-editor-add');
    if (a && !a.disabled) {
      var editor = editorOf(a);
      if (editor) editor.dispatchEvent(new CustomEvent('pudl:row-add', { bubbles: true }));
    }
  });

  window.pudlRows = { focusAfter: focusAfter, add: add, added: added, rows: rows };
})();
