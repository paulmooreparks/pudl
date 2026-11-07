/* The host supplies content, identity and persistence. Shared controls own folding. */
(function () {
  'use strict';
  var root = document.getElementById('catalog');
  pudlLauncher.enhance(root, { pane: document.getElementById('catalog-slot'), layout: document.getElementById('workspace'), invoker: document.getElementById('launcher'), placement: 'above' });
  var destinations = [
    {id:'files',label:'Files',glyph:'folder',kind:'applet'},
    {id:'editor',label:'Editor',glyph:'pencil',kind:'applet'},
    {id:'settings',label:'Settings',glyph:'gear',kind:'applet'},
    {id:'terminal',label:'Terminal',glyph:'terminal',kind:'applet'},
    {id:'article',label:'One Word or Two?',glyph:'file',kind:'page'},
    {id:'notes',label:'Meeting notes',glyph:'file',kind:'page'}
  ];
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem('pudl-compact-taskbar')); } catch (_) {}
  pudlWindows.configureTaskbar(Object.assign({destinations:destinations,pins:['files','editor','settings','terminal']},saved||{}));
  document.addEventListener('pudl:taskbar-change', function (e) { try { localStorage.setItem('pudl-compact-taskbar',JSON.stringify(e.detail)); } catch (_) {} });
  document.addEventListener('pudl:taskbar-activate', function (e) { e.preventDefault(); e.detail.waitUntil(pudlWindows.open(e.detail.id,e.detail.opener)); });
  document.addEventListener('click', function (e) { var theme=e.target.closest('button[data-theme]'); if(theme) document.documentElement.dataset.theme=theme.dataset.theme; });
})();
