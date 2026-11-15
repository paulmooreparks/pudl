const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT_DIR=path.resolve(__dirname,'..'),PORT=25331;
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain; charset=utf-8'};
const log=data=>fs.appendFileSync(path.join(__dirname,'server.jsonl'),JSON.stringify({time:new Date().toISOString(),...data})+'\n');
let serial=0;
const server=http.createServer((req,res)=>{
 const id=++serial,url=new URL(req.url,'http://localhost');let file=path.join(ROOT_DIR,decodeURIComponent(url.pathname));log({id,event:'request',url:req.url,file});
 res.on('finish',()=>log({id,event:'finish',status:res.statusCode}));res.on('close',()=>log({id,event:'close',finished:res.writableFinished}));res.on('error',e=>log({id,event:'response-error',error:String(e)}));
 if(!file.startsWith(ROOT_DIR)){res.writeHead(403);res.end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 fs.readFile(file,(err,data)=>{if(err){log({id,event:'read-error',error:String(err)});res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;}
 const type=TYPES[path.extname(file)]||'application/octet-stream';log({id,event:'response',status:200,file,type,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});res.writeHead(200,{'Content-Type':type});res.end(data);});
});
// Observe parser errors without adding a clientError handler or changing
// the tagged server's default socket handling.
const emit=server.emit;server.emit=function(event,...args){if(event==='clientError')log({event,error:String(args[0])});return emit.call(this,event,...args);};
server.listen(PORT,'127.0.0.1',()=>log({event:'listening',port:PORT}));
