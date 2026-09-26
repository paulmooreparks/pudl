/* PUDL theme handling. Load this in <head>, before pudl.css, so the saved
   theme is applied before the first paint and the page never flashes the
   wrong theme. With no saved choice the page starts dark. */
(function () {
  var KEY = 'pudl-theme';
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
  root.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');

  /* Flips between light and dark and remembers the choice. Wire a button to
     it with onclick="pudlToggleTheme()". */
  window.pudlToggleTheme = function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch (e) { /* storage blocked */ }
  };
})();
