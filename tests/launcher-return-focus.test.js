const assert=require('assert/strict');
const {launch,ROOT,out}=require('./lib');
const fs=require('fs');
(async()=>{const browser=await launch();try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(ROOT+'/tests/fixtures/launcher-return-focus.html');await page.waitForFunction(()=>window.fixtureReady);
 await page.locator('#editor-a').focus();
 await page.evaluate(()=>pudlLauncher.open(document.getElementById('catalog-a'),{returnFocus:document.getElementById('editor-a')}));
 await page.locator('#catalog-a [data-start-query]').waitFor({state:'visible'});
 assert.equal(await page.locator('#catalog-a [data-start-query]').evaluate(n=>n===document.activeElement),true);
 await page.evaluate(()=>pudlLauncher.toggle(document.getElementById('catalog-a'),{returnFocus:document.activeElement}));
 assert.equal(await page.locator('#editor-a').evaluate(n=>n===document.activeElement),true,'closing toggle restores the opening editor');
 const records=[];
 async function fresh(){await page.goto(ROOT+'/tests/fixtures/launcher-return-focus.html');await page.waitForFunction(()=>window.fixtureReady);}
 async function command(target='editor-a',key='a'){await page.evaluate(({target,key})=>pudlLauncher.open(document.getElementById('catalog-'+key),{returnFocus:document.getElementById(target)}),{target,key});}
 async function focused(id,label){assert.equal(await page.locator('#'+id).evaluate(n=>n===document.activeElement),true,label||id);records.push({check:label||id,focused:id});}
 for(const close of ['toggle','close','button','Escape']){
  await fresh();await command();
  if(close==='button')await page.locator('#catalog-a [data-launcher-close]').click();
  else if(close==='Escape')await page.keyboard.press('Escape');
  else await page.evaluate(close=>pudlLauncher[close](document.getElementById('catalog-a'),{returnFocus:document.activeElement}),close);
  await focused('editor-a',close+' restores captured editor');
 }
 await fresh();await command('editor-b');await page.keyboard.press('Escape');await focused('editor-b','tabindex minus one is programmatically focusable');
 for(const invalid of ['null','foreign','removed','hidden','disabled','inert','visibility','nonfocusable']){
  await fresh();
  await page.evaluate(invalid=>{
   let target=document.getElementById('editor-a');
   if(invalid==='null')target=null;
   if(invalid==='foreign')target=document.implementation.createHTMLDocument().createElement('input');
   if(invalid==='nonfocusable'){target=document.createElement('span');target.textContent='Not focusable';document.body.prepend(target);}
   pudlLauncher.open(document.getElementById('catalog-a'),{returnFocus:target});
   if(invalid==='removed')target.remove();
   if(invalid==='hidden')target.hidden=true;
   if(invalid==='disabled')target.disabled=true;
   if(invalid==='inert')target.parentElement.inert=true;
   if(invalid==='visibility')target.style.visibility='hidden';
  },invalid);
  assert.equal(await page.locator('#catalog-a').isVisible(),true,invalid+' does not prevent opening');
  await page.evaluate(()=>pudlLauncher.close(document.getElementById('catalog-a')));
  await focused('launch-a',invalid+' falls back to opener');
 }
 await fresh();await command();
 await page.evaluate(()=>pudlLauncher.open(document.getElementById('catalog-a'),{returnFocus:document.getElementById('editor-b')}));
 await page.keyboard.press('Escape');await focused('editor-a','repeated open retains first target');
 await fresh();await command();
 await page.locator('#catalog-a [data-launcher-pin]').click();
 await page.keyboard.press('Escape');assert.equal(await page.locator('#catalog-a').isVisible(),true,'desktop pane Escape policy retained');
 await page.locator('#catalog-a [data-launcher-pin]').click();
 await page.setViewportSize({width:649,height:900});await page.waitForFunction(()=>pudlLauncher.state(document.getElementById('catalog-a')).compact);
 await page.setViewportSize({width:1200,height:900});await page.waitForFunction(()=>!pudlLauncher.state(document.getElementById('catalog-a')).compact);
 await page.keyboard.press('Escape');await focused('editor-a','pin and responsive transitions retain session');
 await fresh();await command();await page.locator('#outside').click();await page.locator('#catalog-a').waitFor({state:'hidden'});await focused('outside','light dismiss preserves clicked control');
 await page.locator('#launch-a').click();await page.locator('#catalog-a [data-launcher-close]').click();await focused('launch-a','new native pointer session has no previous target');
 await command();await page.evaluate(()=>pudlLauncher.close(document.getElementById('catalog-a')));
 await page.evaluate(()=>pudlLauncher.open(document.getElementById('catalog-a')));await page.evaluate(()=>pudlLauncher.close(document.getElementById('catalog-a')));await focused('launch-a','new default API session has no previous target');
 await fresh();await command();await page.locator('#catalog-a .destination').click();await focused('editor-b','destination focuses content immediately');
 await page.locator('#catalog-a').waitFor({state:'hidden'});await focused('editor-b','delayed dismissal retains destination focus');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await focused('editor-b','destination retains focus after dismissal delivery');
 await fresh();await command();await page.locator('#catalog-a [data-launcher-size]').click();await page.locator('#size-a').waitFor({state:'visible'});
 await page.keyboard.press('Escape');await page.locator('#size-a').waitFor({state:'hidden'});assert.equal(await page.locator('#catalog-a').isVisible(),true,'size popup owns first Escape');
 assert.equal(await page.locator('#catalog-a [data-launcher-size]').evaluate(n=>n===document.activeElement),true,'size Escape returns to size control');
 await page.keyboard.press('Escape');await focused('editor-a','command target survives size popup');
 await fresh();await command();
 await page.evaluate(()=>{const child=document.createElement('div');child.id='nested';child.setAttribute('popover','auto');child.innerHTML='<button>Nested command</button>';document.getElementById('catalog-a').append(child);child.showPopover();child.firstChild.focus();});
 await page.keyboard.press('Escape');await page.locator('#nested').waitFor({state:'hidden'});assert.equal(await page.locator('#catalog-a').isVisible(),true,'nested popup gets first Escape');
 await page.keyboard.press('Escape');await focused('editor-a','outer Escape after nested dismissal');
 await fresh();await page.setViewportSize({width:649,height:900});await page.waitForFunction(()=>pudlLauncher.state(document.getElementById('catalog-a')).compact);await command();
 const modalPrecondition=await page.evaluate(()=>{const modal=document.createElement('dialog');modal.id='modal';modal.innerHTML='<button>Modal command</button>';document.body.append(modal);modal.showModal();return document.getElementById('catalog-a').matches(':popover-open');});
 assert.equal(modalPrecondition,true,'compact manual popup remains open while modal owns Escape');
 await page.keyboard.press('Escape');await page.locator('#modal').waitFor({state:'hidden'});assert.equal(await page.locator('#catalog-a').isVisible(),true,'modal gets first Escape');
 await page.keyboard.press('Escape');await focused('editor-a','outer Escape after modal');
 await page.setViewportSize({width:1200,height:900});await fresh();await command();await page.evaluate(()=>pudlLauncher.pin(document.getElementById('catalog-a'),true));await command('editor-b','b');
 await page.evaluate(()=>pudlLauncher.close(document.getElementById('catalog-b')));await focused('editor-b','second root owns separate target');
 await page.evaluate(()=>pudlLauncher.close(document.getElementById('catalog-a')));await focused('editor-a','first root target survives second root');
 await fresh();await command();await page.evaluate(()=>pudlLauncher.destroy(document.getElementById('catalog-a')));await focused('editor-a','destroy restores owned focus');
 await fresh();await command();await page.locator('#outside').focus();await page.evaluate(()=>pudlLauncher.destroy(document.getElementById('catalog-a')));await focused('outside','destroy preserves external focus');
 await fresh();
 const ordinary=await page.evaluate(()=>{pudlLauncher.open(document.getElementById('catalog-a'));const r=document.getElementById('catalog-a').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
 await page.evaluate(()=>pudlLauncher.close(document.getElementById('catalog-a')));await command();
 const commandProof=await page.evaluate(()=>{const r=document.getElementById('catalog-a').getBoundingClientRect(),t=document.getElementById('editor-a');return {rect:{x:r.x,y:r.y,width:r.width,height:r.height},attrs:['popovertarget','aria-controls','aria-expanded','aria-haspopup'].map(a=>t.getAttribute(a))};});
 assert.deepEqual(commandProof.rect,ordinary,'return target never affects placement or size');assert.deepEqual(commandProof.attrs,[null,null,null,null]);records.push({ordinary,commandProof});
 assert.deepEqual(errors,[]);
 fs.writeFileSync(out('launcher-return-focus.json'),JSON.stringify(records,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
