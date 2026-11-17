export type Review = {
  relevance: 'RELACIONADA' | 'PARCIAL' | 'DESALINHADA' | 'INDETERMINADA';
  summary: string;
  recommendations: string[];
  assertions: Array<{text:string;status:'COMPATIVEL_COM_CONTEXTO'|'PRECISA_DE_FONTE'|'NAO_VERIFICAVEL';note:string}>;
  limitations: string[];
};
export type ReviewResult={review:Review;receipt:string};
export type CreatedRoom={code:string;moderatorCredential:string;participants:Array<{alias:string;credential:string}>};
export type RoomView={
  room:{id:string;code:string;topic:string;proposal:string;proposal_review:Review};
  role:'moderator'|'participant';alias:string|null;canViewGroup:boolean;
  contributions:Array<{id:string;alias:string;text:string;review:Review;user_choice:string;created_at:string}>;
};
export async function request<T>(path:string,body?:unknown):Promise<T>{
  const response=await fetch('/api'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  let result:unknown;
  try{result=await response.json();}catch{throw new Error('Servidor não retornou resposta JSON.');}
  if(!response.ok){
    const error=result as {error?:string};
    throw new Error(error.error||'Falha na comunicação com o servidor.');
  }
  return result as T;
}
