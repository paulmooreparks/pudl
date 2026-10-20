/* The commands sample's own page: the width slider, and the panel that
   shows the commands as an agent sees them. */
(function () {
  'use strict';
  var stage = document.getElementById('stage'), range = document.getElementById('stage-width');
  var out = document.getElementById('stage-width-out'), log = document.getElementById('agent-out');
  function width() {
    stage.style.setProperty('--stage-w', range.value + 'px');
    out.textContent = range.value + 'px';
  }
  range.addEventListener('input', width);
  width();
  function mount() { return stage.querySelector('[data-applet="notes"]'); }
  function brief(list) {
    return list.map(function (c) {
      var o = Object.assign({}, c);
      if (o.items) o.items = o.items.map(function (i) { return i.id; });
      return o;
    });
  }
  document.getElementById('agent-list').addEventListener('click', function () {
    var list = pudlCommands.list(mount());
    log.textContent = JSON.stringify(brief(list), null, 2);
    document.getElementById('agent-ids').innerHTML = list.map(function (c) { return '<option value="' + c.id + '">'; }).join('');
  });
  document.getElementById('agent-run').addEventListener('click', function () {
    var id = document.getElementById('agent-id').value.trim();
    pudlCommands.run(id, undefined, mount()).then(function () {
      log.textContent = 'Ran ' + id + '.\n\n' + JSON.stringify(brief(pudlCommands.list(mount()).filter(function (c) { return c.id === id; })), null, 2);
    }, function (err) {
      log.textContent = id + ' refused: ' + err.message;
    });
  });
})();
