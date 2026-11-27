const assert=require('assert/strict');
const fs=require('fs');
const {launch,ROOT,out,engine}=require('./lib');
const skins=['standard','bevel','gel','glaze','matte','ink','alloy','alloy-bold','glass'];
module.exports=async function run(dir,touch){
 if(touch&&engine==='firefox'){fs.writeFileSync(out('chrome-height-responsive.json'),JSON.stringify({skipped:true,reason:'Firefox does not provide coarse-pointer emulation',dir},null,2));console.log('SKIP ordinary coarse-pointer simulation in Firefox');return;}
 const browser=await launch(),evidence=[];
 try{
  const page=await browser.newPage({hasTouch:touch,viewport:{width:1440,height:950}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  async function measure(tag){
   const row=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const rect=s=>{const n=document.querySelector(s),r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
    const bar=getComputedStyle(document.querySelector('.win-bar'));
    resolve({width:innerWidth,dir:document.documentElement.dir,font:parseFloat(getComputedStyle(document.documentElement).fontSize),skin:document.documentElement.dataset.skin,theme:document.documentElement.dataset.theme,sheets:loadedSheets.slice(),fontLoaded:document.fonts.check('14px Inter'),radius:getComputedStyle(document.querySelector('#ordinary-action')).borderRadius,coarse:matchMedia('(pointer:coarse)').matches,topbar:rect('.topbar'),taskbar:rect('.win-bar'),button:rect('#ordinary-action'),safePadding:parseFloat(bar.paddingBottom),overflow:document.documentElement.scrollWidth>innerWidth,launcher:pudlLauncher.state(document.querySelector('#catalog')),focus:document.activeElement.getAttribute('data-start-query')!==null,ribbonPreference:pudlMenubar.ribbon(),selected:pudlMenubar.launcherButton()?.getAttribute('aria-selected')==='true'?'launcher':null,ribbonVisible:!!document.querySelector('.menubar-ribbon:not([hidden])'),workspace:rect('#layout')});
   }))));
   evidence.push({tag,...row});fs.writeFileSync(out('chrome-height-responsive.json'),JSON.stringify(evidence,null,2));
   assert.equal(row.sheets.length,10);assert.ok(row.fontLoaded);assert.ok(!row.overflow,'page remains within viewport');
   assert.equal(row.radius,({standard:'7px',bevel:'0px',gel:'999px',glaze:'4px',matte:'3px',ink:'0px',alloy:'3px','alloy-bold':'3px',glass:'7px'})[row.skin],'rendered skin geometry accompanies positive load proof');
   assert.ok(row.safePadding>=6,'safe-area padding retains ordinary minimum');
   return row;
  }
  for(const skin of skins)for(const theme of ['light','dark'])for(const font of touch?[16,20]:[16,20,32])for(const mode of touch?['menus','ribbon']:['ribbon']){
   await page.setViewportSize({width:1440,height:950});
   await page.goto(ROOT+'/tests/fixtures/chrome-height-pin.html?mode='+mode+'&skin='+skin+'&theme='+theme+'&font='+font+'&dir='+dir);
   await page.waitForFunction(()=>window.fixtureReady);await page.evaluate(()=>document.fonts.ready);
   if(mode==='ribbon')await page.getByRole('tab',{name:'Harbor',exact:true}).click();
   const wide=await measure('wide '+mode);
   const expected=Math.max(43,font*1.125+25);
   assert.equal(wide.topbar.height,expected);assert.equal(wide.taskbar.height,expected);
   assert.equal(wide.button.height,Math.max(30,font*1.125+12),'controls retain their independent scale');
   assert.equal(wide.dir,dir);assert.equal(wide.coarse,touch);
   if(mode==='ribbon'){assert.ok(wide.workspace.y>wide.topbar.bottom,'ribbon row remains separate');assert.ok(wide.ribbonPreference&&wide.ribbonVisible);assert.equal(wide.selected,'launcher');}
   else assert.equal(wide.ribbonPreference,false);
   await page.locator('#taskbar-launcher').click();await page.locator('[data-start-query]').focus();
   for(const width of [651,650,649,650,651,1440]){
    await page.setViewportSize({width,height:950});
    const row=await measure('live transition');
    assert.equal(row.topbar.height,expected,'ordinary band keeps its scale-aware minimum');
    assert.equal(row.taskbar.height,expected);assert.ok(row.focus,'live resize retains search focus');
    assert.ok(await page.locator('#catalog').isVisible(),'open launcher survives live resize');
    assert.equal(row.ribbonPreference,mode==='ribbon','folding retains mode preference');
    if(width===1440&&mode==='ribbon'){assert.ok(row.ribbonVisible);assert.equal(row.selected,wide.selected,'widening restores the selected product tab');}
   }
   await page.keyboard.press('Escape');
   await page.screenshot({path:out('chrome-responsive-'+skin+'-'+theme+'-'+font+'-'+mode+'.png')});
  }
  if(!touch&&dir==='ltr')for(const extra of ['native=1','wrap=1','dir=rtl']){
   await page.goto(ROOT+'/tests/fixtures/chrome-height-pin.html?'+extra);await page.waitForFunction(()=>window.fixtureReady);
   const row=await measure(extra);assert.ok(row.topbar.height>=43);
   if(extra==='wrap=1')assert.ok(row.topbar.height>43,'wrapped content grows the band');
  }
  if(!touch&&dir==='ltr'&&engine!=='firefox'){
   const context=await browser.newContext({hasTouch:true,viewport:{width:651,height:950}});
   try{
    const touch=await context.newPage();await touch.goto(ROOT+'/tests/fixtures/chrome-height-pin.html?native=1');await touch.waitForFunction(()=>window.fixtureReady);
    const coarse=await touch.evaluate(()=>({coarse:matchMedia('(pointer:coarse)').matches,height:document.querySelector('.topbar').getBoundingClientRect().height,size:getComputedStyle(document.querySelector('.topbar')).getPropertyValue('--native-chrome-size')}));
    evidence.push({tag:'coarse native simulation',...coarse});assert.ok(coarse.coarse);assert.ok(coarse.height>=48);assert.equal(coarse.size,'48px');
    await touch.screenshot({path:out('chrome-native-coarse.png')});
   }finally{await context.close();}
  }
  fs.writeFileSync(out('chrome-height-responsive.json'),JSON.stringify(evidence,null,2));
  assert.deepEqual(errors,[]);console.log('PASS scale-aware height and live responsive transitions');
 }finally{await browser.close();}
};
