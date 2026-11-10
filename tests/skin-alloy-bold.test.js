const assert = require('node:assert/strict');
const fs = require('node:fs');
const { launch, ROOT, out } = require('./lib');

(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [], records = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(ROOT + '/samples/skins.html?skin=standard');
    await page.locator('.win[data-win="editor"]').waitFor();
    // Sample stylesheets use a separate URL from distribution stylesheets.
    await page.addStyleTag({ url: ROOT + '/dist/pudl-skin-alloy-bold.css' });
    await page.addStyleTag({ content: '* { animation:none !important; transition:none !important; }' });
    await page.evaluate(() => pudlWindows.raise('editor'));
    await page.evaluate(() => document.fonts.ready);
    const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const titlePaint = () => page.locator('[data-win="editor"] .win-head').evaluate(n => {
      const s = getComputedStyle(n), t = getComputedStyle(n.querySelector('.win-title'));
      const r = n.getBoundingClientRect();
      return { background: s.backgroundImage, color: t.color, box: [r.x, r.y, r.width, r.height] };
    });
    for (const palette of ['standard', 'bevel', 'gel', 'glaze']) for (const theme of ['light', 'dark']) {
      await page.selectOption('#palette', palette); await page.selectOption('#theme', theme);
      await page.selectOption('#skin', 'standard'); await settle();
      const standard = await titlePaint();
      const boundary = await page.locator('main .btn').first().evaluate(n => {
        const s = getComputedStyle(n), canvas = document.createElement('canvas'), c = canvas.getContext('2d');
        const rgb = v => { c.fillStyle = v; c.fillRect(0,0,1,1); return [...c.getImageData(0,0,1,1).data]; };
        const ground = getComputedStyle(n.closest('.card')).backgroundColor;
        return { border: rgb(s.borderTopColor), ground: rgb(ground) };
      });
      const lum = c => c.slice(0,3).reduce((s,v,i) => { v/=255; return s+(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)*[.2126,.7152,.0722][i]; },0);
      const contrast = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
      const borderContrast = contrast(boundary.border,boundary.ground);
      assert.ok(borderContrast >= 3, palette+' '+theme+' Standard raised boundary '+borderContrast);
      await page.selectOption('#skin', 'alloy-bold'); await settle();
      const bold = await titlePaint();
      assert.deepEqual(bold, standard, 'Alloy Bold keeps Standard title fill, text and geometry');
      const title = page.locator('[data-win="editor"] .win-title');
      const probe = await title.evaluate(n => {
        const r=n.getBoundingClientRect(), c=document.createElement('canvas').getContext('2d');
        c.fillStyle=getComputedStyle(n).color;c.fillRect(0,0,1,1);
        return { x:Math.floor(r.x+r.width/2), top:Math.ceil(r.y+2), bottom:Math.floor(r.bottom-2), fg:[...c.getImageData(0,0,1,1).data] };
      });
      await title.evaluate(n=>n.style.visibility='hidden');
      const shot = await page.screenshot();
      const pixels = await page.evaluate(async ({png,probe}) => {
        const img=new Image();img.src='data:image/png;base64,'+png;await img.decode();
        const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
        const c=canvas.getContext('2d');c.drawImage(img,0,0);
        return Array.from({length:probe.bottom-probe.top+1},(_,i)=>[...c.getImageData(probe.x,probe.top+i,1,1).data]);
      }, {png:shot.toString('base64'),probe});
      await title.evaluate(n=>n.style.visibility='');
      const titleContrast = Math.min(...pixels.map(pixel=>contrast(probe.fg,pixel)));
      assert.ok(titleContrast >= 4.5,palette+' '+theme+' title contrast '+titleContrast);
      for (const skin of ['standard','alloy','alloy-bold']) {
        await page.selectOption('#skin',skin); await settle();
        await page.locator('[data-win="editor"] .win-head').screenshot({path:out('title-'+palette+'-'+theme+'-'+skin+'.png')});
      }
      records.push({palette,theme,borderContrast,titleContrast});
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(out('alloy-bold-measurements.json'),JSON.stringify(records,null,2));
    console.log('PASS Standard boundaries and Alloy Bold title inheritance, geometry and rendered text contrast across four palettes');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
