const assert = require('node:assert/strict');
const { launch, ROOT } = require('./lib');
(async () => {
 const b = await launch();
 try {
  const p = await b.newPage({viewport:{width:1400,height:900}});
  await p.goto(ROOT + '/tests/fixtures/menubar-freshness.html');
  await p.waitForFunction(() => window.pudlMenubar && document.querySelector('[data-applet="counter"][data-applet-state="running"]'));
  await p.evaluate(() => pudlWindows.raise('counter'));
  await p.waitForFunction(() => [...document.querySelectorAll('.menubar-front .menubar-title')].some(x=>x.textContent==='Actions'));
  async function rows() {
   await p.locator('.menubar-front .menubar-title').filter({hasText:/^Actions$/}).click();
   await p.waitForFunction(()=>document.querySelector('#menubar-panel').matches(':popover-open'));
   const result=await p.locator('#menubar-panel > .menu-action').allTextContents();
   await p.keyboard.press('Escape'); return result;
  }
  assert(!(await rows()).includes('Stop'));
  await p.evaluate(()=>window.__working=true);
  const observed=await rows(); const current=await p.evaluate(()=>pudlApplets.menuSourceIn(document.querySelector('[data-win=counter]')).commands().map(c=>c.label));
  assert(observed.some(x=>x.startsWith('Stop')), 'first opening reads newly available Stop: '+JSON.stringify({observed,current}));
  await p.evaluate(()=>window.__queued=true);
  assert((await rows()).includes('Drop the Queued Messages'));
  await p.locator('.menubar-front .menubar-title').filter({hasText:/^Actions$/}).click();
  await p.evaluate(()=>{window.__working=false;window.__queued=false;});
  await p.locator('#menubar-panel > .menu-action').filter({hasText:/^Stop/}).click();
  assert(!(await p.evaluate(()=>__log)).includes('stop'), 'old row cannot invoke removed command');
  await p.evaluate(()=>pudlWindows.retitle('counter','Renamed counter'));
  await p.waitForFunction(()=>document.querySelector('.menubar-front').textContent.includes('Renamed counter'),null,{timeout:2000});
  await p.keyboard.press('Escape');
  await p.evaluate(()=>{window.__ids=true;window.__working=true;window.__queued=true;});
  assert((await rows()).some(x=>x.startsWith('Stop')), 'command IDs read current table');
  assert((await rows()).includes('Drop the Queued Messages'));
  await p.locator('.menubar-front .menubar-title').filter({hasText:/^Actions$/}).click();
  await p.evaluate(()=>{window.__working=false;pudlCommands.changed();});
  await p.waitForFunction(()=>![...document.querySelectorAll('#menubar-panel > .menu-action')].some(x=>x.textContent.startsWith('Stop')));
  await p.keyboard.press('Escape');
  await p.evaluate(()=>{window.__working=true;pudlCommands.changed();});
  await p.evaluate(()=>{const root=document.querySelector('[data-applet=counter]');root.tabIndex=0;root.focus();});
  await p.keyboard.press('F8');
  assert.equal((await p.evaluate(()=>__log)).filter(x=>x==='stop').length,1,'current shortcut runs once');
  await p.evaluate(()=>{window.__working=false;});
  await p.keyboard.press('F8');
  assert.equal((await p.evaluate(()=>__log)).filter(x=>x==='stop').length,1, 'removed shortcut cannot run');
  await p.evaluate(()=>{window.__working=true;pudlCommands.changed();pudlMenubar.ribbon(true);});
  await p.locator('.menubar-front .menubar-title').filter({hasText:/^Actions$/}).click();
  await p.waitForSelector('#menubar-ribbon-row button:has-text("Stop")');
  await p.evaluate(()=>{window.__working=false;});
  await p.locator('#menubar-ribbon-row button').filter({hasText:/^Stop/}).click();
  assert.equal((await p.evaluate(()=>__log)).filter(x=>x==='stop').length,1, 'stale ribbon cannot run');
  await p.evaluate(()=>{pudlMenubar.ribbon(false);pudlWindows.raise('notes');});
  await p.waitForFunction(()=>document.querySelector('.menubar-front').textContent.includes('Notes'));
  await p.evaluate(()=>pudlWindows.raise('counter'));
  assert((await rows()).includes('Drop the Queued Messages'), 'first opening after front switch is current');
  await p.evaluate(()=>{window.__menus=()=>({titles:[{label:'Other applet',items:[{label:'About',run(){}}]},{id:'actions',label:'Actions',items:[{label:'Other action',run(){}}]}]});pudlWindows.raise('notes');});
  await p.waitForFunction(()=>document.querySelector('.menubar-front').textContent.includes('Other applet'));
  await p.evaluate(()=>{const old=[...document.querySelectorAll('.menubar-front .menubar-title')].find(n=>n.textContent==='Actions');pudlWindows.raise('counter');old.click();});
  await p.waitForFunction(()=>document.querySelector('#menubar-panel').matches(':popover-open') && document.querySelector('#menubar-panel').textContent.includes('Add one'));
  assert(!(await p.locator('#menubar-panel').textContent()).includes('Other action'));
  await p.keyboard.press('Escape');
  const title=()=>p.evaluate(()=>document.querySelector('[data-win=notes] .win-title').textContent);
  await p.evaluate(()=>{
   window.__parentDisabled=false;
   window.__menus=()=>({titles:[
    {label:document.querySelector('[data-win=notes] .win-title').textContent,items:[{label:'About',run(){}}]},
    {id:'actions',label:'Actions',items:[
     {id:'parent',label:'Parent',disabled:!!window.__parentDisabled,items:[{id:'child',label:'Child',run(){__log.push('child');}}]},
     {id:7,label:'Seven',run(){__log.push('seven');}}]}]});
   pudlWindows.raise('notes');
  });
  await p.waitForFunction(()=>[...document.querySelectorAll('.menubar-front .menubar-title')].some(x=>x.textContent==='Actions'));
  const actions=()=>p.locator('.menubar-front .menubar-title').filter({hasText:/^Actions$/});
  const inFrontTitle=()=>p.evaluate(()=>{const a=document.activeElement;return !!a&&a.classList.contains('menubar-title')&&!!a.closest('.menubar-front');});

  /* A numeric command id is read as a string and still finds its command. */
  await actions().click();
  await p.locator('#menubar-panel > .menu-action').filter({hasText:/^Seven$/}).click();
  assert((await p.evaluate(()=>__log)).includes('seven'),'numeric command id runs');

  /* A parent disabled after its submenu opened blocks the child. */
  await actions().click();
  await p.locator('#menubar-panel > .menu-action').filter({hasText:/^Parent/}).focus();
  await p.keyboard.press('ArrowRight');
  const child=p.locator('.menu-panel:popover-open .menu-action').filter({hasText:/^Child$/});
  await child.waitFor({state:'visible'});
  await p.evaluate(()=>{window.__parentDisabled=true;});
  await child.click();
  assert(!(await p.evaluate(()=>__log)).includes('child'),'disabled parent blocks an old submenu command');
  await p.keyboard.press('Escape');
  await p.evaluate(()=>{window.__parentDisabled=false;});

  /* The pointer is parked away from the bar before each change, since a title that widens
     slides a different one under a resting pointer, and hovering one opens it. */
  /* Retitling while Actions is open keeps Actions open, and focus stays on one of its rows. */
  await actions().click();
  await p.locator('#menubar-panel > .menu-action').first().focus();
  await p.mouse.move(700,880);
  await p.evaluate(()=>pudlWindows.retitle('notes','Retitled notes'));
  await p.waitForFunction(()=>document.querySelector('.menubar-front').textContent.includes('Retitled notes'));
  assert(await p.evaluate(()=>{const a=document.activeElement,t=document.querySelector('.menubar-front .menubar-title[aria-expanded="true"]');return !!a&&!!a.closest('#menubar-panel')&&a.classList.contains('menu-action')&&!!t&&t.textContent==='Actions';}),'retitle keeps focus on a row of the reopened Actions menu');
  await p.keyboard.press('Escape');

  /* Retitling the first title, whose identity was its old label, moves focus to the replacement front title. */
  await p.locator('.menubar-front .menubar-title').filter({hasText:/^Retitled notes$/}).click();
  await p.locator('#menubar-panel > .menu-action').first().focus();
  await p.mouse.move(700,880);
  await p.evaluate(()=>pudlWindows.retitle('notes','Second title'));
  await p.waitForFunction(()=>document.querySelector('.menubar-front').textContent.includes('Second title'));
  assert(await inFrontTitle(),'retitled first title returns focus to a front title');
  assert.equal(await p.evaluate(()=>document.activeElement.textContent),'Second title','focus is on the replacement front title');
  await p.keyboard.press('Escape');

  /* Removing the open title returns focus to a front title. */
  await actions().click();
  await p.locator('#menubar-panel > .menu-action').first().focus();
  await p.mouse.move(700,880);
  await p.evaluate(()=>{window.__menus=()=>({titles:[{label:document.querySelector('[data-win=notes] .win-title').textContent,items:[{label:'About',run(){}}]}]});pudlCommands.changed();});
  await p.waitForFunction(()=>![...document.querySelectorAll('.menubar-front .menubar-title')].some(x=>x.textContent==='Actions'));
  assert(await inFrontTitle(),'removed open title returns focus to a front title');
  assert(await title()==='Second title');
  console.log('PASS dynamic commands, stale invocation, shortcuts, ribbon, open refresh and retitle');
 } finally { await b.close(); }
})().catch(e=>{console.error("FAIL " + e.message);console.error(e);process.exitCode=1;});

