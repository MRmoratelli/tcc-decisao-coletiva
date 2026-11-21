import {AsyncLocalStorage} from 'node:async_hooks';
import type {ProviderBudget} from './budget.js';
export const GEMINI_WINDOW_LIMIT=14;
export const GEMINI_WINDOW_MS=60000;
const status=new AsyncLocalStorage<((waiting:boolean)=>Promise<void>)>();
export const withAIQueueStatus=<T>(listener:(waiting:boolean)=>Promise<void>,work:()=>Promise<T>)=>status.run(listener,work);
export class QueueFailure extends Error{constructor(public code:string){super(code);}}
type Task={priority:number;at:number;work:()=>Promise<unknown>;resolve:(v:any)=>void;reject:(e:unknown)=>void;notify?:((waiting:boolean)=>Promise<void>);notified:boolean};
export class GeminiQueue{
 private tasks:Task[]=[];private running=false;private lastStart=-Infinity;
 constructor(private budget:ProviderBudget,private options:{now?:()=>number;sleep?:(ms:number)=>Promise<void>;daily?:number;maxWaitMs?:number}={}){}
 run<T>(priority:number,work:()=>Promise<T>):Promise<T>{
  return new Promise<T>((resolve,reject)=>{this.tasks.push({priority,work,resolve,reject,at:this.now(),notify:status.getStore(),notified:false});void this.drain();});
 }
 private now(){return (this.options.now??Date.now)();}
 private sleep(ms:number){return (this.options.sleep??((n:number)=>new Promise<void>(r=>setTimeout(r,n))))(ms);}
 private async drain(){
  if(this.running)return;this.running=true;
  try{while(this.tasks.length){
   this.tasks.sort((a,b)=>a.priority-b.priority||a.at-b.at);const task=this.tasks[0];
   if(this.now()-task.at>(this.options.maxWaitMs??180000)){this.tasks.shift();task.reject(new QueueFailure('QUEUE_TIMEOUT'));continue;}
   const spacing=4300-(this.now()-this.lastStart);
   if(spacing>0){if(!task.notified){task.notified=true;await task.notify?.(true).catch(()=>{});}await this.sleep(Math.min(spacing,1000));continue;}
   let release:(()=>Promise<void>)|undefined;
   try{release=await this.budget.reserve('gemini',{minute:GEMINI_WINDOW_LIMIT,daily:this.options.daily??250,concurrent:1});}
   catch(e){
    const code=e instanceof Error?e.message:'PERSISTENT_BUDGET_UNAVAILABLE';
    if(['LOCAL_GEMINI_LIMIT','LOCAL_EXTERNAL_CONCURRENCY_LIMIT'].includes(code)){if(!task.notified){task.notified=true;await task.notify?.(true);}await this.sleep(1000);continue;}
    this.tasks.shift();task.reject(new QueueFailure(code));continue;
   }
   this.tasks.shift();this.lastStart=this.now();
   try{if(task.notified)await task.notify?.(false).catch(()=>{});task.resolve(await task.work());}catch(e){task.reject(e);}finally{await release();}
  }}finally{this.running=false;if(this.tasks.length)void this.drain();}
 }
}
