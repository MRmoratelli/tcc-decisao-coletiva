# Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva

Universidade Veiga de Almeida — UVA · Engenharia da Computação · 2026

## Apresentação acadêmica

O sistema apoia a organização de manifestações e a revisão de propostas em decisões coletivas. A IA oferece análises e sugestões consultivas. O moderador examina e publica propostas, e os participantes registram suas posições. O consenso formal exige aceite de todos na mesma rodada.

## Acesso

- Aplicação: https://tcc-decisao-v2-test.onrender.com/
- Saúde pública: https://tcc-decisao-v2-test.onrender.com/api/health
- Código do cliente: [prototype-v2/src](prototype-v2/src)
- Código do servidor: [prototype-v2/server](prototype-v2/server)
- Contratos compartilhados: [prototype-v2/shared](prototype-v2/shared)

A consulta pública de24/11/2026 retornou HTTP503. A disponibilidade precisa ser restabelecida e conferida antes da demonstração. A URL identifica o serviço existente.

## Versão da pesquisa

Base desta branch: `63189e5f21dd2794f5677894dc6cae04597095f5`.
Referência de coleta informada pela equipe: `freeze/v2-coleta-20261121-final`.
Esta branch organiza a entrega acadêmica por alterações documentais. O cliente, o servidor, os testes, as dependências e as configurações correspondem ao snapshot científico.

## Tecnologias

React, TypeScript e Vite na interface; Node.js/TypeScript na API; PostgreSQL/JSONB no Neon; assistência Gemini e consulta externa Tavily. Consulta externa e seus testes técnicos têm alcance próprio, com zero uso na sessão científica.

## Documentação existente

- [README técnico V2](prototype-v2/README.md) — acesso à estrutura e instruções de execução registradas no desenvolvimento.
- [Especificação integrada V2](prototype-v2/docs/ESPECIFICACAO_V2.md) — documento original de17/11/2026 com arquitetura, modelo conceitual e fluxo. Seus trechos sobre integração factual e regras anteriores exigem atualização para a versão da coleta.
- [Migrações físicas](prototype-v2/server/migrations) — fontes do modelo PostgreSQL. As entidades dentro de snapshots JSONB devem ser distinguidas das tabelas físicas.
- [Testes do código congelado](https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/44940268869) — execução da suíte de130 testes. O resultado técnico é distinto da avaliação de uso com participantes.

A organização existente em `prototype-v2/docs` foi mantida. Os documentos de requisitos consolidados, casos de uso, modelo de classes/tipos e DER físico serão incorporados após sua elaboração e conferência. Os diagramas conceituais existentes não constituem um DER físico completo.

## Execução técnica

Consultar [prototype-v2/README.md](prototype-v2/README.md) para as instruções existentes. A configuração de serviços utiliza variáveis privadas no servidor. Valores de credenciais e dados da coleta não integram este guia. A interface e a API são hospedadas no mesmo serviço Render.
