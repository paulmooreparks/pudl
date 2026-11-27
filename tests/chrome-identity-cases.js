const assert = require('node:assert/strict');
const fs = require('node:fs');
const { launch, ROOT, out } = require('./lib');
const { glyphPaint,imageParity } = require('./glyph-paint');
const light = ['rgb(36, 88, 166)', 'rgb(104, 67, 160)', 'rgb(0, 103, 123)', 'rgb(88, 79, 157)'];
const dark = ['rgb(168, 200, 255)', 'rgb(207, 181, 244)', 'rgb(133, 212, 229)', 'rgb(191, 185, 242)'];
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
module.exports = async function runIdentity(skins) {
  const results = [];
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/identity-valid.svg',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#7a42b4"/></svg>'}));
    await page.route('**/identity-failed.svg',route=>route.fulfill({status:404,body:'Intentional image fallback fixture'}));
    await page.goto(ROOT + '/tests/fixtures/chrome-identity.html');
    await page.waitForFunction(() => window.fixtureReady);
    const pinGlyph = id => page.locator('.win-bar [data-win-pin="' + id + '"] .win-item-glyph');
    for (const kind of ['conversation','document','files','tools']) assert.equal(await pinGlyph(kind).getAttribute('data-identity-kind'), kind);
    assert.equal(await pinGlyph('unknown').getAttribute('data-identity-kind'), null);
    for(const invalid of ['Document',' document','DOCUMENT','future','',null,4,{},[]]) {
      await page.evaluate(value=>pudlWindows.configureTaskbar({destinations:fixtureDestinations.map(d=>({...d,identityKind:d.id==='unknown'?value:d.identityKind})),pins:fixtureDestinations.map(d=>d.id)}),invalid);
      assert.equal(await pinGlyph('unknown').getAttribute('data-identity-kind'),null,'invalid descriptor metadata stays neutral: '+JSON.stringify(invalid));
    }
    for(const invalid of ['Document',' tools','TOOLS','future','']) {
      await page.evaluate(value=>document.querySelector('[data-win="gamma"]').setAttribute('data-win-identity-kind',value),invalid);await settle(page);
      assert.equal(await page.locator('.win-bar [data-win-tab="gamma"] .win-item-glyph').getAttribute('data-identity-kind'),null,'invalid root metadata stays neutral: '+invalid);
    }
    await page.evaluate(()=>document.querySelector('[data-win="gamma"]').setAttribute('data-win-identity-kind','tools'));
    await page.evaluate(()=>pudlWindows.configureTaskbar({destinations:fixtureDestinations.map(d=>d.id==='unknown'?{...d,identityKind:'files',icon:'/identity-valid.svg'}:d),pins:fixtureDestinations.map(d=>d.id)}));
    await page.locator('.win-bar [data-win-pin="unknown"] .win-item-icon:not([hidden])').waitFor();
    assert.equal(await page.locator('.win-bar [data-win-pin="unknown"] .win-item-icon').getAttribute('data-identity-kind'),null,'host images are not classified or recoloured');
    await page.evaluate(()=>pudlWindows.configureTaskbar({destinations:fixtureDestinations.map(d=>d.id==='unknown'?{...d,identityKind:'files',icon:'/identity-failed.svg'}:d),pins:fixtureDestinations.map(d=>d.id)}));
    await pinGlyph('unknown').waitFor({state:'visible'});assert.equal(await pinGlyph('unknown').getAttribute('data-identity-kind'),'files','failed image restores classified fallback');
    await page.evaluate(()=>pudlWindows.configureTaskbar({destinations:fixtureDestinations,pins:fixtureDestinations.map(d=>d.id)}));
    // Destination aggregates retain descriptor authority over represented roots.
    await page.evaluate(() => pudlWindows.configureTaskbar({ destinations: fixtureDestinations.map(d => ({...d,identityKind:d.id==='document'?'files':d.identityKind})),pins:fixtureDestinations.map(d=>d.id) }));
    assert.equal(await pinGlyph('document').getAttribute('data-identity-kind'), 'files');
    await page.evaluate(() => { const d=fixtureDestinations.find(d=>d.id==='document');d.identityKind='conversation'; });
    await settle(page);
    assert.equal(await pinGlyph('document').getAttribute('data-identity-kind'), 'files', 'supplied objects are copied');
    await page.evaluate(() => { fixtureDestinations.find(d=>d.id==='document').identityKind='document';pudlWindows.configureTaskbar({destinations:fixtureDestinations,pins:['conversation','files','tools','unknown']}); });
    const group = page.locator('.win-bar [data-win-stack="notes"]');
    assert.equal(await group.locator('.win-item-glyph').getAttribute('data-identity-kind'), 'document');
    await group.focus(); await page.keyboard.press('ArrowDown');
    await page.locator('.win-stack-panel:popover-open').waitFor();
    await page.evaluate(() => document.querySelector('[data-win="alpha"]').setAttribute('data-win-identity-kind','files'));
    await page.waitForFunction(() => document.querySelector('.win-stack-panel [data-stack-row="alpha"] .win-item-glyph')?.dataset.identityKind==='files');
    assert.equal(await group.locator('.win-item-glyph').getAttribute('data-identity-kind'), null, 'mixed groups are neutral');
    await page.evaluate(() => document.querySelector('[data-win="alpha"]').removeAttribute('data-win-identity-kind'));
    await page.waitForFunction(() => !document.querySelector('.win-stack-panel [data-stack-row="alpha"] .win-item-glyph')?.hasAttribute('data-identity-kind'));
    await page.keyboard.press('Escape');
    await page.evaluate(() => { document.querySelector('[data-win="alpha"]').setAttribute('data-win-identity-kind','document');pudlWindows.configureTaskbar({destinations:fixtureDestinations,pins:fixtureDestinations.map(d=>d.id)}); });
    await page.keyboard.down('Control');await page.keyboard.press('Tab');await page.keyboard.press('Tab');
    await page.locator('.win-switcher:popover-open').waitFor();
    const picked = await page.locator('.win-switcher [aria-selected="true"]').getAttribute('data-switch-key');
    await page.evaluate(() => document.querySelector('[data-win="gamma"]').setAttribute('data-win-identity-kind','conversation'));
    await page.waitForFunction(() => document.querySelector('.win-switcher [data-switch-key="gamma"] .glyph')?.dataset.identityKind==='conversation');
    assert.equal(await page.locator('.win-switcher [aria-selected="true"]').getAttribute('data-switch-key'),picked,'classification update preserves switcher selection');
    await page.keyboard.press('Escape');await page.keyboard.up('Control');
    await page.evaluate(() => document.querySelector('[data-win="gamma"]').setAttribute('data-win-identity-kind','tools'));
    // Replacement metadata is copied onto the retained root and generated mark.
    assert.equal(await page.evaluate(() => pudlWindows.update('gamma','<section class="win" data-win="gamma" data-win-glyph="terminal" data-win-identity-kind="files"><header class="win-head"><h2 class="win-title">gamma</h2></header><div class="win-body"><input aria-label="gamma draft" value="Invented draft"></div></section>')),true);
    await page.waitForFunction(() => document.querySelector('.win-bar [data-win-tab="gamma"] .win-item-glyph')?.dataset.identityKind==='files');
    await page.evaluate(() => pudlWindows.update('gamma','<section class="win" data-win="gamma" data-win-glyph="terminal"><header class="win-head"><h2 class="win-title">gamma</h2></header><div class="win-body"><input aria-label="gamma draft" value="Invented draft"></div></section>'));
    await page.waitForFunction(() => !document.querySelector('.win-bar [data-win-tab="gamma"] .win-item-glyph')?.hasAttribute('data-identity-kind'));
    await page.evaluate(() => document.querySelector('[data-win="gamma"]').setAttribute('data-win-identity-kind','tools'));
    // A different off-projection member cannot neutralize a unanimous visible group.
    await page.evaluate(() => { const dock=document.querySelector('.win-bar [data-win-dock]');dock.setAttribute('data-win-dock-omit-docked','');const g=document.querySelector('[data-win="gamma"]');g.setAttribute('data-win-group','notes');g.setAttribute('data-win-group-label','Notes');g.setAttribute('data-win-group-glyph','document');pudlWindows.configureTaskbar({destinations:fixtureDestinations,pins:[]});pudlWindows.dock('gamma','left'); });
    await page.waitForFunction(() => document.querySelector('.win-bar [data-win-stack="notes"] .win-item-glyph')?.dataset.identityKind==='document');
    await page.evaluate(() => document.querySelector('[data-win="gamma"]').setAttribute('data-win-identity-kind','conversation'));
    await settle(page);
    assert.equal(await group.locator('.win-item-glyph').getAttribute('data-identity-kind'),'document','excluded member metadata does not affect aggregate');
    await page.evaluate(() => document.querySelector('[data-win="beta"]').setAttribute('data-win-identity-kind','files'));
    await page.waitForFunction(() => !document.querySelector('.win-bar [data-win-stack="notes"] .win-item-glyph')?.hasAttribute('data-identity-kind'));
    await page.evaluate(() => {document.querySelector('[data-win="beta"]').setAttribute('data-win-identity-kind','document');const g=document.querySelector('[data-win="gamma"]');g.removeAttribute('data-win-group');g.removeAttribute('data-win-group-label');g.removeAttribute('data-win-group-glyph');g.setAttribute('data-win-identity-kind','tools');pudlWindows.dock('gamma',null);document.querySelector('.win-bar [data-win-dock]').removeAttribute('data-win-dock-omit-docked');});
    // Provider refresh updates an already open folded-pin navigation context.
    await page.evaluate(() => {window.remoteIdentity='files';window.remoteStatus='available';window.remoteProvider={id:'remote-provider',resolve:()=>remoteStatus==='available'?{status:'available',destination:{id:'remote',label:'Remote files',glyph:'folder',command:true,identityKind:remoteIdentity}}:{status:remoteStatus}};pudlWindows.configureTaskbar({destinations:fixtureDestinations,providers:[remoteProvider],references:[{id:'remote',provider:'remote-provider'}],pins:['remote',...fixtureDestinations.map(d=>d.id)]});});
    await page.waitForFunction(() => document.querySelector('.win-bar [data-win-pin="remote"] .win-item-glyph')?.dataset.identityKind==='files');
    await page.locator('.win-bar').evaluate(n=>n.style.width='280px');
    await page.locator('.win-pins-more:not([hidden])').waitFor();await page.locator('.win-pins-more').click();
    await page.locator('.context-menu:popover-open').waitFor();
    assert.ok(await page.locator('.context-menu:popover-open .glyph[data-identity-kind="files"]').count());
    await page.evaluate(() => {remoteIdentity='conversation';return pudlWindows.refreshTaskbarDestinations({provider:'remote-provider'});});
    await page.waitForFunction(() => [...document.querySelectorAll('.context-menu:popover-open .menu-action')].some(n=>n.textContent.includes('Remote files')&&n.querySelector('.glyph[data-identity-kind="conversation"]')));
    await page.evaluate(() => {remoteStatus='unavailable';return pudlWindows.refreshTaskbarDestinations({provider:'remote-provider'});});
    assert.equal(await pinGlyph('remote').getAttribute('data-identity-kind'),null,'unavailable results discard presentation identity');
    await page.keyboard.press('Escape');await page.locator('.win-bar').evaluate(n=>n.style.removeProperty('width'));
    await page.evaluate(() => pudlWindows.configureTaskbar({destinations:fixtureDestinations,providers:[],references:[],pins:fixtureDestinations.map(d=>d.id)}));
    // A dock's open More context follows root mutations without reopening.
    const dockPage=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    dockPage.on('pageerror',e=>errors.push(e.message));
    await dockPage.goto(ROOT+'/tests/fixtures/dock-overflow.html');
    const dockMore=dockPage.locator('.win-dock-group[data-dock-edge="right"]:not([data-dock-pane]) > .win-dock-more');
    await dockMore.waitFor({state:'visible'});
    const hiddenKey=await dockMore.evaluate(n=>n.__hidden.find(key=>document.querySelector('[data-win="'+key+'"]')?.hasAttribute('data-win-glyph')));
    assert.ok(hiddenKey,'dock overflow has an actual hidden glyph entry');
    await dockPage.evaluate(key=>document.querySelector('[data-win="'+key+'"]').setAttribute('data-win-identity-kind','files'),hiddenKey);
    await dockPage.waitForFunction(key=>document.querySelector('[data-dock-key="'+key+'"] .win-item-glyph')?.dataset.identityKind==='files',hiddenKey);
    await dockMore.click();await dockPage.locator('.context-menu:popover-open .glyph[data-identity-kind="files"]').waitFor();
    await dockPage.screenshot({path:out('identity-dock-more-before.png')});
    await dockPage.evaluate(key=>document.querySelector('[data-win="'+key+'"]').setAttribute('data-win-identity-kind','tools'),hiddenKey);
    await dockPage.locator('.context-menu:popover-open .glyph[data-identity-kind="tools"]').waitFor();
    await dockPage.screenshot({path:out('identity-dock-more-after.png')});
    await dockPage.evaluate(key=>document.querySelector('[data-win="'+key+'"]').removeAttribute('data-win-identity-kind'),hiddenKey);
    await dockPage.waitForFunction(()=>!document.querySelector('.context-menu:popover-open .glyph[data-identity-kind]'));
    await dockPage.close();
    // Authored opt-in is direct, exact-case and does not classify action siblings.
    await page.evaluate(() => { const n=document.getElementById('sample-unknown');n.setAttribute('data-identity-kind','document');n.querySelector('.glyph').setAttribute('data-identity-kind','Document'); });
    assert.equal(await page.locator('#sample-unknown .glyph').evaluate(n=>getComputedStyle(n).backgroundColor),await page.locator('#sample-unknown .glyph').evaluate(n=>getComputedStyle(n).color));
    await page.evaluate(() => document.querySelector('#sample-unknown .glyph').setAttribute('data-identity-kind','unknown'));
    await page.evaluate(() => pudlLauncher.open(catalog));await page.locator('#catalog:popover-open').waitFor();
    for (const skin of skins) for (const theme of ['light','dark']) {
      await page.evaluate(async ({skin,theme})=>{await identitySkin(skin);document.documentElement.dataset.theme=theme;}, {skin,theme});
      await settle(page);
      const ink = theme==='dark'?dark:light;
      const got = await page.locator('#specimens [data-identity-kind]').evaluateAll(nodes=>nodes.slice(0,4).map(n=>getComputedStyle(n).backgroundColor));
      assert.deepEqual(got,ink,skin+' '+theme+' explicit family inks');
      const geometry = await page.evaluate(() => {
        const targets=[...document.querySelectorAll('#catalog a.start-item,#catalog [data-start-query]')];
        const box=n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
        const before=targets.map(box), marks=[...document.querySelectorAll('#catalog .glyph[data-identity-kind]')].map(n=>[n,n.getAttribute('data-identity-kind')]);
        marks.forEach(([n])=>n.removeAttribute('data-identity-kind'));const neutral=targets.map(box);marks.forEach(([n,k])=>n.setAttribute('data-identity-kind',k));
        return {before,neutral,after:targets.map(box),visible:targets.map(n=>{const r=n.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!r.width&&!!r.height&&(hit===n||n.contains(hit));})};
      });
      assert.equal(geometry.before.length,6,'five launcher links plus search are measured');
      assert.deepEqual(geometry.before,geometry.neutral);assert.deepEqual(geometry.after,geometry.neutral);assert.ok(geometry.visible.every(Boolean),'launcher links and search remain hit visible');
      const states=[];
      for (const hook of ['aria-current','aria-selected','aria-disabled']) {
        await page.locator('#sample-document').evaluate((n,hook)=>n.setAttribute(hook,hook==='aria-current'?'page':'true'),hook);
        const state=await page.locator('#sample-document .glyph').evaluate(n=>({ink:getComputedStyle(n).backgroundColor,fg:getComputedStyle(n).color}));assert.equal(state.ink,state.fg,hook+' foreground fallback');states.push({hook,...state});
        await page.locator('#sample-document').evaluate((n,hook)=>n.removeAttribute(hook),hook);
        assert.equal(await page.locator('#sample-document .glyph').evaluate(n=>getComputedStyle(n).backgroundColor),ink[1],'state removal restores identity ink');
      }
      await page.locator('#sample-files').hover();await page.locator('#sample-tools').focus();
      const name=skin+'-'+theme;
      const capture=async suffix=>{
        const slots=await page.locator('.glyph').evaluateAll(nodes=>{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=canvas.height=1;const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);};return nodes.filter(n=>{const r=n.getBoundingClientRect();if(!r.width||!r.height||n.hidden||getComputedStyle(n).visibility!=='visible')return false;const h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===n||n.contains(h);}).map(n=>{const r=n.getBoundingClientRect(),c=getComputedStyle(n);return {kind:n.getAttribute('data-identity-kind'),rect:[r.x,r.y,r.width,r.height],ink:c.backgroundColor,inkRGB:rgb(c.backgroundColor),foreground:c.color,disabled:!!n.closest(':disabled,[aria-disabled="true"]'),mask:c.maskImage||c.webkitMaskImage};});});
        const text=await page.locator(':is(#specimens .md-item,#catalog .start-item)>span:not(.glyph)').evaluateAll(nodes=>{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=canvas.height=1;return nodes.map(n=>{const r=n.getBoundingClientRect();ctx.fillStyle=getComputedStyle(n).color;ctx.fillRect(0,0,1,1);return {kind:'text',rect:[r.x,r.y,r.width,r.height],inkRGB:[...ctx.getImageData(0,0,1,1).data].slice(0,3),minimumContrast:4.5};});});
        const visible=await page.screenshot({path:out(name+suffix+'.png')});
        await page.evaluate(()=>document.documentElement.classList.add('glyphs-hidden'));
        const backing=await page.screenshot({path:out(name+suffix+'-backing.png')});
        await page.evaluate(()=>document.documentElement.classList.remove('glyphs-hidden'));
        assert.ok(slots.some(s=>s.kind==='conversation')&&slots.some(s=>s.kind==='document')&&slots.some(s=>s.kind==='files')&&slots.some(s=>s.kind==='tools'));
        assert.ok(slots.every(s=>s.mask!=='none'),'all retained glyphs have a mask');
        return {slots,text,paint:glyphPaint(visible,backing,slots,!!suffix),textPaint:glyphPaint(visible,backing,text,!!suffix)};
      };
      const ordinary=await capture('');
      await page.emulateMedia({forcedColors:'active'});await settle(page);
      const forcedStates=[];
      for (const kind of ['document','Document','unknown','',null]) {
        await page.locator('#sample-document').evaluate((n,kind)=>{n.setAttribute('aria-current','page');const g=n.querySelector('.glyph');if(kind===null)g.removeAttribute('data-identity-kind');else g.setAttribute('data-identity-kind',kind);},kind);
        const current=await page.locator('#sample-document .glyph').evaluate(n=>{const kind=n.getAttribute('data-identity-kind'),ink=getComputedStyle(n).backgroundColor;n.removeAttribute('data-identity-kind');const neutral=getComputedStyle(n).backgroundColor;if(kind!==null)n.setAttribute('data-identity-kind',kind);return {ink,neutral,foreground:getComputedStyle(n).color};});
        assert.equal(current.ink,current.neutral,'ordinary forced current link retains baseline system ink for '+kind);forcedStates.push({kind,...current});
      }
      await page.locator('#sample-document').evaluate(n=>{n.removeAttribute('aria-current');n.querySelector('.glyph').setAttribute('data-identity-kind','document');});
      await page.locator('#link-document').evaluate(n=>n.setAttribute('aria-current','page'));
      const forced=await capture('-forced');
      const protectedRegions=await page.locator('.glyph,.win-item-title,.win-title,:is(#specimens .md-item,#catalog .start-item)>span:not(.glyph)').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).visibility==='visible').map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}).filter(([x,y,w,h])=>w>0&&h>0&&x<innerWidth&&y<innerHeight&&x+w>0&&y+h>0));
      const ariaClassified=await page.locator('body').ariaSnapshot();
      const classifiedStates=await page.locator('.glyph[data-identity-kind]').evaluateAll(nodes=>nodes.map(n=>{const c=getComputedStyle(n),r=n.getBoundingClientRect();return {ink:c.backgroundColor,foreground:c.color,adjust:c.forcedColorAdjust,rect:[r.x,r.y,r.width,r.height],mask:c.maskImage||c.webkitMaskImage};}));
      const forcedBaseline=await page.evaluate(()=>{
        const marks=[...document.querySelectorAll('.glyph[data-identity-kind]')],values=marks.map(n=>n.getAttribute('data-identity-kind'));
        window.retainedIdentityMarks=marks.map((n,i)=>[n,values[i]]);marks.forEach(n=>n.removeAttribute('data-identity-kind'));
        const label=document.querySelector('#link-document>span:not(.glyph)'),probe=document.createElement('span');document.body.appendChild(probe);
        const system={};for(const name of ['Canvas','CanvasText','Highlight','HighlightText','GrayText']){probe.style.color=name;system[name]=getComputedStyle(probe).color;}probe.remove();
        return {system,labelForeground:getComputedStyle(label).color,forced:matchMedia('(forced-colors:active)').matches};
      });
      const unclassifiedImage=await page.screenshot({path:out(name+'-forced-unclassified.png')});
      await page.evaluate(()=>retainedIdentityMarks.forEach(([n])=>n.setAttribute('data-identity-kind','unknown')));
      const controlImage=await page.screenshot({path:out(name+'-forced-neutral-control.png')});
      const controlParity=imageParity(unclassifiedImage,controlImage,255);
      await page.evaluate(()=>retainedIdentityMarks.forEach(([n])=>n.removeAttribute('data-identity-kind')));
      const unclassifiedStates=await page.evaluate(()=>retainedIdentityMarks.map(([n])=>{const c=getComputedStyle(n),r=n.getBoundingClientRect();return {ink:c.backgroundColor,foreground:c.color,adjust:c.forcedColorAdjust,rect:[r.x,r.y,r.width,r.height],mask:c.maskImage||c.webkitMaskImage};}));
      assert.deepEqual(unclassifiedStates,classifiedStates,'forced classification preserves computed ink, masks, geometry and adjustment roles');
      const ariaUnclassified=await page.locator('body').ariaSnapshot();
      assert.equal(ariaUnclassified,ariaClassified,'forced classification preserves labels and accessibility state');
      const fullFrameParity=imageParity(fs.readFileSync(out(name+'-forced.png')),unclassifiedImage,255);
      const parity=imageParity(fs.readFileSync(out(name+'-forced.png')),unclassifiedImage,255,protectedRegions);
      fs.writeFileSync(out(name+'-forced-raster.json'),JSON.stringify({protectedRegions,parity,fullFrameParity,controlParity},null,2)+'\n');
      assert.equal(parity.changedPixels,0,'outward-clipped complete visible/intersecting glyph and label union has exact raster parity');
      await page.evaluate(()=>retainedIdentityMarks.forEach(([n,k])=>n.setAttribute('data-identity-kind',k)));
      await page.locator('#link-document').evaluate(n=>n.removeAttribute('aria-current'));
      await page.emulateMedia({forcedColors:'none'});await settle(page);
      results.push({skin,theme,geometry,states,ordinary,forced,forcedStates,forcedBaseline,parity,fullFrameParity,controlParity,protectedRegions,classifiedStates,unclassifiedStates,ariaClassified,ariaUnclassified});
      console.log('PASS '+name+' identity inks, states and launcher target geometry');
    }
    assert.deepEqual(errors,[]);
    const forcedContrastFindings=results.flatMap(r=>[...r.forced.paint.filter(s=>!s.disabled&&s.minimumContrast<3),...r.forced.textPaint.filter(s=>s.minimumContrast<4.5)].map(s=>({skin:r.skin,theme:r.theme,...s})));
    fs.writeFileSync(out('forced-system-limitations.json'),JSON.stringify(forcedContrastFindings,null,2)+'\n');
    console.log('PASS forced system-palette parity; retained below-author-threshold measurements: '+forcedContrastFindings.length);
    console.log('PASS generated identity ownership, group/live stack/switcher updates and exact opt-in');
  } finally {
    fs.writeFileSync(out('identity-results.json'),JSON.stringify({results},null,2)+'\n');
    await browser.close();
  }
};
