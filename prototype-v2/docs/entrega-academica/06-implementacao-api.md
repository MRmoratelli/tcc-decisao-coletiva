# ENG-D06 — Documentação Técnica da Implementação

Processo de decisao · UVA · Engenharia da Computação
Versão 1.0 ·24/11/2026 · Origem RETROSPECTIVO
Commit científico `63189e5f21dd2794f5677894dc6cae04597095f5`.

TCC: Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva. Universidade Veiga de Almeida — Engenharia da Computação. Orientador: Prof. Carlos Alvaro de Macedo Soares Quintella.

## Cliente

src/App.tsx coordena entrada, criação, ingresso e acesso à sala. RoomWorkspace apresenta proposta, posições, histórico, revisão e avaliação. ProposalEditor/InitialProposalForm estruturam os campos; ReviewCard apresenta parecer; FactualPanel apresenta fontes; EvaluationForm aplica o instrumento. src/api.ts centraliza fetch JSON e APIError, com tempo de espera na consulta de vista. A implementação usa estado React e armazena credencial de ingresso em localStorage. Um navegador compartilhado exige cuidado para não transferir o acesso a terceiros. A propriedade não equivale a autenticação federada.

## Servidor

index.ts compõe pool pg, Repository, PostgresProviderBudget, GeminiQueue, GeminiAdapter, FactualService e Express; web.ts serve dist em produção. app.ts valida entrada, origem, papel, projeção e erros. domain.ts contém regras determinísticas. db.ts cuida do acesso e transação. shared contém schemas e instrumento. Definições de dados em ENG-D05.

## Convenções de API

Corpos JSON, limite8MB. Rotas de sala recebem code no caminho e credential no corpo, exceto invitation/join. revision é inteiro positivo quando uma mutação o exige. UUIDs identificam proposta, rodada e alvos. Campos de texto são validados e aparados pelo schema correspondente. A tabela lista as respostas expressas e as falhas centrais do middleware;500 também é possível em falha inesperada, sem consenso presumido. Não é contrato de disponibilidade. Fonte de todas as rotas: server/app.ts, funções createApp/auth/view; contratos em shared/contracts.ts e shared/factual.ts.

|Método|Caminho|Consumidor e permissão|Entrada|Resposta|Códigos previstos|
|---|---|---|---|---|---|
|GET|/api/health|Público|Sem corpo|status,version,commit,aiConfigured,geminiPolicy,factual|200; falha de serviço500|
|POST|/api/ai/proposal-review|Público com consentimento|consent=true,proposal:ProposalContent|review,receipt|200;400;429;502/503|
|POST|/api/rooms|Moderador na criação|proposal,participantCount; parecer/dispensa; campos do contrato de criação|code,moderatorCredential,participants[]|201;400;429|
|POST|/api/import|Criação de processo|ImportSchema com state validado|novos code/acessos|201;400;413;429|
|POST|/api/rooms/:code/invitation|Público|Código de 10 hexadecimais|research,participantCount,open|200;400;404;409|
|POST|/api/rooms/:code/join|Participante|browserCredential:hex64,consent=true,version|alias|200;400;404;409|
|POST|/api/rooms/:code/view|Ambos|credential; knownRevision opcional|RoomView filtrada ou revision/unchanged|200;400;401;403;409|
|POST|/api/rooms/:code/prepare-mediation|Moderador|credential|preparing:true|200;400;401;403;429|
|POST|/api/rooms/:code/contribution-review|Participante|credential,text,proposalId,roundId,consent=true|review,receipt,rewriteReceipt,availableAt,cached|200;400;401;403;409;429;502/503|
|POST|/api/rooms/:code/contributions|Participante|credential,revision,proposalId,roundId,text,originalText,contest; receipt ou bypassReason|saved:true|201;400;401;403;409|
|POST|/api/rooms/:code/votes|Participante|credential,revision,proposalId,roundId,choice,justification; comprovante/dispensa se justifica|saved:true|201;400;401;403;409|
|POST|/api/rooms/:code/analyze-objections|Moderador|credential,revision,consent=true|saved:true|200;400;401;403;409;429;502/503|
|POST|/api/rooms/:code/synthesize|Moderador|credential,revision,consent=true,analysisId|saved:true|200;400;401;403;409;429;502/503|
|POST|/api/rooms/:code/publish|Moderador|credential,revision,proposal,sourceId,confirm=true; synthesisId?,reason,coverage[]|saved:true|200;400;401;403;409|
|POST|/api/rooms/:code/close|Moderador|credential,revision,reason não vazio|saved:true|200;400;401;403;409|
|POST|/api/rooms/:code/contest|Participante|credential,revision,targetId,text|saved:true|201;400;401;403;409|
|POST|/api/rooms/:code/evaluation|Participante|credential,revision,input:EvaluationInput|saved:true|201;400;401;403;409|
|POST|/api/rooms/:code/export|Moderador|credential|format,version,exportedAt,state,metrics,evaluation,provenance|200;400;401;403|
|POST|/api/rooms/:code/evaluation-results|Moderador|credential|estatísticas com denominadores|200;400;401;403|
|POST|/api/rooms/:code/fact-check|Moderador|credential,mode,text4–1200,proposalId,roundId,consent=true|check; cached quando reutilizado|200;400;401;403;409;429|

### Exemplos fictícios de estrutura

```json
{"credential":"<ACESSO_FICTICIO>","revision":1,"proposalId":"00000000-0000-4000-8000-000000000001","roundId":"00000000-0000-4000-8000-000000000002","choice":"ACEITO","justification":""}
```
A amostra descreve o contrato; não foi enviada. Uma rejeição precisa de texto e do fluxo de parecer ou dispensa correspondente. Campos de proposta são title,problem,decision,goals,alternatives,constraints,successCriteria,context,text. EvaluationInput possui instrumentVersion,answers[22],open[4],consent e metadados de variante. Não enviar esses exemplos a uma sala real.

## Integração IA

GeminiAdapter recebe proposta, contribuição ou conjunto atual de manifestações e produz Review, Assessment ou SynthesisResult. Modelo padrão no código gemini-3.5-flash-lite; GEMINI_MODEL pode configurá-lo. Prompt versionado consensus-consultive-v2.9-decision-progress. Review inclui limitações e reformulação sugerida. Assessment conserva trechos e vínculos. Síntese declara mudanças, atendimento sugerido e pendências. Zod e verificações de IDs/citações limitam erros estruturais; não comprovam fidelidade semântica. A fila Gemini controla chamadas e utiliza ledger compartilhado. O usuário pode manter o original ou continuar sem parecer quando o fluxo permite. Só o moderador publica, só os participantes votam.

## Factual

FactualService recupera resultados Tavily e usa Gemini para interpretação. Mantém URLs, trechos, proveniência e vínculos. Alegações mínimas e consentimento são exigidos, com rejeição heurística de conteúdo privado. O ledger em dc2_provider_budget controla reservas. A propriedade heurística pode falhar. A função foi demonstrada tecnicamente antes da coleta; houve zero consultas na sessão real, conforme registro científico já conferido.

## Instalação e configuração documentadas

Node >= 22.12.0; PostgreSQL isolado; lockfile do SHA. A sequência existente é `cd prototype-v2`, `npm ci`, `npm run migrate`, `npm run dev` para desenvolvimento ou `npm run build` e `npm start` para produção. As migrações só devem ser usadas em ambiente V2 isolado previamente autorizado. Esta documentação não executou instalação, migração, testes ou deploy. Em produção, frontend e API usam a mesma origem.

Nomes de variáveis: DATABASE_URL_V2,V2_DATABASE_ISOLATED,AUTH_PEPPER,REVIEW_SIGNING_KEY,PORT/API_PORT,API_HOST,PUBLIC_ORIGIN,RENDER_EXTERNAL_URL,NODE_ENV,APP_COMMIT/RENDER_GIT_COMMIT,GEMINI_API_KEY,GEMINI_MODEL,FACTUAL_SEARCH_ENABLED,FACTUAL_FREE_TIER_CONFIRMED,TAVILY_API_KEY,TAVILY_RESEARCHER_CONFIRMED. Não colocar valores privados no repositório. runtime.ts exige pepper e signingKey distintos com no mínimo32 caracteres e origem HTTPS em produção. Configuração e disponibilidade de terceiros não garantem precisão ou permanência do serviço.
