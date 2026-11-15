const fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');
const pw=require('playwright'),out=__dirname;
const log=(kind,data={})=>fs.appendFileSync(path.join(out,'events.jsonl'),JSON.stringify({time:new Date().toISOString(),mono:Number(process.hrtime.bigint()/1000000n),kind,...data})+'\n');
const pending=new Set();let serial=0;const ids=new WeakMap();
function track(p){pending.add(p);p.finally(()=>pending.delete(p));}
function id(page){if(!ids.has(page))ids.set(page,++serial);return ids.get(page);}
async function capture(page,phase){
 const n=id(page);if(page.isClosed())return;
 const state={page:n,phase,url:page.url()};
 try{state.document=await page.evaluate(()=>({url:location.href,readyState:document.readyState,title:document.title,contentType:document.contentType,visibility:document.visibilityState,body:document.body?.innerText,nav:performance.getEntriesByType('navigation').map(n=>n.toJSON())}));}catch(e){state.error=String(e);}
 log('document-state',state);
 try{await page.screenshot({path:path.join(out,`page-${n}-${phase}.png`),timeout:5000});}catch(e){log('capture-error',{page:n,phase,error:String(e)});}
 try{fs.writeFileSync(path.join(out,`page-${n}-${phase}.html`),await page.content());}catch(e){log('capture-error',{page:n,error:String(e)});}
}
async function instrument(context){
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const eventWait=context.waitForEvent.bind(context);
 context.waitForEvent=async(...args)=>{const start=Date.now();log('context-wait-start',{args});try{const result=await eventWait(...args);log('context-wait-end',{event:args[0],page:args[0]==='page'?id(result):null,url:args[0]==='page'?result.url():null,milliseconds:Date.now()-start});return result;}catch(e){log('context-wait-error',{event:args[0],milliseconds:Date.now()-start,error:String(e),stack:e.stack});throw e;}};
 context.on('request',r=>log('request',{url:r.url(),method:r.method(),resource:r.resourceType(),navigation:r.isNavigationRequest()}));
 context.on('requestfinished',r=>log('requestfinished',{url:r.url()}));
 context.on('requestfailed',r=>log('requestfailed',{url:r.url(),failure:r.failure()}));
 context.on('response',r=>track((async()=>{try{const body=await r.body();log('response',{url:r.url(),status:r.status(),headers:await r.allHeaders(),bytes:body.length,sha256:crypto.createHash('sha256').update(body).digest('hex')});}catch(e){log('response-body-error',{url:r.url(),error:String(e)});}})()));
 context.on('page',page=>{
  const n=id(page);log('page',{page:n,url:page.url()});
  for(const event of ['domcontentloaded','load','close','crash'])page.on(event,()=>log(event,{page:n,url:page.url()}));
  page.on('framenavigated',f=>log('framenavigated',{page:n,url:f.url(),main:f===page.mainFrame()}));
  page.on('console',m=>log('console',{page:n,type:m.type(),text:m.text()}));
  page.on('pageerror',e=>log('pageerror',{page:n,error:String(e)}));
  const wait=page.waitForLoadState.bind(page);
  page.waitForLoadState=async(...args)=>{const start=Date.now();log('wait-start',{page:n,url:page.url(),args});try{const result=await wait(...args);log('wait-end',{page:n,url:page.url(),milliseconds:Date.now()-start});await capture(page,'wait-success');return result;}catch(e){log('wait-error',{page:n,url:page.url(),milliseconds:Date.now()-start,error:String(e),stack:e.stack});await capture(page,'wait-failure');throw e;}};
 });
 await context.addInitScript(()=>{const report=event=>console.debug('__PUDL_DIAGNOSTIC__'+JSON.stringify({event,url:location.href,readyState:document.readyState,time:performance.now()}));report('init');for(const event of ['readystatechange','DOMContentLoaded'])document.addEventListener(event,()=>report(event));for(const event of ['load','beforeunload','pagehide'])window.addEventListener(event,()=>report(event));});
 await context.addInitScript(()=>{
  const send=data=>console.debug('__INPUT_DIAGNOSTIC__'+JSON.stringify(data));
  const target=e=>{const n=e.target?.closest?.('a,[role="menuitem"],button');return n?{tag:n.tagName,id:n.id,text:n.textContent,href:n.getAttribute('href'),resolvedHref:n.href,target:n.getAttribute('target'),rel:n.getAttribute('rel'),connected:n.isConnected,html:n.outerHTML}:null;};
  const snapshot=(e,phase)=>({event:e.type,phase,button:e.button,ctrl:e.ctrlKey,meta:e.metaKey,alt:e.altKey,shift:e.shiftKey,trusted:e.isTrusted,defaultPrevented:e.defaultPrevented,target:target(e),sourceClicks:window.sourceClicks,url:location.href,readyState:document.readyState,time:performance.now()});
  for(const type of ['pointerdown','mousedown','pointerup','mouseup','click','auxclick']){
   window.addEventListener(type,e=>{send(snapshot(e,'window-capture'));queueMicrotask(()=>send(snapshot(e,'capture-microtask')));},true);
   window.addEventListener(type,e=>send(snapshot(e,'window-bubble')));
  }
  const prevent=Event.prototype.preventDefault;
  Event.prototype.preventDefault=function(...args){send({...snapshot(this,'preventDefault-call'),stack:new Error().stack});return Reflect.apply(prevent,this,args);};
 });
}
const launch=pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch=async(...args)=>{
 const b=await launch(...args),contexts=[];log('browser',{version:b.version(),node:process.version,platform:process.platform,os:os.release(),playwright:require('playwright/package.json').version,executable:pw.chromium.executablePath()});
 const create=b.newContext.bind(b);
 const make=async opts=>{const c=await create(opts);contexts.push(c);await instrument(c);return c;};
 b.newContext=make;
 b.newPage=async opts=>{const c=await make(opts);return c.newPage();};
 const close=b.close.bind(b);
 b.close=async(...args)=>{try{for(let i=0;i<contexts.length;i++){const c=contexts[i];for(const p of c.pages())await capture(p,'cleanup');await Promise.allSettled([...pending]);await c.tracing.stop({path:path.join(out,`trace-${i}.zip`)});await c.close();}}finally{await close(...args);log('browser-closed');}};
 return b;
};
