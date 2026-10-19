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
   any script at all.

   In every browser it also draws the lines that tell the reader a dialog
   has more to scroll to (0.65.0). pudl.css keeps a dialog's head and its
   actions in view while the content between them scrolls; this script
   marks an open dialog data-dialog-more-above while content is hidden
   beneath its head and data-dialog-more-below while content is hidden
   beneath its actions, and the stylesheet draws a line for each. It also
   sets the dialog's scroll padding to the heights of the head and the
   actions, so a focused field is scrolled clear of both. Without the
   script the head and the actions still stay in view, with no lines. */
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

(function () {
  'use strict';

  var HEAD = '.dialog-head, .dialog-title:not(.dialog-head .dialog-title)';
  var watching = new Map();

  function mark(d, name, on) {
    if (d.hasAttribute(name) !== on) d.toggleAttribute(name, on);
  }

  function update(d) {
    if (!d || !d.open) return;
    var head = d.querySelector(HEAD), foot = d.querySelector('.dialog-actions');
    var above = d.scrollTop, below = d.scrollHeight - d.clientHeight - d.scrollTop;
    mark(d, 'data-dialog-more-above', !!head && above > 1);
    mark(d, 'data-dialog-more-below', !!foot && below > 1);
    d.style.scrollPaddingTop = head ? head.offsetHeight + 'px' : '';
    d.style.scrollPaddingBottom = foot ? foot.offsetHeight + 'px' : '';
  }

  /* An open dialog is watched for scrolling, for a change of its own size
     or of its parts' sizes, and for content added or removed, and is let go
     when it closes. */
  function watch(d) {
    if (watching.has(d)) return;
    var again = function () { update(d); };
    var ro = new ResizeObserver(again);
    ro.observe(d);
    Array.prototype.forEach.call(d.querySelectorAll(':scope > *, :scope > form > *'), function (el) { ro.observe(el); });
    var mo = new MutationObserver(again);
    mo.observe(d, { childList: true, subtree: true, characterData: true });
    d.addEventListener('scroll', again, { passive: true });
    watching.set(d, function () {
      ro.disconnect(); mo.disconnect();
      d.removeEventListener('scroll', again);
    });
    update(d);
  }

  function release(d) {
    var stop = watching.get(d);
    if (!stop) return;
    stop();
    watching.delete(d);
  }

  function check(d) {
    if (!d.matches('dialog.dialog')) return;
    if (d.open) watch(d); else release(d);
  }

  new MutationObserver(function (records) {
    records.forEach(function (r) { check(r.target); });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['open'], subtree: true });
  Array.prototype.forEach.call(document.querySelectorAll('dialog.dialog[open]'), watch);
})();
