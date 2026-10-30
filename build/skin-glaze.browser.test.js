const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const pw=require('playwright');
for(const engine of (process.env.PUDL_BROWSER ? [process.env.PUDL_BROWSER] : ['chromium','firefox','webkit'])) test(engine+' Glaze preview preserves controls and supports both themes',async()=>{
 const browser=await pw[engine].launch();
 try {
 const page=await browser.newPage({viewport:{width:1100,height:900}});
 await page.route('http://skinpreview.test/**', route => {
   let file = new URL(route.request().url()).pathname.slice(1);
   if (process.env.PUDL_MIN && /^dist\/[^/]+\.(css|js)$/.test(file)) file = file.replace('dist/', 'dist/min/');
   if (process.env.PUDL_MIN && /^samples\/skins-(bevel|gel|glaze)\.css$/.test(file)) file = 'dist/min/pudl-skin-' + file.match(/skins-(.*)\.css$/)[1] + '.css';
   if (!fs.existsSync(file)) return route.abort();
   let body=fs.readFileSync(file);
   if (file.startsWith('dist/min/') && file.endsWith('.css')) body=body.toString().replace(/url\((["']?)\.\.\//g, (_, quote) => 'url(' + quote + 'http://skinpreview.test/dist/');
   return route.fulfill({body, contentType: file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.woff2') ? 'font/woff2' : 'text/html'});
 });
 await page.goto('http://skinpreview.test/samples/skins.html?skin=glaze');
 await page.locator('h1').filter({hasText:'Glaze'}).waitFor();
 const field=page.locator('.form-input').first(); await field.fill('Retained edits');
 for(const theme of ['light','dark']) {
 await page.selectOption('#theme',theme);
 await page.evaluate(()=>document.fonts.ready);
 const glaze=await page.locator('.btn').first().evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {w:r.width,h:r.height,radius:s.borderRadius,paint:s.backgroundImage}});
 assert.equal(glaze.radius,'4px'); assert.match(glaze.paint,/linear-gradient/);
 await page.selectOption('#skin','standard');
 const standard=await page.locator('.btn').first().evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height}});
 assert.equal(standard.width,glaze.w);assert.equal(standard.height,glaze.h);
 assert.equal(await field.inputValue(),'Retained edits');
 await page.selectOption('#skin','glaze');
 if(engine==='chromium'){fs.mkdirSync('tests/output',{recursive:true});await page.screenshot({path:'tests/output/glaze-preview-'+theme+'.png',fullPage:true});}
 }
 await page.close();
 } finally {await browser.close();}
});
