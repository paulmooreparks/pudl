const assert = require('node:assert/strict');
const { launch, ROOT, out } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(ROOT + '/tests/fixtures/window-count.html');
    const tab = p.locator('#all [data-win-tab="a"]');
    await tab.waitFor();
    async function attr(key, name, value) { await p.evaluate(({key,name,value}) => { const w = document.querySelector('.win[data-win="' + key + '"]'); if (value === null) w.removeAttribute(name); else w.setAttribute(name, value); }, {key,name,value}); }
    async function badge(selector, value) {
      try { await p.waitForFunction(({selector,value}) => { const b = document.querySelector(selector + ' .win-item-count'); return b && b.hidden === !value && b.textContent === value; }, {selector,value}); }
      catch (error) { const observed = await p.evaluate(selector => { const n=document.querySelector(selector), b=n && n.querySelector('.win-item-count'); return {name:n && n.getAttribute('aria-label'),hidden:b && b.hidden,text:b && b.textContent,source:document.querySelector('.win[data-win="a"]').getAttribute('data-win-count')}; },selector); throw new Error('Count mismatch '+selector+' expected '+JSON.stringify(value)+' observed '+JSON.stringify(observed), {cause:error}); }
    }
    const a = '#all [data-win-tab="a"]';
    await badge(a, '3');
    assert.match(await tab.getAttribute('aria-label'), /2 needing attention, 3 busy/);
    assert.match(await tab.getAttribute('title'), /3 busy/);
    assert.equal(await tab.locator('.win-item-count').evaluate(n => n.classList.contains('warn')), false);
    assert(await tab.evaluate(n => n.querySelector('.win-item-attention').nextElementSibling.classList.contains('win-item-count')));
    const nav = await p.evaluate(() => JSON.stringify(pudlWindows.state()));
    await attr('a', 'data-win-count-label', '<busy>');
    await p.waitForFunction(() => document.querySelector('#all [data-win-tab="a"]').getAttribute('aria-label').includes('3 <busy>'));
    assert.equal(await tab.locator('.win-item-count').textContent(), '3');
    assert.equal(await tab.locator('busy').count(), 0);
    for (const invalid of ['0', '-1', '1.5', 'NaN', 'Infinity', '9007199254740992', '', null]) { await attr('a','data-win-count',invalid); await badge(a,''); assert.equal(await tab.locator('.win-item-attention').textContent(), '2'); }
    assert(!/busy|<busy>/.test(await tab.getAttribute('aria-label')), 'removed count clears stale accessible suffix');
    assert(!/busy|<busy>/.test(await tab.getAttribute('title')), 'removed count clears stale tooltip suffix');
    for (const [value, expected] of [[' 3 ', '3'], ['2e1','20'], ['0x10','16'], ['9007199254740991','9007199254740991']]) { await attr('a','data-win-count',value); await badge(a,expected); }
    await attr('a','data-win-count','0'); await badge(a,'');
    const noCountWidth = await tab.evaluate(n => n.getBoundingClientRect().width);
    await attr('a','data-win-count','12345'); await attr('a','data-win-count-label',' busy '); await badge(a,'12345');
    assert((await tab.evaluate(n => n.getBoundingClientRect().width)) > noCountWidth, 'count grows ordinary tab naturally');
    await attr('a','data-win-attention','0');
    await p.waitForFunction(() => document.querySelector('#all [data-win-tab="a"] .win-item-attention').hidden);
    assert.equal(await tab.locator('.win-item-count').textContent(),'12345');
    assert.equal(await p.evaluate(() => JSON.stringify(pudlWindows.state())),nav,'marks do not enter navigation state');
    await p.evaluate(() => document.querySelector('[data-win-layer]').dataset.winTaskbarStacks='always');
    const stack = p.locator('#all [data-win-stack="chats"]'); await stack.waitFor();
    await badge('#all [data-win-stack="chats"]','12349'); assert.match(await stack.getAttribute('aria-label'), /12349 busy/);
    await stack.click(); await p.waitForSelector('[data-win-stack-row][data-win-tab="a"]');
    await p.locator('[data-win-stack-row][data-win-tab="a"]').focus();
    await p.evaluate(() => { window.countRow = document.querySelector('[data-win-stack-row][data-win-tab="a"]'); });
    await attr('a','data-win-count','5'); await badge('[data-win-stack-row][data-win-tab="a"]','5'); await badge('#all [data-win-stack="chats"]','9');
    assert(await p.evaluate(() => document.activeElement === window.countRow && window.countRow === document.querySelector('[data-win-stack-row][data-win-tab="a"]')), 'open row retains identity and focus');
    await attr('b','data-win-count-label','queued');
    await p.waitForFunction(() => document.querySelector('#all [data-win-stack="chats"]').getAttribute('aria-label').endsWith(', 9'));
    assert.match(await p.locator('[data-win-stack-row][data-win-tab="b"]').getAttribute('aria-label'), /4 queued/);
    await attr('b','data-win-count-label','');
    await p.waitForFunction(() => document.querySelector('#all [data-win-stack="chats"]').getAttribute('aria-label').endsWith(', 9'));
    await attr('a','data-win-count-label','');
    await p.waitForFunction(() => document.querySelector('[data-win-stack-row][data-win-tab="a"]').getAttribute('aria-label').endsWith(', 5'));
    await attr('a','data-win-count-label','busy');
    await attr('b','data-win-count','0'); await badge('#all [data-win-stack="chats"]','5'); assert.match(await stack.getAttribute('aria-label'), /5 busy/);
    await attr('b','data-win-count','-4'); await badge('#all [data-win-stack="chats"]','5'); assert.match(await stack.getAttribute('title'), /5 busy/);
    await attr('b','data-win-count','4'); await attr('b','data-win-count-label','busy');
    await attr('b','data-win-group','other'); await badge(a,'5');
    await attr('b','data-win-group','chats'); await badge('#all [data-win-stack="chats"]','9');
    assert.equal(await stack.locator('.win-stack-count').textContent(),'2','window total remains distinct');
    await p.screenshot({path:out('window-count-stack.png')});
    await attr('a','data-win-count','9007199254740991'); await attr('b','data-win-count','9007199254740990');
    await badge('#all [data-win-stack="chats"]','18014398509481981');
    await p.keyboard.press('Escape');
    await p.evaluate(() => { document.querySelector('[data-win-layer]').removeAttribute('data-win-taskbar-stacks'); pudlWindows.update('a','<section class="win" data-win="a" data-win-count="8" data-win-count-label="running"><header class="win-head"><h2 class="win-title">Updated chat</h2></header><div class="win-body">New body</div></section>'); });
    await badge(a,'8'); assert.match(await tab.getAttribute('aria-label'),/8 running/);
    await p.evaluate(() => pudlWindows.update('a','<p id="body-only">Body replacement</p>')); await badge(a,'8');
    assert.equal(await p.locator('.win[data-win="a"]').getAttribute('data-win-count-label'),'running');
    await p.evaluate(() => pudlWindows.update('a','<section class="win" data-win="a"><header class="win-head"><h2 class="win-title">Cleared chat</h2></header><div class="win-body">Cleared marks</div></section>')); await badge(a,'');
    await attr('a','data-win-count','6'); await attr('a','data-win-count-label','busy'); await attr('a','data-win-attention','2');
    await p.evaluate(() => pudlWindows.dock('a','left'));
    await badge('[data-dock-key="a"]','6');
    await attr('a','data-win-count','7'); await badge('[data-dock-key="a"]','7');
    await p.evaluate(() => { document.querySelector('[data-win-layer]').dataset.winDockRailWidth='2000'; });
    await p.waitForSelector('[data-dock-rail] [data-dock-key="a"]');
    await badge('[data-dock-key="a"]','7');
    for (const theme of ['light','dark']) {
      await p.evaluate(theme => {document.documentElement.dataset.theme=theme; document.documentElement.dir='rtl';},theme);
      await p.screenshot({path:out('window-count-'+theme+'-rtl.png')});
      const geometry = await p.locator('[data-dock-key="a"]').evaluate(n => { const a=n.querySelector('.win-item-attention').getBoundingClientRect(), b=n.querySelector('.win-item-count').getBoundingClientRect(); return {a:{x:a.x,y:a.y,w:a.width,h:a.height},b:{x:b.x,y:b.y,w:b.width,h:b.height}}; });
      assert(geometry.b.w>0 && geometry.b.h>0,'count remains rendered');
      assert(geometry.a.x+geometry.a.w<=geometry.b.x+.5 || geometry.b.x+geometry.b.w<=geometry.a.x+.5 || geometry.a.y+geometry.a.h<=geometry.b.y+.5 || geometry.b.y+geometry.b.h<=geometry.a.y+.5, 'marks do not overlap');
    }
    await p.emulateMedia({forcedColors:'active'}); await p.screenshot({path:out('window-count-forced.png')});
    for (const dir of ['ltr','rtl']) {
      const pressure=await browser.newPage({viewport:{width:320,height:600},reducedMotion:'reduce'});
      pressure.on('pageerror',e=>errors.push(e.message));
      await pressure.goto(ROOT+'/tests/fixtures/window-count.html');
      await pressure.waitForSelector('#all .win-item-count');
      await pressure.evaluate(dir=>{
        document.documentElement.dir=dir;
        document.documentElement.style.setProperty('--text-2xs','11px');
        for (const key of ['a','b','c']) { const w=document.querySelector('.win[data-win="'+key+'"]');w.dataset.winCount='9007199254740991';w.dataset.winState='working'; }
      },dir);
      await pressure.waitForFunction(()=>['a','b','c'].every(key=>{const b=document.querySelector('#all [data-win-tab="'+key+'"] .win-item-count');return b && b.textContent==='9007199254740991' && getComputedStyle(b).fontSize==='11px';}));
      for (const size of [11,22]) {
        await pressure.evaluate(size=>document.documentElement.style.setProperty('--text-2xs',size+'px'),size);
        await pressure.waitForFunction(size=>Array.from(document.querySelectorAll('#all .win-item-count')).filter(b=>!b.hidden).every(b=>getComputedStyle(b).fontSize===size+'px'),size);
        await pressure.waitForSelector('.win-bar[data-win-taskbar-scroll]');
        for (const key of ['a','b','c']) {
          const count=pressure.locator('#all [data-win-tab="'+key+'"] .win-item-count');
          await count.scrollIntoViewIfNeeded();
          const g=await count.evaluate(b=>{
            const tab=b.closest('.win-tab'),bar=tab.parentElement,box=r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}),range=document.createRange();range.selectNodeContents(b);
            return {font:getComputedStyle(b).fontSize,text:b.textContent,badge:box(b.getBoundingClientRect()),tab:box(tab.getBoundingClientRect()),bar:box(bar.getBoundingClientRect()),lines:Array.from(range.getClientRects()).map(box),scroll:bar.scrollWidth>bar.clientWidth};
          });
          assert.equal(g.font,size+'px');assert.equal(g.text,'9007199254740991');assert(g.scroll);assert(g.lines.length>0);
          const contains=(outer,inner)=>inner.left>=outer.left-.5 && inner.right<=outer.right+.5 && inner.top>=outer.top-.5 && inner.bottom<=outer.bottom+.5;
          assert(contains(g.tab,g.badge),dir+' '+size+'px badge fits taskbar entry');
          for (const line of g.lines) { assert(contains(g.badge,line),'all digits fit badge');assert(contains(g.tab,line),'all digits fit entry');assert(line.left>=g.bar.left-.5 && line.right<=g.bar.right+.5,'scroll exposes complete count'); }
        }
      }
      await pressure.screenshot({path:out('window-count-22px-320-'+dir+'.png')});
      await pressure.close();
    }
    assert.deepEqual(errors,[]);
    console.log('PASS neutral counts, safe validation, precise stacks, live rows, labels, updates and dock presentations');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL '+e.stack); process.exitCode=1; });
