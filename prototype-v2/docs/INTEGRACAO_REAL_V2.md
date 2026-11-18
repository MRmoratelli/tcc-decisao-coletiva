# Integração real da V2 — evidência operacional

Data-base: 17/11/2026, America/Sao_Paulo. Evidências em UTC.
Branch: feat/vite-typescript-decisao-generica. Base preservada: af2f8097317326b29b222e23257f64d663aa90d8.

| Etapa | Estado | Comprovação |
|---|---|---|
| Neon | VALIDADO | Projeto V2 novo; migrações 001/002; papel dc2_app; persistência real local e pelo backend HTTPS, inclusive após novo deploy |
| Gemini | VALIDADO tecnicamente | analyzeProposal, analyzeContribution, analyzeObjections e synthesizeProposal reais, sem mocks; chave substituta autenticada |
| Deploy HTTPS | PUBLICADO | https://tcc-decisao-v2-test.onrender.com; GET /api/health 200; frontend servido pela mesma API Node |
| Sessão remota | EXECUTADA | Sala sintética 9658E82969, três participantes fictícios, duas rodadas, unanimidade explícita; restauração 7E22B89F29 |
| Segurança da chave inicial | PENDENTE | Substituta ativa privada e validada. Retirada da inicial exibida em uma saída da interface aguarda confirmação de exclusão irreversível |
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
9. Novo deploy e nova conexão recuperaram o estado integral idêntico da sala original. A chave substituta passou por nova chamada analyzeProposal no backend HTTPS.

Foram seis chamadas bem-sucedidas na sessão (um parecer inicial, três contribuições, uma análise e uma síntese), mais uma chamada de autenticação da substituta. As primeiras quatro usaram o commit 29d5ebc; análise e síntese, 5c33e82. A falha intermediária permanece no histórico como AI_FAILURE. Os tempos isolados não demonstram desempenho sob carga.

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
- A leitura inicial do diálogo da chave expôs o valor em uma saída da interface. Nenhum valor foi salvo no Git, frontend ou documentos. Foi criada uma substituta, configurada exclusivamente no backend e autenticada. A interface de retirada da inicial adverte que a ação não pode ser desfeita; essa exclusão aguarda confirmação específica. Não foi tocada a chave antiga do Streamlit.
- O primeiro verificador de reconexão comparou envelopes com exportedAt variável. Foi corrigido para comparar o estado integral, e a mesma sala passou sem alteração dos registros. O hash da exportação original continua identificado como hash daquele arquivo.

## Documentação acadêmica e preservação
Apenas o parágrafo de evidências técnicas do capítulo 5 na aba prospectiva foi atualizado. A aba histórica permaneceu idêntica na comparação do conteúdo. Comentários não foram apagados, respondidos ou resolvidos. A matriz editorial anterior permanece: referências e siglas tratadas na V2, âncora exata de indentação pendente. Não houve nova auditoria ampla, cenário oficial definido, dados empíricos ou aprovação acadêmica presumida.

backup b1ccffdbfcbcd638da56026b89adeabbcdd70c9d, main, PR #4 e deploy Streamlit preservados.

## Ações indispensáveis antes do pré-teste com pessoas
1. Confirmar retirada irreversível apenas da chave inicial V2 tcc-decisao-v2-desenvolvimento; a substituta já funciona.
2. Ratificar com o orientador cenário, participantes, privacidade/consentimento e procedimento DSR; não reativar automaticamente A/B.
3. Conferir a cota efetiva disponível no dia, iniciar o serviço gratuito antes da sessão e manter exportações protegidas. Não foi realizado ensaio de carga, auditoria independente ou coleta científica.
