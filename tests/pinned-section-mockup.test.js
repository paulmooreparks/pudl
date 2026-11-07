const assert = require('assert/strict');
const { launch, ROOT, out, engine } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
    await page.goto(ROOT+'/mockups/pinned-section.html');
    await page.locator('.win-bar [data-win-pin="editor"]').waitFor();
    await page.locator('.desktop [data-win-open="editor"]').click();
    await page.locator('.win[data-win="editor"]').waitFor();
    await page.locator('.win-bar [data-win-pin="settings"]').click();
    await page.locator('.win #theme').selectOption('light');
    await page.reload();
    await page.locator('.win #theme').waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
    assert.equal(await page.locator('.win #theme').inputValue(),'light','restored Settings reflects the actual theme');
    async function association() {
      for(const key of ['editor','settings']) {
        assert.equal(await page.locator('.win[data-win="'+key+'"]').getAttribute('data-win-destination'),key,'restored metadata is present');
        const tab=page.locator('.win-bar [data-win-tab="'+key+'"]');
        assert.equal(await tab.count(),1,'exactly one represented entry for '+key);
        assert.equal(await tab.getAttribute('data-win-pin'),key,'running window stays in its pin');
        assert.equal(await tab.getAttribute('data-win-pin-running'),'true');
        assert.equal(await tab.evaluate(n=>getComputedStyle(n,'::before').display),'block','open marker remains visible');
        assert.equal(await page.locator('.win-bar .win-tab:not([data-win-pin])[data-win-tab="'+key+'"]').count(),0,'no duplicate ordinary entry');
      }
    }
    await association();
    const desktopHeight=await page.locator('.win-bar').evaluate(n=>n.getBoundingClientRect().height);
    assert.ok(desktopHeight<=40,'desktop taskbar remains compact: '+desktopHeight);
    for(const width of [850,700,600,561,560,559,480,390,320,210,1440]) {
      await page.setViewportSize({width,height:1000});await settle();await association();
      assert.ok(Math.abs((await page.locator('.win-bar').evaluate(n=>n.getBoundingClientRect().height))-desktopHeight)<.5,'no mouse-driven height jump at '+width);
      assert.ok((await page.locator('.win-bar').boundingBox()).width<=width+1,'the shell constrains the taskbar to viewport width at '+width);
      const h=await page.locator('.win-bar :is(.win-tab,.btn,.icon-btn):visible').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().height));
      assert.ok(Math.max(...h)-Math.min(...h)<.5,'buttons share a height at '+width+': '+h);
      assert.ok(await page.locator('.win-bar [data-win-dock]').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'no taskbar scrollbar at '+width);
    }
    await page.locator('[data-win-menu-id="view"]').click();
    const menu=page.getByRole('menu',{name:'View',exact:true});
    await menu.waitFor();
    const pinnedWords=await menu.locator(':scope > .menu-action .menubar-words').allTextContents();
    assert.equal(await page.locator('[data-menu-pin-toggle]').count(),0,'menu contents have no inline pin command');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#pin-editor,#edit-pins').count(),0,'the pin editor is deferred');
    await page.locator('.menubar-title[data-menu-id="view"]').click({button:'right'});
    await page.getByRole('menuitem',{name:'Unpin from taskbar',exact:true}).click();
    await page.reload();await page.locator('.win #theme').waitFor();await association();
    assert.equal(await page.locator('[data-win-menu-id="view"]').isVisible(),false,'menu unpin survives refresh');
    const siteMenus=await page.evaluate(()=>pudlMenubar.siteMenus());
    assert.deepEqual(siteMenus.map(m=>m.id),['site','view','window']);
    for (const item of siteMenus) {
      const title=page.locator('.menubar-title[data-menu-id="'+item.id+'"]');
      await title.click({button:'right'});
      await page.getByRole('menuitem',{name:'Pin to taskbar',exact:true}).click();
      const entry=page.locator('[data-win-menu-id="'+item.id+'"]');
      await entry.click();
      const panel=page.getByRole('menu',{name:item.label,exact:true});
      await panel.waitFor();
      const expected=await page.evaluate(id=>pudlMenubar.siteMenuCommands(id).filter(c=>c&&c.label).map(c=>c.label),item.id);
      assert.deepEqual(await panel.locator(':scope > .menu-action .menubar-words').allTextContents(),expected,'tear-off reads current '+item.label+' commands');
      if (item.id==='view') assert.deepEqual(expected,pinnedWords);
      await entry.click();
      assert.equal(await panel.isVisible(),false,'a second pointer click closes the tear-off');
      await entry.click({button:'right'});
      await page.getByRole('menuitem',{name:'Unpin from taskbar',exact:true}).click();
    }
    await page.evaluate(()=>{
      const title=document.createElement('li');title.dataset.menubarId='workspace-tools';title.textContent='Workspace tools';
      const rows=document.createElement('ul'),row=document.createElement('li'),command=document.createElement('button');
      command.textContent='Inspect workspace';command.addEventListener('click',()=>window.inspections=(window.inspections||0)+1);
      row.append(command);rows.append(row);title.append(rows);document.querySelector('[data-menubar-source]').append(title);pudlMenubar.refresh();
    });
    await page.locator('.menubar-title[data-menu-id="workspace-tools"]').click({button:'right'});
    await page.getByRole('menuitem',{name:'Pin to taskbar',exact:true}).click();
    const custom=page.locator('[data-win-menu-id="workspace-tools"]');
    await custom.click();await page.getByRole('menuitem',{name:'Inspect workspace',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.inspections),1,'arbitrary site-menu command uses its original handler');
    await page.evaluate(()=>{
      const source=document.querySelector('[data-menubar-source] > [data-menubar-id="workspace-tools"]');
      source.firstChild.textContent='Workspace actions';source.parentElement.insertBefore(source,source.parentElement.children[1]);pudlMenubar.refresh();
    });
    await page.waitForFunction(()=>document.querySelector('[data-win-menu-id="workspace-tools"] .win-item-title').textContent==='Workspace actions');
    await custom.click({button:'right'});await page.getByRole('menuitem',{name:'Unpin from taskbar',exact:true}).click();
    await page.evaluate(()=>{document.querySelector('[data-menubar-source] > [data-menubar-id="workspace-tools"]').remove();pudlMenubar.refresh();});
    const appletTitle=page.locator('.menubar-title').filter({hasText:/^Settings$/});
    assert.equal(await appletTitle.evaluate(n=>pudlMenubar.siteMenuId(n)),null,'applet title is excluded from site-menu pinning');
    await page.evaluate(()=>{
      document.querySelector('[data-menubar]').addEventListener('contextmenu',e=>{window.menuContextCanceled=e.defaultPrevented;},true);
    });
    await appletTitle.click({button:'right'});
    assert.equal(await page.evaluate(()=>window.menuContextCanceled),true,'applet title suppresses the browser context menu');
    await appletTitle.focus();await page.keyboard.press('Shift+F10');
    assert.equal(await page.locator('.context-menu:popover-open').count(),0,'applet titles have no keyboard context menu');
    assert.equal(await page.getByRole('menuitem',{name:/^Pin Settings to taskbar$/}).count(),0);
    await page.locator('.menubar-title[data-menu-id="view"]').focus();
    await page.keyboard.press('Shift+F10');
    await page.getByRole('menuitem',{name:'Pin to taskbar',exact:true}).click();
    for(const key of ['settings','editor']) {
      if (await page.evaluate(key=>pudlWindows.state().top!==key || !!pudlWindows.state().min[key],key)) await page.locator('.win-bar [data-win-pin="'+key+'"]').click();
      await page.locator('.win[data-win="'+key+'"] [data-win-action="close"]').click();
      await page.locator('.win-bar [data-win-pin="'+key+'"]').click();
      await page.locator('.win[data-win="'+key+'"]').waitFor();await association();
    }
    const quitPin=page.locator('.win-bar [data-win-pin="quit"]');
    await quitPin.click();await page.locator('#quit-dialog').waitFor();
    await page.locator('#quit-cancel').click();
    await page.waitForFunction(()=>document.querySelector('.win-bar [data-win-pin="quit"]').getAttribute('aria-busy')!=='true');
    assert.equal(await page.locator('#exited').isVisible(),false,'cancel preserves the session');
    await quitPin.click({button:'right'});await page.getByRole('menuitem',{name:'Unpin from taskbar',exact:true}).click();
    assert.equal(await quitPin.count(),0,'Quit uses standard pin management');
    await page.evaluate(()=>pudlWindows.pinTaskbar('quit',true));
    await quitPin.waitFor();
    for (const pinned of [true,false]) {
      await page.evaluate(pinned=>pudlWindows.pinTaskbar('editor',pinned),pinned);
      const entry=page.locator('.win-bar [data-win-tab="editor"]');
      if (await page.evaluate(()=>pudlWindows.state().top!=='editor' || !!pudlWindows.state().min.editor)) await entry.click();
      await entry.click();
      assert.equal(await page.evaluate(()=>!!pudlWindows.state().min.editor),true,'foreground minimizes with membership '+pinned);
      await entry.click();
      assert.equal(await page.evaluate(()=>!!pudlWindows.state().min.editor),false,'minimized restores with membership '+pinned);
    }
    await page.evaluate(()=>pudlWindows.pinTaskbar('editor',true));
    await page.screenshot({path:out('pinned-section-restored-wide.png')});
    await page.setViewportSize({width:390,height:850});await settle();
    assert.equal(await page.locator('.win-bar').getAttribute('data-win-bar-glyphs'),'');
    await page.screenshot({path:out('pinned-section-restored-narrow.png')});
    if(engine!=='firefox') {
      const touch=await browser.newContext({hasTouch:true,viewport:{width:1440,height:1000}});
      const t=await touch.newPage();await t.goto(ROOT+'/mockups/pinned-section.html');await t.locator('.win-bar [data-win-pin="settings"]').waitFor();
      assert.equal(await t.evaluate(()=>matchMedia('(pointer: coarse)').matches),true);
      for(const width of [1440,390]) {
        await t.setViewportSize({width,height:1000});await t.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
        const rects=await t.locator('.win-bar :is(.win-tab,.btn,.icon-btn):visible').evaluateAll(ns=>ns.map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));
        assert.ok(rects.every(r=>r.w>=40&&r.h>=40),'touch targets have width and height independent of viewport');
      }
      await touch.close();
    }
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
