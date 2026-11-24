# ENG-D04 — Modelagem Estrutural e Comportamental

Processo de decisao · UVA · Engenharia da Computação
Versão1.0 ·24/11/2026 · Origem RETROSPECTIVO
Commit científico `63189e5f21dd2794f5677894dc6cae04597095f5`.

## Correspondência com TypeScript

State é type inferido de StateSchema. Proposal, Round, Vote, Analysis e Synthesis são schemas Zod internos, não classes implementadas. ProposalContent, Review, Assessment e SynthesisResult são tipos inferidos dos contratos. DomainError é classe real que estende Error, com status e code. Repository é classe de persistência com create, join, authorize, read, latestRevision e mutate. GeminiAdapter e FactualService são classes reais de integração. O diagrama F06 utiliza estereótipos para impedir a leitura desses objetos de domínio como classes concretas.

## Atributos e relações

Proposta tem id, version, parentId, content e intervention opcional. Round guarda proposalId e número; Vote aponta participante, rodada e proposta. Analysis registra sourceFingerprint. Synthesis aponta analysisId e proposta publicada opcional. O estado contém arrays dessas estruturas e uma Decision. As cardinalidades de participantes e de versões vêm do schema e dos invariantes, sem impor um esquema relacional inexistente. A coleção participants tem2–30 elementos. proposals e rounds têm ao menos um elemento. A referência parentId é nula apenas na proposta inicial. UUIDs estabelecem os vínculos.

### F06 — Tipos e classe de domínio

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte versionável em [diagramas/F06.puml](diagramas/F06.puml). Representação visual em processo de verificação; conferir o estado no catálogo de figuras.

### F09 — Sequência de ingresso e voto

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte versionável em [diagramas/F09.puml](diagramas/F09.puml). Representação visual em processo de verificação; conferir o estado no catálogo de figuras.

### F10 — Sequência da assistência e publicação

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte versionável em [diagramas/F10.puml](diagramas/F10.puml). Representação visual em processo de verificação; conferir o estado no catálogo de figuras.

### F11 — Atividade da deliberação

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte versionável em [diagramas/F11.puml](diagramas/F11.puml). Representação visual em processo de verificação; conferir o estado no catálogo de figuras.

### F12 — Estados efetivos da decisão

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte versionável em [diagramas/F12.puml](diagramas/F12.puml). Representação visual em processo de verificação; conferir o estado no catálogo de figuras.

## Responsabilidades das sequências

F09 mostra ingresso e voto, sem representar a emissão de alias como autenticação irrestrita. A credencial é validada pelo Repository, e o voto passa por mutate, que controla revisão. F10 condensa chamadas externas e gravações. A análise e a síntese podem ser preparadas automaticamente pelo servidor após manifestações, mas continuam privadas até publicação humana. Erros502/503 e conflito409 interrompem o fluxo e não autorizam decisão automática.

## Estados e atividade

A decisão tem somente OPEN, CONSENSUS e CLOSED_WITHOUT_CONSENSUS. A rodada usa OPEN/CLOSED. RUNNING, READY e FAILED são estados da preparação de mediação. O F12 é retrospectivo e substitui a representação de ‘Análise’ como estado da decisão. O ciclo F11 admite revisão manual ou assistência consultiva. Encerramento sem consenso exige razão. Não existe transição de reabertura para decisão encerrada.

## Fonte e limitação

Fontes server/domain.ts (StateSchema, vote, publish), server/app.ts, server/db.ts e shared/contracts.ts no SHA científico. O modelo é explicativo, não código gerado nem documentação comprovadamente usada no início do desenvolvimento.
