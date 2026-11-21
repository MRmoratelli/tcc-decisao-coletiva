import type { State } from '../server/domain';
import type { Review } from '../shared/contracts';
export type { Review };
export type ReviewResult={review:Review;receipt:string;rewriteReceipt?:string|null};
export type CreatedRoom={code:string;moderatorCredential:string;participants:Array<{alias:string;credential:string}>};
export type RoomView={
 revision:number;room:{id:string;code:string;topic:string;proposal:string;proposal_review:Review|null};
 role:'moderator'|'participant';alias:string|null;participantId:string|null;canViewGroup:boolean;state:State;
 positions:Array<{id:string;alias:string;choice:string}>;
 metrics:unknown;contributions:Array<{id:string;alias:string;text:string;review:Review|null;user_choice:string;created_at:string}>;
};
export type RoomSyncResponse=RoomView|{revision:number;unchanged:true};
export class APIError extends Error {
 constructor(message:string,public status:number,public code?:string,public attempts?:number){super(message);this.name='APIError';}
}
export async function request<T>(path:string,body?:unknown):Promise<T>{
 const response=await fetch('/api'+path,{...(path.endsWith('/view')?{signal:AbortSignal.timeout(15000)}:{}),method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 let result:unknown;try{result=await response.json();}catch{throw new Error('Servidor não retornou resposta JSON.');}
 if(!response.ok)throw new APIError((result as {error?:string}).error||'Falha na comunicação com o servidor.',response.status,(result as {code?:string}).code,(result as {attempts?:number}).attempts);
 return result as T;
}
export function downloadJSON(value:unknown,name:string){
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

