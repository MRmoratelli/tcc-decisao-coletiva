# Mapa de commits — protocolo experimental v1.1

## Escopo e governança

Repositório: `MRmoratelli/tcc-decisao-coletiva`. Branch: `feat/protocolo-experimental-v1`. PR [#4](https://github.com/MRmoratelli/tcc-decisao-coletiva/pull/4) aberto/em rascunho, sem merge. Referência de `main`: `b342030bb80eb4d03ff0ee39cb5d7751bfc88336`. Este mapa não comprova deploy.

Os SHAs 1–8 abaixo foram conferidos na lista de commits do PR. Não foram reescritos pelo commit documental. A implementação funcional documentada termina no Commit 8; o Commit 9 altera somente Markdown.

| Nº | SHA | Mensagem | Entrega principal |
|---|---|---|---|
| 1 | [`d499520cfe1928938d9097a679ff4efaa1a3ab45`](https://github.com/MRmoratelli/tcc-decisao-coletiva/commit/d499520cfe1928938d9097a679ff4efaa1a3ab45) | `feat: introduz modo experimental e taxonomia controlada` | EXPERIMENT_MODE, configuração e CAT01–CAT09 |
| 2 | [`914137c5a23045489c1429b5f67deedf08bed41a`](https://github.com/MRmoratelli/tcc-decisao-coletiva/commit/914137c5a23045489c1429b5f67deedf08bed41a) | `feat: adiciona contestação rastreável de categoria` | Contestação ligada à manifestação/edição e categoria final humana |
| 3 | [`ab2d9428feafae1c1ba9079057f469827c894cad`](https://github.com/MRmoratelli/tcc-decisao-coletiva/commit/ab2d9428feafae1c1ba9079057f469827c894cad) | `privacy: minimiza identificação, logs e dados enviados à IA` | P01…Pn, sanitização, metadados mínimos e M01…Mn externos |
| 4 | [`7d09536c5167d34b93aed2133d446aa9690d7662`](https://github.com/MRmoratelli/tcc-decisao-coletiva/commit/7d09536c5167d34b93aed2133d446aa9690d7662) | `feat: aplica visibilidade cega antes da própria manifestação` | Bloqueio por participante/proposta, sem agregados ou histórico antes da resposta |
| 5 | [`13bda09475275f0ea6b9381d97f683aba785ac5c`](https://github.com/MRmoratelli/tcc-decisao-coletiva/commit/13bda09475275f0ea6b9381d97f683aba785ac5c) | `feat: padroniza condição B e rastreia revisão humana` | Template manual B, coverage e vínculo sugestão → revisão → publicação |
| 6 | [`d4d0ed1b2b2f1c925a3dd581661c21d231d78181`](https://github.com/MRmoratelli/tcc-decisao-coletiva/commit/d4d0ed1b2b2f1c925a3dd581661c21d231d78181) | `feat: implementa protocolo experimental de falhas` | Modelo único, fallback de classificação, duas execuções de mediação e gate PostgreSQL |
| 7 | [`ed4b1cb12ca175b7efd6a8cf98d70385b07b6c15`](https://github.com/MRmoratelli/tcc-decisao-coletiva/commit/ed4b1cb12ca175b7efd6a8cf98d70385b07b6c15) | `feat: completa rastreabilidade e exportação experimental` | Schema 2, identidade histórica/exportador, APP_COMMIT e trilhas legíveis |
| 8 | [`25eff66cb970b63abb2b4561fb01793546f262f2`](https://github.com/MRmoratelli/tcc-decisao-coletiva/commit/25eff66cb970b63abb2b4561fb01793546f262f2) | `feat: valida restrições do cenário experimental` | Cenário escolar, V1 oficial e alocações financeiras validadas/rastreáveis |
| 9 | Identidade do próprio commit documental no Git; comando abaixo | `docs: consolida protocolo experimental v1.1` | README vigente, protocolo, checklist, histórico e conferência documental; sem alteração funcional |

## Identificar o SHA do Commit 9 sem inventar autorreferência

Este mapa integra o próprio Commit 9. Inserir literalmente o hash desse commit no seu conteúdo alteraria o hash que se tenta registrar. Por isso, seu SHA real deve ser obtido no metadado Git ou no relatório final da operação, não por placeholder com aparência de SHA e não por um commit posterior de preenchimento.

```bash
git log --all --format='%H %s' --grep='^docs: consolida protocolo experimental v1\.1$'
```

Também é possível conferir o [histórico da branch](https://github.com/MRmoratelli/tcc-decisao-coletiva/commits/feat/protocolo-experimental-v1) e a lista de commits do PR #4, verificando mensagem e pai direto `25eff66cb970b63abb2b4561fb01793546f262f2`. Esse comando é de leitura e não faz merge/deploy.

## Próxima etapa

**AUDITORIA FINAL DO PACOTE EXPERIMENTAL v1.1**, solicitada separadamente, deve conferir Commits 1–9, PR/CI, protocolo, documentação, exportação, privacidade, A/B, cenário, D16/D17 e configuração de deploy/readiness. Este mapa não executa a auditoria, não autoriza piloto e não propõe Commit 10.
