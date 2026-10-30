/* Generate skin distribution assets and the host-readable release catalogue. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { compile } = require('./skin-css');
const root = path.resolve(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'skins/registry.json'), 'utf8'));
const check = process.argv.includes('--check');
const release = process.argv.includes('--release');
const seen = new Set();
const skins = [{ id: 'standard', label: 'Standard', stylesheet: null, admitted: true }];
function output(name, text) {
  const file = path.join(root, name);
  if (check) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== text) throw new Error('Stale skin asset: ' + name);
  } else fs.writeFileSync(file, text);
}
for (const entry of registry) {
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(entry.id) || entry.id === 'standard' || seen.has(entry.id) || typeof entry.admitted !== 'boolean') throw new Error('Invalid skin registry entry');
  seen.add(entry.id);
  if (release && !entry.admitted) throw new Error('Skin lacks release admission: ' + entry.id);
  const definition = JSON.parse(fs.readFileSync(path.join(root, 'skins', entry.id + '.json'), 'utf8'));
  if (definition.id !== entry.id) throw new Error('Skin registry identity mismatch');
  const css = compile(definition);
  const sha256 = crypto.createHash('sha256').update(css).digest('hex');
  if (entry.admitted && entry.sha256 !== sha256) throw new Error('Admission hash mismatch: ' + entry.id);
  const stylesheet = 'pudl-skin-' + entry.id + '.css';
  output('dist/' + stylesheet, css);
  output('samples/skins-' + entry.id + '.css', css);
  skins.push({ id: entry.id, label: definition.name, stylesheet, sha256, admitted: entry.admitted });
}
output('dist/pudl-skins.json', JSON.stringify({ version: 1, skins }, null, 2) + '\n');
console.log('Skin assets ' + (check ? 'checked' : 'generated') + (release ? ' for release' : ' as candidates'));
