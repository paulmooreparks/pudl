'use strict';
const { execFileSync } = require('node:child_process');

/* The Standard rendering the palettes must leave unchanged. It moves only
   with an approved change to Standard paint or geometry. Version 0.105.0
   sets consistent taskbar entry heights and glyph-based folding. */
const revision = '92b25d1ab0179ec7aca7cb54b7c5f8e49a209dfc';
const files = ['dist/pudl.css', 'dist/pudl-windows.css'];

// Paul's 0.108.2 sizing policy changes only these historical declarations.
// Exact single-match guards prevent silently accepting a different baseline.
function taskbarSizingBaseline(windows) {
  for (const [before, after] of [
    ['\n.win-bar {\n', '\n.win-bar {\n  --win-bar-entry-height: max(30px, calc(1.125rem + 12px));\n'],
    ['height: var(--win-bar-entry-height, calc(1.5em + 8px)); min-height: var(--win-bar-entry-height, calc(1.5em + 8px));',
      'height: var(--win-bar-entry-height); min-height: var(--win-bar-entry-height);'],
    ['.win-bar > .status-area {\n  order: 0;', '.win-bar > .status-area {\n  order: 0;\n' +
      '  box-sizing: border-box; height: var(--win-bar-entry-height); min-height: var(--win-bar-entry-height);\n' +
      '  padding: 0; border: 0;\n' +
      '  outline: var(--menubar-status-border, 1px solid var(--tb-border, var(--raise-border))); outline-offset: -1px;'],
    ['  .win-bar { --win-bar-entry-height: max(40px, calc(1.5em + 8px)); }\n', '']
  ]) {
    if (windows.split(before).length !== 2) throw new Error('Approved taskbar baseline declaration changed: ' + before);
    windows = windows.replace(before, after);
  }
  return windows + '\n.win-bar > .status-area > .status-item { height: var(--win-bar-entry-height); min-height: var(--win-bar-entry-height); }\n';
}

// Apply the ordinary-band sizing policy without replacing historical paint.
const ordinaryBandEdits = [
  { file: 'css', before: '\n.topbar {\n', after: '\n:root { --chrome-band-min-height: max(43px, calc(1.125rem + 25px)); }\n.topbar {\n' },
  { file: 'css', before: '  --tb-pad-y: 10px;\n  padding: var(--tb-pad-y) 20px;', after: '  --tb-pad-y: 6px;\n  min-height: var(--chrome-band-min-height); box-sizing: border-box;\n  padding: var(--tb-pad-y) 20px;' },
  { file: 'css', before: '  .topbar { --tb-pad-y: 8px; padding: var(--tb-pad-y) 12px; }', after: '  .topbar { padding: var(--tb-pad-y) 12px; }' },
  { file: 'windows', before: '\n.win-bar {\n  --win-bar-entry-height: max(30px, calc(1.125rem + 12px));\n', after: '\n.win-bar {\n  --win-bar-entry-height: max(30px, calc(1.125rem + 12px));\n  min-height: var(--chrome-band-min-height); box-sizing: border-box;\n' }
];
function ordinaryBandBaseline(css, windows) {
  if (css.includes('--chrome-band-min-height') || windows.includes('--chrome-band-min-height')) throw new Error('Ordinary-band baseline token already exists');
  const values = { css, windows };
  for (const edit of ordinaryBandEdits) {
    if (values[edit.file].split(edit.before).length !== 2) throw new Error('Ordinary-band baseline declaration changed: ' + edit.before);
    values[edit.file] = values[edit.file].replace(edit.before, edit.after);
  }
  return values;
}

function loadBaseline(root) {
  try {
    const baseline = new Map(files.map(file => [file, execFileSync('git', ['show', revision + ':' + file], {
      cwd: root, stdio: ['ignore', 'pipe', 'pipe']
    })]));
    // Paul's approved Standard boundary correction changes only these two declarations.
    // Keep all other historical paint and geometry in the comparison.
    let css = baseline.get('dist/pudl.css').toString();
    for (const [before, after] of [
      ['--raise-border: color-mix(in srgb, var(--shade) calc(var(--depth) * 0.9), var(--surface-alt));', '--raise-border: var(--text-muted);'],
      ['--raise-border-hover: color-mix(in srgb, var(--shade) calc(var(--depth) * 1.6), var(--surface-alt));', '--raise-border-hover: var(--text);']
    ]) {
      if (css.split(before).length !== 2) throw new Error('Approved boundary baseline declaration changed: ' + before);
      css = css.replace(before, after);
    }
    let windows = baseline.get('dist/pudl-windows.css').toString();
    const count = '.win-stack-count { flex: none; font-variant-numeric: tabular-nums; }';
    if (windows.split(count).length !== 2) throw new Error('Approved count baseline declaration changed');
    windows = windows.replace(count, '.win-stack-count { flex: none; font-family: var(--mono); font-variant-numeric: tabular-nums; }');
    // The new decorative span is inert when comparing historical foreground geometry.
    windows += '\n.win-stack-edges { display: none; }\n';
    const bands = ordinaryBandBaseline(css, taskbarSizingBaseline(windows));
    baseline.set('dist/pudl.css', Buffer.from(bands.css));
    baseline.set('dist/pudl-windows.css', Buffer.from(bands.windows));
    return baseline;
  } catch (cause) {
    throw new Error('Palette baseline setup failed: both CSS files from commit ' + revision +
      ' must be available. Fetch the required Git history before running this comparison.', { cause });
  }
}

module.exports = { loadBaseline, revision, files, taskbarSizingBaseline, ordinaryBandBaseline, ordinaryBandEdits };
