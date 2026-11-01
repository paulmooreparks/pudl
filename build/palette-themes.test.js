'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { ids, palette } = require('./palette-themes');
const linear = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
const lab = rgb => {
  const [r, g, b] = rgb.map(linear), l = Math.cbrt(.4122214708*r + .5363325363*g + .0514459929*b), m = Math.cbrt(.2119034982*r + .6806995451*g + .1073969566*b), s = Math.cbrt(.0883024619*r + .2817188376*g + .6299787005*b);
  return [.2104542553*l + .793617785*m - .0040720468*s, 1.9779984951*l - 2.428592205*m + .4505937099*s, .0259040371*l + .7827717662*m - .808675766*s];
};
const distance = (a, b) => { const x = lab(a), y = lab(b); return 100 * Math.hypot(...x.map((v, i) => v - y[i])); };
const hue = rgb => { const [, a, b] = lab(rgb); return (Math.atan2(b, a) * 180 / Math.PI + 360) % 360; };
const hueGap = (a, b) => { const d = Math.abs(hue(a) - hue(b)); return Math.min(d, 360 - d); };
const cvd = [
  [[.152286, 1.052583, -.204868], [.114503, .786281, .099216], [-.003882, -.048116, 1.051998]],
  [[.367322, .860646, -.227968], [.280085, .672501, .047413], [-.011820, .042940, .968881]]
];
const encoded = v => v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055;
const simulate = (rgb, matrix) => { const values = rgb.map(linear); return matrix.map(row => encoded(Math.min(1, Math.max(0, row.reduce((sum, v, i) => sum + v * values[i], 0))))); };
for (const id of ids) for (const form of ['light', 'dark']) test(id + ' ' + form + ' preserves categorical separation', () => {
  const colours = Object.fromEntries(Object.entries(palette(id, form)).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, v.slice(1).match(/../g).map(x => parseInt(x, 16) / 255)]));
  for (let i = 1; i <= 8; i++) {
    const slot = colours['category-' + i];
    assert(distance(slot, colours.accent) >= 8, 'category ' + i + ' separates from accent');
    for (const key of ['warn', 'danger', 'positive']) assert(distance(slot, colours[key]) >= 12 && hueGap(slot, colours[key]) >= 20, 'category ' + i + ' separates from ' + key);
    if (i < 8) {
      const next = colours['category-' + (i + 1)];
      assert(distance(slot, next) >= 15, 'category ' + i + ' separates from its neighbour');
      assert(Math.min(...cvd.map(matrix => distance(simulate(slot, matrix), simulate(next, matrix)))) >= 8, 'category ' + i + ' separates under simulated colour-vision deficiency');
    }
  }
});
