const assert=require('assert/strict');
const {launch,ROOT,out}=require('./lib');
(async()=>{const browser=await launch();try{
 const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(ROOT+'/samples/compact-taskbar.html');await page.locator('[data-menu-id="site"]').waitFor();
 await page.evaluate(()=>{const root=document.getElementById('catalog');pudlLauncher.destroy(root);pudlLauncher.enhance(root,{pane:document.getElementById('catalog-slot'),layout:document.getElementById('workspace'),invoker:document.getElementById('launcher'),placement:'above',compactAt:false,taskbarAlways:true});});
 await page.evaluate(()=>{const root=document.getElementById('catalog');pudlLauncher.resize(root,{width:820,height:620});pudlLauncher.open(root,{focus:'browse'});});
 await page.setViewportSize({width:320,height:850});
 for(let cycle=0;cycle<3;cycle++) {
  const sizes=await page.evaluate(()=>new Promise(resolve=>{
   const root=document.getElementById('catalog'),samples=[];
   // Recreate the stale desktop top constraint when a narrow popup opens.
   root.style.top='240px';root.style.setProperty('--launcher-top','240px');root.style.height='620px';
   function sample(){const r=root.getBoundingClientRect();samples.push([r.top,r.height]);if(samples.length===12)resolve(samples);else requestAnimationFrame(sample);}
   requestAnimationFrame(sample);
  }));
  assert.deepEqual(sizes.slice(-3),Array(3).fill(sizes.at(-1)),'popup placement settles rather than oscillating');
  assert.ok(sizes.at(-1)[0]>=8 && sizes.at(-1)[0]+sizes.at(-1)[1]<=850,'popup stays inside the viewport');
 }
 assert.deepEqual(errors,[],'nested splitter and launcher resizing must not produce browser errors');
 await page.screenshot({path:out('launcher-resize-settled.png')});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
