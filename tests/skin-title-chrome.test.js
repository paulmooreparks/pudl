const assert = require('node:assert/strict');
const fs = require('node:fs');
const {launch, ROOT, out} = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({viewport:{width:1100,height:1000},reducedMotion:'reduce'});
    const errors=[], records=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto(ROOT+'/samples/skins.html?skin=alloy-bold');
    await page.locator('.win[data-win="editor"]').waitFor();
    await page.addStyleTag({url:ROOT+'/dist/pudl-skin-alloy-bold.css'});
    await page.addStyleTag({content:'* {transition:none !important;animation:none !important;} .audit-hide::before,.audit-hide::after {visibility:hidden !important;}'});
    await page.evaluate(()=>{pudlWindows.raise('editor');document.querySelector('.win[data-win="editor"]').setAttribute('data-win-state','waiting');});
    const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const button=page.locator('[data-win="editor"] [data-win-action="close"]');
    const lum=c=>c.slice(0,3).reduce((s,v,i)=>{v/=255;return s+(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)*[.2126,.7152,.0722][i];},0);
    const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    for(const palette of ['standard','bevel','gel','glaze']) for(const theme of ['light','dark']) {
      await page.selectOption('#palette',palette);await page.selectOption('#theme',theme);await settle();
      const chip=await page.locator('[data-win="editor"] .win-execution').evaluate(n=>{
        const c=document.createElement('canvas').getContext('2d');
        const rgb=v=>{c.clearRect(0,0,1,1);c.fillStyle=v;c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data];};
        return {fg:rgb(getComputedStyle(n.querySelector('.win-state')).color),bg:rgb(getComputedStyle(n).backgroundColor)};
      });
      assert.ok(chip.bg[3]===255 && contrast(chip.fg,chip.bg)>=3,'state glyph contrast '+palette+' '+theme);
      for(const state of ['rest','hover','focus']) {
        await button.evaluate(n=>n.blur());await page.mouse.move(0,0);
        if(state==='hover')await button.hover();
        if(state==='focus'){await page.keyboard.press('Tab');await button.focus();}
        await settle();
        const probe=await button.evaluate(n=>{
          const r=n.getBoundingClientRect(),s=getComputedStyle(n),c=document.createElement('canvas').getContext('2d');
          c.fillStyle=s.color;c.fillRect(0,0,1,1);
          return {x:Math.floor(r.x+r.width/2),top:Math.ceil(r.y+5),bottom:Math.floor(r.bottom-5),fg:[...c.getImageData(0,0,1,1).data],focus:n.matches(':focus-visible'),shadow:s.boxShadow};
        });
        if(state==='focus')assert.ok(probe.focus && probe.shadow!=='none','visible chrome focus');
        await button.evaluate(n=>n.classList.add('audit-hide'));
        const png=(await page.screenshot()).toString('base64');
        const pixels=await page.evaluate(async ({png,probe})=>{
          const im=new Image();im.src='data:image/png;base64,'+png;await im.decode();
          const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;
          const ctx=c.getContext('2d');ctx.drawImage(im,0,0);
          return Array.from({length:probe.bottom-probe.top+1},(_,i)=>[...ctx.getImageData(probe.x,probe.top+i,1,1).data]);
        },{png,probe});
        await button.evaluate(n=>n.classList.remove('audit-hide'));
        const ratio=Math.min(...pixels.map(p=>contrast(probe.fg,p)));
        assert.ok(ratio>=3,'chrome glyph '+palette+' '+theme+' '+state+' '+ratio);
        await page.locator('[data-win="editor"] .win-head').screenshot({path:out('chrome-'+palette+'-'+theme+'-'+state+'.png')});
        records.push({palette,theme,state,chromeContrast:ratio,stateContrast:contrast(chip.fg,chip.bg)});
      }
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(out('chrome-measurements.json'),JSON.stringify(records,null,2));
    console.log('PASS Alloy Bold title chrome, focus and execution-state contrast in four palettes');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
