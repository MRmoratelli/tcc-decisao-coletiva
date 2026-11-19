# Integração real da V2 — evidência operacional

Data-base: 17/11/2026, America/Sao_Paulo. Evidências em UTC.
Branch: feat/vite-typescript-decisao-generica. Base preservada: af2f8097317326b29b222e23257f64d663aa90d8.

| Etapa | Estado | Comprovação |
|---|---|---|
| Neon | VALIDADO | Projeto V2 novo; migrações 001/002; papel dc2_app; persistência real local e pelo backend HTTPS, inclusive após novo deploy |
| Gemini | VALIDADO tecnicamente | analyzeProposal, analyzeContribution, analyzeObjections e synthesizeProposal reais, sem mocks; chave substituta autenticada |
| Deploy HTTPS | PUBLICADO | https://tcc-decisao-v2-test.onrender.com; GET /api/health 200; frontend servido pela mesma API Node |
| Sessão remota | EXECUTADA | Sala sintética 9658E82969, três participantes fictícios, duas rodadas, unanimidade explícita; restauração 7E22B89F29 |
| Segurança da chave inicial | CONCLUÍDA em 18/11/2026 | Chave inicial excluída com autorização expressa; substituta conferida privadamente e Gemini real aprovado antes e depois |
| Protocolo DSR | PROSPECTIVO | Cenário, amostra, recrutamento, consentimento e rubricas sujeitos à ratificação |

## Destinos e configuração efetiva
Render My Workspace: tea-dbug9kkipgvc738rb21g. Serviço srv-dbugi3dg1s2s73bpt3f0, tcc-decisao-v2-test, Node 22, free, Ohio. Repositório e branch conferidos antes da transmissão. Auto-deploy de código desativado; publicação manual e verificável. Health check configurado no provedor: /api/health.

SHA implantado e verificado: 5c33e8293a0a56e5573a65a0b5fac1a51e26c11c. Deploy dep-dbuha91srm7s73esdu0g. CI do código implantado: https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/44226838403 — completed/success. O verificador remoto foi publicado separadamente em 2c60110c0fb56ab70d9a8796f2caaec88f2de683; evidências/documentação posteriores não alteram o runtime implantado.

Build: cd prototype-v2 && npm ci --include=dev && npm run build. Start: cd prototype-v2 && npm start. PUBLIC_ORIGIN corresponde à origem HTTPS; API_HOST=0.0.0.0, PORT fornecida pela plataforma, V2_DATABASE_ISOLATED=true. Frontend React existente preservado; /api não depende de outro domínio.

DATABASE_URL_V2, AUTH_PEPPER, REVIEW_SIGNING_KEY e GEMINI_API_KEY foram autorizadas expressamente para esse backend e armazenadas nas variáveis privadas do serviço. Não há valores neste documento. A conexão administrativa DATABASE_URL_V2_DIRECT não foi enviada ao Render. Não foram reutilizadas credenciais históricas.

Neon: projeto polished-star-08552333, tcc-decisao-v2-dev; branch br-nameless-bird-bdw8qntw, v2-development; banco decisao_v2; região aws-us-east-2; PostgreSQL 17. A lista inicial de tabelas estava vazia. Migrações aditivas 001/002 conferidas. dc2_owner reservado à migração; dc2_app usa conexão pooled com TLS verify-full, INSERT nas tabelas operacionais e UPDATE(id) de rooms para bloqueio de transação; sem UPDATE/DELETE nos snapshots. Nenhuma branch histórica foi clonada ou consultada.

Gemini: projeto exclusivo tcc-decisao-v2, ID gen-lang-client-0344808389. Modelo gemini-3.5-flash-lite, prompt consensus-consultive-v2.0, timeout 30 s. Chave inicial identificada como restrita à Gemini API no Console; a substituta foi criada no mesmo projeto pelo AI Studio, cujo padrão de authorization key restringe a Generative Language API. Nome da ativa: tcc-decisao-v2-render. A nova chave existe somente nas variáveis privadas do backend; não foi gravada em arquivo local ou frontend.

O AI Studio mostrou nível gratuito; não foi ativado faturamento pago, cartão ou upgrade. O painel informa atraso de até 15 minutos, e não exibiu ainda as cotas detalhadas do novo projeto/modelo nesta conferência. Não se declara capacidade ilimitada nem custo futuro garantido. Render free pode suspender por inatividade e demorar 50 segundos ou mais no primeiro acesso.

## Sessão sintética remota efetivamente executada
1. Proposta genérica explicitamente fictícia sobre prioridades de projeto, sem orçamento ou cenário escolar. Parecer inicial real e manutenção deliberada do texto original no teste.
2. Criação de sala e três credenciais distintas. Três análises reais de contribuições, duas rejeições justificadas e uma abstenção; processo permaneceu aberto.
3. Contestação preservada, análise real de ambas as rejeições, citações literais e IDs validados pelo domínio.
4. Síntese real: duas objeções parcialmente atendidas e impasses explícitos de capacidade e velocidade. Nenhuma publicação ou consenso por IA.
5. Operador técnico revisou o rascunho no papel fictício de moderador, acrescentou condição de levantamento de capacidade e não assumiu a estimativa sem fonte. Publicação explícita de V2; todos retornaram a PENDENTE. Isso não é revisão humana científica independente.
6. Três novos ACEITO: somente o terceiro encerrou em CONSENSUS. Duas rodadas preservadas.
7. DSR armazenado por identidade: 22 N/A e quatro textos sintéticos, sem inventar percepções. Resultados descritivos e JSON exportados.
8. Importação em nova sala, novas credenciais, isolamento 401 e tentativa de operação de moderador por participante 403.
9. Novo deploy e nova conexão recuperaram o estado integral idêntico da sala original. Os probes iniciais confirmaram autenticação, mas não a identidade da chave. A conferência direta e a validação da substituta foram concluídas em 18/11/2026, conforme o fechamento abaixo.

Foram seis chamadas bem-sucedidas na sessão (um parecer inicial, três contribuições, uma análise e uma síntese), mais chamadas de autenticação; a identidade da substituta foi confirmada por comparação privada em 18/11/2026. As primeiras quatro usaram o commit 29d5ebc; análise e síntese, 5c33e82. A falha intermediária permanece no histórico como AI_FAILURE. Os tempos isolados não demonstram desempenho sob carga.

## Evidências e execução reproduzível
- evidence/REMOTE_REAL.json: resultado, commits por chamada, reconexão e autenticação da chave ativa.
- evidence/REMOTE_SESSION_SYNTHETIC.json: processo fictício integral, sem credenciais.
- evidence/REMOTE_DSR_SYNTHETIC.json: estatísticas de respostas de teste, não resultados científicos.
- evidence/GEMINI_REAL.json: contratos reais separados dos testes simulados.
- evidence/NEON_REAL.json e NEON_SESSION_SYNTHETIC.json: ensaio anterior com Neon real e API local, sem Gemini, preservado.
- server/live-remote.ts: execução HTTPS opt-in, retomável por checkpoint privado. Não utiliza ou lê a chave Gemini no cliente.

Pré-condições: ALLOW_LIVE_REMOTE_TEST=true e V2_REMOTE_ORIGIN com a origem Render HTTPS. Executar npm run validate:remote. A etapa inicial para antes da publicação; --finish exige .private/remote-approved-proposal.json com identificação da síntese, proposta revisada, razão e confirm=true. Após conclusão, novas execuções verificam persistência sem repetir a sessão. --probe-ai acrescenta somente uma análise de proposta real. Acessos e comprovantes ficam em .private, ignorado pelo Git; não distribuir esses arquivos.

## Validação e limites
A base de 39 testes não foi repetida como diagnóstico. Antes desta configuração, CI de 42 verificações já passara. Na alteração do adaptador/API executaram-se 22 verificações afetadas: 22 passaram, nenhuma falhou. TypeScript frontend/backend e build Vite executados e aprovados. O roteiro remoto executou APIs reais, Neon real e Gemini real; as regressões automatizadas usam IA sintética e PGlite. O CI correspondente deve ser consultado pelo SHA da entrega, sem somar contagens de execuções.

## Incidentes saneados
- A primeira análise de objeções falhou com TRANSPORT e sem status original conservado. A gramática foi simplificada removendo maxItems enviados ao provedor; Zod continua impondo todos os limites. Análise e síntese passaram na mesma sala após o ajuste. A causa exata da primeira resposta não é afirmada retrospectivamente. Foram acrescentados códigos HTTP 400 e diagnóstico saneado sem mensagens privadas do provedor.
- A cópia da área de transferência da interface inicialmente não disponibilizou valor; o health check permaneceu aiConfigured=false. O campo privado foi corrigido e só depois as chamadas reais passaram.
- A leitura inicial do diálogo da chave expôs o valor em uma saída da interface. Nenhum valor foi salvo no Git, frontend ou documentos. Foi criada uma substituta. Na conferência direta de 18/11/2026, constatou-se que a configuração ainda conservava a inicial: os probes anteriores não comprovavam a identidade da chave usada. A variável privada foi corrigida com persistência conferida após recarregar o Render; o novo processo autenticou com a substituta. A exclusão da inicial foi então autorizada expressamente, executada e confirmada pela ausência na lista ativa; outro probe Gemini real passou após a retirada. Não foi tocada a chave antiga do Streamlit.
- O primeiro verificador de reconexão comparou envelopes com exportedAt variável. Foi corrigido para comparar o estado integral, e a mesma sala passou sem alteração dos registros. O hash da exportação original continua identificado como hash daquele arquivo.

## Documentação acadêmica e preservação
Apenas o parágrafo de evidências técnicas do capítulo 5 na aba prospectiva foi atualizado. A aba histórica permaneceu idêntica na comparação do conteúdo. Comentários não foram apagados, respondidos ou resolvidos. A matriz editorial anterior permanece: referências e siglas tratadas na V2, âncora exata de indentação pendente. Não houve nova auditoria ampla, cenário oficial definido, dados empíricos ou aprovação acadêmica presumida.

backup b1ccffdbfcbcd638da56026b89adeabbcdd70c9d, main, PR #4 e deploy Streamlit preservados.

## Ações indispensáveis antes do pré-teste com pessoas
1. Segurança da chave inicial: concluída em 18/11/2026. Nenhuma outra chave foi alterada.
2. Ratificar com o orientador cenário, participantes, privacidade/consentimento e procedimento DSR; não reativar automaticamente A/B.
3. Conferir a cota efetiva disponível no dia, iniciar o serviço gratuito antes da sessão e manter exportações protegidas. Não foi realizado ensaio de carga, auditoria independente ou coleta científica.

## Fechamento da chave inicial — 18/11/2026
Foi excluída exclusivamente tcc-decisao-v2-desenvolvimento, após conferir a variável privada contra tcc-decisao-v2-render e validar o novo processo. A substituta permaneceu inalterada. Deploy dep-dbuhisgm7kps73ce6420, SHA acf4aed64ae541cb1f9ec75a4cfef72f3d519a9a. Chamada Gemini real aprovada antes da retirada (03:21:32 UTC) e após a retirada (03:22:11 UTC); página e /api/health HTTP 200; Render live. A sessão sintética persistida permaneceu idêntica. Não houve alteração de código, novas migrações ou exclusão de outros recursos. Evidência saneada: keyLifecycleClosure em evidence/REMOTE_REAL.json e evidence/GEMINI_REAL.json.

## Verificação factual externa — 18/11/2026

A entrega 1392e68992ea7a05d20f5fb2f3a14b74a8f8627a acrescentou uma operação consultiva separada, sem alterar os schemas dos quatro contratos Gemini. CI 44451108859, 56 testes sintéticos, TypeScript e build passaram. O deploy V2 dep-dbv6ntjm8hqs7394de1g ficou live; os quatro contratos Gemini, HTTPS e persistência Neon foram exercitados novamente em sala nova, com dez identidades fictícias e duas rodadas. Nenhuma sessão histórica foi modificada.

A consulta real ao modelo gemini-2.5-flash-lite recebeu MODEL_UNAVAILABLE (HTTP 404) já na classificação, tanto na API quanto na interface móvel. Nenhuma pesquisa Google, fonte, URL ou confirmação factual real foi produzida. O painel gratuito e suas quotas não garantiram acesso efetivo ao modelo legado. Não houve ativação de faturamento, fallback pago ou alteração de credenciais. A implementação e os testes sintéticos estão disponíveis, mas a capacidade de recuperar evidências reais permanece BLOQUEADA no projeto atual. Detalhes, decisões metodológicas atualizadas e limitações em [VERIFICACAO_FACTUAL_V2.md](VERIFICACAO_FACTUAL_V2.md); evidências saneadas em [FACTUAL_REMOTE.json](evidence/FACTUAL_REMOTE.json).

## Migração factual Tavily + Gemini 3.5 — 19/11/2026

A operação factual foi adaptada para classificação/interpretação pelo Gemini 3.5 Flash-Lite e recuperação exclusiva pela Tavily Search básica. Os quatro contratos existentes, o questionário DSR, a monografia e as sessões anteriores foram preservados. Registros Google antigos continuam legíveis, sem conversão artificial para Tavily; os novos registros têm metadados e vínculos próprios.

Validação local: 62 testes sintéticos, TypeScript frontend/backend e build Vite aprovados. O acesso à conta Tavily e a configuração privada ainda precisam ser confirmados antes de afirmar recuperação externa real. Não foi criada conta/chave nem ativado faturamento. Consulte [documentação factual](VERIFICACAO_FACTUAL_V2.md), [testes](evidence/TAVILY_TESTS.txt) e [build](evidence/TAVILY_BUILD.json). O roteiro opt-in server/live-tavily.ts não transmite chaves de provedores ao cliente nem executa busca quando o backend informa configuração incompleta.

## Fechamento Tavily executado — 19/11/2026

A limitação histórica de recuperação externa foi superada na operação factual Tavily + Gemini 3.5. Código `43e6dc5c216c59f636670f9c601d7e28d133256b`, deploy `dep-dbvi2t2fngtc73cb9pvg` live, HTTPS 200 e CI 44564443893 aprovado com 64 testes, TypeScript e build. Uma Search básica real recuperou três fontes e informou um crédito; o painel Researcher confirmou uso 0 → 1 e pay-as-you-go desligado. Gemini 3.5 classificou e interpretou o fato público, conservando os vínculos literais. Datas ausentes permaneceram nulas.

Falhas temporárias 503/504/502 foram registradas, sem sucesso presumido. A retomada da interpretação reutilizou a recuperação original e não gastou outro crédito Tavily. Os quatro contratos antigos permaneceram inalterados e passaram em regressão; a revalidação real de todos eles não se completou nesta execução por falhas do provedor. Dez identidades fictícias, duas rodadas, contestações, unanimidade somente após dez aceitações explícitas, exportação/importação, leitura Neon e interface móvel foram conferidas. O estado histórico Google permaneceu idêntico.

Detalhes verificáveis, fontes, screenshots e limites: [VERIFICACAO_FACTUAL_V2.md](VERIFICACAO_FACTUAL_V2.md) e [TAVILY_REAL.json](evidence/TAVILY_REAL.json). Os parágrafos anteriores descrevem etapas históricas; a configuração Tavily agora está ativa. Não houve alteração de main, backup, PR #4, Streamlit, Neon histórico, monografia ou questionário. Não são resultados científicos com participantes reais.
