/* The applets of applet-requests.html. Each records what it was given,
   for the tests to read. */
window.__log = [];
pudlApplets.define('notepad', { page: 'applet-requests-page.html', handles: { open: { param: 'file', kinds: ['text'] } } });
pudlApplets.define('shell', { page: 'default-windows.html', instances: 3,
                              handles: { shell: { param: 'cwd', extra: ['run'], reuse: false } } });
function recorder(name) {
  return {
    init: function (root, opts) {
      root.setAttribute('data-got', opts.state || '');
      root.setAttribute('data-instance', opts.instance);
      window.__log.push(name + ' init ' + opts.instance + ' ' + opts.state);
      return {
        setState: function (s) {
          root.setAttribute('data-got', s);
          window.__log.push(name + ' set ' + opts.instance + ' ' + s);
        },
        destroy: function () {}
      };
    }
  };
}
pudlApplets.register('notepad', recorder('notepad'));
pudlApplets.register('shell', recorder('shell'));
