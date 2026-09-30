/* The applet of window-sizing.html: a tool laid out at its own width,
   whose layout, chosen from a select, changes how many fields it shows. */
pudlApplets.define('barcodes', {});
pudlApplets.register('barcodes', {
  init: function (root, opts) {
    root.setAttribute('data-got-fit', opts.fit);
    root.innerHTML = '<div style="width: 420px"><label class="form-label" for="bc-layout">Layout</label>' +
      '<select id="bc-layout" class="form-select"><option value="2">Two fields</option><option value="6">Six fields</option></select>' +
      '<div class="bc-fields"></div></div>';
    var fields = root.querySelector('.bc-fields');
    function show(n) {
      fields.innerHTML = '';
      for (var i = 0; i < n; i++) fields.insertAdjacentHTML('beforeend', '<div class="form-group"><input class="form-input" aria-label="Field ' + (i + 1) + '"></div>');
    }
    show(2);
    root.querySelector('select').addEventListener('change', function (e) { show(+e.target.value); });
    return { destroy: function () {} };
  }
});
