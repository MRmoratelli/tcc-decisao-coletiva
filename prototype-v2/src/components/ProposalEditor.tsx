import type { ProposalContent } from '../../shared/contracts';
export const emptyProposal:ProposalContent={title:'',problem:'',decision:'',text:'',goals:'',alternatives:'',constraints:'',successCriteria:'',context:''};
export function ProposalEditor({value,onChange,disabled=false}:{value:ProposalContent;onChange:(p:ProposalContent)=>void;disabled?:boolean}){
 const field=(key:keyof ProposalContent,label:string,required=false)=><label key={key}>{label}{key==='title'?<input disabled={disabled} value={value[key]} required={required} minLength={3} maxLength={180} onChange={e=>onChange({...value,[key]:e.target.value})}/>:<textarea disabled={disabled} value={value[key]} required={required} minLength={required?4:undefined} maxLength={5000} rows={key==='text'?5:2} onChange={e=>onChange({...value,[key]:e.target.value})}/>}</label>;
 return <div className="proposal-editor">{field('title','Título',true)}{field('problem','Problema',true)}{field('decision','Decisão pretendida',true)}{field('text','Proposta inicial ou revisada',true)}
 <details><summary>Contexto e critérios opcionais</summary>{field('goals','Objetivos')}{field('alternatives','Alternativas consideradas')}{field('constraints','Restrições')}{field('successCriteria','Critérios de sucesso')}{field('context','Contexto adicional')}</details></div>;
}
