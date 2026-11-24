# ENG-D04 — Modelagem Estrutural e Comportamental

Processo de decisao · UVA · Engenharia da Computação
Versão 1.0 ·24/11/2026 · Origem RETROSPECTIVO
Commit científico `63189e5f21dd2794f5677894dc6cae04597095f5`.

TCC: Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva. Universidade Veiga de Almeida — Engenharia da Computação. Orientador: Prof. Carlos Alvaro de Macedo Soares Quintella.

## Correspondência com TypeScript

State é type inferido de StateSchema. Proposal, Round, Vote, Analysis e Synthesis são schemas Zod internos, não classes implementadas. ProposalContent, Review, Assessment e SynthesisResult são tipos inferidos dos contratos. DomainError é classe real que estende Error, com status e code. Repository é classe de persistência com create, join, authorize, read, latestRevision e mutate. GeminiAdapter e FactualService são classes reais de integração. O diagrama F06 utiliza estereótipos para impedir a leitura desses objetos de domínio como classes concretas.

## Atributos e relações

Proposta tem id, version, parentId, content e intervention opcional. Round guarda proposalId e número; Vote aponta participante, rodada e proposta. Analysis registra sourceFingerprint. Synthesis aponta analysisId e proposta publicada opcional. O estado contém arrays dessas estruturas e uma Decision. As cardinalidades de participantes e de versões vêm do schema e dos invariantes, sem impor um esquema relacional inexistente. A coleção participants tem2–30 elementos. proposals e rounds têm ao menos um elemento. A referência parentId é nula apenas na proposta inicial. UUIDs estabelecem os vínculos.

### F06 — Tipos e classe de domínio

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F06.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F06 Tipos e classe de domínio](https://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/MRmoratelli/tcc-decisao-coletiva/9b15c14928e6a28ba0408f5a1aba5b9b04a88416/prototype-v2/docs/entrega-academica/diagramas/F06.puml)

Legenda sugerida — Tipos e classe de domínio. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

### F09 — Sequência de ingresso e voto

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F09.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F09 Sequência de ingresso e voto](https://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/MRmoratelli/tcc-decisao-coletiva/9b15c14928e6a28ba0408f5a1aba5b9b04a88416/prototype-v2/docs/entrega-academica/diagramas/F09.puml)

Legenda sugerida — Sequência de ingresso e voto. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

### F10 — Sequência da assistência e publicação

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F10.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F10 Sequência da assistência e publicação](https://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/MRmoratelli/tcc-decisao-coletiva/9b15c14928e6a28ba0408f5a1aba5b9b04a88416/prototype-v2/docs/entrega-academica/diagramas/F10.puml)

Legenda sugerida — Sequência da assistência e publicação. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

### F11 — Atividade da deliberação

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F11.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F11 Atividade da deliberação](https://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/MRmoratelli/tcc-decisao-coletiva/9b15c14928e6a28ba0408f5a1aba5b9b04a88416/prototype-v2/docs/entrega-academica/diagramas/F11.puml)

Legenda sugerida — Atividade da deliberação. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

### F12 — Estados efetivos da decisão

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F12.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F12 Estados efetivos da decisão](https://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/MRmoratelli/tcc-decisao-coletiva/9b15c14928e6a28ba0408f5a1aba5b9b04a88416/prototype-v2/docs/entrega-academica/diagramas/F12.puml)

Legenda sugerida — Estados efetivos da decisão. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

## Responsabilidades das sequências

F09 mostra ingresso e voto, sem representar a emissão de alias como autenticação irrestrita. A credencial é validada pelo Repository, e o voto passa por mutate, que controla revisão. F10 condensa chamadas externas e gravações. A análise e a síntese podem ser preparadas automaticamente pelo servidor após manifestações, mas continuam privadas até publicação humana. Erros502/503 e conflito409 interrompem o fluxo e não autorizam decisão automática.

## Estados e atividade

A decisão tem somente OPEN, CONSENSUS e CLOSED_WITHOUT_CONSENSUS. A rodada usa OPEN/CLOSED. RUNNING, READY e FAILED são estados da preparação de mediação. O F12 é retrospectivo e substitui a representação de ‘Análise’ como estado da decisão. O ciclo F11 admite revisão manual ou assistência consultiva. Encerramento sem consenso exige razão. Não existe transição de reabertura para decisão encerrada.

## Fonte e limitação

Fontes server/domain.ts (StateSchema, vote, publish), server/app.ts, server/db.ts e shared/contracts.ts no SHA científico. O modelo é explicativo, não código gerado nem documentação comprovadamente usada no início do desenvolvimento.

## F13 — Interfaces e classe de persistência

As interfaces SQLPool e SQLClient descrevem consultas/conexões. Repository é classe real e utiliza SQLPool. Os métodos aparecem no código server/db.ts. A representação omite assinaturas privadas para legibilidade.

![F13 Interfaces e classe de persistência](https://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/MRmoratelli/tcc-decisao-coletiva/9b15c14928e6a28ba0408f5a1aba5b9b04a88416/prototype-v2/docs/entrega-academica/diagramas/F13.puml)

[Fonte editável](diagramas/F13.puml). Origem retrospectiva.

## Referências técnicas verificáveis

- [shared/contracts.ts](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/63189e5f21dd2794f5677894dc6cae04597095f5/prototype-v2/shared/contracts.ts)
- [server/domain.ts](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/63189e5f21dd2794f5677894dc6cae04597095f5/prototype-v2/server/domain.ts)
- [server/db.ts](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/63189e5f21dd2794f5677894dc6cae04597095f5/prototype-v2/server/db.ts)

## Correspondência com a modelagem original

O fluxo original da especificação17/11 empregava Análise e RevisãoHumana como etapas conceituais. Elas não são estados persistidos da decisão no contrato final. Por isso F12 usa OPEN,CONSENSUS,CLOSED_WITHOUT_CONSENSUS, mantendo a mediação em estado separado. A representação atual preserva a distinção entre etapa de trabalho, status da mediação e estado decisório.
