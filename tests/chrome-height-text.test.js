const assert=require('assert/strict');
const fs=require('fs');
const {launch,ROOT,out}=require('./lib');
(async()=>{
 const browser=await launch(),rows=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const skin of ['standard','bevel','gel','glaze','matte','ink','alloy','alloy-bold','glass'])for(const theme of ['light','dark']){
   await page.goto(ROOT+'/tests/fixtures/chrome-height-pin.html?skin='+skin+'&theme='+theme+'&font=20');await page.waitForFunction(()=>window.fixtureReady);
   await page.evaluate(()=>{const s=document.documentElement.style;s.setProperty('--text-xs','24px');s.setProperty('--text-sm','26px');s.setProperty('--text-md','28px');});
   await page.evaluate(()=>document.fonts.ready);
   const row=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const button=document.querySelector('#ordinary-action'),range=document.createRange();range.selectNodeContents(button);
    const rect=n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    resolve({font:getComputedStyle(button).fontSize,button:rect(button),words:rect(range),topbar:rect(document.querySelector('.topbar')),taskbar:rect(document.querySelector('.win-bar')),sheets:loadedSheets.slice(),overflow:document.documentElement.scrollWidth>innerWidth});
   }))));
   rows.push({skin,theme,...row});fs.writeFileSync(out('chrome-height-text.json'),JSON.stringify(rows,null,2));
   await page.screenshot({path:out('chrome-text-'+skin+'-'+theme+'.png')});
   assert.equal(row.font,'24px','actual taskbar text doubles independently of root geometry');assert.equal(row.sheets.length,10);
   assert.ok(row.words.top>=row.button.top&&row.words.bottom<=row.button.bottom,'enlarged text remains within its hit target');
   assert.ok(row.button.height>=row.words.height);assert.ok(row.topbar.height>43&&row.taskbar.height>43,'bands grow for actual enlarged content');
   assert.ok(!row.overflow,'actual text scaling does not overflow the page');
  }
  assert.deepEqual(errors,[]);console.log('PASS actual enlarged chrome text containment');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
