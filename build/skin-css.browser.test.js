/* Focused compiler checks, independent of the full Standard baseline. */
'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('fs');
const path = require('path');
const playwright = require('playwright');
const { compile } = require('./skin-css');
const root = path.join(__dirname, '..');
const css = ['pudl.css', 'pudl-windows.css'].map(name => fs.readFileSync(path.join(root, 'dist', process.env.PUDL_MIN ? 'min' : '', name), 'utf8')).join('\n');
const definition = { version: 1, id: 'probe', name: 'Probe', treatment: 'bevel',
  radii: { radius: 0, 'radius-sm': 0, 'radius-xs': 0, 'radius-pill': 0 },
  palette: { light: { accent: '#123456' }, dark: { accent: '#abcdef' } } };

for (const engine of (process.env.PUDL_BROWSER ? [process.env.PUDL_BROWSER] : ['chromium', 'firefox', 'webkit'])) {
  test(engine + ' verifies effective cascade, selection and stable control geometry', async () => {
    const browser = await playwright[engine].launch();
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent('<button class="btn" id="control">A control</button><input class="form-input" id="field" value="A field"><button class="btn btn-danger" id="danger">Delete</button>');
      await page.addStyleTag({ content: css });
      /* This check isolates shape geometry from installed/font-download and
         transition timing differences; the baseline tests cover real fonts. */
      await page.addStyleTag({ content: '* { transition: none !important; animation: none !important; font-family: Arial !important; }' });
      const sample = () => page.evaluate(() => {
        const result = {};
        for (const id of ['control', 'field']) {
          const el = document.getElementById(id), s = getComputedStyle(el), r = el.getBoundingClientRect();
          result[id] = { box: [r.x, r.y, r.width, r.height], padding: s.padding, border: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth],
            client: [el.clientWidth, el.clientHeight], radius: s.borderRadius, shadow: s.boxShadow, background: s.backgroundImage };
        }
        result.accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        return result;
      });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => { document.documentElement.setAttribute('data-theme', theme); document.documentElement.removeAttribute('data-skin'); }, theme);
        const before = await sample();
        assert.match(before.field.shadow, /inset/, 'Standard field has its sunken paint');
        assert.match(before.field.shadow, /0px 1px 2px/, 'Standard field uses the expected inset depth');
        assert.equal(before.field.box[3], 36, 'fixture is an enhanced PUDL-sized field');
        const sheet = await page.addStyleTag({ content: compile(definition) });
        assert.deepEqual(await sample(), before, 'unselected skin changes nothing');
        await page.evaluate(() => document.documentElement.setAttribute('data-skin', 'standard'));
        assert.deepEqual(await sample(), before, 'explicit Standard changes nothing');
        await page.evaluate(() => document.documentElement.setAttribute('data-skin', 'probe'));
        const after = await sample();
        assert.equal(after.accent, theme === 'light' ? '#123456' : '#abcdef', 'skin palette wins over base theme');
        for (const id of ['control', 'field']) {
          for (const property of ['box', 'padding', 'border', 'client']) assert.deepEqual(after[id][property], before[id][property], id + ' ' + property);
        }
        assert.equal(after.control.radius, '0px');
        assert.notEqual(after.control.shadow, before.control.shadow, 'bevel paint reaches the control');
        assert.notEqual(after.field.shadow, before.field.shadow, 'bevel paint reaches the PUDL field');
        assert.match(after.field.shadow, /1px 1px 0px/, 'bevel field has its first inset edge');
        assert.match(after.field.shadow, /-1px -1px 0px/, 'bevel field has its opposing inset edge');
        const dangerRatio = () => page.locator('#danger').evaluate(el => {
          const s = getComputedStyle(el), canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          function luminance(colour) {
            ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = colour; ctx.fillRect(0, 0, 1, 1);
            const channels = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3).map(value => {
              const c = value / 255;
              return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
          }
          const foreground = luminance(s.color), background = luminance(s.backgroundColor);
          return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
        });
        for (const state of ['rest', 'hover', 'pressed']) {
          if (state === 'hover') await page.locator('#danger').hover();
          if (state === 'pressed') await page.mouse.down();
          try { assert.ok(await dangerRatio() >= 4.5, theme + ' destructive text contrast at ' + state); }
          finally { if (state === 'pressed') await page.mouse.up(); }
        }
        await page.mouse.move(799, 599);
        const host = await page.addStyleTag({ content: '[data-theme="' + theme + '"] { --accent: #765432; --surface-alt: #dedede; }' });
        assert.equal((await sample()).accent, '#765432', 'ordinary later host override wins');
        const fill = await page.locator('#control').evaluate(el => getComputedStyle(el).backgroundColor);
        assert.equal(fill, 'rgb(222, 222, 222)', 'bevel paint consumes the host palette');
        await host.evaluate(el => el.remove());
        await sheet.evaluate(el => el.remove());
      }
      const skinSheet = await page.addStyleTag({ content: compile(definition) });
      for (const media of [{ media: 'screen', forcedColors: 'active' }, { media: 'print', forcedColors: 'none' }]) {
        await page.emulateMedia(media);
        await page.evaluate(() => document.documentElement.removeAttribute('data-skin'));
        const standard = await sample();
        await page.evaluate(() => document.documentElement.setAttribute('data-skin', 'probe'));
        assert.deepEqual(await sample(), standard, 'skin leaves system-colour and print rules intact');
      }
      await skinSheet.evaluate(el => el.remove());
    } finally { await browser.close(); }
  });
}
