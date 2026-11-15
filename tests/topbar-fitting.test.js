const assert = require('assert/strict');
const { launch, ROOT, out } = require('./lib');
(async () => {
 const browser = await launch(); let failures = 0;
 try {
  const p = await browser.newPage({ viewport: { width: 220, height: 900 } });
  async function settle() { await p.evaluate(() => document.fonts.ready); await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))); }
  const direct = () => p.locator('.toolbar-group > button.btn').evaluateAll(es => es.filter(e => e.getClientRects().length).length);
  const check = (name, pass) => { console.log((pass ? 'PASS ' : 'FAIL ') + name); if (!pass) failures++; };
  await p.goto(ROOT + '/tests/fixtures/topbar-1-loads-folded-stays-folded.html'); await settle();
  await p.setViewportSize({width:1400,height:900}); await settle();
  check('widened toolbar restores all five direct commands', await direct() === 5);
  await p.screenshot({path:out('topbar-widened.png')});
  await p.setViewportSize({width:700,height:900});
  await p.goto(ROOT + '/tests/fixtures/topbar-2-topbar-wraps.html'); await settle();
  check('enhanced shared topbar is one row without ribbon', await p.evaluate(() => { const a=document.querySelector('.menubar').getBoundingClientRect(),b=document.querySelector('.toolbar').getBoundingClientRect();return Math.max(a.top,b.top)<Math.min(a.bottom,b.bottom); }));
  await p.screenshot({path:out('topbar-shared.png')});
  for(const rtl of [false,true]){
   await p.evaluate(rtl=>{
    document.documentElement.dir=rtl?'rtl':'ltr';
    const bar=document.querySelector('.toolbar');
    if(!bar.querySelector('[data-unavailable]')){
     for(const kind of ['hidden','css']){
      const group=document.createElement('div');group.className='toolbar-group';group.dataset.toolbarGroup='Unavailable '+kind;group.dataset.unavailable=kind;
      if(kind==='hidden')group.hidden=true;else group.style.display='none';
      group.innerHTML='<button class="btn btn-sm">Unavailable '+kind+'</button>';bar.appendChild(group);
     }
     bar.querySelector('.toolbar-group').setAttribute('data-toolbar-end','');
    }
    pudlToolbar.enhance(document);
   },rtl);
   for(const width of [220,1400,700,1400]){
    await p.setViewportSize({width,height:900});await settle();
    await p.evaluate(()=>pudlToolbar.fit(document.querySelector('.toolbar')));await settle();
    check('authored hidden groups stay unavailable at '+width+' rtl='+rtl,await p.locator('[data-unavailable]').evaluateAll(gs=>gs.every(g=>!g.getClientRects().length)));
    if(width===1400)check('all native commands restore after forced intrinsic measurement rtl='+rtl,await direct()===5);
   }
  }
  // Each folded group is opened from a fresh page so prior focus cannot affect its next fit.
  for(const name of ['One','Two','Three']){
   await p.setViewportSize({width:220,height:900});await p.goto(ROOT+'/tests/fixtures/topbar-1-loads-folded-stays-folded.html');await settle();
   const more=p.locator('.toolbar-more > .menu-btn');
   if(await more.isVisible()){
    await more.focus();await p.keyboard.press('ArrowDown');
    await p.waitForSelector('.toolbar-more > .menu-panel:popover-open');
    check('More exposes all five commands',await p.locator('.toolbar-more > .menu-panel .menu-action').count()===5);
    await p.keyboard.press('Escape');break;
   }
   const group=p.locator('[data-toolbar-group="'+name+'"]');
   await group.locator('.toolbar-fold > .menu-btn').focus();await p.keyboard.press('ArrowDown');
   await group.locator('.menu-panel').waitFor({state:'visible'});
   check('folded '+name+' keeps command rows',await group.locator('.menu-panel .menu-action').count()===(name==='Three'?1:2));
   await p.keyboard.press('Escape');
  }
  const baseline = await browser.newContext({javaScriptEnabled:false,viewport:{width:220,height:900}});
  const no = await baseline.newPage();await no.goto(ROOT + '/tests/fixtures/topbar-1-loads-folded-stays-folded.html');
  check('no-script toolbar exposes every native control inside its scroll bounds',await no.locator('.toolbar').evaluate(b=>{const r=b.getBoundingClientRect();return [...b.querySelectorAll('button')].every(e=>{const q=e.getBoundingClientRect();return q.left>=r.left-1&&q.right<=r.right+1;});}));
  await no.screenshot({path:out('topbar-no-script.png')});await baseline.close();
 } finally { await browser.close(); }
 process.exitCode=failures?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
