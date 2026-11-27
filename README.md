# Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva

Universidade Veiga de Almeida — Engenharia da Computação · 2026
Orientador — Prof. Carlos Alvaro de Macedo Soares Quintella

Sistema para organizar manifestações e revisar propostas com assistência consultiva de IA e decisão humana.

## Acesso e código

- [Aplicação](https://tcc-decisao-v2-validacao.onrender.com/)
- [Saúde](https://tcc-decisao-v2-validacao.onrender.com/api/health)
- [Cliente](prototype-v2/src) · [Servidor](prototype-v2/server) · [Contratos](prototype-v2/shared)

## Documentação consolidada

- [ENG-D01 — Visão, Escopo e Especificação de Requisitos](prototype-v2/docs/entrega-academica/01-visao-escopo-requisitos.md)
- [ENG-D02 — Modelagem e Especificação dos Casos de Uso](prototype-v2/docs/entrega-academica/02-casos-de-uso.md)
- [ENG-D03 — Arquitetura do Sistema](prototype-v2/docs/entrega-academica/03-arquitetura.md)
- [ENG-D04 — Modelagem Estrutural e Comportamental](prototype-v2/docs/entrega-academica/04-modelagem-uml.md)
- [ENG-D05 — Modelagem e Persistência de Dados](prototype-v2/docs/entrega-academica/05-modelagem-dados.md)
- [ENG-D06 — Documentação Técnica da Implementação](prototype-v2/docs/entrega-academica/06-implementacao-api.md)
- [ENG-D07 — Validação Técnica e Matriz de Rastreabilidade](prototype-v2/docs/entrega-academica/07-validacao-rastreabilidade.md)
- [ENG-D08 — Manual de Utilização e Roteiro de Demonstração](prototype-v2/docs/entrega-academica/08-manual-demonstracao.md)
- [ENG-D09 — Prompt da API do Gemini](prototype-v2/docs/entrega-academica/09-prompt-gemini.md)
- [Figuras e fontes editáveis](prototype-v2/docs/entrega-academica/figuras/CATALOGO.md)
- [Índice técnico](prototype-v2/docs/entrega-academica/README.md)

## Referência científica e validação

A V2 descrita na monografia foi congelada em 26/11/2026. A avaliação exploratória acompanhou uma sessão simulada de organização de reuniões com quatro votantes em duas rodadas. [Commit `ea225a5`](https://github.com/MRmoratelli/tcc-decisao-coletiva/commit/ea225a5791305acc127db05c5a9a6236396bd2e5)

A verificação técnica registrou a compilação, a verificação de tipos do TypeScript e a aprovação de 127 testes na cópia de teste. [ENG-D07](prototype-v2/docs/entrega-academica/07-validacao-rastreabilidade.md)

## Uso e execução

O manual apresenta o fluxo para moderador e participantes e um roteiro fictício de demonstração. [ENG-D08](prototype-v2/docs/entrega-academica/08-manual-demonstracao.md)

A execução local requer Node.js 22.12 ou superior, npm e um banco PostgreSQL isolado. Em `prototype-v2`, instale as dependências com `npm ci` e configure o ambiente conforme `.env.example`. Aplique as migrações com `npm run migrate` e inicie o ambiente de desenvolvimento com `npm run dev`. Para servir a aplicação compilada, use `npm run build` e `npm start`. [README técnico da V2](prototype-v2/README.md)

## Documentação histórica preservada

A entrega acadêmica anterior reúne a documentação da sessão associada ao commit `63189e5`. [Branch `entrega-academica-2026`](https://github.com/MRmoratelli/tcc-decisao-coletiva/tree/entrega-academica-2026)

A [especificação da V2](prototype-v2/docs/ESPECIFICACAO_V2.md) e a [documentação da V1](docs) registram outras etapas do desenvolvimento.

## Figuras e leitura

O catálogo reúne 13 diagramas com fontes editáveis em Mermaid, elaborados a partir do código congelado. As figuras apresentam casos de uso, arquitetura, estruturas de domínio, persistência e fluxos da aplicação.
