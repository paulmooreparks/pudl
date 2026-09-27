/* PUDL theme handling. Load this in <head>, before pudl.css, so the chosen
   theme is applied before the first paint and the page never flashes the
   wrong theme.

   A reader's preference is light, dark or system, remembered under the key
   pudl-theme. System follows the operating system's setting, and keeps
   following it if that changes while the page is open. With nothing saved
   the page starts dark.

   The html element carries data-theme, the theme in force (light or dark),
   which the stylesheet reads, and data-theme-pref, the reader's preference,
   which a settings control can read to show the current choice.

     pudlSetTheme('light' | 'dark' | 'system')   sets and remembers a preference
     pudlThemePreference()                        returns the preference
     pudlToggleTheme()                            flips light and dark, for a single button

   pudl:theme-change fires on the document after every change, with
   detail.preference and detail.theme. */
(function () {
  var KEY = 'pudl-theme';
  var DEFAULT = 'dark';
  var root = document.documentElement;
  var system = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function valid(p) { return p === 'light' || p === 'dark' || p === 'system'; }

  function saved() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
    return valid(v) ? v : null;
  }

  function resolve(p) {
    if (p !== 'system') return p;
    return system && !system.matches ? 'light' : 'dark';
  }

  var pref = saved() || DEFAULT;

  function apply() {
    var theme = resolve(pref);
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-pref', pref);
    return theme;
  }

  function announce(theme) {
    document.dispatchEvent(new CustomEvent('pudl:theme-change', { detail: { preference: pref, theme: theme } }));
  }

  apply();

  window.pudlSetTheme = function (p) {
    if (!valid(p)) return;
    pref = p;
    try { localStorage.setItem(KEY, p); } catch (e) { /* storage blocked */ }
    announce(apply());
  };

  window.pudlThemePreference = function () { return pref; };

  /* Flips between light and dark and remembers the choice. Wire a button to
     it with onclick="pudlToggleTheme()". From system, it flips whichever
     theme the system gave. */
  window.pudlToggleTheme = function () {
    window.pudlSetTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  };

  /* The system's setting changing, for a reader who follows it. */
  if (system) {
    system.addEventListener('change', function () {
      if (pref === 'system') announce(apply());
    });
  }

  /* A choice made in another tab of the same site. */
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    pref = saved() || DEFAULT;
    announce(apply());
  });
})();
