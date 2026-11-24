# ENG-D03 — Arquitetura do Sistema

Processo de decisao · UVA · Engenharia da Computação
Versão1.0 ·24/11/2026 · Origem CONSOLIDADO
Commit científico `63189e5f21dd2794f5677894dc6cae04597095f5`.

## Finalidade e organização

O cliente React apresenta proposta, manifestações, revisão e avaliação. O servidor Express autentica solicitações e coordena regras de domínio, persistência e integrações. Zod em shared define contratos de entrada e saída, validando o estado também no servidor. O navegador não tem autoridade sobre consenso ou publicação.

## Componentes e comunicação

|Camada|Fonte|Responsabilidade|
|---|---|---|
|Cliente|src/App.tsx; components/RoomWorkspace.tsx|Acesso, formulários, ações e atualização da vista|
|Cliente HTTP|src/api.ts|JSON, tratamento de erros e credenciais de sessão|
|API|server/app.ts|Rotas, autenticação, projeção por papel e limites|
|Domínio|server/domain.ts|Votos únicos, versões, consenso, publicação e exportação|
|Contratos|shared/contracts.ts; shared/factual.ts|Schemas Zod e tipos inferidos|
|Persistência|server/db.ts|Bloqueio de sala, revisão e snapshots em transação|
|Mediação|server/ai.ts; gemini-queue.ts|Pareceres e sínteses; fila de chamadas e tratamento de falha|
|Pesquisa|server/factual.ts; budget.ts|Busca Tavily, interpretação Gemini e orçamento persistente|

## Implantação

Cliente compilado em dist e API são servidos pelo mesmo processo Node no serviço Render srv-dbugi3dg1s2s73bpt3f0. A persistência PostgreSQL é hospedada no Neon. Gemini e Tavily são provedores externos. A consulta inicial desta etapa confirmou auto deploy desligado e a branch feat/vite-typescript-decisao-generica vinculada. Nenhuma modificação de implantação é realizada.

## Fluxo de dados e fronteiras

Requisição JSON passa por validação de origem, autenticação e schemas. O Repository lê a revisão. Mutação válida executa regra, valida o estado e insere novo snapshot. Operações externas são verificadas contra estado atual antes da gravação. A vista retornada ao participante é filtrada por papel e contexto de manifestação. Os segredos ficam no servidor. PostgreSQL não torna conteúdo livre anônimo e o envio ao provedor precisa do consentimento previsto no fluxo.

### F03 — Contexto do sistema

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F03.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F03 Contexto do sistema](https://www.plantuml.com/plantuml/png/~h407374617274756d6c0a736b696e706172616d2064656661756c74466f6e7453697a652031340a736b696e706172616d20736861646f77696e672066616c73650a736b696e706172616d206261636b67726f756e64436f6c6f722077686974650a6163746f72204d6f64657261646f72206173204d0a6163746f72205061727469636970616e746520617320500a72656374616e676c65202253697374656d61206465206465636973616f20636f6c65746976612220617320530a636c6f75642047656d696e6920617320470a636c6f756420546176696c7920617320540a64617461626173652022506f737467726553514c202f204e656f6e222061732044420a4d202d2d3e2053203a2070726f706f7374617320652072657669736f65730a50202d2d3e2053203a206d616e696665737461636f6573206520766f746f730a53202d2d3e2047203a20616e616c69736520636f6e73756c746976610a53202d2d3e2054203a2062757363612065787465726e61206f7063696f6e616c0a53202d2d3e204442203a2070657273697374656e6369610a40656e64756d6c)

Legenda sugerida — Contexto do sistema. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

### F04 — Componentes da arquitetura lógica

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F04.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F04 Componentes da arquitetura lógica](https://www.plantuml.com/plantuml/png/~h407374617274756d6c0a736b696e706172616d2064656661756c74466f6e7453697a652031340a736b696e706172616d20736861646f77696e672066616c73650a736b696e706172616d206261636b67726f756e64436f6c6f722077686974650a636f6d706f6e656e7420225265616374202f20737263222061732055490a636f6d706f6e656e742022415049202f206170702e747322206173204150490a636f6d706f6e656e742022436f6e747261746f73205a6f64202f207368617265642220617320430a636f6d706f6e656e742022446f6d696e696f202f20646f6d61696e2e74732220617320440a636f6d706f6e656e7420225265706f7369746f7279202f2064622e74732220617320520a636f6d706f6e656e74202247656d696e6941646170746572202f2061692e74732220617320470a636f6d706f6e656e7420224661637475616c53657276696365202f206661637475616c2e74732220617320460a5549202d2d3e20415049203a2048545450204a534f4e0a415049202d2d3e2043203a2076616c6964610a415049202d2d3e2044203a207265677261730a415049202d2d3e2052203a2065737461646f2065207265766973616f0a415049202d2d3e2047203a2070617265636572202f2073696e746573650a415049202d2d3e2046203a20636f6e73756c74610a52202d2d3e2044203a2076616c6964612065737461646f0a40656e64756d6c)

Legenda sugerida — Componentes da arquitetura lógica. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

### F05 — Implantação utilizada

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F05.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F05 Implantação utilizada](https://www.plantuml.com/plantuml/png/~h407374617274756d6c0a736b696e706172616d2064656661756c74466f6e7453697a652031340a736b696e706172616d20736861646f77696e672066616c73650a736b696e706172616d206261636b67726f756e64436f6c6f722077686974650a6e6f646520224e6176656761646f722220617320420a6e6f6465202252656e6465723a20756d207365727669636f204e6f64652e6a7322207b0a61727469666163742022646973742028566974652922206173205745420a61727469666163742022415049204578707265737322206173204150490a7d0a646174616261736520224e656f6e20506f737467726553514c222061732044420a636c6f7564202247656d696e692220617320470a636c6f75642022546176696c792220617320540a42202d2d3e20574542203a2048545450530a42202d2d3e20415049203a204854545053202f6170690a415049202d2d3e204442203a207067202f207472616e7361636f65730a415049202d2d3e2047203a206368616d616461732065787465726e61730a415049202d2d3e2054203a2062757363612065787465726e610a40656e64756d6c)

Legenda sugerida — Implantação utilizada. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

## Origem e limites

A especificação original de17/11 já apresentava arquitetura e estados. Esta consolidação mantém componentes comprovados e incorpora pesquisa externa e as regras binárias da coleta. Não há microsserviços separados de cliente/servidor. A fila Gemini é componente em processo, com orçamento persistido. Não implica infraestrutura distribuída ou garantia de vazão. Ver ENG-D06 para execução e ENG-D05 para armazenamento.
