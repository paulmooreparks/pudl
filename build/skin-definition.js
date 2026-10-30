/* Validates authored skin data before compilation. Rendered conformance is
   a separate gate; this module does not certify a skin's appearance. */
'use strict';
const fs = require('fs');
const path = require('path');

const SPEC = path.join(__dirname, '..', 'vendor', 'pudl-spec', 'tokens');
const PALETTE = Object.create(null);
const file = JSON.parse(fs.readFileSync(path.join(SPEC, 'palette.light.tokens.json'), 'utf8'));
Object.keys(file).filter(k => k[0] !== '$').forEach(group => {
  Object.keys(file[group]).filter(k => k[0] !== '$').forEach(key => {
    PALETTE[key] = file[group][key].$type || file[group].$type;
  });
});

function object(value, at) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new Error(at + ' must be an object');
  }
}

function keys(value, expected, at) {
  object(value, at);
  Object.keys(value).forEach(key => {
    if (expected.indexOf(key) < 0) throw new Error(at + ': unsupported property ' + key);
  });
  expected.forEach(key => {
    if (!Object.prototype.hasOwnProperty.call(value, key)) throw new Error(at + ': missing ' + key);
  });
}

function number(value, max, at) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) {
    throw new Error(at + ' must be a finite number from 0 to ' + max);
  }
}

function validate(definition) {
  keys(definition, ['version', 'id', 'name', 'treatment', 'radii', 'palette'], 'skin');
  if (definition.version !== 1) throw new Error('skin.version must be 1');
  if (typeof definition.id !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(definition.id) || definition.id === 'standard') {
    throw new Error('skin.id must be a valid non-reserved identifier');
  }
  if (typeof definition.name !== 'string' || !definition.name.trim() || definition.name.length > 80 ||
      /[\u0000-\u001f\u007f-\u009f]/.test(definition.name)) throw new Error('skin.name must be a display name');
  if (['standard', 'bevel', 'gel', 'glaze'].indexOf(definition.treatment) < 0) throw new Error('skin.treatment is unsupported');
  keys(definition.radii, ['radius', 'radius-sm', 'radius-xs', 'radius-pill'], 'skin.radii');
  Object.keys(definition.radii).forEach(key => number(definition.radii[key], key === 'radius-pill' ? 999 : 32, 'skin.radii.' + key));
  keys(definition.palette, ['light', 'dark'], 'skin.palette');
  ['light', 'dark'].forEach(form => {
    const overrides = definition.palette[form];
    object(overrides, 'skin.palette.' + form);
    Object.keys(overrides).forEach(key => {
      const at = 'skin.palette.' + form + '.' + key;
      if (!Object.prototype.hasOwnProperty.call(PALETTE, key)) throw new Error(at + ' is unsupported');
      if (PALETTE[key] === 'number') number(overrides[key], 1, at);
      else if (PALETTE[key] !== 'color' || typeof overrides[key] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(overrides[key])) {
        throw new Error(at + ' must be an opaque six-digit hexadecimal colour');
      }
    });
    if (['bg', 'surface', 'light', 'shade', 'lit', 'depth'].some(key => Object.prototype.hasOwnProperty.call(overrides, key))) {
      for (let i = 1; i <= 8; i++) {
        if (!Object.prototype.hasOwnProperty.call(overrides, 'category-' + i)) throw new Error('skin.palette.' + form + ' must supply all category colours');
      }
    }
  });
  if (Object.keys(definition.palette.light).sort().join(',') !== Object.keys(definition.palette.dark).sort().join(',')) {
    throw new Error('skin.palette forms must override the same tokens');
  }
  return definition;
}

module.exports = { validate };

if (require.main === module) {
  try {
    const inputs = process.argv.slice(2);
    if (!inputs.length) throw new Error('Usage: node build/skin-definition.js <definition.json> [...]');
    inputs.forEach(input => {
      validate(JSON.parse(fs.readFileSync(input, 'utf8')));
      console.log(input + ': definition valid; rendered conformance not assessed');
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
