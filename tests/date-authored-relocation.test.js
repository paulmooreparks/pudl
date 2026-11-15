const assert=require('assert/strict');const {launch,ROOT}=require('./lib');
(async()=>{const b=await launch();try{const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
for(const kind of ['date','time']){
 await p.goto(ROOT+'/tests/fixtures/'+(kind==='date'?'date':'time')+'-validation.html');await p.waitForSelector('#value-text');
 await p.evaluate(()=>{const s=document.getElementById('value');window.source=s;window.query=document.getElementById('value-text');window.authored=s;window.fs=document.createElement('fieldset');fs.disabled=true;window.legend=document.createElement('legend');legend.textContent='First';fs.append(legend);s.form.append(fs);fs.append(authored);});
 await p.waitForFunction(()=>query.matches(':disabled'));
 await p.evaluate(()=>{legend.append(authored);pudlDate.refresh(source);});
 assert.equal(await p.evaluate(()=>query.matches(':disabled')),false,'authored move into first legend');
 assert.equal(await p.evaluate(()=>query.willValidate),true);
 await p.evaluate(()=>{fs.append(authored);pudlDate.refresh(source);});assert.equal(await p.evaluate(()=>query.matches(':disabled')),true,'authored move out of legend');
 await p.evaluate(()=>{legend.append(authored);pudlDate.refresh(source);});
 await p.locator('#value-text').fill('uncommitted query');
 await p.evaluate(()=>{window.destination=document.createElement('form');destination.id='relocated';document.body.append(destination);destination.append(authored);});
 await p.waitForFunction(()=>query.form&&query.form.id==='relocated');
 assert.equal(await p.locator('#value-text').inputValue(),'uncommitted query','internal placement preserves draft');
 await p.evaluate(()=>{source.setAttribute('form','missing');pudlDate.refresh(source);});assert.equal(await p.evaluate(()=>query.form),null);
 await p.evaluate(()=>{source.setAttribute('form','relocated');pudlDate.refresh(source);});assert.equal(await p.evaluate(()=>query.form.id),'relocated');
 await p.evaluate(()=>{source.removeAttribute('form');authored.remove();});await p.waitForFunction(()=>!query.isConnected);
 await p.evaluate(()=>destination.append(authored));await p.waitForFunction(()=>query.isConnected&&query.form===destination);
 assert.equal(await p.evaluate(()=>document.querySelectorAll('#value-text').length),1,'reinsertion does not clone');
 await p.evaluate(()=>{source.setCustomValidity('Host error');pudlDate.refresh(source);destination.checkValidity();});
 assert.ok(await p.evaluate(()=>query.getAttribute('aria-describedby')));
 await p.evaluate(()=>{legend.append(authored);pudlDate.refresh(source);});assert.equal(await p.evaluate(()=>query.validationMessage),'Host error');
}
assert.deepEqual(errors,[]);console.log('PASS authored relocation, state, association and detached lifecycle');}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
