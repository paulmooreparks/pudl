const assert=require('assert/strict');const {launch,ROOT}=require('./lib');
(async()=>{const b=await launch();try{const p=await b.newPage();for(const kind of ['date','time'])for(const owner of ['popover','dialog']){
 await p.goto(ROOT+'/tests/fixtures/'+kind+'-validation.html');await p.waitForSelector('#value-text');
 await p.evaluate(owner=>{const box=document.createElement(owner==='dialog'?'dialog':'div');box.id='parent';if(owner==='popover')box.setAttribute('popover','auto');document.body.appendChild(box);box.appendChild(document.getElementById('form'));if(owner==='dialog')box.showModal();else box.showPopover();},owner);
 await p.locator('.combo-open').click();assert.equal(await p.locator('.date-panel:popover-open,.time-list:popover-open').count(),1);
 await p.evaluate(()=>{window.closedFocusCalls=0;const f=document.getElementById('value-text'),focus=f.focus;f.focus=function(...args){if(!document.getElementById('parent').getClientRects().length)closedFocusCalls++;return focus.apply(this,args);};});
 await p.evaluate(owner=>{const box=document.getElementById('parent');if(owner==='dialog')box.close();else box.hidePopover();},owner);
 await p.waitForFunction(()=>!document.querySelector('.date-panel:popover-open,.time-list:popover-open'));
 assert.equal(await p.evaluate(()=>closedFocusCalls),0,'component must not return focus into closed owner');
 console.log('PASS '+kind+' picker closes with '+owner+' without returning focus into it');
}}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
