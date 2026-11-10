'use strict';
const { execFileSync } = require('node:child_process');

/* The Standard rendering the palettes must leave unchanged. It moves only
   with an approved change to Standard paint or geometry. Version 0.105.0
   sets consistent taskbar entry heights and glyph-based folding. */
const revision = '92b25d1ab0179ec7aca7cb54b7c5f8e49a209dfc';
const files = ['dist/pudl.css', 'dist/pudl-windows.css'];

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
    baseline.set('dist/pudl.css', Buffer.from(css));
    let windows = baseline.get('dist/pudl-windows.css').toString();
    const count = '.win-stack-count { flex: none; font-variant-numeric: tabular-nums; }';
    if (windows.split(count).length !== 2) throw new Error('Approved count baseline declaration changed');
    windows = windows.replace(count, '.win-stack-count { flex: none; font-family: var(--mono); font-variant-numeric: tabular-nums; }');
    // The new decorative span is inert when comparing historical foreground geometry.
    windows += '\n.win-stack-edges { display: none; }\n';
    baseline.set('dist/pudl-windows.css', Buffer.from(windows));
    return baseline;
  } catch (cause) {
    throw new Error('Palette baseline setup failed: both CSS files from commit ' + revision +
      ' must be available. Fetch the required Git history before running this comparison.', { cause });
  }
}

module.exports = { loadBaseline, revision, files };
