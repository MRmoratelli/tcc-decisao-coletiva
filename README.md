# Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva

Universidade Veiga de Almeida — Engenharia da Computação ·2026
Orientador — Prof. Carlos Alvaro de Macedo Soares Quintella

Sistema para organizar manifestações e revisar propostas com assistência consultiva de IA e decisão humana.

## Acesso e código

- [Aplicação](https://tcc-decisao-v2-test.onrender.com/)
- [Saúde](https://tcc-decisao-v2-test.onrender.com/api/health)
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
- [Figuras e fontes editáveis](prototype-v2/docs/entrega-academica/figuras/CATALOGO.md)
- [Índice técnico](prototype-v2/docs/entrega-academica/README.md)

## Referência científica e validação

Código da coleta: `63189e5f21dd2794f5677894dc6cae04597095f5`. A referência de congelamento informada é `freeze/v2-coleta-20261121-final`; o SHA identifica inequivocamente a versão. A documentação consolidada/retrospectiva foi elaborada em24/11/2026 e não é apresentada como conjunto de peças históricas do desenvolvimento.

[CI histórica de130 testes](https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/44940268869). Testes técnicos têm alcance distinto da avaliação exploratória com um grupo.

## Uso e execução

Consulte ENG-D08 para moderador/participante e roteiro fictício, preparado para execução posterior autorizada. Node>=22.12.0, PostgreSQL isolado e serviços externos conforme ENG-D06. A sequência documentada é `cd prototype-v2`, `npm ci`, `npm run migrate`, `npm run dev`, ou `npm run build` e `npm start` em ambiente apropriado. Nenhuma instalação ou migração foi executada na produção desta documentação. Valores privados não pertencem ao repositório.

## Documentação histórica preservada

[README técnico V2](prototype-v2/README.md), [especificação17/11](prototype-v2/docs/ESPECIFICACAO_V2.md) e [documentação V1](docs) permanecem disponíveis em sua forma original. Suas regras e contagens devem ser lidas pela data e pelo protótipo a que se referem. Para a entrega atual, utilizar o índice consolidado acima.
