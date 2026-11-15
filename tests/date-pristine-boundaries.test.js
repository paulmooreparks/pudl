const assert=require('assert/strict');const {launch,ROOT}=require('./lib');
(async()=>{const b=await launch();let failures=0;try{
 const p=await b.newPage();
 async function fresh(){await p.goto(ROOT+'/tests/fixtures/date-pristine-presentation.html');await p.locator('#start-text').waitFor();}
 function check(name,ok){console.log((ok?'PASS ':'FAIL ')+name);if(!ok)failures++;}
 for(const id of ['day','start']){
  await fresh();await p.locator('#'+id+'-text').fill('rejected draft');await p.locator('#note').focus();
  assert.equal(await p.locator('#'+id+'-text').getAttribute('aria-invalid'),'true');
  await p.locator('#'+id+'-text').fill('');
  check(id+' clearing rejected draft to empty is quiet before reporting',await p.locator('#'+id+'-text').getAttribute('aria-invalid')===null);
  assert.equal(await p.locator('#'+id+'-text').evaluate(q=>q.validity.valid),false);
  for(const required of [false,true]){
   await fresh();await p.evaluate(({id,required})=>{const s=document.getElementById(id);s.required=required;s.setCustomValidity('Host refusal');pudlDate.refresh(s);},{id,required});
   const r=await p.evaluate(id=>({source:document.getElementById(id).validity.valid,proxy:document.getElementById(id+'-text').validity.valid,aria:document.getElementById(id+'-text').getAttribute('aria-invalid')}),id);
   assert.equal(r.source,false);assert.equal(r.proxy,false);
   check(id+' explicit native custom error stays marked required='+required,r.aria==='true');
  }
 }
 if(failures)process.exitCode=1;
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
