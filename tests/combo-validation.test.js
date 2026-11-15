const assert=require('assert/strict');
const {launch,ROOT,out}=require('./lib');
(async()=>{
 const b=await launch();
 try{
  const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  async function fresh(){await p.goto(ROOT+'/tests/fixtures/combo-validation.html');await p.waitForSelector('#room-combo');}
  async function state(){return p.evaluate(()=>{const s=document.getElementById('room'),f=document.getElementById('room-combo');return {source:s.validity.valid,proxy:f.validity.valid,value:s.value,text:f.value,disabled:f.disabled,required:f.getAttribute('aria-required'),form:f.form&&f.form.id,name:f.name,error:!!document.querySelector('.combo-select + .form-error:not([hidden])')};});}
  await fresh();assert.equal((await state()).proxy,false,'nonempty placeholder mirrors empty selected validity');
  const staticResult=await p.evaluate(()=>{window.events=[];document.addEventListener('invalid',e=>events.push(e),true);document.getElementById('outside').focus();return document.getElementById('main').checkValidity();});
  assert.equal(staticResult,false);assert.equal(await p.evaluate(()=>document.activeElement.id),'outside');
  assert.deepEqual(await p.evaluate(()=>events.map(e=>[e.target.id,e.defaultPrevented])),[['room',true],['room-combo',false]]);
  assert.ok((await state()).error);assert.ok(await p.locator('#room-combo').getAttribute('aria-describedby'));
  assert.equal(await p.evaluate(()=>document.getElementById('main').reportValidity()),false);
  assert.equal(await p.evaluate(()=>document.activeElement.id),'room-combo','observed native reporting focuses proxy in this profile');
  await fresh();await p.evaluate(()=>{document.getElementById('room-combo').addEventListener('invalid',e=>e.preventDefault());document.getElementById('outside').focus();document.getElementById('main').reportValidity();});
  assert.equal(await p.evaluate(()=>document.activeElement.id),'outside');assert.ok((await state()).error);
  for(const position of ['before','after']){
   await fresh();await p.evaluate(position=>{const n=document.createElement('input');n.required=true;n.id='other';const form=document.getElementById('main');form.insertBefore(n,position==='before'?form.firstChild:document.getElementById('send'));form.reportValidity();},position);
   assert.equal(await p.evaluate(()=>document.activeElement.id),position==='before'?'other':'room-combo');
  }
  console.log('PASS native static/interactive reporting, source-only cancellation, host cancellation and other invalid controls');
  await fresh();await p.evaluate(()=>{const s=document.getElementById('room');s.value='a';pudlCombo.refresh(s);s.setCustomValidity('Host error');pudlCombo.refresh(s);});
  assert.equal((await state()).proxy,false);await p.evaluate(()=>document.getElementById('main').reportValidity());assert.ok((await state()).error);
  await p.evaluate(()=>{const s=document.getElementById('room');s.setCustomValidity('');pudlCombo.refresh(s);});assert.equal((await state()).proxy,true);assert.equal((await state()).error,false);
  await p.locator('#room-combo').fill('');assert.equal((await state()).proxy,true,'empty search does not invalidate valid committed selection');
  await p.locator('#room-combo').fill('unmatched');await p.locator('#outside').focus();await p.waitForFunction(()=>document.getElementById('room-combo').value==='Room A');assert.equal((await state()).value,'a');
  assert.deepEqual(await p.evaluate(()=>[...new FormData(document.getElementById('main'))]),[['room','a']]);
  await p.evaluate(()=>{const s=document.getElementById('room');s.setCustomValidity('Direct error');pudlCombo.refresh(s);document.getElementById('outside').focus();window.direct=s.reportValidity();});assert.equal(await p.evaluate(()=>direct),false);assert.equal(await p.evaluate(()=>document.activeElement.id),'outside');
  console.log('PASS custom errors and clearing, unnamed serialization, unmatched settlement and direct-source limitation');
  await fresh();await p.evaluate(()=>{const s=document.getElementById('room');s.setAttribute('form','second');pudlCombo.refresh(s);});assert.equal((await state()).form,'second');assert.equal((await state()).name,'');
  await p.evaluate(()=>{document.body.appendChild(document.querySelector('.form-select-wrap'));});await p.waitForFunction(()=>document.getElementById('room-combo').form?.id==='second');
  await p.evaluate(()=>{const s=document.getElementById('room');s.setAttribute('form','unresolved');pudlCombo.refresh(s);});assert.equal((await state()).form,null);
  await p.evaluate(()=>{const s=document.getElementById('room');s.removeAttribute('form');pudlCombo.refresh(s);});assert.equal((await state()).form,null);
  await p.evaluate(()=>{const s=document.getElementById('room');s.setAttribute('form','main');pudlCombo.refresh(s);s.required=false;pudlCombo.refresh(s);});assert.equal((await state()).proxy,true);assert.equal((await state()).required,'false');
  await p.evaluate(()=>{const s=document.getElementById('room');s.required=true;pudlCombo.refresh(s);});assert.equal((await state()).proxy,false);
  console.log('PASS external form ownership, reassociation, ownerless controls and immediate required refresh');
  for(const inLegend of [false,true]){
   await fresh();await p.evaluate(inLegend=>{const fs=document.createElement('fieldset');fs.disabled=true;fs.id='fieldset';const legend=document.createElement('legend');legend.textContent='Legend';fs.appendChild(legend);document.getElementById('main').prepend(fs);const outer=document.querySelector('.form-select-wrap'),wrap=document.querySelector('.combo-select');(inLegend?legend:fs).append(outer,wrap);pudlCombo.refresh(document.getElementById('room'));},inLegend);
   assert.equal((await state()).disabled,!inLegend);
   assert.equal(await p.evaluate(()=>document.getElementById('room').willValidate),inLegend);
   await p.evaluate(()=>{document.getElementById('fieldset').disabled=false;});await p.waitForFunction(()=>!document.getElementById('room-combo').disabled);assert.equal((await state()).proxy,false);
  }
  console.log('PASS effective fieldset disabling and first-legend exception');
  await fresh();await p.evaluate(()=>{const s=document.getElementById('room');s.value='a';pudlCombo.refresh(s);document.getElementById('main').addEventListener('reset',e=>e.preventDefault(),{once:true});document.getElementById('main').reset();});
  assert.equal((await state()).value,'a');assert.equal((await state()).text,'Room A');
  await p.evaluate(()=>document.getElementById('main').reset());await p.waitForFunction(()=>document.getElementById('room-combo').value==='Choose a room');assert.equal((await state()).proxy,false);
  await p.evaluate(()=>{document.getElementById('main').reset();const s=document.getElementById('room');s.value='a';pudlCombo.refresh(s);});
  await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
  await p.waitForFunction(()=>document.getElementById('room-combo').value==='Room A');assert.equal((await state()).value,'a');assert.equal((await state()).proxy,true);
  await p.evaluate(()=>{document.getElementById('main').reset();const s=document.getElementById('room');s.setAttribute('form','second');s.value='a';pudlCombo.refresh(s);});await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));assert.equal((await state()).form,'second');assert.equal((await state()).text,'Room A');
  console.log('PASS cancelled reset, completed reset, stale reset after edit and reassociation');
  await fresh();await p.evaluate(()=>{window.sent=0;document.getElementById('main').addEventListener('submit',()=>sent++);});await p.locator('#send').click();assert.equal(await p.evaluate(()=>sent),0);assert.ok((await state()).error);
  await p.evaluate(()=>{const s=document.getElementById('room');s.value='a';pudlCombo.refresh(s);document.getElementById('main').requestSubmit();});assert.equal(await p.evaluate(()=>sent),1);
  await fresh();await p.evaluate(()=>{const s=document.getElementById('room');s.options[0].textContent='';pudlCombo.refresh(s);});assert.equal((await state()).proxy,false);
  await p.evaluate(()=>{document.getElementById('main').reportValidity();document.getElementById('main').addEventListener('reset',e=>e.preventDefault(),{once:true});document.getElementById('main').reset();});
  await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));assert.ok((await state()).error,'cancelled reset preserves reported error');
  await p.evaluate(()=>document.getElementById('main').reset());await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));assert.equal((await state()).error,false,'completed reset clears owned report');
  await p.evaluate(()=>{const s=document.getElementById('room');s.disabled=true;pudlCombo.refresh(s);});assert.equal((await state()).disabled,true);
  await p.evaluate(()=>{const s=document.getElementById('room');s.disabled=false;s.setAttribute('form','second');pudlCombo.refresh(s);window.externalResult=document.getElementById('second').reportValidity();});assert.equal(await p.evaluate(()=>externalResult),false);assert.ok((await state()).error);
  const native=await b.newContext({javaScriptEnabled:false});const np=await native.newPage();await np.goto(ROOT+'/tests/fixtures/combo-validation.html');
  assert.equal(await np.locator('#room').isVisible(),true);assert.equal(await np.locator('#room-combo').count(),0);assert.equal(await np.locator('#room').evaluate(e=>e.willValidate&&!e.validity.valid),true);await native.close();
  console.log('PASS blank placeholder, reset report policy, direct disabled, external reporting and native baseline');
  assert.deepEqual(errors,[]);await p.screenshot({path:out('combo-validation.png')});
  console.log('PASS ordinary submission blocks invalid state and requestSubmit accepts a refreshed valid choice');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
