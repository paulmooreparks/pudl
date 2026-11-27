const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { launch, ROOT, out, engine } = require('./lib');
(async () => {
  const browser = await launch(), results = [];
  try {
    const cases = process.env.PUDL_PLACEMENT_REPRO ? [{width:1280,height:900,dir:'ltr',mode:'ribbon'},{width:1100,height:480,dir:'ltr',mode:'ribbon'}] : [900,480].flatMap(height=>['ltr','rtl'].flatMap(dir=>['ribbon','menus'].map(mode=>({width:height===900?1280:1100,height,dir,mode}))));
    for (const spec of cases) {
      const name=[spec.mode,spec.dir,spec.width,spec.height].join('-'), videoDir=path.join(path.dirname(out('placement.json')),'videos',name);
      fs.mkdirSync(videoDir,{recursive:true});
      const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},recordVideo:{dir:videoDir,size:{width:spec.width,height:spec.height}}});
      const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
      const result={...spec,name,failures:[]};
      function check(condition,message){if(!condition)result.failures.push(message);}
      try {
        await page.goto(ROOT+'/tests/fixtures/launcher-placement.html?mode='+spec.mode+'&dir='+spec.dir);
        await page.waitForFunction(()=>window.fixtureReady);
        const opener=spec.mode==='ribbon'?page.locator('#menubar-ribbon-row').getByRole('button',{name:'Launcher',exact:true}):page.locator('[data-menu-id="site"]');
        result.visibleGetterMatches=await opener.evaluate(n=>n===pudlMenubar.launcherButton({visible:true}));
        await opener.evaluate(n=>{window.actualOpener=n;window.retainedIdentity=pudlMenubar.launcherButton();});
        await page.evaluate(()=>{
          const panel=document.getElementById('catalog');window.openingFrames=[];window.openingEvents=[];
          panel.addEventListener('beforetoggle',e=>openingEvents.push({type:'beforetoggle',newState:e.newState,time:performance.now()}));
          panel.addEventListener('toggle',e=>openingEvents.push({type:'toggle',newState:e.newState,time:performance.now()}));
          const box=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
          function frame(time){const css=getComputedStyle(panel);if(panel.matches(':popover-open')&&css.visibility==='visible'&&Number(css.opacity)>0){openingFrames.push({time,panel:box(panel),opener:box(actualOpener),top:css.top,maxHeight:css.maxHeight,visibility:css.visibility,animations:panel.getAnimations().map(a=>a.playState)});}if(openingFrames.length<24)requestAnimationFrame(frame);}
          requestAnimationFrame(frame);
        });
        await opener.click();
        await page.waitForFunction(()=>openingFrames.length===24);
        result.frames=await page.evaluate(()=>openingFrames);result.events=await page.evaluate(()=>openingEvents);
        const first=result.frames[0].panel,last=result.frames.at(-1).panel,button=result.frames[0].opener;
        check(result.visibleGetterMatches,'visible getter resolves actual opener');
        check(result.frames.every(f=>f.panel.y>=f.opener.y+f.opener.height+5.5),'popup remains below full opener rectangle');
        check(result.frames.every(f=>['x','y','width','height'].every(k=>Math.abs(f.panel[k]-last[k])<=.5)),'first visible rectangle equals settled rectangle');
        check(first.x>=7.5&&first.y>=7.5&&first.x+first.width<=spec.width-7.5&&first.y+first.height<=spec.height-7.5,'popup stays inside viewport');
        result.hitPoints=await opener.evaluate(n=>{const r=n.getBoundingClientRect();return[[.15,.15],[.5,.5],[.85,.85]].map(([x,y])=>{const hit=document.elementFromPoint(r.x+r.width*x,r.y+r.height*y);return hit===n||n.contains(hit);});});check(result.hitPoints.every(Boolean),'full opener remains hit visible');
        await page.screenshot({path:out('placement-'+name+'.png')});
        await page.mouse.click(button.x+button.width/2,button.y+button.height/2);
        await page.evaluate(()=>new Promise(requestAnimationFrame));
        check(await page.locator('#catalog').evaluate(n=>!n.matches(':popover-open')),'second actual pointer click closes popup');
        check(await page.evaluate(()=>pudlMenubar.launcherButton()===retainedIdentity),'retained getter identity survives');
        if(spec.mode==='ribbon'&&spec.dir==='ltr'&&spec.height===900){
          result.lifecycle=await page.evaluate(async()=>{
            const panel=document.getElementById('catalog'), anchor=document.getElementById('explicit-anchor');
            pudlLauncher.destroy(panel);
            anchor.style.position='fixed';anchor.style.top='700px';anchor.style.left='400px';
            pudlLauncher.enhance(panel,{...fixtureOptions,anchor,placement:'above',size:{width:400,height:120}});
            pudlLauncher.open(panel);
            await new Promise(requestAnimationFrame);
            const p=panel.getBoundingClientRect(),a=anchor.getBoundingClientRect();
            const above={height:p.height,bottom:p.bottom,anchorTop:a.top};
            pudlLauncher.close(panel);
            pudlLauncher.destroy(panel);
            anchor.style.top='650px';
            pudlLauncher.enhance(panel,{...fixtureOptions,anchor,size:{width:400,height:120}});
            pudlLauncher.open(panel);
            await new Promise(requestAnimationFrame);
            const autoBox=panel.getBoundingClientRect(),autoAnchor=anchor.getBoundingClientRect();
            const auto={height:autoBox.height,bottom:autoBox.bottom,anchorTop:autoAnchor.top};
            pudlLauncher.close(panel);pudlLauncher.destroy(panel);
            pudlLauncher.enhance(panel,fixtureOptions);
            const old=pudlMenubar.launcherButton({visible:true});
            document.getElementById('updates').textContent='Check for updates';
            document.querySelector('[data-menubar-source] > li:nth-child(2)').firstChild.textContent='Conversations';
            pudlMenubar.refresh();
            document.querySelectorAll('[role="tab"]').forEach(n=>{if(n.textContent.trim()==='Conversations')n.click();});
            const disconnectedBeforeReturn=!old.isConnected;
            document.querySelector('[data-menu-id="site"]').click();
            await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
            const fresh=pudlMenubar.launcherButton({visible:true});
            return{above,auto,replaced:disconnectedBeforeReturn&&!old.isConnected,freshConnected:fresh.isConnected,retained:pudlMenubar.launcherButton()===retainedIdentity};
          });
          check(Math.abs(result.lifecycle.above.height-260)<=.5,'above placement resolves requested height below minimum consistently');
          check(result.lifecycle.above.bottom<=result.lifecycle.above.anchorTop-5.5,'above placement leaves entire explicit opener uncovered');
          check(Math.abs(result.lifecycle.auto.height-260)<=.5&&result.lifecycle.auto.bottom<=result.lifecycle.auto.anchorTop-5.5,'automatic side choice uses effective minimum height');
          check(result.lifecycle.replaced&&result.lifecycle.freshConnected&&result.lifecycle.retained,'visible lookup follows rebuilt toolbar without changing retained identity');
        }
        check(errors.length===0,'no page errors');result.pageErrors=errors;
      } catch(error){result.exception=error.stack;result.failures.push(error.message);}
      finally{await context.close();result.video=await page.video().path();results.push(result);fs.writeFileSync(out('placement-results.json'),JSON.stringify(results,null,2)+'\n');}
      for(const failure of result.failures)console.error('FAIL '+name+' '+failure);
      if(!result.failures.length)console.log('PASS '+name+' cold first-visible geometry, full opener and second pointer toggle');
    }
    assert.equal(results.reduce((n,r)=>n+r.failures.length,0),0,'launcher placement regressions');
  } finally {await browser.close();}
})().catch(error=>{console.error('FAIL '+error.stack);process.exitCode=1;});
