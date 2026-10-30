const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pw=require('playwright');
for(const engine of (process.env.PUDL_BROWSER ? [process.env.PUDL_BROWSER] : ['chromium','firefox','webkit'])) test(engine+' one-line fields preserve default height and contain enlarged text',async()=>{
 const browser=await pw[engine].launch();
 try {
  const page=await browser.newPage();
  await page.setContent('<input class="form-input" value="Working text"><select class="form-select"><option>Selected text</option></select>');
  const file='dist/'+(process.env.PUDL_MIN ? 'min/' : '')+'pudl.css';
  await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
  for(const selector of ['input','select']) {
   const control=page.locator(selector);
   assert.equal(await control.evaluate(n=>n.getBoundingClientRect().height),36);
   await control.evaluate(n=>n.style.fontSize='28px');
   const metrics=await control.evaluate(n=>{const s=getComputedStyle(n),c=document.createElement('canvas').getContext('2d');c.font=s.fontSize+' '+s.fontFamily;const text=c.measureText('Selected Working text');return {height:n.getBoundingClientRect().height,needed:text.actualBoundingBoxAscent+text.actualBoundingBoxDescent+parseFloat(s.paddingTop)+parseFloat(s.paddingBottom)+parseFloat(s.borderTopWidth)+parseFloat(s.borderBottomWidth)};});
   assert.ok(metrics.height>=metrics.needed,JSON.stringify(metrics));
  }
 } finally {await browser.close();}
});
