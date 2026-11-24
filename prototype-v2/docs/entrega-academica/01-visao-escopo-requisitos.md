# ENG-D01 — Visão, Escopo e Especificação de Requisitos

Projeto Processo de decisao · UVA · Engenharia da Computação
Versão documental 1.0 · Elaborado em 24/11/2026 · Origem CONSOLIDADO
Referência científica `63189e5f21dd2794f5677894dc6cae04597095f5`.

TCC: Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva. Universidade Veiga de Almeida — Engenharia da Computação. Orientador: Prof. Carlos Alvaro de Macedo Soares Quintella.

## Visão e escopo

Apoiar um grupo a organizar manifestações e acompanhar objeções, revisões e pendências. A formulação é alinhada à proposta acadêmica D04, ainda sujeita à aprovação. Participante e moderador são os papéis humanos. Gemini e Tavily são serviços externos. O escopo inclui propostas genéricas, votação binária, sugestões consultivas, revisão humana e avaliação pós-encerramento. Não inclui decisão autônoma, execução do evento decidido, garantia de neutralidade ou controle experimental.

## Desenvolvimento

Node >= 22.12.0; TypeScript, React e Vite no cliente; Express e pg no servidor; PostgreSQL/JSONB no Neon. Cliente e API são servidos pelo mesmo serviço Render em produção. Gemini e Tavily dependem de configuração privada. Sem cadastro sociodemográfico adicional obrigatório. O código usa src, server e shared. Faixas declaradas constam em package.json; versões resolvidas abaixo vêm do package-lock.json do SHA.

```
react 19.3.1
react-dom 19.3.1
express 5.3.0
pg 8.23.1
zod 4.6.7
@google/genai 1.52.0
typescript 5.9.3
vite 8.3.8
tsx 4.23.15
```

## Requisitos funcionais e rastreabilidade histórica

Os identificadores RF01–RF24 preservam o nexo com RFv1.1 de 06/11. A coluna de origem descreve a mudança, sem retroagir a especificação. RF25–27 foram reconstruídos da implementação. ‘Implementado’ descreve a regra no código, não comprova seu efeito científico.

|ID|Finalidade / ator|Condição e comportamento|Fonte e teste relacionado|Origem e cobertura|
|---|---|---|---|---|
|RF01|Criar sessão — Moderador|Proposta validada, parecer com comprovante ou razão de dispensa; 2–30 participantes.|Repository.create; POST /api/rooms; server/api.test.ts|Alterado: sem condição experimental A/B.|
|RF02|Controlar acesso — Moderador e participante|Credencial individual ou ingresso por convite com concordância; papel verificado no servidor.|Repository.authorize/join; app.ts auth; server/api.test.ts|Consolidado.|
|RF03|Manifestar por versão — Participante|Contribuições e voto vinculados a proposta/rodada; um único voto por participante na rodada.|vote; contribute; server/simplification.test.ts|Alterado: contribuições adicionais e voto imutável.|
|RF04|Controlar edição — Moderador|Revisar rascunho e publicar outra proposta; voto vigente não é editado.|publish; vote; server/publication-api.test.ts|Substituído: não há edição de voto.|
|RF05|Analisar manifestações — IA, solicitada no fluxo humano|Organizar interpretações e citações, sem taxonomia CAT01–09 obrigatória.|GeminiAdapter.analyzeObjections; server/ai.test.ts|Substituído: análise estruturada.|
|RF06|Revisar interpretação — Moderador e participante|Examinar sugestões, manter original e contestar registros acessíveis; cobertura humana opcional.|contest; CoverageSchema; server/linked-quotes.test.ts|Alterado: sem categoria_final da V1.|
|RF07|Apresentar divergências — Moderador|Conservar posições, manifestações e interpretações; frequência não elimina objeções.|manifestations; positions; server/domain.test.ts|Consolidado.|
|RF08|Gerir estado — Sistema e moderador|OPEN transita a CONSENSUS ou CLOSED_WITHOUT_CONSENSUS. Rodadas OPEN/CLOSED.|vote; publish; closeWithoutConsensus; server/domain.test.ts|Substituído: sem fases COLETA/REVISAO.|
|RF09|Sugerir revisão — Moderador e IA|Síntese usa análise atual, vínculos e fingerprint; permanece rascunho até publicação.|addAnalysis; addSynthesis; assertSynthesis; server/decision-progress.test.ts|Consolidado.|
|RF10|Publicar proposta — Moderador|Confirmação, sourceId atual e razão quando texto alterado ou revisão manual; nova rodada.|publish; POST publish; server/publication-api.test.ts|Alterado: sem teto de três versões.|
|RF11|Verificar consenso — Sistema|Todos os habilitados devem ter ACEITO na mesma proposta/rodada.|unanimous; vote; server/simplification.test.ts|Alterado: ausência de rejeição isoladamente é insuficiente.|
|RF12|Encerrar sem consenso — Moderador|Exigir razão não vazia e preservar histórico; questionário liberado após encerramento.|closeWithoutConsensus; evaluate; server/evaluation-api.test.ts|Substituído: resultados operacionais da V2.|
|RF13|Permitir novas rodadas — Moderador|Nova proposta fecha rodada anterior e reinicia pendências, sem limite rígido de três.|publish; server/domain.test.ts|Limite V1 removido.|
|RF14|Conservar histórico — Sistema|Versões, manifestações, votos, análises, sínteses, intervenções e eventos no estado tipado.|StateSchema; Repository.mutate; server/domain.test.ts|Consolidado.|
|RF15|Exportar processo — Moderador|Exportar JSON e resultados de avaliação; não contém credenciais de acesso.|exportState; statistics; server/evaluation-api.test.ts|Alterado: não afirmar CSV do processo na V2.|
|RF16|Continuar sem parecer — Participante/moderador|Dispensa explícita do parecer com razão; revisão manual possível. Sem condição B experimental.|reviewRecord; publish; server/api.test.ts|Equivalência experimental A/B não mantida.|
|RF17|Persistir estado — Servidor|Armazenar snapshots incrementais PostgreSQL com revisão e transação.|Repository.mutate; server/api.test.ts|Substitui SQLite do protótipo.|
|RF18|Acessos individuais — Moderador/participante|Criação e ingresso geram/protegem acesso. Não foi localizada redefinição de credencial equivalente à V1.|Repository.create/join; server/api.test.ts|Redefinição V1 não identificada.|
|RF19|Tratar falha de IA — Sistema|Informar indisponibilidade e preservar texto/estado consistente; permitir dispensa explícita quando aplicável.|AIUnavailable; reviewRecord; server/pretest-corrections.test.ts|Alterado: sem cancelamento experimental obrigatório da V1.|
|RF20|Sincronizar vista — Cliente|Consultar revisão e obter projeção por papel; recusar mutação concorrente.|POST view; Repository.latestRevision; server/usability.test.ts|Consolidado.|
|RF21|Contestar interpretação — Participante|Alvo deve ser contribuição própria ou registro permitido; rascunho privado é protegido.|contest; server/linked-quotes.test.ts|Alterado: não usa CAT01–09.|
|RF22|Controlar visibilidade — Servidor|Aplicar projeção por papel e situação da manifestação; parecer inicial e rascunhos privados filtrados.|app.ts view; server/initial-proposal-api.test.ts|Alterado: não alegar cegamento experimental integral.|
|RF23|Validar proposta genérica — Moderador|Título 3–180 caracteres e texto >=4; campos opcionais até5000.|ProposalSchema; server/initial-proposal-api.test.ts|Cenário financeiro fixo da V1 substituído.|
|RF24|Registrar proveniência — Sistema|Metadados de modelo/prompt, versão do instrumento, eventos e contexto de aplicação.|StateSchema; exportState; server/evaluation-naturalistic.test.ts|Alterado: sem equivalência A/B.|
|RF25|Consultar fonte externa — Moderador|Consentimento, alegação validada e vínculo à rodada; orçamento/serviço habilitados.|POST fact-check; FactualService; server/factual-api.test.ts|Consolidado retrospectivamente; zero uso na coleta.|
|RF26|Responder avaliação — Participante|Encerramento legítimo, concordância e resposta única;22 itens e4 questões abertas.|evaluate; EvaluationSchema; server/evaluation-naturalistic.test.ts|Consolidado retrospectivamente.|
|RF27|Importar processo — Moderador|Validar estado importado e criar nova sala com novas credenciais; não sobrescrever original.|POST /api/import; validateState; server/api.test.ts|Consolidado retrospectivamente.|

## Requisitos não funcionais

- RNF01 Acesso — credenciais verificadas por operação, com hashes/HMAC no servidor. Propriedade implementada; sem certificação de segurança.
- RNF02 Integridade — chaves físicas e validação Zod protegem vínculos; JSONB não normaliza cada entidade lógica.
- RNF03 Transações — revisão esperada e bloqueio de sala precedem novo snapshot. Conflitos retornam409.
- RNF04 Rastreabilidade — eventos, versões, origem e metadados são preservados nos registros disponíveis.
- RNF05 Original — texto original e texto enviado são campos distintos; não se grava cada tecla do navegador.
- RNF06 Controle humano — publicação e voto são humanos. A propriedade de autoridade está implementada, sem medir autonomia psicológica.
- RNF07 Falhas — retorno de erro/dispensa e preservação de texto; dependência do provedor permanece.
- RNF08 Persistência — PostgreSQL isolado e snapshots; existência do código não constitui teste de recuperação de desastre.
- RNF09 Concorrência — pedidos e resultados externos obsoletos não sobrescrevem revisões recentes.
- RNF10 Usabilidade — interface web e estados de erro; instrumento exploratório não mede conformidade normativa.
- RNF11 Auditabilidade — exportação contém encadeamento do processo; não certifica autoria externa ou imutabilidade administrativa.
- RNF12 Privacidade — pseudônimos, projeção por papel e segredos no servidor; texto livre ainda pode revelar informações.
- RNF13 Compatibilidade — stack Node/React e build Vite; não há matriz completa de navegadores ou dispositivos certificada.
- RNF14 Verificabilidade —130 testes aprovados na CI histórica do SHA. Nenhum teste novo executado nesta documentação.
- RNF15 Interpretação — êxito técnico não demonstra qualidade decisória nem efeito causal da IA.
- RNF16 Reprodutibilidade — SHA, lockfile e contratos identificados; saídas de IA/serviços externos variam.
- RNF17 Experimento A/B da V1 — não se aplica ao caso único executado com V2.
- RNF18 Exportação segura — credenciais estruturadas ficam fora do estado exportado; conteúdo livre requer revisão antes de compartilhar.
- RNF19 Desempenho e disponibilidade — limites de requisição existem, mas SLA, latência e capacidade simultânea não foram medidos. Não atribuir garantia numérica.

## Regras de negócio

- RB01 O moderador publica, encerra, exporta e solicita análises de conjunto. A autenticação é aplicada no servidor.
- RB02 O contrato do servidor aceita de 2 a 30 participantes na criação; a interface pública observada limita o formulário a 2–15. O número habilitado é definido na criação. No autoingresso, ocupam-se as vagas já previstas.
- RB03 Os pedidos novos aceitam somente ACEITO ou REJEITO. ACEITO não recebe justificativa. REJEITO exige razão e fluxo de parecer ou dispensa.
- RB04 Cada participante vota uma única vez na rodada. Referências antigas à proposta/rodada e revisões concorrentes são recusadas.
- RB05 Consenso exige ACEITO de todos na mesma proposta. O último aceite encerra automaticamente decisão e rodada.
- RB06 Publicar exige decisão OPEN, proposta-fonte atual, confirmação e justificativa de mudanças. Síntese usada deve estar atualizada.
- RB07 Publicação fecha a rodada e cria outra proposta/rodada. Os votos anteriores permanecem e todos ficam pendentes na nova.
- RB08 Síntese é rascunho. A IA não publica, não vota nem encerra. Cobertura sugerida não prova fidelidade semântica.
- RB09 Encerramento sem consenso exige uma razão. Não há reabertura prevista para decisão encerrada.
- RB10 Avaliação individual somente após encerramento e sem duplicação. Importação cria novo processo.
- RB11 Estado LEGACY conserva posições históricas; isso não habilita ACEITO_COM_RESSALVAS ou ABSTENHO em pedidos novos.
- RB12 A avaliação das fontes externas é consultiva. Seu resultado não estabelece consenso nem substitui a decisão humana.

## Evidências e limites

Fontes históricas RF/RNFv1.1 no Drive, ESPECIFICACAO_V2.md de 17/11 e os arquivos app.ts, domain.ts, db.ts, contracts.ts e package-lock.json do snapshot. Os RNF antigos de Streamlit, equivalência A/B e cancelamento técnico não são requisitos satisfeitos da V2. Não há evidência de SLA, auditoria de segurança independente ou generalização de usabilidade. Propriedades de serviço dependem da configuração externa. Ver ENG-D06 e ENG-D07 para API, persistência e evidências.
