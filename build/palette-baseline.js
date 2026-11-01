'use strict';
const { execFileSync } = require('node:child_process');

const revision = 'cab552a9131950ec502906d0c187f354d6a1874f';
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
