const assert=require('assert/strict');
const {launch,ROOT}=require('./lib');
(async()=>{const browser=await launch();try{
 const page=await browser.newPage({viewport:{width:390,height:850}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(ROOT+'/samples/compact-taskbar.html');await page.locator('#launcher:visible').waitFor();
 const root=page.locator('#catalog');
 await page.locator('#launcher').click();await root.waitFor({state:'visible'});
 const preference=await page.evaluate(()=>pudlLauncher.state(document.getElementById('catalog')).presentation);
 await page.locator('.win-bar-windows').click();
 await page.getByRole('menuitem',{name:'Arrange taskbar',exact:true}).waitFor();
 await page.keyboard.press('Escape');
 assert.equal(await root.isVisible(),true,'first Escape closes only the actions menu');
 assert.equal(await page.locator('.context-menu:popover-open').count(),0);
 await page.keyboard.press('Escape');
 assert.equal(await root.isVisible(),false,'second Escape closes browsing after focus returns to the taskbar');
 assert.equal(await page.evaluate(()=>pudlLauncher.state(document.getElementById('catalog')).presentation),preference);
 assert.equal(await page.locator('#launcher').evaluate(n=>n===document.activeElement),true,'dismissal returns focus to the compact opener');
 for(const target of ['#launcher','.win-bar-windows','body']) {
  await page.evaluate(()=>pudlLauncher.open(document.getElementById('catalog'),{focus:'browse'}));
  await page.locator(target).evaluate(n=>{if(n===document.body)n.tabIndex=-1;n.focus();});
  await page.keyboard.press('Escape');assert.equal(await root.isVisible(),false,'Escape dismisses compact browsing from '+target);
 }
 await page.evaluate(()=>{
  pudlLauncher.open(document.getElementById('catalog'),{focus:'browse'});
  const panel=document.createElement('div');panel.id='escape-native';panel.setAttribute('popover','auto');panel.innerHTML='<button>Other action</button>';document.body.appendChild(panel);panel.showPopover();document.body.focus();
 });
 await page.keyboard.press('Escape');
 await page.locator('#escape-native').waitFor({state:'hidden'});
 assert.equal(await root.isVisible(),true,'native popup dismissal does not dismiss the catalog on the same Escape');
 await page.keyboard.press('Escape');assert.equal(await root.isVisible(),false);
 await page.evaluate(()=>{
  pudlLauncher.open(document.getElementById('catalog'),{focus:'browse'});
  const dialog=document.createElement('dialog');dialog.id='escape-modal';dialog.innerHTML='<button>Modal action</button>';document.body.appendChild(dialog);dialog.showModal();
 });
 await page.keyboard.press('Escape');await page.locator('#escape-modal').waitFor({state:'hidden'});
 assert.equal(await root.isVisible(),true,'modal dismissal gets its own Escape');
 await page.keyboard.press('Escape');assert.equal(await root.isVisible(),false);
 await page.evaluate(()=>{
  pudlLauncher.open(document.getElementById('catalog'),{focus:'browse'});document.body.focus();
  document.addEventListener('keydown',e=>e.preventDefault(),{capture:true,once:true});
 });
 await page.keyboard.press('Escape');assert.equal(await root.isVisible(),true,'an already handled Escape retains browsing');
 await page.keyboard.press('Escape');assert.equal(await root.isVisible(),false);
 await page.setViewportSize({width:1200,height:900});
 await page.waitForFunction(()=>!pudlLauncher.state(document.getElementById('catalog')).compact);
 await page.evaluate(()=>{pudlLauncher.present(document.getElementById('catalog'),'pane',{focus:false});document.body.focus();});
 await page.keyboard.press('Escape');assert.equal(await root.isVisible(),true,'the fallback does not dismiss a desktop pane');
 assert.deepEqual(errors,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
