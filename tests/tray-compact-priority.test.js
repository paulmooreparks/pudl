const {launch,ROOT}=require('./lib');
const assert=require('assert');
(async()=>{
 const b=await launch();try{
  const p=await b.newPage({viewport:{width:1400,height:800}});
  await p.goto(ROOT+'/tests/fixtures/status-fold.html');
  await p.waitForFunction(()=>window.pudlWindows && document.querySelector('#bar-all .win-tab'));
  await p.evaluate(()=>{const area=document.getElementById('tray-all');area.removeAttribute('data-status-fold');area.setAttribute('data-status-compact-priority','first');});
  const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  let compact=false;
  for(const width of [1200,1000,800,600,400,300]){
   await p.evaluate(w=>{document.getElementById('wrap-all').style.width=w+'px';window.dispatchEvent(new Event('resize'));},width);await settle();
   const state=await p.evaluate(()=>({compact:document.getElementById('bar-all').hasAttribute('data-win-bar-compact'),folded:document.querySelectorAll('#tray-all > .status-item[data-status-folded]').length,aggregate:!!document.querySelector('#tray-all > .status-fold:not([hidden])')}));
   assert.strictEqual(state.folded,0);assert.strictEqual(state.aggregate,false);compact=compact||state.compact;
  }
  assert.strictEqual(compact,true,'priority tray compacts as space runs out');
  await p.evaluate(()=>{document.getElementById('wrap-all').style.width='1200px';window.dispatchEvent(new Event('resize'));});await settle();
  assert.strictEqual(await p.evaluate(()=>document.getElementById('bar-all').hasAttribute('data-win-bar-compact')),false);
  console.log('PASS individual tray actions compact and expand without aggregation');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
