import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
export function serveFrontend(app:express.Express,directory:string){
 const root=resolve(directory),index=resolve(root,'index.html');
 if(!existsSync(index))throw new Error('Frontend compilado ausente. Execute npm run build.');
 app.use('/api',(_req,res)=>res.status(404).json({error:'Rota de API inexistente.'}));
 app.use(express.static(root,{dotfiles:'deny',index:false,fallthrough:true}));
 app.get(/^(?!\/api(?:\/|$)).*/,(_req,res)=>res.set('Cache-Control','no-store').sendFile(index));
}
