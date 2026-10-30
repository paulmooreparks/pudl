/* Compiles validated skin definitions to candidate CSS. This does not admit
   a skin to the release registry or certify rendered conformance. */
'use strict';
const fs = require('fs');
const { validate } = require('./skin-definition');

/* Edge lighting is inset paint. The existing border, padding and target
   geometry stay component-owned. Focus and forced-colour rules stay there
   too. Colours consume the effective palette, including host overrides. */
const BEVEL = {
  'raise-grad': 'var(--surface-alt)',
  'raise-grad-hover': 'color-mix(in srgb, var(--text) 6%, var(--surface-alt))',
  'raise-active-bg': 'color-mix(in srgb, var(--shade) 15%, var(--surface-alt))',
  'raise-border': 'color-mix(in srgb, var(--text) 65%, var(--surface))',
  'raise-border-hover': 'var(--text)',
  'raise-shadow': 'inset 1px 1px 0 var(--light), inset -1px -1px 0 var(--shade)',
  'raise-active-shadow': 'inset 1px 1px 0 var(--shade), inset -1px -1px 0 var(--light)',
  'entry-shadow': 'inset 1px 1px 0 var(--shade), inset -1px -1px 0 var(--light)',
  'recess-shadow': 'inset 0 1px 0 var(--shade)',
  'shadow-card': '1px 1px 0 var(--shade)',
  'shadow-dialog': '2px 2px 0 var(--shade)',
  'overlay-shadow': '2px 2px 0 var(--shade)',
  'toast-shadow': '2px 2px 0 var(--shade)',
  'tooltip-shadow': '1px 1px 0 var(--shade)',
  'surface-edge-shadow': 'inset 0 1px 0 var(--light)',
  'primary-fill': 'var(--accent)',
  'primary-hover-fill': 'var(--accent-hover)',
  'danger-hover-fill': 'var(--danger)',
  'danger-rest-fg': 'color-mix(in srgb, var(--danger) 80%, var(--text))',
  'focus-ring': 'var(--accent)',
  'win-chrome-focus-shadow': '0 0 0 2px #fff, 0 0 0 3px #000',
  'tb-focus-ring': 'var(--tb-fg)',
  'focus-ring-danger': 'color-mix(in srgb, var(--danger) 80%, var(--text))',
  'shadow-btn-primary': 'inset 1px 1px 0 var(--light), inset -1px -1px 0 var(--shade)',
  'primary-active-shadow': 'inset 1px 1px 0 var(--shade), inset -1px -1px 0 var(--light)',
  'primary-pressed-shadow': 'inset 1px 1px 0 var(--shade), inset -1px -1px 0 var(--light)',
  'dismiss-radius': '0px',
  'win-shadow': '2px 2px 0 var(--shade)',
  'win-shadow-active': '3px 3px 0 var(--shade)',
  'win-active-shadow': 'inset 0 1px 0 var(--light)',
  'win-active-bg': 'linear-gradient(to right, var(--accent), var(--accent-hover))',
  'win-active-fg': 'var(--on-accent)',
  'snap-current-shadow': 'inset 1px 1px 0 var(--shade), inset -1px -1px 0 var(--light)',
  'tb-grad': 'var(--tb-bg)',
  'tb-chip': 'color-mix(in srgb, var(--tb-fg) 12%, var(--tb-bg))',
  'tb-chip-shadow': 'inset 1px 1px 0 var(--tb-fg), inset -1px -1px 0 var(--shade)',
  'tb-active-shadow': 'inset 1px 1px 0 var(--shade), inset -1px -1px 0 var(--tb-fg)',
  'tb-toggle-active-shadow': 'inset 1px 1px 0 var(--shade), inset -1px -1px 0 var(--tb-fg)'
};

/* Gel keeps gloss in component-owned surfaces. No texture crosses text or
   changes layout, and control geometry remains identical to Standard. */
const GEL = {
  'raise-grad': 'linear-gradient(to bottom, color-mix(in srgb, var(--light) 30%, var(--surface-alt)) 0%, var(--surface) 48%, var(--surface-alt) 49%, color-mix(in srgb, var(--accent) 8%, var(--surface-alt)) 100%)',
  'raise-grad-hover': 'linear-gradient(to bottom, color-mix(in srgb, var(--light) 35%, var(--surface-alt)), var(--surface) 48%, color-mix(in srgb, var(--accent) 12%, var(--surface-alt)) 49%, var(--surface-alt))',
  'raise-active-bg': 'color-mix(in srgb, var(--accent) 16%, var(--surface-alt))',
  'raise-border': 'color-mix(in srgb, var(--text) 65%, var(--surface))',
  'raise-border-hover': 'var(--text)',
  'raise-shadow': 'inset 0 1px 0 color-mix(in srgb, var(--light) 75%, transparent), inset 0 -1px 0 color-mix(in srgb, var(--shade) 20%, transparent), 0 1px 2px color-mix(in srgb, var(--shade) 25%, transparent)',
  'raise-active-shadow': 'inset 0 1px 3px color-mix(in srgb, var(--shade) 45%, transparent)',
  'entry-shadow': 'inset 0 1px 3px color-mix(in srgb, var(--shade) 30%, transparent)',
  'primary-fill': 'linear-gradient(to bottom, var(--accent-hover), var(--accent) 48%, var(--accent-hover) 49%, var(--accent))',
  'primary-hover-fill': 'var(--accent-hover)',
  'primary-active-shadow': 'inset 0 2px 3px color-mix(in srgb, var(--shade) 55%, transparent)',
  'primary-pressed-shadow': 'inset 0 2px 3px color-mix(in srgb, var(--shade) 55%, transparent)',
  'danger-hover-fill': 'var(--danger)',
  'danger-rest-fg': 'color-mix(in srgb, var(--danger) 80%, var(--text))',
  'focus-ring': 'var(--accent)',
  'focus-ring-danger': 'color-mix(in srgb, var(--danger) 80%, var(--text))',
  'win-chrome-focus-shadow': '0 0 0 2px #fff, 0 0 0 3px #000',
  'tb-focus-ring': 'var(--tb-fg)',
  'win-active-bg': 'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, color-mix(in srgb, var(--text) 4%, transparent) 2px, color-mix(in srgb, var(--text) 4%, transparent) 3px), linear-gradient(var(--surface), var(--surface-alt))',
  'win-active-fg': 'var(--text)',
  'win-active-shadow': 'inset 0 1px 0 color-mix(in srgb, var(--light) 65%, transparent)',
  'win-active-border': 'var(--raise-border)',
  'dismiss-radius': '50%',
  'button-radius': '999px',
  'win-button-radius': '999px'
};

/* Glaze uses softly lit controls and saturated title chrome. These paints
   inherit the effective palette without changing typography or geometry. */
const GLAZE = {
  'raise-grad': 'linear-gradient(to bottom, var(--surface), color-mix(in srgb, var(--accent) 5%, var(--surface-alt)))',
  'raise-grad-hover': 'linear-gradient(to bottom, var(--surface), color-mix(in srgb, var(--accent) 15%, var(--surface-alt)))',
  'raise-active-bg': 'color-mix(in srgb, var(--accent) 18%, var(--surface-alt))',
  'raise-border': 'color-mix(in srgb, var(--text) 65%, var(--surface))',
  'raise-border-hover': 'var(--accent)',
  'raise-shadow': 'inset 0 1px 0 color-mix(in srgb, var(--light) 70%, transparent), inset 0 -2px 0 color-mix(in srgb, var(--shade) 15%, transparent), 0 1px 2px color-mix(in srgb, var(--shade) 20%, transparent)',
  'raise-active-shadow': 'inset 0 2px 3px color-mix(in srgb, var(--shade) 40%, transparent)',
  'entry-shadow': 'inset 0 1px 2px color-mix(in srgb, var(--shade) 25%, transparent)',
  'primary-fill': 'linear-gradient(var(--accent), var(--accent-hover))',
  'primary-hover-fill': 'var(--accent-hover)',
  'primary-active-shadow': 'inset 0 2px 4px color-mix(in srgb, var(--shade) 45%, transparent)',
  'primary-pressed-shadow': 'inset 0 2px 4px color-mix(in srgb, var(--shade) 45%, transparent)',
  'danger-hover-fill': 'var(--danger)',
  'danger-rest-fg': 'color-mix(in srgb, var(--danger) 80%, var(--text))',
  'focus-ring': 'var(--accent)',
  'focus-ring-danger': 'color-mix(in srgb, var(--danger) 80%, var(--text))',
  'win-chrome-focus-shadow': '0 0 0 2px #fff, 0 0 0 3px #000',
  'tb-focus-ring': 'var(--tb-fg)',
  'win-active-bg': 'linear-gradient(to bottom, var(--accent-hover) 0%, var(--accent) 18%, var(--accent-hover) 88%, var(--accent) 100%)',
  'win-active-fg': 'var(--on-accent)',
  'win-active-border': 'var(--accent-hover)',
  'win-active-shadow': 'inset 0 1px 0 color-mix(in srgb, var(--light) 70%, transparent), inset 0 -1px 0 color-mix(in srgb, var(--shade) 35%, transparent)',
  'button-radius': '4px',
  'win-button-radius': '4px',
  'dismiss-radius': '4px'
};

function rule(selector, values) {
  const names = Object.keys(values).sort();
  if (!names.length) return '';
  return selector + ' {\n' + names.map(key => '  --' + key + ': ' + values[key] + ';').join('\n') + '\n}\n';
}

function compile(input) {
  const skin = validate(input);
  /* The name is display text only. Never interpolate it into CSS, even a
     comment. The identifier is restricted by the definition validator. */
  const condition = '[data-skin="' + skin.id + '"]';
  const shape = {};
  Object.keys(skin.radii).forEach(key => { shape[key] = skin.radii[key] + 'px'; });
  if (skin.treatment === 'bevel') Object.assign(shape, BEVEL);
  if (skin.treatment === 'gel') Object.assign(shape, GEL);
  if (skin.treatment === 'glaze') Object.assign(shape, GLAZE);
  let css = '/* Generated candidate skin. Rendered conformance is a separate gate. */\n';
  css += rule(':root:where(' + condition + ')', shape);
  ['light', 'dark'].forEach(form => {
    const palette = {};
    Object.keys(skin.palette[form]).forEach(key => {
      const value = skin.palette[form][key];
      /* The palette generator preserves --pr as the positive-colour input
         for compatibility. Follow that alias when overriding the palette. */
      palette[key === 'positive' ? 'pr' : key] = typeof value === 'number' ? (value * 100) + '%' : value;
    });
    const theme = form === 'dark' ? '[data-theme="dark"]' : ':not([data-theme="dark"])';
    css += rule(':root:where(' + condition + theme + ')', palette);
  });
  /* System-colour and print rendering remain entirely component-owned.
     A later skin file must not override their palette resets. */
  return '@media screen and (forced-colors: none) {\n' + css + '}\n';
}

module.exports = { compile };

if (require.main === module) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node build/skin-css.js <definition.json>');
    process.stdout.write(compile(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
