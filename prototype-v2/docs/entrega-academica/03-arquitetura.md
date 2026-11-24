# ENG-D03 — Arquitetura do Sistema

Processo de decisao · UVA · Engenharia da Computação
Versão 1.0 ·24/11/2026 · Origem CONSOLIDADO
Commit científico `63189e5f21dd2794f5677894dc6cae04597095f5`.

TCC: Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva. Universidade Veiga de Almeida — Engenharia da Computação. Orientador: Prof. Carlos Alvaro de Macedo Soares Quintella.

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

![F03 Contexto do sistema](https://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/MRmoratelli/tcc-decisao-coletiva/9b15c14928e6a28ba0408f5a1aba5b9b04a88416/prototype-v2/docs/entrega-academica/diagramas/F03.puml)

Legenda sugerida — Contexto do sistema. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

### F04 — Componentes da arquitetura lógica

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F04.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F04 Componentes da arquitetura lógica](https://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/MRmoratelli/tcc-decisao-coletiva/9b15c14928e6a28ba0408f5a1aba5b9b04a88416/prototype-v2/docs/entrega-academica/diagramas/F04.puml)

Legenda sugerida — Componentes da arquitetura lógica. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

### F05 — Implantação utilizada

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F05.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F05 Implantação utilizada](https://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/MRmoratelli/tcc-decisao-coletiva/9b15c14928e6a28ba0408f5a1aba5b9b04a88416/prototype-v2/docs/entrega-academica/diagramas/F05.puml)

Legenda sugerida — Implantação utilizada. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

## Origem e limites

A especificação original de 17/11 já apresentava arquitetura e estados. Esta consolidação mantém componentes comprovados e incorpora pesquisa externa e as regras binárias da coleta. Não há microsserviços separados de cliente/servidor. A fila Gemini é componente em processo, com orçamento persistido. Não implica infraestrutura distribuída ou garantia de vazão. Ver ENG-D06 para execução e ENG-D05 para armazenamento.

## Referências técnicas verificáveis

- [server/index.ts](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/63189e5f21dd2794f5677894dc6cae04597095f5/prototype-v2/server/index.ts)
- [server/app.ts](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/63189e5f21dd2794f5677894dc6cae04597095f5/prototype-v2/server/app.ts)
- [server/db.ts](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/63189e5f21dd2794f5677894dc6cae04597095f5/prototype-v2/server/db.ts)
- [server/ai.ts](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/63189e5f21dd2794f5677894dc6cae04597095f5/prototype-v2/server/ai.ts)
- [server/factual.ts](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/63189e5f21dd2794f5677894dc6cae04597095f5/prototype-v2/server/factual.ts)
- [docs/ESPECIFICACAO_V2.md](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/63189e5f21dd2794f5677894dc6cae04597095f5/prototype-v2/docs/ESPECIFICACAO_V2.md)

## Reaproveitamento e diferenças em relação aos antecedentes

A arquitetura v1.1 de06/11 descreve Streamlit, decision.py e ai_service.py, pertencentes ao protótipo anterior. Sua separação de interface, regras e integração é antecedente histórico, sem transpor módulos Python para a V2. A especificação integrada de17/11 já registra React/Express, Repository, contratos Zod e PostgreSQL/JSONB, preservados nesta consolidação. O código congelado prevalece nas divergências: o ingresso conserva acesso em localStorage; as novas operações usam voto binário único; a integração Tavily foi acrescentada; a versão de prompt foi atualizada. Os diagramas atuais foram elaborados retrospectivamente, não são os desenhos originais.
