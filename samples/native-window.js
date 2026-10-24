(function () {
  var fullscreen = false, log = document.getElementById('native-log');
  function record(action) { var li = document.createElement('li'); li.textContent = action; log.appendChild(li); }
  function report() {
    window.nativeDemo.update({ fullscreen: fullscreen });
    document.getElementById('fullscreen').textContent = fullscreen ? 'Leave simulated full screen' : 'Enter simulated full screen';
    document.getElementById('host-state').textContent = fullscreen ? 'Host reports full screen.' : 'Host reports a normal window.';
  }
  window.nativeDemo = pudlNative.attach(document.querySelector('.topbar'), {
    title: 'Example app', actions: {
      minimize: function () { record('Minimize requested'); },
      restore: function () { record('Restore requested'); fullscreen = false; report(); },
      close: function () { record('Close requested; the simulated host keeps this sample open'); }
    }
  });
  document.getElementById('fullscreen').addEventListener('click', function () { fullscreen = !fullscreen; report(); });
  document.getElementById('can-close').addEventListener('change', function (e) { window.nativeDemo.update({ canClose: e.target.checked }); });
  report();
})();
