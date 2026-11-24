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

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte versionável em [diagramas/F03.puml](diagramas/F03.puml). Representação visual em processo de verificação; conferir o estado no catálogo de figuras.

### F04 — Componentes da arquitetura lógica

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte versionável em [diagramas/F04.puml](diagramas/F04.puml). Representação visual em processo de verificação; conferir o estado no catálogo de figuras.

### F05 — Implantação utilizada

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte versionável em [diagramas/F05.puml](diagramas/F05.puml). Representação visual em processo de verificação; conferir o estado no catálogo de figuras.

## Origem e limites

A especificação original de17/11 já apresentava arquitetura e estados. Esta consolidação mantém componentes comprovados e incorpora pesquisa externa e as regras binárias da coleta. Não há microsserviços separados de cliente/servidor. A fila Gemini é componente em processo, com orçamento persistido. Não implica infraestrutura distribuída ou garantia de vazão. Ver ENG-D06 para execução e ENG-D05 para armazenamento.
