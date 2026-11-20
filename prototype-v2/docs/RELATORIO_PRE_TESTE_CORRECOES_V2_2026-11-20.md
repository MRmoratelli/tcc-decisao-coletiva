# Relatório técnico — cinco correções do pré-teste V2

**Data:** 20/11/2026. **Natureza:** implementação, regressão e ensaios exclusivamente sintéticos. Não representa coleta científica, validação psicométrica ou demonstração de eficácia com o grupo do churrasco.

## Resultado e limite de conclusão

As cinco correções foram implementadas. Posições, revisão humana, pesquisa externa, sincronização, persistência e restauração foram exercitadas na V2 remota. A análise abrangente e a síntese com proveniência passaram em testes com IA simulada, mas a revalidação com Gemini real ficou **bloqueada por respostas HTTP 503**. Portanto, não se declara concluído o critério de análise/síntese real. A falha não foi atribuída sem evidência a quota, Tavily ou schema.

## Diagnóstico confirmado e correções

| Achado | Causa confirmada no código anterior | Correção | Evidência e situação |
|---|---|---|---|
| Ausência de ACEITO COM RESSALVAS | Enum e controles de voto continham somente três estados. | Quarto estado ACEITO_COM_RESSALVAS, justificativa obrigatória, histórico, métricas, exportação/restauração e encaminhamento à análise. | Testes e sala remota com dez identidades; corrigido e validado. Não equivale a ACEITO nem a REJEITO. |
| Análise/síntese centradas em rejeições | Contratos e validações estruturavam principalmente objeções, embora contribuições adicionais fossem encaminhadas em parte. | Vetor canônico de todas as posições, contribuições e contestações; cobertura de IDs, categorias e citações literais; síntese com consideredSourceIds e sourceIds nas mudanças. | Doze fontes em fixture completa e regressão; implementado e validado com IA simulada. Revalidação Gemini real bloqueada por 503. |
| Pergunta pública não pesquisada | Gate factual pesquisava somente FATO_VERIFICAVEL. INFORMAÇÃO_INSUFICIENTE e outras categorias retornavam sem Search. | Modalidades VERIFY/RESEARCH, categoria SOLICITACAO_PESQUISA, esclarecimento de ano ausente, metadados de etapa/consulta e mensagens distintas. | Duas Search reais, dois créditos observados; classificação/interpretação efetivas, incluindo insuficiência para hospedagem. |
| Intervenção humana pouco visível | Publicação guardava versões e motivo, mas não comparação estruturada suficiente entre origem IA, edição e publicação na tela participante. | Metadados opcionais intervention, original/publicado, autoria funcional, motivo, horário, tipo e diferenças por campo. Aviso e comparação na proposta atual e histórico. | Revisão manual real persistida; edição de síntese FakeAI em fixture explícita; original preservado, comparação visível e exportável. |
| Nova rodada exigia Atualizar | Frontend atualizava a sala somente por ações locais ou atualização manual. | Polling de quatro segundos, sem sobreposição, pausa de aba oculta, resposta leve por revisão conhecida, retorno completo quando há alteração e reconexão. | Chrome moderador e navegador independente participante; segunda rodada e encerramento automáticos. Rascunho preservado e voto antigo bloqueado. |

## Regras preservadas

Consenso formal continua a exigir ACEITO explícito de todos os habilitados sobre a mesma versão. Apoio condicionado, rejeição, abstenção e ausência de resposta não satisfazem unanimidade. O moderador não altera posição alheia. A IA não vota, publica ou decide consenso. Encerramento sem consenso permanece legítimo.

A análise distingue apoio, ressalva, objeção, abstenção, contribuição e contestação. O voto e a contribuição vinculada com o mesmo autor/texto não são contados duas vezes. Cobertura de IDs, trechos literais e categorias é verificada automaticamente; completude semântica e fidelidade absoluta não são garantidas por essas validações. Interpretação da IA permanece separada do texto original. Novo material ou contestação invalida a análise anterior para síntese.

Dados históricos sem campos novos continuam legíveis e não recebem diferenças retroativas inventadas. Importação valida vínculos/diferenças de registros novos. Evidências externas importadas são marcadas como não autenticadas localmente, sem fingir nova consulta. Nenhuma migração destrutiva foi introduzida.

## Arquivos de implementação

- shared/contracts.ts; shared/factual.ts.
- server/ai.ts; server/app.ts; server/domain.ts; server/db.ts; server/factual.ts.
- src/App.tsx; src/api.ts; src/components/RoomWorkspace.tsx; src/components/FactualPanel.tsx.
- server/fixtures.ts; server/api.test.ts; server/pretest-corrections.test.ts; src/pretest-components.test.tsx.
- server/reproduce-pretest-fixture.ts: gerador offline explícito (--run), somente FakeAI e dados fictícios, sem chamadas externas.

Não houve alteração em shared/instrument.ts, nos 22 itens, nas quatro abertas, nas instruções DSR-1.1 ou no documento original do orientador.

## Ensaios automatizados

As execuções CI das correções registraram **81 testes, 81 aprovados, zero falhas**: 74 anteriores e sete novos. Os sete novos cobrem posições, proveniência, fluxo com dez identidades, fontes, modalidades factuais, falhas e interface. Há testes anteriores de limites persistentes, consenso, importação/exportação e DSR. A execução final deve ser identificada pelo commit/CI no índice de entrega; não se somam execuções repetidas para inflar a contagem.

Verificações locais: 13 testes focados aprovados; TypeScript frontend e backend e build Vite aprovados após correção de tipos no mock. A execução local dos testes HTTP é limitada pelo bloqueio de bind/network do ambiente; a suíte HTTP completa roda no CI Linux. Logs de testes e evidências ficam nesta pasta. Não foram usados 100 créditos reais para testar tetos.

Foram testados: preferência sem busca; esclarecimento de ano; fato corroborado; pergunta causal de dólar; pesquisa de hospedagem; fonte ausente/antiga; falha Tavily; falha Gemini; quota; cache/reuso; citações sem fonte; fonte inexistente; cobertura incompleta; ressalva em branco; duplicação vinculada; importação histórica; aprovação sem edição; intervenção inicial/IA; conflitos de rodada e reconexão simulada.

## Ensaio remoto com dez identidades fictícias

A sala técnica teve duas rodadas e 20 votos. Rodada 1: quatro ACEITO, dois ACEITO COM RESSALVAS, dois REJEITO e dois ABSTENHO; 11 contribuições e uma contestação. Os textos eram sintéticos e estavam explicitamente identificados. Nenhum dado pessoal real foi utilizado.

A análise Gemini retornou 503 nas tentativas realizadas. Uma sala diagnóstica de duas manifestações também retornou 503. Uma simplificação experimental da gramática de geração não resolveu o erro e foi revertida; o resultado novo continua sujeito ao schema completo. Não se apresenta essa experiência como causa comprovada do 503.

O moderador publicou a segunda versão **manualmente, por contingência**, com motivo que identifica a indisponibilidade Gemini. A proposta não foi atribuída a uma síntese Gemini inexistente. O navegador participante recebeu a nova rodada sem Atualizar ou recarregar. O rascunho anterior ficou visível, envio desabilitado até confirmação e reutilização dependente de ação humana. Tentativa de votar sobre rodada anterior retornou 409.

Na segunda rodada, nove ACEITO mantiveram OPEN; o décimo ACEITO explícito sobre a mesma proposta produziu CONSENSUS. Operações concorrentes com conflito foram reaplicadas somente após ler a revisão atual. Exportação e importação em sala nova preservaram duas rodadas, 20 votos, duas ressalvas históricas e três registros factuais. Nenhuma sessão anterior foi sobrescrita. Não foram respondidos questionários para criar resultados fictícios.

A demonstração separada com **IA SIMULADA** contém 12 fontes canônicas, análise, síntese, comparação da sugestão com edição do moderador e dez aceitações na segunda rodada. Foi gerada offline, importada em sala técnica nova e identificada como FakeAI, sem alegar resposta Gemini real.

## Tavily real e integridade das fontes

Duas requisições Search basic distintas retornaram **creditsUsed = 1 cada**, total observado de dois créditos.

1. “A Lua é um satélite natural da Terra.” Request ID 9d3efa37-cb22-485a-96ee-50d81e55f8f5. Três fontes: https://pt.wikipedia.org/wiki/Lua ; https://brasilescola.uol.com.br/geografia/lua.htm ; https://dpid.cidadaopg.sp.gov.br/pde/arquivos/1620150381790~5%C2%BAano%20-%20Ci%C3%AAncias%20v.02%20-%20Semanas%207%20e%208.pdf . Gemini classificou e interpretou EVIDENCIA_FAVORAVEL, com vínculos literais aos trechos recuperados.
2. “Quais hospedagens existem em Búzios e Ilha Grande de 25 a 31 de dezembro de 2026?” Request ID 0bf6e393-7463-49db-afc1-59d0b4fac9aa. Fontes: https://www.instagram.com/reel/DfsNChSthnm e https://bonito-paraiso-ilha-grande.allriodejaneirohotels.com/pt . Escores aproximadamente 0,273 e 0,260; datas não fornecidas. Primeira interpretação Gemini falhou com 503; retomada reaproveitou as fontes e retornou EVIDENCIA_INSUFICIENTE.

Não foi afirmado preço mais barato, disponibilidade ou comparação temporal a partir desses resultados genéricos. O retorno de fontes não implica confirmação. A consulta causal sobre dólar foi testada com mocks; não se afirma validação factual externa real dessa pergunta.

Os registros preservam consulta original, modalidade, termos efetivos, horário UTC, metadados reais, URLs, títulos, trechos, relevância, datas quando disponíveis, IDs do provedor, hashes, modelo retornado, versão, incertezas, falhas e contestação. Nenhuma URL foi criada pelo texto do Gemini; a associação usa IDs de resultados Tavily e citação literal. Isso prova proveniência estrutural, não a verdade integral do conteúdo de terceiros. Fontes são dados não confiáveis.

Tetos mantidos: Search 100/dia UTC, 15/minuto, 1.000 reservas/mês; Gemini factual 250/dia UTC e 12/minuto; dez operações externas. Controle persistente PostgreSQL não reinicia com deploy. Ledger antes/depois: Search 1→3 no dia, 2→4 no mês; Gemini factual 10→15. O ledger registra reservas, não um extrato financeiro do provedor. Quotas e disponibilidade reais podem impedir volume nominal, e os quatro contratos de mediação não estão no contador factual. Nenhum faturamento pago, plano superior ou chave nova foi habilitado.

## Interface e sincronização

Testes visuais desktop e viewport móvel de 375 px; ausência de transbordamento horizontal observada. Trata-se de emulação responsiva em navegador, sem validação em aparelho físico. Quatro posições, fontes, motivos de revisão, comparação e formulário foram conferidos. São 22 seletores fechados e quatro campos abertos preservados, sem resposta pré-selecionada.

Polling consulta revisão leve e somente traz o estado completo filtrado por papel quando há mudança. Autorização ocorre antes da consulta; versões antigas do cliente continuam usando /view completo. Aba oculta pausa consultas. Falha mantém a sala e os rascunhos, mostra aviso e permite Atualizar. O servidor rejeita voto com rodada/proposta/revisão antiga. O intervalo de quatro segundos não constitui garantia de latência; a observação real capturou a mudança após publicação, sem clique manual. Conexão instável foi exercitada com mock, não por queda deliberada da rede do usuário.

## Preservação

Conferência read-only no Neon exclusivo V2: os **147 snapshots** anteriores a 2026-11-20T16:28:55.081Z conservaram o hash agregado **5e0a42c4ce18d7d60d224182ce20a930**. Essa é evidência de integridade, não um dump completo. Histórico append-only e commits/deploys anteriores foram preservados. Não foram alterados main, backup, PR #4, V1 Streamlit, Neon histórico, credenciais ou permissões. PR #4 foi lido como aberto e em rascunho.

## Evidências

- [Quatro posições desktop](evidence/PRETESTE_RESSALVAS_DESKTOP.jpg) e [móvel](evidence/PRETESTE_RESSALVAS_MOBILE.jpg).
- [Sincronização móvel](evidence/PRETESTE_SINCRONIZACAO_MOBILE.jpg) e [registro antes/depois](evidence/PRETESTE_SINCRONIZACAO_REAL.json).
- [Edição de síntese IA SIMULADA](evidence/PRETESTE_REVISAO_HUMANA_IA_SIMULADA.jpg) e [revisão manual remota](evidence/PRETESTE_REVISAO_MANUAL_MOBILE.jpg).
- [Fluxo completo FakeAI](evidence/PRETESTE_FLUXO_IA_SIMULADA.json); [sala remota sintética](evidence/PRETESTE_FLUXO_REAL_SINTETICO.json); [dez identidades e consenso](evidence/PRETESTE_DEZ_IDENTIDADES_REAL.json).
- [Pesquisa real Tavily/Gemini](evidence/PRETESTE_FACTUAL_REAL.json); [restauração](evidence/PRETESTE_RESTAURACAO_REAL.json); [integridade Neon](evidence/PRETESTE_PRESERVACAO_NEON.json).
- [Protocolo incremental v0.4](PROTOCOLO_AVALIACAO_DSR_V2.md); [documentação factual atualizada](VERIFICACAO_FACTUAL_V2.md).

## Atualização acadêmica pontual e pendências reais

A monografia de 19/11 é preservada sem edição; a atualização de 20/11 utiliza cópia versionada, com ajustes pontuais nos capítulos 4, 5 e 6 e correção de coerência sobre as posições no capítulo 2. Capítulo 6 separa ocorrências do pré-teste, ensaios sintéticos e resultados científicos futuros. Protocolo v0.4 documenta as mudanças funcionais, preservando o original e o anexo do instrumento. Espelhos Drive são estáticos e devem indicar commit-fonte.

Pendente técnico: obter resposta bem-sucedida real do Gemini nos contratos ampliados e executar sua síntese conciliadora real; repetir somente esse gate quando o provedor estiver disponível. Não é necessário fabricar divergências ou substituir pesquisa real por mock.

Pendências científicas: completar pré-teste de compreensão do instrumento, registrar eventuais ajustes metodológicos autorizados, definir guarda/acesso/retenção e conduzir a avaliação real. O grupo tem necessidade autônoma de organizar seu churrasco; moderador integrante do grupo do TCC; um grupo, uma condição com IA, sem A/B ou avaliação independente adicional de fidelidade. Não houve criação de respostas, notas ou conclusões científicas.
