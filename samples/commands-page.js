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
  /* Actions: the catalog, and a run that holds no grant, so that an action
     needing a capability asks the person through the confirm hook. */
  var aOut = document.getElementById('actions-out'), aRef = document.getElementById('actions-ref'), aIn = document.getElementById('actions-input');
  var SAMPLE_INPUT = {
    'sample.notes/stats@1': { text: '# Hello\nTwo words.' },
    'sample.notes/resolve-comment@1': { line: 2 },
    'sample.notes/ask-title@1': { suggestion: 'Shopping' },
    'notes/open-note@1': { path: 'shopping' }
  };
  function fillRefs() {
    return pudlApplets.catalog().then(function (cat) {
      var refs = [];
      cat.forEach(function (m) { m.actions.forEach(function (a) { refs.push(a.ref); }); });
      aRef.innerHTML = refs.map(function (r) { return '<option>' + r + '</option>'; }).join('');
      return cat;
    });
  }
  aRef.addEventListener('change', function () { aIn.value = JSON.stringify(SAMPLE_INPUT[aRef.value] || {}); });
  document.getElementById('actions-list').addEventListener('click', function () {
    fillRefs().then(function (cat) {
      aOut.textContent = JSON.stringify(cat.map(function (m) {
        return { id: m.id, title: m.title, actions: m.actions.map(function (a) { return { ref: a.ref, title: a.title, replay: a.replay, capabilities: a.capabilities, input: a.inputSchema }; }) };
      }), null, 2);
    }, function (err) { aOut.textContent = err.message; });
  });
  document.getElementById('actions-run').addEventListener('click', function () {
    var input;
    try { input = JSON.parse(aIn.value || '{}'); } catch (err) { aOut.textContent = 'The input is not JSON: ' + err.message; return; }
    aOut.textContent = 'Running ' + aRef.value + '…';
    pudlApplets.run(aRef.value, input, { owner: { kind: 'agent', id: 'the sample panel' } }).then(function (out) {
      aOut.textContent = aRef.value + ' gave:\n\n' + JSON.stringify(out, null, 2);
    }, function (err) { aOut.textContent = err.message; });
  });
  var dlg = document.getElementById('confirm-dialog');
  pudlApplets.confirm = function (req) {
    document.getElementById('confirm-body').textContent = (req.owner.id || req.owner.kind) + ' wants to run ' + req.action.title + ' (' + req.action.ref + '), which needs ' + req.missing.join(' and ') + '.';
    dlg.returnValue = '';
    dlg.showModal();
    return new Promise(function (resolve) { dlg.addEventListener('close', function () { resolve(dlg.returnValue === 'yes'); }, { once: true }); });
  };
  fillRefs().catch(function () {});

  document.getElementById('agent-run').addEventListener('click', function () {
    var id = document.getElementById('agent-id').value.trim();
    pudlCommands.run(id, undefined, mount()).then(function () {
      log.textContent = 'Ran ' + id + '.\n\n' + JSON.stringify(brief(pudlCommands.list(mount()).filter(function (c) { return c.id === id; })), null, 2);
    }, function (err) {
      log.textContent = id + ' refused: ' + err.message;
    });
  });
})();
