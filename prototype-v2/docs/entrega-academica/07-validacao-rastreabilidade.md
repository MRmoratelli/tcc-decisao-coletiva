# ENG-D07 — Validação Técnica e Matriz de Rastreabilidade

Processo de decisao · UVA · Engenharia da Computação
Versão 1.0 ·24/11/2026 · Origem CONSOLIDADO
Commit científico `63189e5f21dd2794f5677894dc6cae04597095f5`.

TCC: Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva. Universidade Veiga de Almeida — Engenharia da Computação. Orientador: Prof. Carlos Alvaro de Macedo Soares Quintella.

## Evidência histórica

CI 44940268869, job136955708525, executada no SHA científico. Resultado previamente conferido:130 testes aprovados, zero falhas. Não houve repetição da suíte nesta etapa. A validação de 17/11 registrava39 testes e é histórica. A suíte usa arquivos server/*.test.ts e src/*.test.tsx; sua contagem inclui subtestes. O teste de uma regra não é validação de segurança, disponibilidade ou qualidade da decisão.

[Execução da CI](https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/44940268869)

## Matriz funcional

|RF|UC relacionados|Componente/endpoint ou regra|Teste relacionado|Estado e limite|
|---|---|---|---|---|
|RF01|UC01|Repository.create; POST /api/rooms|server/api.test.ts|Alterado: sem condição experimental A/B.|
|RF02|UC01,UC02|Repository.authorize/join; app.ts auth|server/api.test.ts|Consolidado.|
|RF03|UC04,UC05|vote; contribute|server/simplification.test.ts|Alterado: contribuições adicionais e voto imutável.|
|RF04|UC08|publish; vote|server/publication-api.test.ts|Substituído: não há edição de voto.|
|RF05|UC06|GeminiAdapter.analyzeObjections|server/ai.test.ts|Substituído: análise estruturada.|
|RF06|UC04|contest; CoverageSchema|server/linked-quotes.test.ts|Alterado: sem categoria_final da V1.|
|RF07|UC06|manifestations; positions|server/domain.test.ts|Consolidado.|
|RF08||vote; publish; closeWithoutConsensus|server/domain.test.ts|Substituído: sem fases COLETA/REVISAO.|
|RF09|UC07|addAnalysis; addSynthesis; assertSynthesis|server/decision-progress.test.ts|Consolidado.|
|RF10|UC08|publish; POST publish|server/publication-api.test.ts|Alterado: sem teto de três versões.|
|RF11|UC05|unanimous; vote|server/simplification.test.ts|Alterado: ausência de rejeição isoladamente é insuficiente.|
|RF12|UC09|closeWithoutConsensus; evaluate|server/evaluation-api.test.ts|Substituído: resultados operacionais da V2.|
|RF13|UC08|publish|server/domain.test.ts|Limite V1 removido.|
|RF14|UC03|StateSchema; Repository.mutate|server/domain.test.ts|Consolidado.|
|RF15|UC12|exportState; statistics|server/evaluation-api.test.ts|Alterado: não afirmar CSV do processo na V2.|
|RF16||reviewRecord; publish|server/api.test.ts|Equivalência experimental A/B não mantida.|
|RF17||Repository.mutate|server/api.test.ts|Substitui SQLite do protótipo.|
|RF18||Repository.create/join|server/api.test.ts|Redefinição V1 não identificada.|
|RF19||AIUnavailable; reviewRecord|server/pretest-corrections.test.ts|Alterado: sem cancelamento experimental obrigatório da V1.|
|RF20|UC03|POST view; Repository.latestRevision|server/usability.test.ts|Consolidado.|
|RF21|UC10|contest|server/linked-quotes.test.ts|Alterado: não usa CAT01–09.|
|RF22|UC03|app.ts view|server/initial-proposal-api.test.ts|Alterado: não alegar cegamento experimental integral.|
|RF23||ProposalSchema|server/initial-proposal-api.test.ts|Cenário financeiro fixo da V1 substituído.|
|RF24||StateSchema; exportState|server/evaluation-naturalistic.test.ts|Alterado: sem equivalência A/B.|
|RF25|UC11|POST fact-check; FactualService|server/factual-api.test.ts|Consolidado retrospectivamente; zero uso na coleta.|
|RF26|UC14|evaluate; EvaluationSchema|server/evaluation-naturalistic.test.ts|Consolidado retrospectivamente.|
|RF27|UC13|POST /api/import; validateState|server/api.test.ts|Consolidado retrospectivamente.|

## Requisitos acadêmicos R01–R08

|ID|Barreira e derivação|Implementação|Evidência e alcance|
|---|---|---|---|
|R01|Informação dispersa|RF03,RF14; campos e manifestações|Registra o comunicado; não recupera o omitido|
|R02|Evolução de propostas|RF10,RF13; versões e rodadas|Histórico conserva mudanças, sem provar progresso substantivo|
|R03|Preservação do dissenso|RF05,RF07,RF21|Rejeições registradas não significam atendimento integral|
|R04|Sentido da síntese|RF09,RF06|Vínculos e revisão humana; sem avaliação independente de fidelidade|
|R05|Controle e influência|RF02,RF10|Autoridade humana implementada; autonomia psicológica não medida|
|R06|Ambiguidade de consenso|RF11|Unanimidade formal observada; pendências práticas podem permanecer|
|R07|Confiabilidade factual|RF25|Implementado e demonstrado tecnicamente, zero uso científico|
|R08|Uso situado|RF26|Questionário e observação de um caso; sem controle|

## Leitura dos testes e limites

Os arquivos indicados são conjuntos relacionados às regras, não prova de cobertura exaustiva de cada condição. api.test.ts e domain.test.ts examinam fluxo/regras; publication-api e simplification tratam publicação e voto; evaluation-naturalistic trata variante e encerramento; factual-api e budget tratam integração e limites; componentes examinam apresentação. Evidências sintéticas de docs/evidence devem ser identificadas como ensaios. Nenhuma resposta individual real ou credencial integra este pacote.

## Técnica e ciência

Uma verificação técnica comprova a propriedade testada naquela execução. O caso naturalístico examina uso, observações e percepções. Dez participantes são observações internas de um processo coletivo. Discord, moderação e relações prévias impedem atribuir o resultado exclusivamente à IA. A documentação técnica não transforma percepção em eficácia causal.
