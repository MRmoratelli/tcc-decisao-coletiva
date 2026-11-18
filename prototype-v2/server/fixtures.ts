import { ProposalSchema,ReviewSchema } from '../shared/contracts.js';
import { GeminiAdapter, AIUnavailable, type AIAdapter } from './ai.js';
import type { Assessment, SynthesisResult } from '../shared/contracts.js';
export const proposal=ProposalSchema.parse({title:'Prioridades da equipe',problem:'Há tarefas concorrentes e capacidade limitada.',decision:'Definir a ordem de execução do projeto.',text:'Priorizar a acessibilidade antes da próxima funcionalidade.',goals:'Entregar com acesso amplo.'});
export const review=ReviewSchema.parse({relevance:'RELACIONADA',summary:'Parecer sintético de teste; não é resultado Gemini.',recommendations:['Esclareça o prazo.'],assertions:[{text:'A capacidade é limitada.',status:'COMPATIVEL_COM_CONTEXTO',note:'Somente o contexto informado.'}],limitations:['Sem consulta a fontes externas.'],clarity:'Objetivo compreensível.',questions:['Qual o prazo?'],suggestedRewrite:'Priorizar acessibilidade e revisar o prazo com a equipe.'});
export class FakeAI implements AIAdapter{
 model='synthetic-test-only';fail=false;
 async analyzeProposal(){if(this.fail)throw new AIUnavailable('TRANSPORT');return review;}
 async analyzeContribution(){return this.analyzeProposal();}
 async analyzeObjections(_p:unknown,votes:any[]):Promise<Assessment>{if(this.fail)throw new AIUnavailable('TRANSPORT');return {individualAssessments:votes.filter(v=>v.choice==='REJEITO').map(v=>({voteId:v.id,relevance:'Pertinente',explanation:'Discordância preservada.',quotedExcerpt:v.justification,premises:[],evidence:[],risks:[],uncertainty:'Não verificada.'})),sharedInterests:['Entregar o projeto'],convergences:[],conflicts:['Prazo'],incompatibleObjections:[],nonNegotiableConditions:[],uncertainties:['Capacidade não comprovada']};}
 async synthesizeProposal(p:any,a:Assessment):Promise<SynthesisResult>{return {revisedProposal:{...p,text:p.text+' Revisar o prazo após avaliar capacidade.'},changeLog:a.individualAssessments.map(x=>({change:'Revisar prazo',reason:'Preocupação apresentada',voteIds:[x.voteId]})),addressedObjections:[],partiallyAddressedObjections:a.individualAssessments.map(x=>x.voteId),unresolvedObjections:[],remainingImpasses:['Prazo ainda requer confirmação'],feasibilityWarnings:['Validar capacidade']};}
}
export function jsonAdapter(body:unknown){return new GeminiAdapter('synthetic-validated',async()=>JSON.stringify(body));}
