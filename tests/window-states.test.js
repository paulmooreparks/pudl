const assert = require('node:assert/strict');
const { launch, ROOT, out } = require('./lib');
(async () => {
  const b = await launch();
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(ROOT + '/tests/fixtures/taskbar-stacks.html?no-stacks');
    await p.waitForSelector('#all [data-win-tab="a1"]');
    await p.evaluate(async () => {
      await document.fonts.ready;
      document.querySelectorAll('.win').forEach(w=>{w.removeAttribute('data-win-running');w.removeAttribute('data-win-attention');});
    });
    async function frames() { await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))); }
    await frames();
    for (const skin of ['standard','bevel','gel','glaze']) {
      if (skin !== 'standard') await p.addStyleTag({url:ROOT+'/dist/pudl-skin-'+skin+'.css'});
      for (const theme of ['light','dark']) {
        await p.evaluate(({skin,theme})=>{document.documentElement.dataset.skin=skin;document.documentElement.dataset.theme=theme;}, {skin,theme});
        await frames();
        const snapshot = () => p.evaluate(()=>[...document.querySelectorAll('#all > [data-win-tab], .win[data-win="a1"] .win-chrome')].map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
        const baseline = await snapshot();
        for (const state of ['working','waiting','stuck','idle','']) {
          const observed = await p.evaluate(async state=>{
            const w=document.querySelector('.win[data-win="a1"]');
            if(state) w.dataset.winState=state;else w.removeAttribute('data-win-state');
            const results=[];
            for(let i=0;i<4;i++) {await new Promise(requestAnimationFrame);results.push([...document.querySelectorAll('#all > [data-win-tab], .win[data-win="a1"] .win-chrome')].map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));}
            return results;
          }, state);
          observed.forEach(v=>assert.deepEqual(v,baseline,skin+' '+theme+' '+state+' keeps every frame stable'));
          const mark = p.locator('#all [data-win-tab="a1"] .win-state');
          assert.equal(await mark.getAttribute('data-state'),state);
          if(state) {
            assert.match(await mark.getAttribute('aria-label'),new RegExp(state,'i'));
            assert.equal(await mark.locator('.win-state-words').isVisible(),false);
            assert.notEqual(await mark.locator('.glyph').evaluate(n=>getComputedStyle(n).maskImage),'none');
            assert.equal(await mark.locator('.glyph').evaluate(n=>getComputedStyle(n).animationName),'none');
          }
        }
      }
    }
    await p.evaluate(()=>{const w=document.querySelector('.win[data-win="a1"]');w.setAttribute('data-win-running','');});
    await frames();
    assert.equal(await p.locator('#all [data-win-tab="a1"] .win-state').getAttribute('data-state'),'working');
    await p.evaluate(()=>{document.querySelector('.win[data-win="a1"]').dataset.winState='idle';document.querySelector('[data-win-layer]').dataset.winTaskbarStacks='always';});
    await p.waitForSelector('#all [data-win-stack="alpha"]');
    for(const [key,state] of [['a1','working'],['a2','waiting'],['a3','stuck']]) await p.evaluate(({key,state})=>document.querySelector('.win[data-win="'+key+'"]').dataset.winState=state,{key,state});
    await frames();
    const stack=p.locator('#all [data-win-stack="alpha"]');
    assert.equal(await stack.locator('.win-state').getAttribute('data-state'),'stuck');
    assert.match(await stack.getAttribute('aria-label'),/1 stuck, 1 waiting, 1 working/);
    await stack.click();
    await p.waitForSelector('[data-stack-row="a1"]');
    const close=p.locator('[data-stack-row="a1"] > button').first();
    const before=await close.boundingBox();
    await p.evaluate(()=>document.querySelector('.win[data-win="a1"]').dataset.winStateLabel='Working on a very long description that must wrap without moving controls');
    await frames();
    assert.deepEqual(await close.boundingBox(),before,'popup close stays fixed');
    assert(await p.locator('[data-stack-row="a1"] .win-state-words').isVisible());
    await p.keyboard.press('Escape');
    await p.evaluate(()=>{const w=document.querySelector('.win[data-win="a1"]');pudlWindows.raise('a1');pudlWindows.retitle('a1','A very long title that requires the status group to fold');w.style.width='240px';});
    await frames();
    const toggle=p.locator('.win[data-win="a1"] .win-status-toggle');
    await toggle.click();
    const popup=p.locator('#'+await toggle.getAttribute('popovertarget'));
    await popup.locator('.win-state .glyph').waitFor({state:'visible'});
    assert(await popup.locator('.win-state-words').isVisible());
    await p.evaluate(()=>{const w=document.querySelector('.win[data-win="a1"]');w.dataset.winState='waiting';w.dataset.winStateLabel='Waiting for approval';});
    await p.waitForFunction(()=>[...document.querySelectorAll('.win-status-popover:popover-open .win-state')].some(n=>n.dataset.state==='waiting'));
    assert.match(await popup.textContent(),/Waiting for approval/);
    await p.screenshot({path:out('window-states.png')});
    await p.emulateMedia({forcedColors:'active'});
    assert.notEqual(await popup.locator('.glyph').first().evaluate(n=>getComputedStyle(n).maskImage),'none');
    await p.keyboard.press('Escape');
    await p.evaluate(()=>{const w=document.querySelector('.win[data-win="a1"]');w.style.removeProperty('width');pudlWindows.retitle('a1','Atlas');});
    async function contrast(selector) {
      const result=await p.locator(selector).first().evaluate(g=>{
        const colour=getComputedStyle(g).backgroundColor;
        let n=g.parentElement, background;
        while(n) { background=getComputedStyle(n).backgroundColor; if(background!=='rgba(0, 0, 0, 0)' && background!=='transparent')break;n=n.parentElement; }
        function lum(s){const c=s.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
        const a=lum(colour),b=lum(background);
        return {colour,background,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
      });
      assert(result.ratio>=3,selector+' actual mask contrast '+JSON.stringify(result));
    }
    for(const system of ['light','dark']) for(const theme of ['light','dark']) {
      await p.emulateMedia({forcedColors:'active',colorScheme:system});
      await p.evaluate(t=>document.documentElement.dataset.theme=t,theme);
      for(const state of ['working','waiting','stuck','idle']) {
        await p.evaluate(s=>{document.querySelector('.win[data-win="a1"]').dataset.winState=s;pudlWindows.raise('a1');},state);
        await frames();
        await contrast('.win[data-win="a1"] .win-execution .glyph');
        await contrast('#all [data-win-stack="alpha"] .win-state .glyph');
        await p.evaluate(()=>pudlWindows.raise('b1'));await frames();
        await contrast('.win[data-win="a1"] .win-execution .glyph');
      }
      await p.evaluate(()=>{document.querySelector('[data-win-layer]').removeAttribute('data-win-taskbar-stacks');pudlWindows.raise('a1');});await frames();
      await contrast('#all [data-win-tab="a1"] .win-state .glyph');
      await p.evaluate(()=>{const l=document.querySelector('[data-win-layer]');l.setAttribute('data-win-dock-tabs','all');pudlWindows.dock('a1','left');});await frames();
      await contrast('[data-dock-key="a1"] .win-state .glyph');
      await p.evaluate(()=>{pudlWindows.dock('a1',null);document.querySelector('[data-win-layer]').setAttribute('data-win-taskbar-stacks','always');});await frames();
    }
    assert.deepEqual(errors,[]);
    console.log('PASS states, compatibility, aggregation, frame stability, skin/theme matrix and folded status');
  } finally { await b.close(); }
})().catch(e=>{console.error('FAIL '+e.message.replace(/\n/g,' ')+' '+e.stack.split('\n')[1]);console.error(e.stack);process.exitCode=1;});
