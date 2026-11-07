const assert = require('assert/strict');
const fs = require('fs');
const {launch,ROOT,out,engine}=require('./lib');
(async()=>{
 const browser=await launch();
 try {
  const page=await browser.newPage({viewport:{width:1440,height:850}}),errors=[],measurements=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(ROOT+'/samples/compact-taskbar.html');
  await page.locator('.win-bar [data-win-pin="files"]').waitFor();
  await page.waitForFunction(()=>document.querySelector('.win-bar').hasAttribute('data-win-bar-priority'));
  const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
  const original=await page.locator('[data-win-dock] [data-win-tab="article"]').elementHandle();
  const prefs=await page.evaluate(()=>pudlWindows.taskbarState());
  for(const theme of ['light','dark']) {
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   for(const width of [1440,900,650,480,390,320,240]) {
    await page.setViewportSize({width,height:850}); await settle();
    const m=await page.evaluate(()=>{
     const bar=document.querySelector('.win-bar'),active=bar.querySelector('[aria-current="true"]');
     return {width:innerWidth,bar:bar.getBoundingClientRect().toJSON(),scroll:document.documentElement.scrollWidth,active:active&&active.getBoundingClientRect().toJSON(),buttons:Array.from(bar.querySelectorAll('.win-tab,.icon-btn,.btn')).filter(n=>n.getClientRects().length).map(n=>({name:n.getAttribute('aria-label'),rect:n.getBoundingClientRect().toJSON(),glyph:n.hasAttribute('data-win-tab-glyph')})),attrs:bar.outerHTML};
    });
    measurements.push(m);fs.writeFileSync(out('compact-geometry.json'),JSON.stringify(measurements,null,2));
    assert.ok(m.scroll<=width+1,'no document overflow at '+width);
    assert.ok(m.active&&m.active.width>15,'current entry remains visible at '+width);
    assert.ok(m.buttons.every(b=>b.rect.x>=-1&&b.rect.right<=width+1),'all visible controls fit at '+width);
    assert.ok(Math.max(...m.buttons.map(b=>b.rect.height))-Math.min(...m.buttons.map(b=>b.rect.height))<1,'common button height');
    assert.equal(await original.evaluate(n=>n===document.querySelector('[data-win-dock] [data-win-tab="article"]')),true,'same active entry');
    if(width===1440) await page.screenshot({path:out('compact-wide-'+theme+'.png')});
    if(width===390) await page.screenshot({path:out('compact-'+theme+'.png')});
   }
  }
  await page.setViewportSize({width:390,height:850});await settle();
  await page.locator('.win-pins-more:visible').click();
  await page.getByRole('menuitem',{name:'Files, pinned, not open',exact:true}).click();
  await page.locator('.win[data-win="files"]').waitFor();await settle();
  assert.equal(await page.locator('[data-win-dock] [data-win-tab="files"]').count(),1);
  assert.equal(await page.locator('[data-win-dock] [data-win-tab="files"]').getAttribute('data-win-pin'),'files');
  assert.equal(await page.locator('[data-win-dock] [data-win-tab="files"]').isVisible(),true);
  await page.locator('[data-win-dock] [data-win-tab="files"]').click();
  assert.equal(await page.evaluate(()=>!!pudlWindows.state().min.files),true,'foreground pin minimizes');
  await page.locator('.win-bar-windows').click();
  const rows=await page.locator('.context-menu:popover-open>.menu-action').allTextContents();
  assert.match(rows.at(-1),/Close all windows/);
  await page.keyboard.press('Escape');
  assert.deepEqual(await page.evaluate(()=>pudlWindows.taskbarState().pins),prefs.pins);
  await page.setViewportSize({width:1440,height:850});await settle();
  assert.equal(await page.locator('.win-pins-more:visible').count(),0);
  assert.equal(await page.locator('.win-bar-windows:visible').count(),0);
  await page.evaluate(()=>{const group=document.createElement('div');group.innerHTML='<a class="icon-btn" data-win-close-all href="?" aria-label="Close all"></a><span id="retained-status">Ready</span>';document.querySelector('.win-bar').appendChild(group);pudlWindows.closeAll();});
  await page.setViewportSize({width:240,height:850});await settle();
  assert.equal(await page.locator('#retained-status').isVisible(),true,'folding bulk controls preserves unrelated status content');
  await page.locator('.win-pins-more').focus();
  await page.setViewportSize({width:1440,height:850});await settle();
  assert.equal(await page.evaluate(()=>!!document.activeElement.getClientRects().length),true,'widening with only dormant pins recovers visible focus');
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
