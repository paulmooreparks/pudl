'use strict';
const { execFileSync } = require('node:child_process');

/* The Standard rendering the palettes must leave unchanged. It moves only
   with an approved change to Standard paint or geometry. Version 0.105.0
   sets consistent taskbar entry heights and glyph-based folding. */
const revision = '92b25d1ab0179ec7aca7cb54b7c5f8e49a209dfc';
const files = ['dist/pudl.css', 'dist/pudl-windows.css'];

function loadBaseline(root) {
  try {
    return new Map(files.map(file => [file, execFileSync('git', ['show', revision + ':' + file], {
      cwd: root, stdio: ['ignore', 'pipe', 'pipe']
    })]));
  } catch (cause) {
    throw new Error('Palette baseline setup failed: both CSS files from commit ' + revision +
      ' must be available. Fetch the required Git history before running this comparison.', { cause });
  }
}

module.exports = { loadBaseline, revision, files };
