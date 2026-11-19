import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ImportSchema,validateState,metrics,type State } from './domain.js';
import { openItems,displayedOpenItems } from '../shared/instrument.js';
export function cohortReport(states:State[]){
 const unique=[...new Map(states.map(s=>[s.decision.originId,s])).values()];
 const closed=unique.filter(s=>s.decision.status!=='OPEN');
 return {processes:unique.length,duplicatesExcluded:states.length-unique.length,completed:closed.length,
 consensusRate:closed.length?closed.filter(s=>s.decision.status==='CONSENSUS').length/closed.length:null,
 denominator:'Processos concluídos únicos por originId; processos abertos não entram no denominador.',
 sessions:unique.map(s=>({originId:s.decision.originId,...metrics(s),instrumentVersions:[...new Set(s.evaluations.map(e=>e.input.instrumentVersion))]})),
 openCoding:openItems.map((question,i)=>({question:'A'+(i+1),text:question,wording:'Consultar texto e versão de cada resposta; A4 adaptada não é automaticamente equivalente à original.',responses:unique.flatMap(s=>s.evaluations.map(e=>({originId:s.decision.originId,alias:s.participants.find(p=>p.id===e.participantId)!.alias,instrumentVersion:e.input.instrumentVersion,questionText:displayedOpenItems(e.input.instrumentVersion)[i],applicationContext:e.applicationContext??null,text:e.input.open[i],humanCodes:[],analystMemo:''}))),thematicSummary:null})),
 caveat:'Relatório descritivo. Não demonstra causalidade, validade psicométrica ou qualidade da decisão. Codificação temática e qualidade argumentativa requerem avaliação humana definida.'};
}
if(process.argv[1]?.endsWith('cohort.ts')){
 const [output,...inputs]=process.argv.slice(2);if(!output||!inputs.length)throw new Error('Uso: npm run report:cohort -- relatorio.json export1.json export2.json');
 const states=[];for(const input of inputs){const parsed=ImportSchema.parse(JSON.parse(await readFile(resolve(input),'utf8')));states.push(validateState(parsed.state));}
 await writeFile(resolve(output),JSON.stringify(cohortReport(states),null,2)+'\n');console.log('Relatório descritivo gerado com arquivos fornecidos.');
}
