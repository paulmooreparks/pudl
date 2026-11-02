'use strict';
const { execFileSync } = require('node:child_process');

/* The Standard rendering the palettes must leave unchanged. It moves only
   with a deliberate change to Standard's own paint, such as the dark
   destructive button's words in 0.97.5. */
const revision = 'ed5e790a28f56b53bc3bfbe092e567318fb640ec';
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
