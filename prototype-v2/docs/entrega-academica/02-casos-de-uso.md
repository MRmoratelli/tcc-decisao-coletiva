# ENG-D02 — Modelagem e Especificação dos Casos de Uso

Processo de decisao · UVA · Engenharia da Computação
Versão1.0 ·24/11/2026 · Origem RETROSPECTIVO
Commit científico `63189e5f21dd2794f5677894dc6cae04597095f5`.

## Atores

Moderador publica, encerra e administra a consulta. Participante se manifesta e vota. Gemini e Tavily são atores de apoio externos. Interface, API, domínio e Repository são componentes internos. Diagramas F01/F02 representam a fronteira e as associações.

## UC01 — Criar sala

Objetivo e atores — Criar sala, Moderador. Requisitos RF01,RF02.

Pré-condição — Proposta e número de participantes válidos. Gatilho — ação correspondente na interface.

Fluxo — Preencher proposta; obter parecer ou justificar dispensa; confirmar; receber código e acessos.

Alternativas/exceções — Dados inválidos impedem criação; indisponibilidade pode exigir dispensa explícita.

Pós-condição — Sala e primeira rodada criadas. Regras RB01–RB12 do ENG-D01.

Fonte — POST /api/rooms em server/app.ts; server/domain.ts e server/db.ts.

## UC02 — Ingressar

Objetivo e atores — Ingressar, Participante. Requisitos RF02.

Pré-condição — Convite de sala com vagas. Gatilho — ação correspondente na interface.

Fluxo — Abrir link; ler informação/concordância; confirmar; receber posição Pxx e credencial.

Alternativas/exceções — Termo alterado, sala encerrada ou vagas ocupadas impedem novo ingresso.

Pós-condição — Vaga atribuída e consentimento registrado. Regras RB01–RB12 do ENG-D01.

Fonte — Repository.join em server/app.ts; server/domain.ts e server/db.ts.

## UC03 — Consultar proposta e histórico

Objetivo e atores — Consultar proposta e histórico, Ambos. Requisitos RF14,RF20,RF22.

Pré-condição — Código e credencial válidos. Gatilho — ação correspondente na interface.

Fluxo — Abrir sala; carregar projeção por papel; acompanhar revisão; consultar versões permitidas.

Alternativas/exceções — Credencial inválida é recusada; acesso a rascunho privado não é liberado.

Pós-condição — Vista atual sem alterar a decisão. Regras RB01–RB12 do ENG-D01.

Fonte — POST view em server/app.ts; server/domain.ts e server/db.ts.

## UC04 — Enviar contribuição

Objetivo e atores — Enviar contribuição, Participante. Requisitos RF03,RF06.

Pré-condição — Decisão e rodada atuais abertas. Gatilho — ação correspondente na interface.

Fluxo — Escrever texto; solicitar parecer se desejado; manter ou rever; registrar dispensa se aplicável; enviar.

Alternativas/exceções — Conflito de revisão exige atualização; reformulação usada exige comprovante correspondente.

Pós-condição — Texto original/enviado e contexto preservados. Regras RB01–RB12 do ENG-D01.

Fonte — POST contributions em server/app.ts; server/domain.ts e server/db.ts.

## UC05 — Votar

Objetivo e atores — Votar, Participante. Requisitos RF03,RF11.

Pré-condição — Sem voto na rodada atual. Gatilho — ação correspondente na interface.

Fluxo — Ler proposta; escolher Aceito ou Rejeito; para rejeitar justificar e completar parecer/dispensa; confirmar.

Alternativas/exceções — Aceite com razão é recusado; voto duplicado ou rodada antiga recebe conflito.

Pós-condição — Voto salvo; último aceite unânime encerra por consenso. Regras RB01–RB12 do ENG-D01.

Fonte — POST votes em server/app.ts; server/domain.ts e server/db.ts.

## UC06 — Analisar manifestações

Objetivo e atores — Analisar manifestações, Moderador; Gemini externo. Requisitos RF05,RF07.

Pré-condição — Rodada aberta e estado atual. Gatilho — ação correspondente na interface.

Fluxo — Solicitar preparação; servidor obtém manifestações; Gemini analisa; servidor valida e registra.

Alternativas/exceções — Falha é informada; resultado obsoleto não sobrescreve novo estado.

Pós-condição — Análise vinculada à rodada e às fontes. Regras RB01–RB12 do ENG-D01.

Fonte — prepare-mediation; analyze-objections em server/app.ts; server/domain.ts e server/db.ts.

## UC07 — Preparar síntese

Objetivo e atores — Preparar síntese, Moderador; Gemini externo. Requisitos RF09.

Pré-condição — Análise atual disponível. Gatilho — ação correspondente na interface.

Fluxo — Selecionar análise; solicitar síntese; validar vínculos/citações; guardar rascunho privado.

Alternativas/exceções — Análise desatualizada exige preparação atual; erro não publica proposta.

Pós-condição — Rascunho de proposta disponível para revisão. Regras RB01–RB12 do ENG-D01.

Fonte — POST synthesize em server/app.ts; server/domain.ts e server/db.ts.

## UC08 — Publicar revisão

Objetivo e atores — Publicar revisão, Moderador. Requisitos RF04,RF10,RF13.

Pré-condição — Processo aberto e proposta-fonte atual. Gatilho — ação correspondente na interface.

Fluxo — Examinar síntese ou proposta anterior; editar; justificar mudança; confirmar publicação.

Alternativas/exceções — Alteração sem razão ou síntese obsoleta é recusada.

Pós-condição — Rodada anterior fechada; proposta e nova rodada abertas. Regras RB01–RB12 do ENG-D01.

Fonte — POST publish em server/app.ts; server/domain.ts e server/db.ts.

## UC09 — Encerrar sem consenso

Objetivo e atores — Encerrar sem consenso, Moderador. Requisitos RF12.

Pré-condição — Processo aberto. Gatilho — ação correspondente na interface.

Fluxo — Selecionar encerramento; informar razão; confirmar.

Alternativas/exceções — Razão vazia impede encerramento.

Pós-condição — Processo fechado com motivo e histórico. Regras RB01–RB12 do ENG-D01.

Fonte — POST close em server/app.ts; server/domain.ts e server/db.ts.

## UC10 — Contestar interpretação

Objetivo e atores — Contestar interpretação, Participante. Requisitos RF21.

Pré-condição — Alvo acessível ao participante. Gatilho — ação correspondente na interface.

Fluxo — Abrir registro; indicar divergência; escrever contestação; enviar.

Alternativas/exceções — Alvo reservado ao moderador ou texto inválido é recusado.

Pós-condição — Contestação acrescentada sem apagar fonte. Regras RB01–RB12 do ENG-D01.

Fonte — POST contest em server/app.ts; server/domain.ts e server/db.ts.

## UC11 — Consultar fato externo

Objetivo e atores — Consultar fato externo, Moderador; Tavily e Gemini externos. Requisitos RF25.

Pré-condição — Integração habilitada, consentimento e orçamento. Gatilho — ação correspondente na interface.

Fluxo — Indicar texto e modo; confirmar envio; buscar fontes; interpretar; registrar referências.

Alternativas/exceções — Dados privados detectados, limite ou provedor indisponível causam erro.

Pós-condição — Registro factual consultivo ligado à rodada. Regras RB01–RB12 do ENG-D01.

Fonte — POST fact-check em server/app.ts; server/domain.ts e server/db.ts.

## UC12 — Exportar

Objetivo e atores — Exportar, Moderador. Requisitos RF15.

Pré-condição — Acesso válido. Gatilho — ação correspondente na interface.

Fluxo — Solicitar exportação do processo ou resultados da avaliação; salvar arquivo.

Alternativas/exceções — Permissão insuficiente bloqueia a operação.

Pós-condição — Cópia exportada, sem substituir o original. Regras RB01–RB12 do ENG-D01.

Fonte — POST export; evaluation-results em server/app.ts; server/domain.ts e server/db.ts.

## UC13 — Importar

Objetivo e atores — Importar, Moderador. Requisitos RF27.

Pré-condição — JSON compatível. Gatilho — ação correspondente na interface.

Fluxo — Selecionar arquivo; validar formato e estado; confirmar criação de nova sala; guardar novas credenciais.

Alternativas/exceções — Formato, tamanho ou vínculos inválidos são recusados.

Pós-condição — Novo processo independente; original não é sobrescrito. Regras RB01–RB12 do ENG-D01.

Fonte — POST /api/import em server/app.ts; server/domain.ts e server/db.ts.

## UC14 — Responder questionário

Objetivo e atores — Responder questionário, Participante. Requisitos RF26.

Pré-condição — Processo encerrado e sem resposta anterior. Gatilho — ação correspondente na interface.

Fluxo — Abrir avaliação; ler itens; preencher notas, N/A ou branco; confirmar consentimento e enviar.

Alternativas/exceções — Duplicação ou envio antes do fim é recusado.

Pós-condição — Resposta individual registrada. Regras RB01–RB12 do ENG-D01.

Fonte — POST evaluation em server/app.ts; server/domain.ts e server/db.ts.
## Limites

Documentação reconstruída do código congelado. A preparação automática pode produzir análise/síntese após voto ou consulta do moderador. A publicação continua humana. As figuras estão no catálogo, com fonte editável e ligação para renderização. Sequências e estados em ENG-D04.
