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
- Questionário DSR com 22 itens e quatro abertas; variante proposta DSR-1.1-NATURALISTICO após encerramento de uma ou mais rodadas, preservando o original 1.0.
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
A variante proposta DSR-1.1-NATURALISTICO está incorporada à sala, com identificação Pxx, após encerramento com ou sem consenso de uma ou mais rodadas. Não force nova rodada. Os 22 itens e A1–A3 permanecem originais; A4 trata de usos futuros. N/A e ausência são separados. Revisão metodológica e pré-teste de compreensão devem preceder coleta científica; não há validação psicométrica demonstrada. O instrumento 1.0 histórico e sua condição original continuam preservados.

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

Os quatro segredos foram autorizados e guardados nas variáveis privadas do backend. A chave ativa tcc-decisao-v2-render foi conferida por comparação privada no backend e validada após novo deploy. Em 18/11/2026, a chave inicial tcc-decisao-v2-desenvolvimento foi excluída com autorização expressa; Gemini e HTTPS continuaram operacionais. Não há valores de credenciais nos arquivos versionados.

Consulte [integração real e pendências](docs/INTEGRACAO_REAL_V2.md), [evidência remota](docs/evidence/REMOTE_REAL.json), [protocolo DSR prospectivo](docs/PROTOCOLO_AVALIACAO_DSR_V2.md) e [comentários acadêmicos](docs/MATRIZ_COMENTARIOS_ORIENTADOR_V2.md).

O runtime usa somente a conexão pooled dc2_app; DATABASE_URL_V2_DIRECT de dc2_owner é exclusiva das migrações e não foi enviada ao Render. Cenário científico, amostra e consentimento permanecem pendentes de ratificação. A instância gratuita pode dormir e demorar a responder; cotas do Gemini podem mudar. Nenhum faturamento pago foi ativado.

Verificação remota opt-in: definir ALLOW_LIVE_REMOTE_TEST=true e V2_REMOTE_ORIGIN com a origem HTTPS, executar npm run validate:remote. O script salva acessos somente em .private (ignorado pelo Git) e retoma o mesmo teste. A primeira etapa gera um rascunho; --finish exige o arquivo privado de revisão operacional explicitamente confirmado. Se o teste já terminou, verifica o estado após novo deploy; --probe-ai acrescenta uma chamada Gemini de autenticação. Não copie esses arquivos privados para repositórios ou relatórios.

## Verificação factual — Tavily + Gemini 3.5

O mecanismo atual usa Tavily Search básica para recuperar até três resultados públicos e Gemini 3.5 Flash-Lite para classificação e interpretação consultiva. Os registros novos conservam URLs, trechos, relevância, data quando fornecida, request_id, créditos, horário e vínculos literais da interpretação. Não reutilizam widgets ou metadados exclusivos do Google Grounding. Registros antigos continuam legíveis como históricos.

Chave Tavily somente no backend Render; ativação exige Researcher gratuito e pay-as-you-go desligado, confirmados por TAVILY_RESEARCHER_CONFIRMED=true. **64 testes**, TypeScript/build e CI passaram. Uma Search real retornou três fontes por **1 crédito**, interpretadas pelo Gemini 3.5; dez identidades fictícias, exportação/persistência e interface móvel foram verificadas. Falhas temporárias Gemini e limites constam nas [evidências Tavily](docs/VERIFICACAO_FACTUAL_V2.md). Sem chave ou confirmação de plano, o fluxo retorna indisponibilidade e não tenta ativar faturamento.

## Ampliação Tavily e aplicação DSR — 19/11/2026

Tavily basic: 100 buscas/dia UTC, 15/minuto e orçamento mensal conservador de 1.000 reservas. Gemini factual: 250 chamadas/dia UTC e 12/minuto; quota gratuita observada de 500/dia, 15/minuto e 250 mil tokens de entrada/minuto, compartilhada com mediação. Até dez operações externas simultâneas, 60 requisições factuais/IP/minuto e 200 registros por sala. Os tetos não garantem volume de verificações completas. A migração **003_provider_budget** cria somente o ledger persistente no PostgreSQL V2; aplicar com o responsável pela base isolada antes de publicar o runtime novo. Não executa migração no Neon histórico. Sem o ledger, a busca falha de forma segura.

[Versão de aplicação proposta](docs/DSR_1_1_NATURALISTICO.md) · [Protocolo 0.3](docs/PROTOCOLO_AVALIACAO_DSR_V2.md) · [Trechos acadêmicos pontuais](docs/TRECHOS_ATUALIZACAO_CAP4_CAP5_V2.md). Frequências e médias excluem N/A e ausências; não respondentes são contados separadamente; relatórios identificam versão e contexto.

Fechamento: código 98781dca1a4ca58a548c8d4b6f4be8bcb8432bcf publicado na V2 de testes, migração 003 aplicada e CI 44577662452 aprovado. [Evidência dos limites e dos três casos remotos sintéticos](docs/evidence/LIMITES_DSR_VALIDACAO.json). Sem consumo externo adicional; pré-teste de compreensão e revisão metodológica permanecem necessários antes da coleta científica.
