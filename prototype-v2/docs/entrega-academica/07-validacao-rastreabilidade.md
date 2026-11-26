# ENG-D07 — Validação e rastreabilidade

## Evidência da versão congelada

| Verificação | Resultado registrado |
|---|---|
| Build e verificação TypeScript | Build Vite e verificações TypeScript concluídos na preparação da V2. |
| Testes automatizados | Em 26/11/2026, 127 testes passaram na cópia de teste. Os testes de rotas dessa execução usaram transporte em memória para exercitar Express em ambiente com loopback bloqueado e persistência de teste conforme cada suíte. |
| Deploy e disponibilidade | O Render registrou o deploy `dep-dc43rr59el5s73a58t20` do commit `ea225a5` como ativo. A página abriu e `/api/health` informou `status: ok` e `aiConfigured: true`. |
| Teste com Gemini externo | Na validação anterior ao congelamento, a revisão inicial devolveu um parecer para uma proposta fictícia. Na versão congelada foi verificada a configuração da IA pela rota de saúde. |
| Sessão acadêmica | As evidências de coleta existente referem-se à versão `63189e5`. Resultados daquela sessão devem ser citados com seu contexto e versão. |

## Matriz funcional

| Requisitos | Implementação | Testes de referência |
|---|---|---|
| RF01–RF02 | Formulário inicial e revisão assinada | [Criação e equivalência](../../src/initial-proposal.test.tsx), [API iniciais](../../server/initial-proposal-api.test.ts) |
| RF03 | Consentimento e ingresso | [Usabilidade da API](../../server/usability.test.ts), [usabilidade da interface](../../src/usability-components.test.tsx) |
| RF04–RF07 | Registro de voto, cronômetro, encerramento e ausência | [Ciclo de rodadas](../../server/round-lifecycle.test.ts), [controles da sala](../../src/components.test.tsx), [fluxo de voto](../../src/usability-components.test.tsx) |
| RF08–RF10 | Análise, vínculos, síntese, publicação e consenso | [Vínculos do parecer](../../server/linked-quotes.test.ts), [API da sala](../../server/api.test.ts), [fluxo simplificado](../../src/simplification-components.test.tsx) |
| RF11 | Saídas, histórico, exportação e avaliação | [Ciclo de rodadas](../../server/round-lifecycle.test.ts), [API de avaliação](../../server/evaluation-api.test.ts), [componentes de avaliação](../../src/evaluation-components.test.tsx) |
| RNF01–RNF05 | Domínio, configuração, recibos, snapshots e compatibilidade | [Domínio](../../server/domain.test.ts), [implantação](../../server/deployment.test.ts), [recibos](../../server/receipts.test.ts), [histórico factual](../../server/factual-api.test.ts) |

## Correspondência com os objetivos acadêmicos

| ID da entrega anterior | Cobertura na V2 congelada |
|---|---|
| R01 — Informação dispersa | Propostas, manifestações e histórico. |
| R02 — Evolução de propostas | Versões, rodadas e registro da intervenção humana. |
| R03 — Preservação do dissenso | Rejeição justificada, vínculo de fontes e pendências. |
| R04 — Sentido da síntese | Regras de cobertura, rastreabilidade e revisão humana. |
| R05 — Controle e influência | Aprovação da publicação pelo moderador e votos explícitos pelos participantes. |
| R06 — Ambiguidade de consenso | Unanimidade formal para uma mesma versão. |
| R07 — Confiabilidade factual | Parecer limitado aos dados fornecidos. Consulta factual externa desativada nesta versão. |
| R08 — Uso situado | Questionário exploratório e possibilidade de demonstração em cenário fictício. |

As verificações técnicas sustentam as afirmações sobre comportamento observado nos testes. A execução de um roteiro, a avaliação metodológica e a avaliação de efeitos sobre decisões coletivas têm evidências próprias.
