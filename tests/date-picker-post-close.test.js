const assert=require('assert/strict');const {launch,ROOT,out}=require('./lib');
(async()=>{const b=await launch();const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
async function fresh(kind='time'){await p.goto(ROOT+'/tests/fixtures/date-picker-activation.html');await p.waitForSelector('#'+kind+'-text');await p.evaluate(kind=>{window.source=document.getElementById(kind);window.q=document.getElementById(kind+'-text');window.feedback=q.parentElement.nextSibling;window.events=[];source.addEventListener('input',()=>events.push('input'));source.addEventListener('change',()=>events.push('change'));},kind);await p.locator('#'+kind+'-text').locator('..').locator('.combo-open').click();}
const state=()=>p.evaluate(()=>({value:source.value,query:q.value,echo:feedback.textContent,events:[...events]}));
try{
for(const kind of ['date','time'])for(const mutation of ['min','max','step','readonly','disabled','detach','reparent','owner','source','instance','fieldset','inert']){
 await fresh(kind);const initial=await state();
 await p.evaluate(({kind,mutation})=>{document.querySelector(kind==='date'?'.date-panel':'.time-list').addEventListener('beforetoggle',e=>{
  if(e.newState!=='closed')return;
  if(mutation==='min')source.min=kind==='date'?'2027-01-15':'10:00';
  if(mutation==='max')source.max=kind==='date'?'2027-01-11':'09:00';
  if(mutation==='step'){source.min=kind==='date'?'2027-01-11':'09:00';source.step=kind==='date'?'2':'3600';}
  if(mutation==='readonly')source.readOnly=true;
  if(mutation==='disabled')source.disabled=true;
  if(mutation==='detach')source.remove();
  if(mutation==='reparent')document.getElementById('other').append(source);
  if(mutation==='owner')source.setAttribute('form','other');
  if(mutation==='source')source.value=kind==='date'?'2027-01-20':'11:00';
  if(mutation==='instance')source.__pudlDate=false;
  if(mutation==='fieldset'){const f=document.createElement('fieldset');f.disabled=true;source.before(f);f.append(source);}
  if(mutation==='inert')source.parentElement.inert=true;
  window.atHook={value:source.value,query:q.value,echo:feedback.textContent};
 },{once:true});},{kind,mutation});
 await p.locator(kind==='date'?'[data-date="2027-01-12"]':'[data-time="09:30"]').click();
 const r=await state();assert.deepEqual(r.events,[],kind+' '+mutation);assert.equal(r.value,mutation==='source'?(kind==='date'?'2027-01-20':'11:00'):initial.value,kind+' '+mutation);
 // Observe the refusal synchronously through its value/events. Mutation observers may subsequently reconcile feedback.
 console.log('PASS post-close '+kind+' '+mutation+' refuses without source events');
}
for(const kind of ['date','time']){
 await fresh(kind);
 await p.evaluate(kind=>{const panel=document.querySelector(kind==='date'?'.date-panel':'.time-list');panel.addEventListener('beforetoggle',e=>{
  if(e.newState==='closed'){source.value=kind==='date'?'2027-01-20':'11:00';pudlDate.refresh(source);window.refreshed={value:source.value,query:q.value,echo:feedback.textContent};}
 },{once:true});},kind);
 await p.locator(kind==='date'?'[data-date="2027-01-12"]':'[data-time="09:30"]').click();
 const r=await state(),expected=await p.evaluate(()=>refreshed);assert.deepEqual(r,{...expected,events:[]});
 await p.locator('#'+kind+'-text').locator('..').locator('.combo-open').click();
 await p.locator(kind==='date'?'[data-date="2027-01-21"]':'[data-time="11:30"]').click();
 assert.deepEqual((await state()).events,['input','change']);assert.equal((await state()).value,kind==='date'?'2027-01-21':'11:30');
 console.log('PASS post-close refresh wins and fresh '+kind+' choice recovers');
}
await fresh('date');await p.evaluate(()=>{q.addEventListener('focus',()=>{source.required=true;pudlDate.refresh(source);window.refreshed={value:source.value,query:q.value,echo:feedback.textContent};},{once:true});});
await p.getByRole('button',{name:'Clear',exact:true}).click();assert.deepEqual(await state(),{...await p.evaluate(()=>refreshed),events:[]});console.log('PASS Clear respects focus-return required/refresh');
await fresh('date');await p.evaluate(()=>q.addEventListener('focus',()=>{source.disabled=true;},{once:true}));await p.locator('[data-date="2027-01-12"]').click();assert.equal((await state()).value,'2027-01-11');assert.deepEqual((await state()).events,[]);console.log('PASS focus-return lock without refresh');
await fresh();await p.evaluate(()=>{const row=document.querySelector('[data-time="10:00"]');document.querySelector('.time-list').addEventListener('beforetoggle',e=>{if(e.newState==='closed')row.click();},{once:true});});await p.locator('[data-time="09:30"]').click();assert.equal((await state()).value,'10:00');assert.deepEqual((await state()).events,['input','change']);console.log('PASS newer valid reentrant activation wins and earlier ticket cannot overwrite it');
await fresh();await p.evaluate(()=>source.addEventListener('input',()=>{source.value='12:00';pudlDate.refresh(source);},{once:true}));await p.locator('[data-time="09:30"]').click();assert.equal((await state()).value,'12:00');assert.equal((await state()).query,'12:00');assert.deepEqual((await state()).events,['input','change']);console.log('PASS valid write precedes events and post-commit host refresh wins');
await p.screenshot({path:out('picker-post-close.png')});assert.deepEqual(errors,[]);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
