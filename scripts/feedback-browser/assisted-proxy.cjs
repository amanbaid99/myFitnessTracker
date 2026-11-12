/* eslint-disable @typescript-eslint/no-require-imports */
// Local throwaway PostgREST bridge only. No hosted requests.
const http=require('node:http');http.createServer(async(req,res)=>{
 if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','Access-Control-Allow-Headers':req.headers['access-control-request-headers']||'*','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'});return res.end();}
 if(!req.url.startsWith('/rest/v1/')){res.writeHead(200,{'content-type':'application/json','access-control-allow-origin':'*'});return res.end('{}');}
 const chunks=[];for await(const chunk of req)chunks.push(chunk);
 const h={...req.headers};delete h.host;delete h['content-length'];
 const r=await fetch('http://127.0.0.1:55436/'+req.url.slice(9),{method:req.method,headers:h,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
 const headers=Object.fromEntries(r.headers);delete headers['content-length'];delete headers['content-encoding'];res.writeHead(r.status,{...headers,'access-control-allow-origin':'*','access-control-expose-headers':'*'});res.end(Buffer.from(await r.arrayBuffer()));
}).listen(55435,'127.0.0.1');
