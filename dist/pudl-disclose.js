/* PUDL disclosure cards. Load with defer.

   A disclosure card opens and closes by one raised toggle at the start of
   its head, drawn as a tree's toggle; the rest of the head is flat, since a
   card is read and not pressed.

     <section class="card disclosure">
       <div class="card-head">
         <button type="button" class="card-toggle" aria-expanded="false" aria-controls="step-1"></button>
         <h3 class="card-title">1. Research the account</h3>
         <span class="chip">Agent</span>
         <span class="card-summary">/research-account</span>
       </div>
       <div class="card-body" id="step-1">…</div>
       <div class="card-actions">…</div>
     </section>

   The server writes aria-expanded on the toggle, and that is the open
   state. Without this script every part shows. With it, the body and the
   foot show while the toggle says open, the summary while it says closed,
   and the toggle answers a press, Enter and Space. pudl:disclose fires on
   the card with detail.open each time it opens or closes, so a host can
   remember which cards are open. pudlDisclose.enhance(root) takes in cards
   a host has added, and pudlDisclose.set(card, open) opens or closes one. */
(function () {
  'use strict';
  var uid = 0;

  function toggleOf(card) { return card.querySelector(':scope > .card-head > .card-toggle'); }

  function enhance(root) {
    (root || document).querySelectorAll('.card.disclosure').forEach(function (card) {
      var t = toggleOf(card), body = card.querySelector(':scope > .card-body');
      if (!t) return;
      if (!t.hasAttribute('aria-expanded')) t.setAttribute('aria-expanded', 'true');
      if (body && !t.hasAttribute('aria-controls')) {
        if (!body.id) body.id = 'pudl-disclose-' + (++uid);
        t.setAttribute('aria-controls', body.id);
      }
      label(card, t);
      sync(card, t);
      card.classList.add('disclose-ready');
    });
  }

  /* A toggle with no name of its own is named for the card's title. */
  function label(card, t) {
    if (t.hasAttribute('aria-label') || t.hasAttribute('aria-labelledby') || t.textContent.trim()) return;
    var title = card.querySelector(':scope > .card-head > .card-title');
    if (!title) return;
    if (!title.id) title.id = 'pudl-disclose-title-' + (++uid);
    t.setAttribute('aria-labelledby', title.id);
  }

  /* The summary is hidden from assistive technology while the card is
     open, as it is from sight; the stylesheet hides the rest. */
  function sync(card, t) {
    var open = t.getAttribute('aria-expanded') === 'true';
    var summary = card.querySelector(':scope > .card-head > .card-summary');
    if (summary) { if (open) summary.setAttribute('aria-hidden', 'true'); else summary.removeAttribute('aria-hidden'); }
  }

  function set(card, open) {
    var t = toggleOf(card);
    if (!t || (t.getAttribute('aria-expanded') === 'true') === open) return;
    t.setAttribute('aria-expanded', String(open));
    sync(card, t);
    card.dispatchEvent(new CustomEvent('pudl:disclose', { bubbles: true, detail: { open: open } }));
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.card.disclosure > .card-head > .card-toggle');
    if (!t || e.defaultPrevented) return;
    e.preventDefault();
    set(t.closest('.card'), t.getAttribute('aria-expanded') !== 'true');
  });

  /* A toggle that is not a button, such as one a server drew as a link,
     still answers Enter and Space. A button answers them by itself. */
  document.addEventListener('keydown', function (e) {
    var t = e.target.closest && e.target.closest('.card.disclosure > .card-head > .card-toggle');
    if (!t || t.tagName === 'BUTTON' || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    set(t.closest('.card'), t.getAttribute('aria-expanded') !== 'true');
  });

  window.pudlDisclose = { enhance: enhance, set: set };
  /* Cards the page adds are found among the nodes it adds, not by
     searching the whole page after every change in it (0.69.3). */
  new MutationObserver(function (records) {
    records.forEach(function (r) {
      Array.prototype.forEach.call(r.addedNodes, function (n) {
        if (n.nodeType === 1 && (n.matches('.card.disclosure') || (n.firstElementChild && n.querySelector('.card.disclosure')))) enhance(n.parentElement || n);
      });
    });
  }).observe(document.documentElement, { subtree: true, childList: true });
  document.addEventListener('pudl:regions-swap', function () { enhance(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enhance(); }); else enhance();
})();
