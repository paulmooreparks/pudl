const assert=require('assert/strict');
const {launch,ROOT,out}=require('./lib');
(async()=>{
 const b=await launch();const p=await b.newPage({viewport:{width:500,height:650}});let failures=0;
 const check=(n,v)=>{console.log((v?'PASS ':'FAIL ')+n);if(!v)failures++;};
 const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 async function open(){await p.locator('.toolbar').evaluate(e=>pudlToolbar.fit(e));await settle();const more=p.locator('.toolbar-more > button');const btn=await more.isVisible()?more:p.locator('[data-toolbar-group="Views"] > .toolbar-fold > button');await btn.click();await p.waitForSelector('.menu-panel:popover-open');return p.locator('.menu-panel:popover-open');}
 try{
  await p.goto(ROOT+'/tests/fixtures/toolbar-linked-segments.html');await p.evaluate(()=>document.fonts.ready);await settle();
  let panel=await open();
  check('native navigation rows retain authored order and omit hidden choices',JSON.stringify(await panel.locator('.menu-action').allTextContents())===JSON.stringify(['Week','Rooms','Locked','Choice']));
  const week=panel.getByRole('menuitem',{name:'Week',exact:true});
  check('navigation current state and delegated region metadata survive',await week.getAttribute('aria-current')==='page'&&await week.getAttribute('data-region-link')!==null&&await week.getAttribute('data-route')==='week');
  const rooms=panel.getByRole('menuitem',{name:'Rooms',exact:true});
  check('target rel download preserved',await rooms.getAttribute('target')==='_blank'&&await rooms.getAttribute('rel')==='noopener'&&await rooms.getAttribute('download')==='rooms.txt');
  check('unavailable has no destination',await panel.getByRole('menuitem',{name:'Locked'}).getAttribute('href')===null);
  check('button choice retains radio state',await panel.getByRole('menuitemradio',{name:'Choice'}).getAttribute('aria-checked')==='true');
  await week.focus();
  await p.locator('#week').evaluate(e=>{e.href='#updated';e.textContent='Updated';e.setAttribute('aria-current','date');});
  await p.waitForFunction(()=>document.querySelector('.menu-panel:popover-open a')?.textContent==='Updated');
  check('live updates preserve focused row identity',await p.evaluate(()=>document.activeElement.textContent==='Updated'&&document.activeElement.getAttribute('href')==='#updated'&&document.activeElement.getAttribute('aria-current')==='date'));
  await p.locator('#week').evaluate(e=>e.hidden=true);await settle();
  check('hidden focused source removes folded row and preserves component focus',await panel.getByText('Updated',{exact:true}).count()===0&&await p.evaluate(()=>!!document.activeElement.closest('.menu-panel')));
  await p.locator('#rooms').evaluate(e=>{e.removeAttribute('download');e.removeAttribute('target');e.removeAttribute('rel');e.textContent='Navigate';});
  await settle();await panel.getByRole('menuitem',{name:'Navigate'}).click();
  await p.waitForURL(/#rooms$/);check('native same-page navigation executes',p.url().endsWith('#rooms'));
  await p.goto(ROOT+'/tests/fixtures/toolbar-linked-segments.html');await settle();panel=await open();
  await panel.getByRole('menuitemradio',{name:'Choice'}).click();check('button executes once',await p.evaluate(()=>window.presses===1));
  await p.goto(ROOT+'/tests/fixtures/toolbar-linked-segments.html');await settle();panel=await open();
  await panel.getByRole('menuitem',{name:'Week',exact:true}).focus();
  await p.locator('.toolbar').evaluate(e=>{e.style.width='1000px';pudlToolbar.fit(e);});
  await p.keyboard.press('Escape');await settle();
  check('resize recovery restores logical native source focus',await p.locator('#week').evaluate(e=>document.activeElement===e));
  await p.locator('.toolbar').evaluate(e=>{e.style.width='180px';pudlToolbar.fit(e);});await settle();panel=await open();
  await p.locator('#outside').focus();
  await p.locator('#rooms').evaluate(e=>e.remove());await settle();
  check('live removal does not steal outside focus',await p.locator('#outside').evaluate(e=>document.activeElement===e));
  await p.keyboard.press('Escape');await settle();
  await p.goto(ROOT+'/tests/fixtures/toolbar-linked-segments.html');await settle();panel=await open();
  await p.locator('#rooms').evaluate(e=>{e.removeAttribute('download');e.href='/tests/fixtures/toolbar-link-target.txt';});await settle();
  const popupPromise=p.waitForEvent('popup');await panel.getByRole('menuitem',{name:'Rooms',exact:true}).click();const popup=await popupPromise;
  await popup.waitForLoadState();check('target blank opens native destination',popup.url().endsWith('/toolbar-link-target.txt'));await popup.close();
  await p.goto(ROOT+'/tests/fixtures/toolbar-linked-segments.html');await settle();panel=await open();
  await p.locator('#rooms').evaluate(e=>{e.removeAttribute('target');e.href='/tests/fixtures/toolbar-link-target.txt';});await settle();
  const downloadPromise=p.waitForEvent('download');await panel.getByRole('menuitem',{name:'Rooms',exact:true}).click();const download=await downloadPromise;
  check('native download retains filename',download.suggestedFilename()==='rooms.txt');
  await p.goto(ROOT+'/tests/fixtures/toolbar-linked-segments.html');await settle();panel=await open();
  await panel.getByRole('menuitem',{name:'Week',exact:true}).focus();await p.keyboard.press('Enter');await p.waitForURL(/#week$/);
  check('keyboard Enter follows native destination',p.url().endsWith('#week'));
  await p.goto(ROOT+'/tests/fixtures/toolbar-linked-segments.html');await settle();panel=await open();
  await p.locator('#rooms').evaluate(e=>{e.removeAttribute('download');e.removeAttribute('target');e.href='/tests/fixtures/toolbar-link-target.txt';});await settle();
  const modifiedPromise=p.context().waitForEvent('page');await panel.getByRole('menuitem',{name:'Rooms',exact:true}).click({modifiers:['Control']});const modified=await modifiedPromise;
  await modified.waitForLoadState();check('Control click retains native new-tab behavior',modified.url().endsWith('/toolbar-link-target.txt'));await modified.close();
  await p.screenshot({path:out('toolbar-linked.png')});
  for(const rtl of [false,true]){await p.evaluate(v=>document.documentElement.dir=v?'rtl':'ltr',rtl);await p.locator('.toolbar').evaluate(e=>{e.style.width='1000px';pudlToolbar.fit(e);});await settle();check('wide native links restore rtl='+rtl,await p.locator('#week').isVisible());await p.locator('.toolbar').evaluate(e=>{e.style.width='180px';pudlToolbar.fit(e);});await settle();}
 }finally{await b.close();}
 process.exitCode=failures?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
