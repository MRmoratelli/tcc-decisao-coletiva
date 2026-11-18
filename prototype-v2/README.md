# Decisão Coletiva — V2
React + TypeScript + Vite, API Node.js/TypeScript, persistência PostgreSQL e adaptador Gemini.

A implementação amplia o React existente da branch `feat/vite-typescript-decisao-generica`, base `6e444ab2`. A versão Python, a branch backup, main, PR #4 e o deploy Streamlit são preservados.

## Implementado
- Propostas genéricas estruturadas, com campos opcionais e rascunho inicial preservado.
- Pareceres consultivos de proposta e contribuição; edição, contestação e envio sem parecer.
- Salas remotas com credenciais individuais; autorização e visibilidade por versão no servidor.
- ACEITO, REJEITO (justificativa obrigatória), ABSTENHO e PENDENTE derivado.
- Consenso exclusivamente por ACEITO de todos na mesma versão; nenhuma decisão é atribuída à IA.
- Rodadas e propostas versionadas; histórico de votos e contribuições mantido.
- Análise de objeções e síntese conciliadora com vínculos validados; publicação depende de revisão humana.
- Encerramento sem consenso com razão registrada.
- Snapshots PostgreSQL append-only pela aplicação, migrações 001/002 com checksum e controle de concorrência.
- Exportação/importação JSON v2; restauração cria sala nova e reemite credenciais.
- Questionário DSR integral de 22 itens e quatro abertas, pós-sessão com pelo menos duas rodadas.
- Exportação das respostas, frequências, médias descritivas, N/A e ausências separados; indicadores e preparação de codificação temática humana.

## Executar
Requer Node.js >=22.12, npm e uma base PostgreSQL/Neon nova, isolada.

```sh
cd prototype-v2
npm ci
# Criar .env a partir de .env.example, configurar somente credenciais novas de desenvolvimento.
# Gerar AUTH_PEPPER e REVIEW_SIGNING_KEY diferentes, com pelo menos 32 caracteres aleatórios.
# Depois de confirmar a base V2 isolada, definir V2_DATABASE_ISOLATED=true.
npm run migrate
npm run typecheck
npm test
npm run build
npm run dev
```

Frontend: http://localhost:5173. API: 127.0.0.1:8787. O proxy Vite encaminha /api.
`npm run start:api` executa apenas a API. O diretório dist contém apenas o frontend.

Em hospedagem remota, use HTTPS, proxy /api na mesma origem, PUBLIC_ORIGIN exata e API_HOST apropriado ao provedor. Restrinja a base ao ambiente V2. O parâmetro V2_DATABASE_ISOLATED é uma declaração operacional, não comprovação automática de isolamento.

Não existe uso de localStorage como banco, nem cache de credenciais persistente no navegador. Guarde os convites antes de abrir a sala. As credenciais não são recuperáveis; importação reemite acessos em outra sala.

## Validação e limites
Veja [evidências executadas](docs/VALIDACAO_V2.md), [especificação e rastreabilidade](docs/ESPECIFICACAO_V2.md) e [texto acadêmico prospectivo](docs/ACADEMICO_V2_PROSPECTIVO.md).

A validação inicial usou PGlite e IA sintética. A integração posterior foi executada contra Neon real e Gemini real pelo deploy HTTPS V2; as evidências de cada ambiente permanecem separadas. Nenhuma base histórica foi acessada. Não houve participantes reais, auditoria de segurança independente ou ensaio de carga.

## Avaliação exploratória
O instrumento está incorporado à sala, com identificação Pxx e aplicação após encerramento de pelo menos duas rodadas. Se houver consenso na primeira, registre a ocorrência e não force uma nova rodada para obter respostas. O questionário não tem validação psicométrica demonstrada.

No moderador, exporte processo e estatísticas. Para consolidar exportações:
```sh
npm run report:cohort -- relatorio.json export1.json export2.json
```
O relatório deduplica restaurações pelo originId, calcula taxa apenas entre processos concluídos e prepara campos vazios para codificação temática humana. Não atribui automaticamente temas, fidelidade ou qualidade argumentativa.

D19/SUS/D20 e o protocolo A/B anterior permanecem históricos. Sua aplicação na V2 depende de nova decisão acadêmica.

## Fontes e decisões
Documentos do orientador de 16/11/2026: análise SWOT/especificação v1.0 e questionário DSR v1.0, ambos consultados integralmente. React e participação remota autenticada são decisões do grupo, distintas da simulação Svelte/local proposta no documento.

## Integração e deploy reais — 17/11/2026

Aplicação: https://tcc-decisao-v2-test.onrender.com. Health check: /api/health. Render free, Node 22, frontend e /api na mesma origem, PUBLIC_ORIGIN HTTPS. Build: cd prototype-v2 && npm ci --include=dev && npm run build. Start: cd prototype-v2 && npm start.

Neon V2 isolado e quatro contratos Gemini reais validados. A sessão remota sintética 9658E82969 utilizou três identidades, duas rodadas, contestação, revisão operacional explícita, unanimidade e DSR com N/A. Exportação/importação e persistência após novo deploy passaram. Não é coleta científica ou avaliação humana independente.

Os quatro segredos foram autorizados e guardados nas variáveis privadas do backend. A chave ativa tcc-decisao-v2-render foi substituída e validada; a retirada da chave inicial, exibida durante leitura da interface, depende da confirmação da exclusão irreversível. Não há valores de credenciais nos arquivos versionados.

Consulte [integração real e pendências](docs/INTEGRACAO_REAL_V2.md), [evidência remota](docs/evidence/REMOTE_REAL.json), [protocolo DSR prospectivo](docs/PROTOCOLO_AVALIACAO_DSR_V2.md) e [comentários acadêmicos](docs/MATRIZ_COMENTARIOS_ORIENTADOR_V2.md).

O runtime usa somente a conexão pooled dc2_app; DATABASE_URL_V2_DIRECT de dc2_owner é exclusiva das migrações e não foi enviada ao Render. Cenário científico, amostra e consentimento permanecem pendentes de ratificação. A instância gratuita pode dormir e demorar a responder; cotas do Gemini podem mudar. Nenhum faturamento pago foi ativado.

Verificação remota opt-in: definir ALLOW_LIVE_REMOTE_TEST=true e V2_REMOTE_ORIGIN com a origem HTTPS, executar npm run validate:remote. O script salva acessos somente em .private (ignorado pelo Git) e retoma o mesmo teste. A primeira etapa gera um rascunho; --finish exige o arquivo privado de revisão operacional explicitamente confirmado. Se o teste já terminou, verifica o estado após novo deploy; --probe-ai acrescenta uma chamada Gemini de autenticação. Não copie esses arquivos privados para repositórios ou relatórios.
