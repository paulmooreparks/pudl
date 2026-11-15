const assert = require('assert/strict');
const {launch, ROOT} = require('./lib');
(async () => {
 const b = await launch();
 try {
  const p = await b.newPage();
  async function fresh() {
   await p.goto(ROOT+'/tests/fixtures/combo-query-navigation.html');
   await p.waitForSelector('input[role=combobox]');
   await p.evaluate(()=>{window.s=document.querySelector('select[name=b]');window.q=document.querySelectorAll('input[role=combobox]')[1];window.panel=document.getElementById(q.getAttribute('aria-controls'));window.events=[];for(const t of ['input','change'])s.addEventListener(t,()=>events.push(t));});
   await p.locator('input[role=combobox]').nth(1).focus();
   await p.keyboard.press('ControlOrMeta+A');await p.keyboard.type('unmatched draft');
  }
  const rows=()=>p.evaluate(()=>[...panel.querySelectorAll('[role=option]')].map(r=>r.textContent));
  await fresh();await p.evaluate(()=>s.form.reset());
  await p.waitForFunction(()=>q.value==='Ada Invented');
  await p.keyboard.press('ArrowDown');assert.equal((await rows()).length,4,'reset leaves completed selection in browsing intent');
  assert.deepEqual(await p.evaluate(()=>events),[]);
  console.log('PASS reset abandons obsolete query without source notification');
  await fresh();await p.locator('#before-b').click();await p.waitForFunction(()=>q.value==='Ada Invented');
  await p.evaluate(()=>{s.value='p2';pudlCombo.refresh(s);});
  await p.locator('input[role=combobox]').nth(1).focus();await p.keyboard.press('ArrowUp');
  assert.equal((await rows()).length,4);assert.equal(await p.evaluate(()=>s.value),'p2');assert.deepEqual(await p.evaluate(()=>events),[]);
  console.log('PASS unfocused refreshed choice opens in browsing intent');
  await fresh();await p.evaluate(()=>{s.form.addEventListener('reset',e=>e.preventDefault(),{once:true});s.form.reset();});
  await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
  await p.keyboard.press('ArrowDown');assert.equal((await rows()).length,0);assert.equal(await p.evaluate(()=>q.value),'unmatched draft');
  console.log('PASS cancelled reset preserves edited query');
 } finally {await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
