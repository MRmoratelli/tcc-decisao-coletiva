# Validação da candidata V2 RC2 — 21/11/2026

Commit publicado: 516fe216935dbbb930041011444c994323b0d532.
Branch de referência: freeze/v2-rc2-20261121.
Deploy Render: dep-dc0sa0ss728c73b80lo0, confirmado live.
Aplicação: https://tcc-decisao-v2-test.onrender.com/
Auto-deploy: no/off, confirmado após publicação. A branch configurada no serviço continua feat/vite-typescript-decisao-generica. A seleção da branch freeze no painel continua pendente de autenticação/autorização do responsável.

## Verificação concluída
- TypeScript e build Vite aprovados.
- 117 testes aprovados, zero falhas: https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/44923945609
- Sessão exclusivamente sintética no commit publicado com Gemini real aprovada: https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/44924227817
- Dez identidades inscritas, termo 1.2-2026-11-21.
- Contrato de novos votos binário e pesquisa factual restrita ao moderador.
- Dez pareceres individuais usando a fila compartilhada; recuperação idêntica em cache e rejeição de novo pedido individual antes de 60 s.
- Análise e síntese com cobertura das dez manifestações e rascunho privado.
- Publicação humana simulada, segunda rodada sem votos transportados.
- Consenso somente após dez ACEITO na segunda rodada.
- Vinte votos e duas rodadas no JSON validado; cache operacional e credenciais ausentes da exportação.
- Sala técnica 0F4959164E: excluir da amostra científica.
- SHA-256 do JSON: 299bb33ff510df2022fb7626016430e7927ff7d6aba42e77e9d7b0e9a2eea3e5.
- Início 13:22:42 BRT; fim 13:23:57 BRT, em 21/11/2026.

A verificação da janela móvel e da prioridade foi feita com relógio controlado e orçamento compartilhado na suíte. O ensaio externo confirma o fluxo integrado; não é teste de carga nem estudo com participantes.

O artifact v2-simple-ten-synthetic-evidence contém exportação integral e relatório no workflow, com retenção de 30 dias. Este relatório estruturado é preservado neste commit documental para não depender da expiração do artifact.

## Pendências
- Repetir ensaio com amigos, incluindo revisão da síntese e publicação da segunda proposta pelo moderador real.
- Conferir e alinhar documentos externos de termo/roteiro/questionário antes da coleta. O termo incorporado foi atualizado; Google Docs/Forms e capítulos acadêmicos não foram editados nesta execução.
- Aprovar congelamento final e configurar branch do Render para a referência aprovada.

A causa histórica exata das três falhas anteriores permanece não comprovada, pois a versão antiga não gravou os detalhes. A candidata elimina entrada duplicada de manifestações, exige cobertura no contrato de geração e registra a etapa/categoria em falhas futuras; não se atribui a falha histórica ao limite de requisições sem evidência.

main, backup, PR #4, V1 Streamlit e Neon histórico preservados. Nenhuma migração destrutiva nem mudança de credenciais foi realizada.
