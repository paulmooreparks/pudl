(function () {
  'use strict';
  var choices = document.getElementById('theme-choices');
  choices.addEventListener('pudl:menu-choose', function (event) {
    if (['light', 'dark', 'system'].indexOf(event.detail.value) < 0) return;
    event.preventDefault();
    if (event.detail.value === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', event.detail.value);
    choices.querySelectorAll('button').forEach(function (button) {
      button.setAttribute('aria-checked', button === event.detail.button ? 'true' : 'false');
    });
    document.getElementById('choice-status').textContent = 'Appearance follows ' + event.detail.button.textContent + '.';
    pudlMenubar.refresh();
  });
}());
