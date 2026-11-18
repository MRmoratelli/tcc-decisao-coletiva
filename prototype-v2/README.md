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

Os testes de integração executam HTTP real e PostgreSQL embarcado PGlite, com IA sintética. PGlite é dependência de teste, não o banco do servidor de produção. **Isso não certifica Neon nem Gemini reais.** As novas credenciais não estavam disponíveis na execução; nenhuma base histórica foi acessada.

Não houve deploy V2 nem teste com participantes reais. O controle de acesso foi testado na API; não houve auditoria de segurança independente ou ensaio de carga.

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
