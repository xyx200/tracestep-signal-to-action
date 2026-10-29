/* Optional local preview. No installation required. Bound only to loopback. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server = http.createServer((req,res)=>{
  let target;
  try { const raw = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); target = path.resolve(root, '.' + (raw==='/'?'/index.html':raw)); }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  if (target!==root && !target.startsWith(root+path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405);res.end('Method not allowed');return; }
  fs.readFile(target,(err,data)=>{
    if(err){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:data);
  });
});
server.on('error',err=>{console.error('Preview failed:',err.message);process.exitCode=1;});
server.listen(0,'127.0.0.1',()=>console.log(`TraceStep preview: http://127.0.0.1:${server.address().port} (auto-stops after 10 minutes; PID ${process.pid})`));
const timer = setTimeout(()=>server.close(()=>process.exit(0)),10*60*1000);timer.unref();
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
