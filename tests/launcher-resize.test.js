const assert=require('assert/strict');
const {launch,ROOT,out}=require('./lib');
(async()=>{const browser=await launch();try{
 const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(ROOT+'/samples/compact-taskbar.html');await page.locator('[data-menu-id="site"]').waitFor();
 await page.evaluate(()=>{const root=document.getElementById('catalog');pudlLauncher.destroy(root);pudlLauncher.enhance(root,{pane:document.getElementById('catalog-slot'),layout:document.getElementById('workspace'),invoker:document.getElementById('launcher'),placement:'above',compactAt:false,taskbarAlways:true});});
 await page.evaluate(()=>{const root=document.getElementById('catalog');pudlLauncher.resize(root,{width:820,height:620});pudlLauncher.open(root,{focus:'browse'});});
 const evidence={natural:[],recovery:[]};
 async function sample(){return page.evaluate(()=>new Promise(resolve=>{
  const root=document.getElementById('catalog'),samples=[];
  function frame(){const r=root.getBoundingClientRect();samples.push([r.top,r.height]);if(samples.length===12){const anchor=document.getElementById('launcher'),a=anchor.getBoundingClientRect();resolve({samples,state:pudlLauncher.state(root),rendered:{width:r.width,height:r.height,bottom:r.bottom},anchor:{id:anchor.id,top:a.top,bottom:a.bottom,width:a.width,height:a.height,visible:!!anchor.getClientRects().length&&!anchor.hidden}});}else requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
 }));}
 for(const viewport of [{width:320,height:850},{width:1440,height:950},{width:320,height:850}]){
  await page.setViewportSize(viewport);
  const result=await sample();evidence.natural.push({viewport,...result});
  require('fs').writeFileSync(out('launcher-resize-evidence.json'),JSON.stringify(evidence,null,2));
  assert.deepEqual(result.samples.slice(-3),Array(3).fill(result.samples.at(-1)),'natural viewport placement settles rather than oscillating');
  assert.ok(result.samples.at(-1)[0]>=8&&result.samples.at(-1)[0]+result.samples.at(-1)[1]<=viewport.height,'natural viewport transition keeps popup inside viewport');
  assert.equal(result.state.width,820,'natural viewport transition retains requested width');
  assert.equal(result.state.height,620,'natural viewport transition retains requested height');
  assert.ok(result.anchor.visible&&result.anchor.height>0,'configured taskbar anchor remains visible');
  assert.ok(result.rendered.bottom<=result.anchor.top-5.5,'natural viewport transition retains above taskbar separation');
  if(viewport.width===1440){
   assert.equal(result.rendered.width,820,'widening restores actual requested width before API repair');
   assert.equal(result.rendered.height,620,'widening restores actual requested height before API repair');
  }
 }
 await page.setViewportSize({width:320,height:850});
 for(let cycle=0;cycle<3;cycle++) {
  const sizes=await page.evaluate(()=>new Promise(resolve=>{
   const root=document.getElementById('catalog'),samples=[];
   // Recreate the stale desktop top constraint when a narrow popup opens.
   root.style.top='240px';root.style.setProperty('--launcher-top','240px');root.style.height='620px';
   // Request recovery through the public API independently of natural resize.
   pudlLauncher.resize(root,{width:820,height:620});
   function sample(){const r=root.getBoundingClientRect();samples.push([r.top,r.height]);if(samples.length===12)resolve(samples);else requestAnimationFrame(sample);}
   requestAnimationFrame(sample);
  }));
  evidence.recovery.push(sizes);require('fs').writeFileSync(out('launcher-resize-evidence.json'),JSON.stringify(evidence,null,2));
  assert.deepEqual(sizes.slice(-3),Array(3).fill(sizes.at(-1)),'popup placement settles rather than oscillating');
  assert.ok(sizes.at(-1)[0]>=8 && sizes.at(-1)[0]+sizes.at(-1)[1]<=850,'popup stays inside the viewport');
 }
 assert.deepEqual(errors,[],'nested splitter and launcher resizing must not produce browser errors');
 await page.screenshot({path:out('launcher-resize-settled.png')});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
