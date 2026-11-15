const assert=require('assert/strict');
const {launch,ROOT}=require('./lib');
(async()=>{
 const b=await launch();try{
 const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 async function fresh(){await p.goto(ROOT+'/tests/fixtures/date-pristine-presentation.html');await p.locator('#start-text').waitFor();await p.evaluate(()=>{window.events=[];for(const t of ['input','change'])document.addEventListener(t,e=>{if(e.target.id==='day'||e.target.id==='start')events.push(t+':'+e.target.id);},true);document.querySelector('form').addEventListener('submit',e=>e.preventDefault());});}
 const state=id=>p.evaluate(id=>{const s=document.getElementById(id),q=document.getElementById(id+'-text');return{value:s.value,text:q.value,valid:s.validity.valid,proxyValid:q.validity.valid,aria:q.getAttribute('aria-invalid'),echo:s.closest('label').querySelector('.date-echo').textContent,description:q.getAttribute('aria-describedby'),events:[...events],focus:document.activeElement.id};},id);
 for(const id of ['day','start']){
  await fresh();let r=await state(id);assert.equal(r.valid,false);assert.equal(r.proxyValid,false);assert.equal(r.aria,null);const example=r.echo;
  await p.locator('#'+id+'-text').focus();await p.locator('#note').focus();r=await state(id);assert.equal(r.aria,null);assert.equal(r.echo,example);assert.deepEqual(r.events,[]);
  console.log('PASS '+id+' pristine native invalidity remains quiet through focus/blur');
  const valid=id==='day'?'2026-11-15':'11:00';
  await p.locator('#'+id+'-text').fill(valid);await p.locator('#note').focus();assert.equal((await state(id)).valid,true);
  await p.locator('#'+id+'-text').fill('');await p.locator('#note').focus();r=await state(id);assert.equal(r.aria,null);assert.equal(r.valid,false);assert.equal(r.proxyValid,false);assert.deepEqual(r.events,['input:'+id,'change:'+id,'input:'+id,'change:'+id]);
  console.log('PASS '+id+' ordinary clearing keeps required semantics without premature mark');
  for(const method of ['checkValidity','reportValidity']){
   await fresh();const result=await p.evaluate(({id,method})=>document.getElementById(id)[method](),{id,method});assert.equal(result,false);assert.equal((await state(id)).aria,'true');
   await p.locator('#'+id+'-text').fill(valid);await p.locator('#note').focus();await p.locator('#'+id+'-text').fill('');await p.locator('#note').focus();assert.equal((await state(id)).aria,'true');
   await p.evaluate(()=>document.querySelector('form').reset());await p.waitForFunction(id=>document.getElementById(id+'-text').getAttribute('aria-invalid')===null,id);r=await state(id);assert.equal(r.valid,false);assert.equal(r.proxyValid,false);assert.equal(r.echo,example);
   console.log('PASS '+id+' '+method+' reports until completed reset restores quiet empty state');
  }
  await fresh();await p.locator('#'+id+'-text').fill('not valid');await p.locator('#note').focus();r=await state(id);assert.equal(r.aria,'true');assert.equal(r.proxyValid,false);assert.equal(r.value,'');assert.deepEqual(r.events,[]);
  console.log('PASS '+id+' rejected draft keeps mark/custom validity and refuses source mutation');
  await fresh();await p.evaluate(id=>{const s=document.getElementById(id);s.setAttribute('aria-invalid','true');s.setAttribute('aria-describedby','host-help');const n=document.createElement('span');n.id='host-help';n.textContent='Authored help';document.body.append(n);pudlDate.refresh(s);},id);r=await state(id);assert.equal(r.aria,'true');assert.ok(r.description.includes('host-help'));
  await p.evaluate(id=>{const s=document.getElementById(id);s.removeAttribute('aria-invalid');pudlDate.refresh(s);},id);assert.equal((await state(id)).aria,null);
  console.log('PASS '+id+' authored error precedence and description custody remain');
  await fresh();await p.evaluate(({id,valid})=>{const s=document.getElementById(id);s.value=valid;s.min=id==='day'?'2026-12-01':'12:00';pudlDate.refresh(s);},{id,valid});assert.equal((await state(id)).aria,'true');assert.equal((await state(id)).proxyValid,false);
  console.log('PASS '+id+' nonempty out-of-range source retains existing presentation');
  await fresh();await p.evaluate(id=>{document.getElementById(id).checkValidity();document.querySelector('form').addEventListener('reset',e=>e.preventDefault(),{once:true});document.querySelector('form').reset();},id);await p.evaluate(()=>new Promise(r=>setTimeout(r,0)));assert.equal((await state(id)).aria,'true');
  console.log('PASS '+id+' cancelled reset preserves reported presentation');
  for(const action of ['refresh','input','owner']){
   await fresh();await p.evaluate(({id,action})=>{const s=document.getElementById(id),q=document.getElementById(id+'-text'),f=s.form;s.checkValidity();f.addEventListener('reset',()=>queueMicrotask(()=>{q.value='new rejected draft';q.dispatchEvent(new Event('input',{bubbles:true}));if(action==='refresh'){s.setAttribute('aria-invalid','true');pudlDate.refresh(s);}if(action==='owner'){const n=document.createElement('form');n.id='other';document.body.append(n);s.setAttribute('form','other');}}),{once:true});f.reset();},{id,action});await p.evaluate(()=>new Promise(r=>setTimeout(r,0)));r=await state(id);assert.equal(r.aria,'true');if(action!=='refresh')assert.equal(r.text,'new rejected draft');assert.deepEqual(r.events,[]);
   console.log('PASS '+id+' newer '+action+' defeats stale reset cleanup');
  }
 }
 assert.deepEqual(errors,[]);
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
