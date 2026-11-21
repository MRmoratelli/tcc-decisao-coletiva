# Escopo de simplificação e recuperação da V2 — 21/11/2026

Base preservada: tag v2.0.0-dsr-20261121, commit a7b169edd5561bdf454e9bf302da3ca740dc19c5.
Implementação: branch feat/v2-fluxo-simples-20261121. Esta branch é candidata a novo ensaio; não é liberação científica.

## Afazeres e critérios
- [x] Atualizar o diário de achados com as decisões aprovadas.
- [x] Trocar uma revisão por rodada por intervalo INDIVIDUAL de 60 s entre novos pedidos, sem reinício por refresh/nova rodada. Cada identidade da sala tem seu relógio. Apenas um pedido em andamento; resposta idêntica pode ser recuperada sem nova chamada.
- [x] Controlar no backend todas as chamadas Gemini, inclusive tentativas e classificação/interpretação factual, com teto GLOBAL de 14 em janela móvel de 60 s. Reservas persistidas no orçamento PostgreSQL já existente; fila local com prioridade de mediação e espaçamento conservador. Falha do orçamento impede envio.
- [x] Apenas ACEITO e REJEITO em novos votos; rejeição exige justificativa. Preservar categorias antigas na leitura/importação/histórico. Ausência continua pendente; consenso exige todos ACEITO na rodada atual.
- [x] Mostrar painel do moderador por etapa. Recolher edição manual, pesquisa factual, revisão inicial, exportações e encerramento. Exibir editor automaticamente com síntese pronta.
- [x] Renomear publicação para “Publicar proposta e abrir próxima rodada”.
- [x] Restringir pesquisa factual ao moderador tanto na interface quanto no endpoint.
- [x] Indicar aplicação da sugestão inicial e alertar sobre marcadores de prazo/valor pendentes. Reforçar prompt contra placeholders/condições inventadas.
- [x] Registrar falha de mediação por etapa/código seguro, sem texto do provedor, credenciais ou argumentos nos logs. Preservar análise válida privada para reaproveitar em falha exclusiva da síntese.
- [x] Eliminar representações duplicadas da mesma manifestação no pedido de análise quando há fontes canônicas; exigir cobertura dessas fontes na gramática de geração. A validação de proveniência continua estrita.
- [x] Atualizar termo incorporado para 1.2-2026-11-21 e instruções afetadas. Questionário incorporado foi inspecionado: não menciona as duas categorias removidas; suas perguntas e identificação DSR-1.1 permanecem.
- [x] Completar build, testes de regressão, concorrência, janela móvel, intervalo individual e fluxo sintético com dez identidades.
- [x] Verificar serviço publicado e ensaio ponta a ponta com Gemini real.
- [ ] Conferir e alinhar documentos externos de termo/roteiro/questionário. Este arquivo não afirma que Google Docs/Forms já foram alterados.
- [ ] Repetir ensaio com amigos até revisão humana, publicação e novos votos.
- [ ] Somente depois aprovar referência final de congelamento e proteção da implantação.

## Diagnóstico e limites
A exportação do ensaio anterior confirmou três falhas em cerca de cinco segundos e seis votos preservados. A versão anterior guardou apenas uma falha genérica; a consulta de logs não revelou a causa. Não atribuir retrospectivamente a HTTP 503, quota ou número de participantes sem prova.

A nova versão corrige um risco concreto do contrato: o mesmo argumento podia aparecer simultaneamente em votes, contributions e manifestations, e campos de cobertura eram opcionais na geração. Essas mudanças reduzem ambiguidade e tornam os vínculos obrigatórios, mas não provam que esse foi o único motivo da falha histórica.

A análise validada fica privada até publicação de uma síntese pelo moderador; se a síntese falhar, nova tentativa reutiliza a análise somente com mesmo fingerprint, prompt e modelo. Mudança das fontes invalida o reaproveitamento.

O scheduler limita transmissões deste backend (serviço Render de uma instância), com orçamento compartilhado persistente. Outros clientes do mesmo projeto Gemini também consomem a quota e devem ser evitados durante sessões. Quotas de tokens, diária e disponibilidade externa continuam aplicáveis. Espera pode durar além de um minuto; a interface conserva rascunhos durante a operação. A fila pendente é local, reservas e intervalo individual são persistidos; se o processo reiniciar, pode ser necessária recuperação da consulta. Nenhum voto ou proposta é publicado pela fila.

O JSON científico exclui o cache operacional de pareceres. Exportações antigas não são reescritas. A reimportação cria cópia com credenciais novas; não altera a sala original.
