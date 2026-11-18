import { useState, type FormEvent } from 'react';
import { dimensions,items,openItems,scale } from '../../shared/instrument';
import { INSTRUMENT_VERSION, type EvaluationInput } from '../../shared/contracts';
export function EvaluationForm({onSubmit,busy}:{onSubmit:(input:EvaluationInput)=>Promise<void>;busy:boolean}){
 const [answers,setAnswers]=useState<EvaluationInput['answers']>(Array(22).fill(null)),[open,setOpen]=useState<string[]>(Array(4).fill('')),[consent,setConsent]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();if(consent)await onSubmit({instrumentVersion:INSTRUMENT_VERSION,answers,open,consent:true});}
 return <section className="evaluation"><h3>Avaliação individual pós-sessão</h3><p>Instrumento preliminar de 16/11/2026, sem validação psicométrica demonstrada. Participação voluntária. Deixe em branco o que não desejar responder. N/A é registrado separadamente de ausência.</p><p>1 = Discordo totalmente; 2 = Discordo; 3 = Nem concordo nem discordo; 4 = Concordo; 5 = Concordo totalmente; N/A = Não se aplica.</p>
 <form onSubmit={submit}>{dimensions.map(d=><fieldset key={d.name}><legend>{d.name}</legend>{items.slice(d.from,d.to).map((text,j)=>{const i=d.from+j;return <label key={i}>{String(i+1).padStart(2,'0')}. {text}<select value={answers[i]??''} onChange={e=>setAnswers(answers.map((a,n)=>n!==i?a:e.target.value===''?null:e.target.value==='N/A'?'N/A':Number(e.target.value)))}><option value="">Sem resposta</option>{scale.map((s,n)=><option key={n} value={n+1}>{n+1} — {s}</option>)}<option>N/A</option></select></label>;})}</fieldset>)}
 {openItems.map((text,i)=><label key={text}>A{i+1}. {text}<textarea maxLength={5000} value={open[i]} onChange={e=>setOpen(open.map((v,j)=>j===i?e.target.value:v))}/></label>)}
 <label className="check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Participo voluntariamente e autorizo o registro das respostas pseudonimizadas conforme o protocolo apresentado pelo pesquisador.</label>
 <button className="primary" disabled={busy||!consent}>Enviar avaliação individual</button></form></section>;
}
