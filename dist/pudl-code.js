/* PUDL code blocks. Load with defer.

   A code block marked for actions:

     <pre class="code" data-code-actions data-code-filename="exercise-0-0.cpp"><code class="language-cpp">…</code></pre>

   gains a strip above the code that names its language, from the code's
   language- class, and holds two raised buttons: Copy, which puts the
   code's text on the clipboard, and Download, which saves it as a file.
   Without this script the block is the plain pre.code it always was; the
   buttons do nothing without script, so the script adds them.

   Copy takes the code's text, never its highlighting. Where the clipboard
   is unavailable, outside a secure context or refused, the script selects
   the code and tells the reader how to copy it. The button's glyph turns
   to a check for two seconds, and a live region says what happened.

   Download names the file from data-code-filename, else "code" with an
   extension for the language, else code.txt.

   pudlCode.names and pudlCode.extensions map language classes to the
   names the strip shows and the extensions files take, and a project adds
   its own languages to them. pudlCode.words holds the words the script
   writes, for a page in another language. pudlCode.enhance(scope) takes in
   blocks added by other means, or one pre, marked or not, as a site whose
   Markdown writes a bare pre needs; enhancing a block twice changes
   nothing. pudl:code-copy, with detail.ok, and pudl:code-download, with
   detail.name, fire on the pre after each action. */
(function () {
  'use strict';

  var DONE_MS = 2000;

  var EXTENSIONS = {
    c: 'c', cpp: 'cpp', csharp: 'cs', cs: 'cs', css: 'css', go: 'go', html: 'html', java: 'java',
    javascript: 'js', js: 'js', json: 'json', kotlin: 'kt', markdown: 'md', md: 'md', php: 'php',
    powershell: 'ps1', python: 'py', py: 'py', ruby: 'rb', rust: 'rs', sh: 'sh', bash: 'sh', shell: 'sh',
    sql: 'sql', swift: 'swift', typescript: 'ts', ts: 'ts', xml: 'xml', yaml: 'yml', yml: 'yml'
  };
  var NAMES = {
    c: 'C', cpp: 'C++', csharp: 'C#', cs: 'C#', css: 'CSS', go: 'Go', html: 'HTML', java: 'Java',
    javascript: 'JavaScript', js: 'JavaScript', json: 'JSON', kotlin: 'Kotlin', markdown: 'Markdown', md: 'Markdown',
    php: 'PHP', powershell: 'PowerShell', python: 'Python', py: 'Python', ruby: 'Ruby', rust: 'Rust',
    sh: 'Shell', bash: 'Bash', shell: 'Shell', sql: 'SQL', swift: 'Swift', typescript: 'TypeScript', ts: 'TypeScript',
    xml: 'XML', yaml: 'YAML', yml: 'YAML'
  };
  var WORDS = {
    copy: 'Copy code',
    download: 'Download code',
    copied: 'Copied',
    copyByHand: 'Selected. Press Ctrl+C, or Command+C on a Mac, to copy.'
  };

  function own(map, key) { return key && Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null; }

  function codeOf(pre) { return pre.querySelector('code') || pre; }

  function langOf(pre) {
    var m = /(?:^|\s)language-([\w+#-]+)/.exec(codeOf(pre).className || '') || /(?:^|\s)language-([\w+#-]+)/.exec(pre.className || '');
    return m ? m[1].toLowerCase() : null;
  }

  function button(kind, label, glyph) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon-btn';
    b.setAttribute('data-code-' + kind, '');
    b.setAttribute('aria-label', label);
    var g = document.createElement('span');
    g.className = 'glyph';
    g.style.setProperty('--glyph', 'var(--glyph-' + glyph + ')');
    g.setAttribute('aria-hidden', 'true');
    b.appendChild(g);
    return b;
  }

  function enhanceOne(pre) {
    if (!pre.parentNode || (pre.parentElement && pre.parentElement.classList.contains('code-block'))) return;
    var lang = langOf(pre);
    var words = window.pudlCode.words;
    var wrap = document.createElement('div');
    wrap.className = 'code-block';
    var head = document.createElement('div');
    head.className = 'code-head';
    var name = document.createElement('span');
    name.className = 'code-lang';
    name.textContent = lang ? (own(window.pudlCode.names, lang) || lang) : '';
    var actions = document.createElement('span');
    actions.className = 'code-actions';
    actions.appendChild(button('copy', words.copy, 'copy'));
    actions.appendChild(button('download', words.download, 'download'));
    var status = document.createElement('span');
    status.className = 'visually-hidden';
    status.setAttribute('role', 'status');
    head.appendChild(name);
    head.appendChild(actions);
    head.appendChild(status);
    wrap.appendChild(head);
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
  }

  function enhance(scope) {
    scope = scope || document;
    if (scope.matches && scope.matches('pre')) { enhanceOne(scope); return; }
    scope.querySelectorAll('pre[data-code-actions]').forEach(enhanceOne);
  }

  function say(wrap, text) {
    var s = wrap.querySelector('.code-head [role="status"]');
    s.textContent = '';
    setTimeout(function () { s.textContent = text; }, 50);
  }

  /* The check stays two seconds after the last copy, however many there
     were. */
  var timers = new WeakMap();
  function confirmOn(btn) {
    var glyph = btn.querySelector('.glyph');
    clearTimeout(timers.get(btn));
    btn.setAttribute('data-done', '');
    glyph.style.setProperty('--glyph', 'var(--glyph-check)');
    timers.set(btn, setTimeout(function () {
      btn.removeAttribute('data-done');
      glyph.style.setProperty('--glyph', 'var(--glyph-copy)');
    }, DONE_MS));
  }

  function selectCode(pre) {
    var r = document.createRange();
    r.selectNodeContents(codeOf(pre));
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }

  function copy(wrap, btn, pre) {
    var fire = function (ok) { pre.dispatchEvent(new CustomEvent('pudl:code-copy', { bubbles: true, detail: { ok: ok } })); };
    var byHand = function () {
      selectCode(pre);
      say(wrap, window.pudlCode.words.copyByHand);
      fire(false);
    };
    if (!window.isSecureContext || !navigator.clipboard || !navigator.clipboard.writeText) { byHand(); return; }
    navigator.clipboard.writeText(codeOf(pre).textContent).then(function () {
      confirmOn(btn);
      say(wrap, window.pudlCode.words.copied);
      fire(true);
    }, byHand);
  }

  function download(pre) {
    var lang = langOf(pre);
    var name = pre.getAttribute('data-code-filename') || ('code.' + (own(window.pudlCode.extensions, lang) || 'txt'));
    var url = URL.createObjectURL(new Blob([codeOf(pre).textContent], { type: 'text/plain;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    pre.dispatchEvent(new CustomEvent('pudl:code-download', { bubbles: true, detail: { name: name } }));
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.code-head [data-code-copy], .code-head [data-code-download]');
    if (!btn) return;
    var wrap = btn.closest('.code-block');
    var pre = wrap && wrap.querySelector(':scope > pre');
    if (!pre) return;
    if (btn.hasAttribute('data-code-copy')) copy(wrap, btn, pre);
    else download(pre);
  });

  window.pudlCode = { enhance: enhance, names: NAMES, extensions: EXTENSIONS, words: WORDS };

  function init() { enhance(document); }
  document.addEventListener('pudl:window-open', function (e) { enhance(e.target); });
  document.addEventListener('pudl:regions-swap', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
