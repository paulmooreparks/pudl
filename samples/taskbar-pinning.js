/* The host owns destination identities, activation and saved preferences. */
(function () {
  'use strict';
  var layer = document.querySelector('[data-win-layer]');
  var storage = 'pudl-taskbar-pinning-demo';
  var destinations = [
    { id: 'editor', label: 'Editor', glyph: 'pencil', newWindow: true },
    { id: 'meeting-notes', label: 'Meeting notes', glyph: 'file' },
    { id: 'calculator', label: 'Calculator', glyph: 'app' }
  ];
  var identities = { editor: 'editor', 'editor-copy': 'editor', 'meeting-notes': 'meeting-notes', calculator: 'calculator' };
  var editor = document.getElementById('study-editor');
  var copy = editor.cloneNode(true); copy.id = 'study-editor-copy';
  copy.content.querySelector('[data-win]').setAttribute('data-win', 'editor-copy');
  copy.content.querySelector('.win-title').textContent = 'Second editor';
  copy.content.querySelectorAll('[id]').forEach(function (el) { el.id += '-copy'; });
  copy.content.querySelectorAll('[for]').forEach(function (el) { el.htmlFor += '-copy'; });
  copy.content.querySelectorAll('[data-draft]').forEach(function (el) { el.dataset.draft += '-copy'; });
  document.body.appendChild(copy);
  Object.keys(identities).forEach(function (key) {
    var template = document.getElementById('study-' + key);
    template.content.querySelector('[data-win]').setAttribute('data-win-destination', identities[key]);
  });
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(storage)) || {}; } catch (_) { /* Storage is optional. */ }
  pudlWindows.configureTaskbar({ destinations: destinations, pins: Array.isArray(saved.pins) ? saved.pins : ['editor'], order: Array.isArray(saved.order) ? saved.order : [] });
  layer.addEventListener('pudl:taskbar-activate', function (event) {
    event.preventDefault();
    var key = event.detail.id;
    if (event.detail.action === 'new' && key === 'editor') {
      var index = 2;
      while (pudlWindows.state().open.indexOf('editor-' + index) >= 0) index++;
      key = 'editor-' + index;
      var template = editor.cloneNode(true); template.id = 'study-' + key;
      template.content.querySelector('[data-win]').setAttribute('data-win', key);
      template.content.querySelector('.win-title').textContent = 'Editor ' + index;
      template.content.querySelectorAll('[id]').forEach(function (el) { el.id += '-' + index; });
      template.content.querySelectorAll('[for]').forEach(function (el) { el.htmlFor += '-' + index; });
      template.content.querySelectorAll('[data-draft]').forEach(function (el) { el.dataset.draft += '-' + index; });
      if (!document.getElementById(template.id)) document.body.appendChild(template);
    }
    pudlWindows.open(key, event.detail.opener);
  });
  layer.addEventListener('pudl:taskbar-change', function () {
    try { localStorage.setItem(storage, JSON.stringify(pudlWindows.taskbarState())); } catch (_) { /* The demo still works without storage. */ }
  });
  document.getElementById('reset-pins').addEventListener('click', function () {
    pudlWindows.configureTaskbar({ destinations: destinations, pins: ['editor'], order: [] });
    try { localStorage.removeItem(storage); } catch (_) { /* Storage is optional. */ }
  });
}());
