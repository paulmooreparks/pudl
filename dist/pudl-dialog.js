/* PUDL dialogs. Load with defer. A PUDL dialog is a native
   <dialog class="dialog"> that the server renders into the page, and a
   button opens or closes it with the HTML command attributes:

     <button class="btn" commandfor="discard" command="show-modal">Discard…</button>
     <dialog class="dialog" id="discard" aria-labelledby="discard-title">
       <h3 class="dialog-title" id="discard-title">Discard unsaved changes?</h3>
       …
       <button class="btn" commandfor="discard" command="close">Keep editing</button>
     </dialog>

   Browsers that know these attributes need nothing from this script. For
   those that do not yet, it does the same thing: show-modal opens the
   dialog with showModal(), close closes it, and request-close asks it to
   close, which its cancel handler may refuse in a browser that has
   requestClose(), and otherwise closes it. A form
   inside the dialog with method="dialog" closes it on submission without
   any script at all. */
(function () {
  'use strict';

  if ('command' in HTMLButtonElement.prototype) return;

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('button[commandfor][command]');
    if (!btn || btn.disabled) return;
    var target = document.getElementById(btn.getAttribute('commandfor'));
    if (!target || target.tagName !== 'DIALOG') return;
    var command = btn.getAttribute('command');
    if (command === 'show-modal') {
      if (!target.open) target.showModal();
    } else if (command === 'close') {
      if (target.open) target.close(btn.value || undefined);
    } else if (command === 'request-close') {
      /* request-close lets the dialog's cancel handler refuse, where the
         browser has requestClose(); otherwise it closes as close does. */
      if (!target.open) return;
      if (target.requestClose) target.requestClose(btn.value || undefined);
      else target.close(btn.value || undefined);
    } else {
      return;
    }
    e.preventDefault();
  });
})();
