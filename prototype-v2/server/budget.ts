import {randomUUID} from 'node:crypto';
import type {SQLPool} from './db.js';
export type BudgetKind='search'|'gemini';
export type BudgetLimits={daily:number;minute:number;monthly?:number;concurrent:number};
type Counter={day:string;month:string;calls:number;monthly:number;minute:number[]};
export type BudgetState={search:Counter;gemini:Counter;leases:Array<{id:string;until:number}>};
export const emptyBudget=():BudgetState=>({search:{day:'',month:'',calls:0,monthly:0,minute:[]},gemini:{day:'',month:'',calls:0,monthly:0,minute:[]},leases:[]});
export interface ProviderBudget {readonly persistent:boolean;reserve(kind:BudgetKind,limits:BudgetLimits):Promise<()=>Promise<void>>;}
export function reserveBudget(state:BudgetState,kind:BudgetKind,limits:BudgetLimits,now:number){
 const day=new Date(now).toISOString().slice(0,10),month=day.slice(0,7),c=state[kind];
 if(c.day!==day){c.day=day;c.calls=0;}if(c.month!==month){c.month=month;c.monthly=0;}
 c.minute=c.minute.filter(t=>t>now-60000);state.leases=state.leases.filter(l=>l.until>now);
 if(c.calls>=limits.daily)throw Error(kind==='search'?'LOCAL_SEARCH_LIMIT':'LOCAL_GEMINI_DAILY_LIMIT');
 if(c.minute.length>=limits.minute)throw Error(kind==='search'?'LOCAL_SEARCH_LIMIT':'LOCAL_GEMINI_LIMIT');
 if(limits.monthly!==undefined&&c.monthly>=limits.monthly)throw Error('LOCAL_SEARCH_MONTHLY_LIMIT');
 if(state.leases.length>=limits.concurrent)throw Error('LOCAL_EXTERNAL_CONCURRENCY_LIMIT');
 // Reserve before transmission. Failures/ambiguous charges are never refunded or retried automatically.
 c.calls++;c.monthly++;c.minute.push(now);const id=randomUUID();state.leases.push({id,until:now+90000});return id;
}
export class MemoryProviderBudget implements ProviderBudget {
 readonly persistent=false;private state=emptyBudget();
 constructor(private now=Date.now){}
 async reserve(kind:BudgetKind,limits:BudgetLimits){const id=reserveBudget(this.state,kind,limits,this.now());return async()=>{this.state.leases=this.state.leases.filter(l=>l.id!==id);};}
}
export class PostgresProviderBudget implements ProviderBudget {
 readonly persistent=true;
 constructor(private pool:SQLPool){}
 private async change<T>(work:(state:BudgetState,now:number)=>T){
  const c=await this.pool.connect();try{await c.query('BEGIN');
   const row=(await c.query("SELECT state, EXTRACT(EPOCH FROM clock_timestamp())*1000 AS ms FROM dc2_provider_budget WHERE id=1 FOR UPDATE")).rows[0];
   if(!row)throw Error('PERSISTENT_BUDGET_UNAVAILABLE');
   const state=row.state as BudgetState,result=work(state,Number(row.ms));
   await c.query('UPDATE dc2_provider_budget SET state=$1,updated_at=NOW() WHERE id=1',[JSON.stringify(state)]);await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async reserve(kind:BudgetKind,limits:BudgetLimits){
  let id:string;try{id=await this.change((s,now)=>reserveBudget(s,kind,limits,now));}catch(e){if(e instanceof Error&&e.message.startsWith('LOCAL_'))throw e;throw Error('PERSISTENT_BUDGET_UNAVAILABLE');}
  return async()=>{try{await this.change(s=>{s.leases=s.leases.filter(l=>l.id!==id);});}catch{/* Lease expires; keep consumed reservation and fail closed on next unavailable reservation. */}};
 }
}
