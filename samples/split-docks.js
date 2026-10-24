(function () {
  'use strict';
  var tools = ['browser', 'search', 'terminal', 'problems'];
  var initialized = new URLSearchParams(location.search).has('open');
  function arrange(edge) {
    ['left', 'right', 'top', 'bottom'].forEach(function (e) { pudlWindows.dockArrange(e, 'merge'); });
    tools.forEach(function (key) { pudlWindows.dock(key, edge); });
    pudlWindows.dockMode(edge, 'open');
    pudlWindows.dock('terminal', edge, { group: 'main', position: 'after' });
    var tree = pudlWindows.state().docks[edge].tree;
    if (tree) pudlWindows.dock('problems', edge, { group: tree.second.id, position: 'tab' });
    pudlWindows.raise('browser');
    pudlWindows.raise('editor');
  }
  document.querySelectorAll('[data-demo-edge]').forEach(function (button) {
    button.addEventListener('click', function () { initialized = true; arrange(button.getAttribute('data-demo-edge')); });
  });
  if (!initialized) {
    function scheduleInitial() {
      /* Initial restore adopts every window before applying the complete
         state. The next frame sees that state and the measured dock. */
      requestAnimationFrame(function () {
        if (initialized || !tools.every(function (key) { return pudlWindows.state().open.indexOf(key) >= 0; })) return;
        initialized = true;
        arrange('right');
      });
    }
    document.addEventListener('pudl:window-open', scheduleInitial);
    scheduleInitial();
  }
})();
