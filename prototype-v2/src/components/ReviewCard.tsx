import type { Review } from '../api';
const relevanceLabels:Record<Review['relevance'],string>={
  RELACIONADA:'Relacionada ao tema',PARCIAL:'Parcialmente relacionada',
  DESALINHADA:'Possivelmente fora do escopo',INDETERMINADA:'Pertinência incerta',
};

export function ReviewCard({review,label}:{review:Review;label:string}){
  return <section className="review" aria-label={label}>
    <div className="review-head"><span>Parecer consultivo de IA</span><strong>{relevanceLabels[review.relevance]}</strong></div>
    <p>{review.summary}</p>
    {review.recommendations.length>0&&<><h4>Perguntas e sugestões de melhoria</h4><ul>{review.recommendations.map((x,i)=><li key={i}>{x}</li>)}</ul></>}
    {review.assertions.length>0&&<><h4>Afirmações que merecem atenção</h4><ul>{review.assertions.map((a,i)=><li key={i}><strong>{a.text}</strong> — {a.note} <span className="muted">({a.status.replaceAll('_',' ').toLowerCase()})</span></li>)}</ul></>}
    {review.limitations.length>0&&<p className="muted">Limitações: {review.limitations.join(' · ')}</p>}
    {review.clarity&&<p>Clareza: {review.clarity}</p>}
    {(['biasFlags','assumptions','missingInfo','questions','uncertainties'] as const).map(key=>review[key]?.length>0&&<p key={key}><b>{{biasFlags:'Possíveis vieses',assumptions:'Pressupostos',missingInfo:'Informações ausentes',questions:'Perguntas construtivas',uncertainties:'Incertezas'}[key]}</b>: {review[key].join('; ')}</p>)}
    {review.suggestedRewrite&&<><h4>Reformulação sugerida</h4><p>{review.suggestedRewrite}</p></>}
    <p className="disclaimer">Este parecer não é um julgamento definitivo de pertinência ou veracidade. A IA pode errar; a decisão é das pessoas.</p>
  </section>;
}

