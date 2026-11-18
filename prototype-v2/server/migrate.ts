import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
export async function migrate(client:{query:(sql:string,values?:any[])=>Promise<any>}){
 await client.query('BEGIN');
 try{
  await client.query('CREATE TABLE IF NOT EXISTS dc2_migrations (version VARCHAR(80) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  for(const version of ['001_remote_rooms','002_consensus']){
   const sql=await readFile(new URL('./migrations/'+version+'.sql',import.meta.url),'utf8');
   const checksum=createHash('sha256').update(sql).digest('hex');
   const existing=await client.query('SELECT checksum FROM dc2_migrations WHERE version=$1',[version]);
   if(existing.rows[0]&&existing.rows[0].checksum!==checksum)throw new Error('Migração aplicada possui checksum diferente: '+version);
   if(!existing.rows.length){await client.query(sql);await client.query('INSERT INTO dc2_migrations(version,checksum) VALUES($1,$2)',[version,checksum]);}
  }
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}
}
if(process.argv[1]?.endsWith('migrate.ts')){
 if(process.env.V2_DATABASE_ISOLATED!=='true'||!process.env.DATABASE_URL_V2)throw new Error('Configure uma base V2 NOVA e V2_DATABASE_ISOLATED=true. Não reutilize a base histórica.');
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL_V2,max:1});const client=await pool.connect();
 try{await migrate(client);console.log('Migrações aditivas 001/002 aplicadas.');}finally{client.release();await pool.end();}
}
