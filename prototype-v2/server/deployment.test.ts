import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runtimeConfig } from './runtime.js';
import { serveFrontend } from './web.js';
const env={DATABASE_URL_V2:'postgresql://test@isolated/db',V2_DATABASE_ISOLATED:'true',AUTH_PEPPER:'a'.repeat(40),REVIEW_SIGNING_KEY:'b'.repeat(40)};
test('deploy: porta da plataforma, bind público e origem HTTPS de mesma origem',()=>{
 const c=runtimeConfig({...env,NODE_ENV:'production',PORT:'10000',RENDER_EXTERNAL_URL:'https://v2.example.test',RENDER_GIT_COMMIT:'synthetic-sha'});
 assert.equal(c.port,10000);assert.equal(c.host,'0.0.0.0');assert.equal(c.origin,'https://v2.example.test');assert.equal(c.commit,'synthetic-sha');
 assert.throws(()=>runtimeConfig({...env,NODE_ENV:'production'}));assert.throws(()=>runtimeConfig({...env,NODE_ENV:'production',PUBLIC_ORIGIN:'http://v2.example.test'}));assert.throws(()=>runtimeConfig({...env,V2_DATABASE_ISOLATED:'false'}));
});
test('deploy: frontend e SPA são servidos; API ausente continua JSON 404',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'dc2-web-'));await writeFile(join(dir,'index.html'),'<html><body>React V2 build test</body></html>');
 const app=express();app.get('/api/health',(_req,res)=>res.json({status:'ok'}));serveFrontend(app,dir);const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 try{const a=server.address();if(!a||typeof a==='string')throw new Error('server');const base='http://127.0.0.1:'+a.port;
 assert.ok((await (await fetch(base+'/')).text()).includes('React V2'));assert.ok((await (await fetch(base+'/sala/teste')).text()).includes('React V2'));
 const missing=await fetch(base+'/api/missing');assert.equal(missing.status,404);assert.match(missing.headers.get('content-type')??'',/json/);assert.deepEqual(await (await fetch(base+'/api/health')).json(),{status:'ok'});}
 finally{await new Promise<void>(r=>server.close(()=>r()));await rm(dir,{recursive:true});}
});
