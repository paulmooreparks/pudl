const assert = require('assert/strict');
const {launch,ROOT} = require('./lib');
(async()=>{
 const b=await launch();
 try {
  const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  async function fresh(){
   await p.goto(ROOT+'/tests/fixtures/combo-query-navigation.html');await p.locator('input[role=combobox]').nth(1).waitFor();
   await p.evaluate(()=>{window.s=document.querySelector('select[name=b]');window.q=document.querySelectorAll('input[role=combobox]')[1];window.panel=document.getElementById(q.getAttribute('aria-controls'));window.events=[];for(const t of ['input','change'])s.addEventListener(t,()=>events.push(t));});
   await p.locator('input[role=combobox]').nth(1).focus();await p.keyboard.press('ControlOrMeta+A');await p.keyboard.type('Pri');await p.keyboard.press('ArrowDown');
  }
  const state=()=>p.evaluate(()=>({text:q.value,value:s.value,open:panel.matches(':popover-open'),rows:[...panel.querySelectorAll('[role=option]')].map(r=>r.textContent),active:q.getAttribute('aria-activedescendant'),events:[...events],focused:document.activeElement===q}));
  await fresh();await p.evaluate(()=>{document.querySelector('#before-b').focus();s.form.reset();});
  await p.waitForFunction(()=>q.value==='Ada Invented');
  let r=await state();assert.equal(r.open,false);assert.deepEqual(r.rows,[]);assert.equal(r.active,null);assert.equal(r.focused,false);assert.deepEqual(r.events,[]);
  console.log('PASS completed reset retires rows/filter/activation without focus return');
  for(const action of ['browse','refresh','reset','owner','disconnect']){
   await fresh();
   if(action==='disconnect'){
    // Let ordinary blur settlement finish before testing disconnected
    // reset ownership. Removing a focused proxy would also test blur.
    await p.locator('#before-b').focus();await p.waitForFunction(()=>q.value==='Ada Invented');
    await p.evaluate(()=>q.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})));
   }
   await p.evaluate(action=>{
    const hide=panel.hidePopover.bind(panel);window.closeCalls=0;
    // This wrapper is an explicit synchronous host boundary, independent
    // of whether a browser dispatches toggle synchronously.
    panel.hidePopover=function(){hide();closeCalls++;panel.hidePopover=hide;
     // Native reset has already cleared the proxy. Create newer host
     // work here so the old reset must not overwrite that work.
     q.value='new '+action+' draft';
     if(action==='browse')q.parentElement.querySelector('.combo-open').click();
     if(action==='refresh'){s.value='p3';pudlCombo.refresh(s);}
     if(action==='reset'){s.options[1].defaultSelected=false;s.options[3].defaultSelected=true;s.form.reset();}
     if(action==='owner'){const f=document.createElement('form');f.id='other';document.body.append(f);s.setAttribute('form','other');}
     if(action==='disconnect')s.closest('.form-select-wrap').remove();
    };
    s.form.reset();
   },action);
   await p.waitForFunction(()=>window.closeCalls===1);
   if(action==='reset')await p.waitForFunction(()=>q.value==='Wen Hui Sample');
   r=await state();assert.deepEqual(r.events,[]);
   if(action==='browse'){assert.equal(r.text,'new browse draft');assert.equal(r.open,true);assert.equal(r.rows.length,4);assert.ok(r.active);}
   if(action==='refresh'){assert.equal(r.text,'new refresh draft');assert.equal(r.value,'p3');}
   if(action==='reset'){assert.equal(r.text,'Wen Hui Sample');assert.equal(r.value,'p3');assert.equal(r.open,false);}
   if(action==='owner'||action==='disconnect')assert.equal(r.text,'new '+action+' draft');
   console.log('PASS newer '+action+' survives synchronous close callback');
  }
  await fresh();await p.evaluate(()=>{const hide=panel.hidePopover.bind(panel);window.awaited=false;panel.hidePopover=function(){hide();panel.hidePopover=hide;window.awaited=true;};s.form.reset();});
  await p.waitForFunction(()=>window.awaited&&q.value==='Ada Invented');
  await p.keyboard.press('ArrowDown');assert.equal((await state()).rows.length,4);
  console.log('PASS unchanged close callback permits fresh browsing');
  assert.deepEqual(errors,[]);
 } finally {await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
