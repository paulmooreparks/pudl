const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(ROOT+'/samples/markup-menu-choices.html');
    await page.locator('.menubar-ready').waitFor();
    assert.deepEqual(await page.evaluate(()=>pudlMenubar.siteMenus().map(m=>m.id)),['site','appearance']);
    assert.deepEqual(await page.evaluate(()=>pudlMenubar.siteMenuCommands('missing')),[]);
    assert.equal(await page.locator('[data-menu-id="appearance"]').evaluate(n=>pudlMenubar.siteMenuId(n)),'appearance');
    await page.evaluate(()=>{
      window.choiceEvents=[];
      document.addEventListener('pudl:menu-choose',e=>choiceEvents.push(e.detail.value));
      pudlMenubar.siteMenuCommands('appearance').find(c=>c.label==='Dark').run();
    });
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark','tear-off retains the host choice event');
    assert.deepEqual(await page.evaluate(()=>choiceEvents),['dark']);
    assert.equal(await page.evaluate(()=>pudlMenubar.siteMenuCommands('appearance').find(c=>c.label==='Dark').checked),true,'fresh rows reflect current choice');
    await page.evaluate(()=>{
      window.retainedChoice=pudlMenubar.siteMenuCommands('appearance').find(c=>c.label==='Light');
      document.querySelector('button[value="light"]').disabled=true;
      retainedChoice.run();
    });
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark','disabled source cannot run through retained rows');
    await page.evaluate(()=>{
      document.querySelector('button[value="light"]').remove();
      retainedChoice.run();
    });
    assert.deepEqual(await page.evaluate(()=>choiceEvents),['dark'],'removed source cannot run through retained rows');
    await page.evaluate(()=>{
      pudlMenubar.ribbon(true);
      const opener=document.createElement('button');opener.id='tearoff-test';opener.textContent='Appearance';document.body.append(opener);
      pudlMenubar.toggleSiteMenu('appearance',opener);
    });
    await page.getByRole('menu',{name:'Appearance',exact:true}).waitFor();
    await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('menu',{name:'Appearance',exact:true}).isVisible(),true,'taskbar tear-offs stay popups while the menubar is a ribbon');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#tearoff-test').evaluate(n=>n===document.activeElement),true);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
