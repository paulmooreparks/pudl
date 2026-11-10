/* Emit the complete distribution identity from an immutable release tag. */
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const [tag, output] = process.argv.slice(2);
if (!/^v\d+\.\d+\.\d+$/.test(tag || '') || !output) {
  throw new Error('Usage: node build/release-manifest.js v<version> <output.json>');
}
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024, windowsHide: true });
const commit = git(['rev-parse', tag + '^{}']).toString('utf8').trim();
const paths = git(['ls-tree', '-rz', '--name-only', commit, '--', 'dist']).toString('utf8').split('\0').filter(Boolean);
if (!paths.length) throw new Error('The tag contains no distribution files');
const files = paths.map(path => {
  const bytes = git(['show', commit + ':' + path]);
  return {
    path,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    integrity: 'sha384-' + crypto.createHash('sha384').update(bytes).digest('base64')
  };
});
fs.writeFileSync(output, JSON.stringify({ version: tag.slice(1), tag, commit, files }, null, 2) + '\n', 'utf8');
