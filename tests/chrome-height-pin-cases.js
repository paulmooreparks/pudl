const assert=require('assert/strict');
const fs=require('fs');
const {launch,ROOT,out,engine}=require('./lib');
module.exports=async function run(skins){
 const browser=await launch(),evidence=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  async function retain(button,route,skin,theme,index){
   const state=await button.evaluate(n=>{const s=getComputedStyle(n),g=n.querySelector('.glyph'),r=n.getBoundingClientRect();return {pressed:n.getAttribute('aria-pressed'),name:n.getAttribute('aria-label'),disabled:n.disabled,focus:n===document.activeElement,width:r.width,height:r.height,shadow:s.boxShadow,background:s.backgroundColor,foreground:s.color,glyph:g&&getComputedStyle(g).backgroundColor};});
   state.accessibility=await button.ariaSnapshot();
   (evidence.at(-1).states||(evidence.at(-1).states=[])).push({route,index,...state});
   fs.writeFileSync(out('chrome-height-pin.json'),JSON.stringify(evidence,null,2));
   assert.ok(state.width>0&&state.height>0);assert.ok(state.focus,'pin activation retains focus');
   if(index<2){
    await page.screenshot({path:out('pin-'+skin+'-'+theme+'-'+route+'-'+state.pressed+'.png')});
    if(state.pressed==='true'){
     await page.emulateMedia({forcedColors:'active'});
     const forced=await button.evaluate(n=>({fill:getComputedStyle(n).backgroundColor,glyph:getComputedStyle(n.querySelector('.glyph')).backgroundColor,outline:getComputedStyle(n).outlineStyle}));
     assert.notEqual(forced.fill,forced.glyph,'pressed pin glyph remains distinct in forced colours');assert.notEqual(forced.outline,'none');
     evidence.at(-1).states.at(-1).forced=forced;
     await page.emulateMedia({forcedColors:'none'});
    }
   }
   fs.writeFileSync(out('chrome-height-pin.json'),JSON.stringify(evidence,null,2));
  }
  for(const skin of skins)for(const theme of ['light','dark']){
   await page.goto(ROOT+'/tests/fixtures/chrome-height-pin.html?skin='+skin+'&theme='+theme);
   await page.waitForFunction(()=>window.fixtureReady);
   await page.evaluate(()=>document.fonts.ready);
   const geometry=await page.evaluate(()=>{
    const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    return {sheets:loadedSheets,font:document.fonts.check('14px Inter'),family:getComputedStyle(document.body).fontFamily,skin:document.documentElement.dataset.skin,topbar:rect('.topbar'),taskbar:rect('.win-bar'),button:rect('#ordinary-action')};
   });
   evidence.push({skin,theme,geometry});fs.writeFileSync(out('chrome-height-pin.json'),JSON.stringify(evidence,null,2));
   await page.screenshot({path:out('chrome-height-pin-'+skin+'-'+theme+'.png')});
   assert.equal(geometry.sheets.length,10,'all fixture stylesheets successfully load');
   assert.ok(geometry.font&&geometry.family.includes('Inter'),'Inter is rendered');
   assert.equal(geometry.topbar.height,43,'stock ordinary band is 43px');
   assert.equal(geometry.taskbar.height,43,'stock taskbar is 43px');
   assert.equal(geometry.button.height,30,'taskbar control size remains unchanged');
   const direct=page.locator('#direct-pin');
   for(const [index,key] of ['Enter','Enter','Space','Space'].entries()){
    const before=await direct.getAttribute('aria-pressed');await direct.focus();await page.keyboard.press(key);
    assert.equal(await direct.getAttribute('aria-pressed'),before==='true'?'false':'true');
    assert.equal(await direct.getAttribute('aria-label'),'Pin Team notes to taskbar');
    assert.equal(await page.getByRole('button',{name:'Pin Team notes to taskbar',exact:true,pressed:before!=='true'}).count(),1);
    assert.ok(await direct.evaluate(n=>n===document.activeElement),'direct adapter retains focus');
    await retain(direct,'direct',skin,theme,index);
   }
   assert.ok(await page.locator('[data-win-pin-toggle="missing"]').isDisabled());
   await page.locator('#taskbar-launcher').click();
   const launcherPin=page.locator('[data-launcher-pin]');
   await launcherPin.evaluate(n=>n.disabled=true);assert.ok(await launcherPin.isDisabled());
   evidence.at(-1).disabledLauncher=await launcherPin.ariaSnapshot();
   const disabledState=await launcherPin.getAttribute('aria-pressed');await launcherPin.dispatchEvent('click');
   assert.equal(await launcherPin.getAttribute('aria-pressed'),disabledState,'synthetic disabled activation is rejected by controller');
   await launcherPin.evaluate(n=>n.disabled=false);
   for(const [index,key] of ['Enter','Enter','Space','Space'].entries()){
    const before=await launcherPin.getAttribute('aria-pressed');await launcherPin.focus();await page.keyboard.press(key);
    assert.equal(await launcherPin.getAttribute('aria-pressed'),before==='true'?'false':'true');
    assert.equal(await launcherPin.getAttribute('aria-label'),'Pin launcher');
    assert.equal(await page.getByRole('button',{name:'Pin launcher',exact:true,pressed:before!=='true'}).count(),1);
    await retain(launcherPin,'launcher',skin,theme,index);
   }
   await page.keyboard.press('Escape');
   for(const edge of ['left','right','top','bottom']){
   await page.evaluate(edge=>pudlWindows.dock('notes',edge),edge);
   const dockPin=page.locator('.win-dock-group[data-dock-edge="'+edge+'"] .win-dock-toggle');
   await dockPin.waitFor();
   assert.equal(await dockPin.getAttribute('aria-pressed'),'false','automatic open is not pinned membership');
   for(const [index,key] of ['Enter','Enter','Space','Space'].entries()){
    const before=await dockPin.getAttribute('aria-pressed');await dockPin.focus();await page.keyboard.press(key);
    assert.equal(await dockPin.getAttribute('aria-pressed'),before==='true'?'false':'true');
    assert.equal(await dockPin.getAttribute('aria-label'),'Pin '+edge+' dock open');
    assert.equal(await page.getByRole('button',{name:'Pin '+edge+' dock open',exact:true,pressed:before!=='true'}).count(),1);
    assert.equal(await dockPin.locator('.glyph').evaluate(n=>n.style.getPropertyValue('--glyph')),'var(--glyph-pin)');
    const focus=await dockPin.evaluate(n=>({retained:n===document.activeElement,active:{tag:document.activeElement.tagName,id:document.activeElement.id,className:document.activeElement.className},pressed:n.getAttribute('aria-pressed'),connected:n.isConnected}));
    evidence.at(-1).dockFocus={edge,key,...focus};fs.writeFileSync(out('chrome-height-pin.json'),JSON.stringify(evidence,null,2));
    assert.ok(focus.retained,'dock pin retains focus');
    await retain(dockPin,'dock-'+edge,skin,theme,index);
   }
   }
   await page.evaluate(()=>{
    const layer=document.querySelector('[data-win-layer]');layer.setAttribute('data-win-text-dock-pin','Keep dock open');pudlWindows.dock('notes','left');pudlWindows.dockMode('left','auto');
   });
   const translatedPin=page.locator('[data-dock-edge="left"] .win-dock-toggle');
   assert.equal(await translatedPin.getAttribute('aria-label'),'Keep dock open','legacy localized pin label remains a stable fallback');
   await page.evaluate(()=>{
    const layer=document.querySelector('[data-win-layer]');layer.setAttribute('data-win-text-dock-pin-button','Keep {edge} open');layer.setAttribute('data-win-text-dock-edge-left','planning sidebar');pudlWindows.dockMode('left','open');
   });
   assert.equal(await translatedPin.getAttribute('aria-label'),'Keep planning sidebar open','button template and edge localization take precedence');
   await page.evaluate(()=>pudlWindows.dockMode('left','rail'));
   assert.equal(await translatedPin.getAttribute('aria-label'),'Keep planning sidebar open','localized membership name remains stable');
   await page.evaluate(()=>pudlWindows.dock('notes',null));
   await page.locator('.win-bar-arrange').click();
   const arrangement=page.getByRole('dialog',{name:'Arrange taskbar',exact:true});
   await arrangement.locator('select').selectOption('notes');
   const arrangePin=arrangement.getByRole('button',{name:'Pin Team notes to taskbar',exact:true});
   await page.evaluate(()=>pudlWindows.configureTaskbar({destinations:[{id:'notes',label:'Team notes',glyph:'file',pinnable:false}],pins:[]}));
   assert.ok(await arrangePin.isDisabled(),'ineligible selection disables Arrange membership button');
   assert.ok(await page.locator('#direct-pin').isDisabled(),'ineligible registration disables direct adapter');
   assert.equal(await arrangePin.getAttribute('aria-pressed'),'false');
   assert.ok(!(await page.evaluate(()=>pudlWindows.menuCommands('notes').some(c=>c.id==='taskbar-pin'))),'ineligible destination keeps pin action unavailable');
   evidence.at(-1).disabledArrange=await arrangePin.ariaSnapshot();
   await page.evaluate(()=>pudlWindows.configureTaskbar({destinations:[{id:'notes',label:'Team notes',glyph:'file'}],pins:[]}));
   assert.ok(await arrangePin.isEnabled());
   for(const [index,key] of ['Enter','Enter','Space','Space'].entries()){
    const before=await arrangePin.getAttribute('aria-pressed');await arrangePin.focus();await page.keyboard.press(key);
    assert.equal(await arrangePin.getAttribute('aria-pressed'),before==='true'?'false':'true');
    assert.equal(await arrangement.getByRole('button',{name:'Pin Team notes to taskbar',exact:true,pressed:before!=='true'}).count(),1);
    assert.ok(await arrangePin.evaluate(n=>n===document.activeElement),'Arrange pin retains focus');
    await retain(arrangePin,'arrange',skin,theme,index);
   }
   evidence.at(-1).accessibility=await arrangePin.ariaSnapshot();
   await page.keyboard.press('Escape');
   let composition;
   for(const pinned of [false,true]){
    await page.evaluate(pinned=>pudlWindows.pinTaskbar('notes',pinned),pinned);
    for(let refresh=0;refresh<2;refresh++){
     if(refresh)await page.evaluate(()=>pudlWindows.update('notes','<p>Refreshed invented planning notes.</p>'));
     await page.locator('.win[data-win="notes"] [data-win-action="menu"]').click();
     const command=page.locator('.win-menu:popover-open [data-win-cmd="taskbar-'+(pinned?'unpin':'pin')+'"]');
     await command.waitFor({state:'visible'});
     evidence.at(-1).menu={html:await command.evaluate(n=>n.outerHTML),snapshot:await page.locator('.win-menu:popover-open').ariaSnapshot(),commands:await page.evaluate(()=>pudlWindows.menuCommands('notes').filter(c=>c.id.startsWith('taskbar')).map(c=>({id:c.id,label:c.label,glyph:c.glyph,disabled:!!c.disabled,checked:c.checked})))};
     const structure=await page.evaluate(()=>{
      const map=c=>c==='-'?'-':({id:c.id.startsWith('taskbar-')?'taskbar-membership':c.id,label:c.id.startsWith('taskbar-')?'membership-action':c.label,glyph:c.glyph||'',disabled:!!c.disabled,checked:c.checked==null?null:c.checked,items:c.items?c.items.map(map):[]});
      return pudlWindows.menuCommands('notes').map(map);
     });
     if(!composition)composition=structure;else assert.deepEqual(structure,composition,'menu composition, availability and checked states survive membership and body refresh');
     fs.writeFileSync(out('chrome-height-pin.json'),JSON.stringify(evidence,null,2));
     assert.equal(await command.innerText(),pinned?'Unpin from taskbar':'Pin to taskbar');
     assert.equal(await command.getAttribute('role'),null,'native window menu retains implicit button role');assert.equal(await command.getAttribute('aria-checked'),null);assert.equal(await command.getAttribute('aria-pressed'),null);
     assert.ok(await command.isEnabled());assert.equal(evidence.at(-1).menu.commands[0].glyph,'pin');assert.equal(await command.locator('.glyph').count(),0,'native window menu retains its text-only row');
     await page.keyboard.press('Escape');
     await page.locator('.win-bar [data-win-tab="notes"],.win-bar [data-win-pin="notes"]').click({button:'right'});
     const contextCommand=page.getByRole('menuitem',{name:pinned?'Unpin from taskbar':'Pin to taskbar',exact:true});
     await contextCommand.waitFor({state:'visible'});
     assert.equal(await contextCommand.getAttribute('aria-checked'),null);assert.equal(await contextCommand.getAttribute('aria-pressed'),null);
     assert.ok(await contextCommand.isEnabled());assert.ok((await contextCommand.locator('.glyph').getAttribute('style')).includes('--glyph-pin'));
     (evidence.at(-1).contextMenus||(evidence.at(-1).contextMenus=[])).push({pinned,refresh,snapshot:await contextCommand.ariaSnapshot(),html:await contextCommand.evaluate(n=>n.outerHTML)});
     await page.keyboard.press('Escape');
    }
   }
   await page.reload();await page.waitForFunction(()=>window.fixtureReady);
   const refreshedDirect=page.locator('#direct-pin');
   await page.evaluate(()=>pudlWindows.pinTaskbar('notes',false));
   await page.emulateMedia({forcedColors:'active'});await refreshedDirect.focus();await page.keyboard.press('Space');
   const paint=await refreshedDirect.evaluate(n=>({button:getComputedStyle(n).backgroundColor,glyph:getComputedStyle(n.querySelector('.glyph')).backgroundColor,outline:getComputedStyle(n).outlineStyle}));
   assert.notEqual(paint.button,paint.glyph,'forced-colour glyph contrasts with pressed fill');assert.notEqual(paint.outline,'none');
   evidence.at(-1).forcedPaint=paint;await page.screenshot({path:out('chrome-pin-forced-'+skin+'-'+theme+'.png')});
   await page.emulateMedia({forcedColors:'none'});
   fs.writeFileSync(out('chrome-height-pin.json'),JSON.stringify(evidence,null,2));
  }
  assert.deepEqual(errors,[]);console.log('PASS chrome height and pin skin matrix');
 }finally{await browser.close();}
};
