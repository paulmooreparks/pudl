const assert=require('assert/strict');
const fs=require('fs');
const {launch,ROOT,out,engine}=require('./lib');
(async()=>{
 const browser=await launch(),rows=[];
 try{
  for(const touch of engine==='firefox'?[false]:[false,true]){
   const context=await browser.newContext({hasTouch:touch,viewport:{width:1440,height:950}});
   try{
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    for(const skin of ['standard','bevel','gel','glaze','matte','ink','alloy','alloy-bold','glass'])for(const theme of ['light','dark']){
     await page.setViewportSize({width:1440,height:950});
     await page.goto(ROOT+'/tests/fixtures/chrome-height-pin.html?native=1&skin='+skin+'&theme='+theme);await page.waitForFunction(()=>window.fixtureReady);
     await page.addScriptTag({url:ROOT+'/dist/pudl-native.js'});
     await page.evaluate(()=>{window.nativeHeight=pudlNative.attach(document.querySelector('.topbar'),{title:'Harbor',state:{fullscreen:true},actions:{minimize(){},restore(){},close(){}}});});
     await page.evaluate(()=>document.fonts.ready);
     for(const width of [1440,651,650,649,420,649,650,651]){
      await page.setViewportSize({width,height:950});
      if(width===420)await page.evaluate(()=>document.documentElement.dir='rtl');
      const row=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
       const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
       resolve({width:innerWidth,coarse:matchMedia('(pointer:coarse)').matches,dir:document.documentElement.dir,border:parseFloat(getComputedStyle(document.querySelector('.topbar')).borderBottomWidth),topbar:rect(document.querySelector('.topbar')),controls:rect(document.querySelector('.native-window-controls')),menu:rect(document.querySelector('.native-window-menu')),targets:[...document.querySelectorAll('.native-window-target')].map(rect),buttons:[...document.querySelectorAll('.native-window-target>.icon-btn')].map(rect),overflow:document.documentElement.scrollWidth>innerWidth,sheets:loadedSheets.slice(),font:document.fonts.check('14px Inter')});
      }))));
      rows.push({skin,theme,touch,...row});fs.writeFileSync(out('chrome-height-native.json'),JSON.stringify(rows,null,2));
      assert.equal(row.sheets.length,10);assert.ok(row.font);assert.equal(row.coarse,touch);assert.ok(!row.overflow);
      assert.ok(row.topbar.height>=(touch?48:43));assert.equal(row.menu.left,0);assert.equal(row.controls.right,width);
      assert.equal(row.controls.top,row.topbar.top);assert.equal(row.controls.bottom,row.topbar.bottom-row.border,'native edge slots fill the padding box inside the border');
      assert.ok(row.targets.every(r=>r.width===(touch?48:32)&&r.height>=r.width),'native transparent edge targets keep their independent dimensions');
      assert.ok(row.buttons.every(r=>r.width===28&&r.height===28),'native visible buttons retain their ordinary size');
     }
     await page.screenshot({path:out('chrome-native-'+skin+'-'+theme+'-'+touch+'.png')});
    }
    assert.deepEqual(errors,[]);
   }finally{await context.close();}
  }
  console.log('PASS simulated native chrome height and edge targets');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
