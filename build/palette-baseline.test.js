'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { taskbarSizingBaseline, loadBaseline, revision } = require('./palette-baseline');
const root = path.resolve(__dirname, '..');
const historical = execFileSync('git', ['show', '92b25d1ab0179ec7aca7cb54b7c5f8e49a209dfc:dist/pudl-windows.css'], { cwd: root, encoding: 'utf8' });
const oldParts = [
  '\n.win-bar {\n',
  'height: var(--win-bar-entry-height, calc(1.5em + 8px)); min-height: var(--win-bar-entry-height, calc(1.5em + 8px));',
  '.win-bar > .status-area {\n  order: 0;',
  '  .win-bar { --win-bar-entry-height: max(40px, calc(1.5em + 8px)); }\n'
];

test('approved sizing overlay preserves every unrelated historical byte and fixed revision', () => {
  assert.equal(revision, '92b25d1ab0179ec7aca7cb54b7c5f8e49a209dfc');
  const updated = taskbarSizingBaseline(historical);
  const newParts = [
    '\n.win-bar {\n  --win-bar-entry-height: max(30px, calc(1.125rem + 12px));\n',
    'height: var(--win-bar-entry-height); min-height: var(--win-bar-entry-height);',
    '.win-bar > .status-area {\n  order: 0;\n' +
      '  box-sizing: border-box; height: var(--win-bar-entry-height); min-height: var(--win-bar-entry-height);\n' +
      '  padding: 0; border: 0;\n' +
      '  outline: var(--menubar-status-border, 1px solid var(--tb-border, var(--raise-border))); outline-offset: -1px;',
    '\n.win-bar > .status-area > .status-item { height: var(--win-bar-entry-height); min-height: var(--win-bar-entry-height); }\n'
  ];
  let untouchedOld = historical, untouchedNew = updated;
  for (const part of oldParts) untouchedOld = untouchedOld.replace(part, '');
  // Remove complete tray blocks before the height declaration they contain.
  for (const part of [...newParts].sort((a, b) => b.length - a.length)) {
    assert.equal(untouchedNew.split(part).length, 2, 'approved replacement occurs once');
    untouchedNew = untouchedNew.replace(part, '');
  }
  assert.equal(untouchedNew, untouchedOld, 'all unrelated paint and geometry stay byte-identical');
  assert.ok(loadBaseline(root).get('dist/pudl-windows.css').toString().includes('--win-bar-entry-height: max(30px, calc(1.125rem + 12px));'));
});

test('missing, changed or duplicate historical declarations reject instead of widening the overlay', () => {
  for (const part of oldParts) {
    assert.throws(() => taskbarSizingBaseline(historical.replace(part, '')), /Approved taskbar baseline declaration changed/);
    assert.throws(() => taskbarSizingBaseline(historical.replace(part, part + part)), /Approved taskbar baseline declaration changed/);
    assert.throws(() => taskbarSizingBaseline(historical.replace(part, part.replace('win-bar', 'foreign-bar'))), /Approved taskbar baseline declaration changed/);
  }
  assert.throws(() => taskbarSizingBaseline(taskbarSizingBaseline(historical)), /Approved taskbar baseline declaration changed/);
});
