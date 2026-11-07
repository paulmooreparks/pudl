const assert = require('assert/strict');
const { launch, ROOT, engine } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({viewport:{width:1440,height:950}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(ROOT+'/samples/taskbar-reordering.html');
    const button=page.locator('.win-bar-arrange');await button.waitFor();
    const dialog=page.getByRole('dialog',{name:'Arrange taskbar',exact:true});
    const original=await page.evaluate(()=>pudlWindows.state().taskbarOrder);
    await button.click();await dialog.waitFor();
    assert.equal(await button.getAttribute('aria-expanded'),'true');
    await dialog.locator('select').selectOption('help');
    await dialog.getByRole('button',{name:'Move to beginning',exact:true}).click();
    await button.click();
    assert.equal(await page.locator('.win-taskbar-arrangement').count(),0,'second pointer click removes the popup');
    assert.equal(await button.getAttribute('aria-expanded'),'false');
    assert.deepEqual(await page.evaluate(()=>pudlWindows.state().taskbarOrder),original,'toggle dismissal discards the draft');
    await button.focus();await page.keyboard.press('Enter');await dialog.waitFor();
    await button.focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('.win-taskbar-arrangement').count(),0,'second Enter closes the popup');
    await button.focus();await page.keyboard.press('Space');await dialog.waitFor();
    await button.focus();await page.keyboard.press('Space');
    assert.equal(await page.locator('.win-taskbar-arrangement').count(),0,'second Space closes the popup');
    await button.click();await dialog.waitFor();await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('.win-taskbar-arrangement'));
    await button.click();await dialog.waitFor();
    assert.equal(await page.locator('.win-taskbar-arrangement').count(),1,'reopening creates only one popup');
    await page.locator('h1').click();await page.waitForFunction(()=>!document.querySelector('.win-taskbar-arrangement'));
    assert.equal(await button.getAttribute('aria-expanded'),'false','outside dismissal clears button state');
    if(engine!=='firefox') {
      const touch=await browser.newContext({hasTouch:true,viewport:{width:390,height:850}});
      const t=await touch.newPage();await t.goto(ROOT+'/samples/taskbar-reordering.html');
      const target=t.locator('.win-bar-arrange');
      await t.locator('.win-bar-windows').tap();await t.getByRole('menuitem',{name:'Arrange taskbar',exact:true}).tap();
      await t.getByRole('dialog',{name:'Arrange taskbar',exact:true}).waitFor();
      await t.getByRole('button',{name:'Cancel',exact:true}).tap();assert.equal(await t.locator('.win-taskbar-arrangement').count(),0,'compact command opens the same cancellable popup');
      await touch.close();
    }
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
