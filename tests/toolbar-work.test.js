const {launch, ROOT, out} = require('./lib');
const assert = require('assert');
(async()=>{
 const b=await launch();
 try {
  const p=await b.newPage({viewport:{width:2000,height:800}});
  await p.goto(ROOT+'/tests/fixtures/tree-indent.html');
  await p.setContent('<div class="toolbar" id="bar" data-toolbar-fold style="width:1800px"><div class="toolbar-group" data-toolbar-group="Shapes" data-toolbar-glyph="document"><div class="seg sm" data-command-choice="shape"></div></div></div>');
  await p.addStyleTag({url:ROOT+'/dist/pudl.css'});
  for(const name of ['commands','menu','toolbar']) await p.addScriptTag({url:ROOT+'/dist/pudl-'+name+'.js'});
  await p.evaluate(()=>{
   window.shapeState={selected:0,label:'Shape 0',glyph:'document'};
   pudlCommands.register(document.body,()=>Array.from({length:13},(_,i)=>({id:'shape-'+i,choice:'shape',label:i===0?shapeState.label:'Shape '+i,glyph:i===0?shapeState.glyph:'document',checked:shapeState.selected===i,run:()=>{shapeState.selected=i;pudlCommands.changed();}})));
  });
  await p.waitForFunction(()=>document.querySelectorAll('.seg button > .glyph').length===13, null, {timeout:3000}).catch(async () => {
    const state = await p.evaluate(() => ({buttons:document.querySelectorAll('.seg button').length,glyphs:document.querySelectorAll('.seg button > .glyph').length,html:document.querySelector('.seg').outerHTML,commands:pudlCommands.list(document.body)}));
    throw new Error(JSON.stringify(state));
  });
  const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await settle();
  assert.strictEqual(await p.locator('.seg button > .toolbar-words').count(),13);
  assert.strictEqual(await p.locator('.seg button').first().getAttribute('aria-label'),'Shape 0');
  await p.locator('#bar').screenshot({path:out('choice-glyphs-wide.png')});
  assert.strictEqual(await p.locator('.seg button > .toolbar-words').first().evaluate(el=>getComputedStyle(el).display!=='none'),true);
  await p.evaluate(()=>{window.fits=0;document.addEventListener('pudl:toolbar-fit',()=>fits++);const w=document.querySelector('.seg .toolbar-words');w.textContent=w.textContent;});await settle();
  assert.strictEqual(await p.evaluate(()=>fits),0,'unchanged label must not request a fold');
  await p.evaluate(()=>{document.querySelector('.seg .toolbar-words').firstChild.data='Changed';});await settle();
  assert.ok(await p.evaluate(()=>fits>0),'changed label must request a fold');
  await p.evaluate(()=>{shapeState.label='Renamed';shapeState.glyph='pencil';pudlCommands.changed();});await settle();
  assert.strictEqual(await p.locator('.seg button').first().getAttribute('aria-label'),'Renamed');
  assert.ok((await p.locator('.seg button > .glyph').first().getAttribute('style')).includes('pencil'));
  await p.locator('.seg button').nth(1).click();
  await p.waitForFunction(()=>document.querySelectorAll('.seg button[aria-pressed="true"]').length===1 && document.querySelector('.seg button:nth-child(2)').getAttribute('aria-pressed')==='true');
  await p.evaluate(()=>{document.getElementById('bar').style.width='600px';});await settle();
  assert.strictEqual(await p.locator('.toolbar-group').getAttribute('data-toolbar-stage'),'2');
  await p.locator('#bar').screenshot({path:out('choice-glyphs-narrow.png')});
  assert.strictEqual(await p.locator('.seg button > .toolbar-words').first().evaluate(el=>getComputedStyle(el).display==='none'),true);
  await p.evaluate(()=>{document.getElementById('bar').style.width='1800px';});await settle();
  assert.strictEqual(await p.locator('.toolbar-group').getAttribute('data-toolbar-stage'),'1');
  assert.strictEqual(await p.locator('.seg button > .toolbar-words').first().evaluate(el=>getComputedStyle(el).display!=='none'),true);
  await p.evaluate(()=>{document.getElementById('bar').style.width='160px';});await settle();
  await p.locator('.toolbar-fold > .menu-btn').click();
  assert.strictEqual(await p.locator('.menu-panel:popover-open [role="menuitemradio"]').count(),13);
  assert.strictEqual(await p.locator('.menu-panel:popover-open [aria-checked="true"]').count(),1);
  console.log('PASS toolbar unchanged text suppression, real text invalidation, choice glyphs, dynamic labels, choice state and wide/narrow labels');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
