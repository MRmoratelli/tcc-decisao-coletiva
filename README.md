# Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva

Trabalho de Conclusão de Curso em Engenharia da Computação da Universidade Veiga de Almeida. O artefato organiza decisões em grupo por meio de propostas, votos, análise consultiva e rodadas sucessivas.

| Referência | Valor |
|---|---|
| Versão documentada | V2 congelada em 26/11/2026 |
| Código e testes de referência | [`ea225a5`](https://github.com/MRmoratelli/tcc-decisao-coletiva/commit/ea225a5791305acc127db05c5a9a6236396bd2e5) |
| Aplicação desta versão | [V2 de validação](https://tcc-decisao-v2-validacao.onrender.com/) |
| Documentação de engenharia | [Índice da entrega final](prototype-v2/docs/entrega-academica/README.md) |
| Prompt do Gemini | [Apêndice pronto para a monografia](prototype-v2/docs/entrega-academica/09-prompt-gemini.md) |
| Implementação | [Diretório prototype-v2](prototype-v2/) |

Na V2, o moderador cria uma sala e compartilha um convite. Cada participante registra **Aceito** ou **Rejeito**. O servidor verifica a unanimidade na mesma proposta e o moderador decide se publica uma revisão. A assistência do Gemini é consultiva.

A sessão acadêmica já realizada está associada à versão `63189e5`. A documentação daquela entrega está na branch [`entrega-academica-2026`](https://github.com/MRmoratelli/tcc-decisao-coletiva/tree/entrega-academica-2026). Na raiz deste repositório, os arquivos da implementação Python/Streamlit e a pasta `docs/` correspondem ao histórico do projeto.
