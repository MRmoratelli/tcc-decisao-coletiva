# Mapa de commits — protocolo experimental v1.1 e hardening de deploy

## Escopo e governança

Repositório: `MRmoratelli/tcc-decisao-coletiva`. Branch: `feat/protocolo-experimental-v1`. PR [#4](https://github.com/MRmoratelli/tcc-decisao-coletiva/pull/4) permanece aberto/em rascunho, sem merge. Referência de `main`: `b342030bb80eb4d03ff0ee39cb5d7751bfc88336`.

Os Commits 1–8 implementam o protocolo funcional; o Commit 9 consolida a documentação v1.1. Os Commits 10–11 surgiram durante a configuração real do deploy de teste no Streamlit/Neon e adicionaram diagnóstico seguro de PostgreSQL. O commit de regularização posterior mantém essa capacidade, restaura a compatibilidade da interface experimental com a fixture SQLite dos testes e adiciona cobertura automatizada. Nenhuma dessas alterações modifica regra decisória, condição A/B, taxonomia, cenário, mediação ou exportação científica.

| Nº | SHA | Mensagem | Entrega principal |
|---|---|---|---|
| 1 | `d499520cfe1928938d9097a679ff4efaa1a3ab45` | `feat: introduz modo experimental e taxonomia controlada` | EXPERIMENT_MODE, configuração e CAT01–CAT09 |
| 2 | `914137c5a23045489c1429b5f67deedf08bed41a` | `feat: adiciona contestação rastreável de categoria` | Contestação ligada à manifestação/edição e categoria final humana |
| 3 | `ab2d9428feafae1c1ba9079057f469827c894cad` | `privacy: minimiza identificação, logs e dados enviados à IA` | P01…Pn, sanitização, metadados mínimos e M01…Mn externos |
| 4 | `7d09536c5167d34b93aed2133d446aa9690d7662` | `feat: aplica visibilidade cega antes da própria manifestação` | Bloqueio por participante/proposta |
| 5 | `13bda09475275f0ea6b9381d97f683aba785ac5c` | `feat: padroniza condição B e rastreia revisão humana` | Template manual B, coverage e revisão humana |
| 6 | `d4d0ed1b2b2f1c925a3dd581661c21d231d78181` | `feat: implementa protocolo experimental de falhas` | Modelo único, fallback de classificação, duas execuções de mediação e gate PostgreSQL |
| 7 | `ed4b1cb12ca175b7efd6a8cf98d70385b07b6c15` | `feat: completa rastreabilidade e exportação experimental` | Schema 2, APP_COMMIT e trilhas |
| 8 | `25eff66cb970b63abb2b4561fb01793546f262f2` | `feat: valida restrições do cenário experimental` | Cenário escolar e alocações financeiras |
| 9 | `75a43517a0ec207e54c301b01524283e2d9064ee` | `docs: consolida protocolo experimental v1.1` | Documentação v1.1; CI 142/84 |
| 10 | `1219e6f330f34faff7deed4bc5a83010ab26f295` | `chore: add safe database diagnostics for experimental deploy` | Diagnóstico de falha de conexão sem exibir URL/segredos |
| 11 | `a228f7775ed97a2adc47386fe057b639455e6015` | `chore: classify safe postgres connection diagnostics` | Classificação segura: autenticação, DNS, timeout, SSL, conexão recusada, rede ou genérica |
| 12 | Identidade no Git do commit de regularização | `chore: regulariza diagnostico postgres do deploy` | Remove gate prematuro que quebrou os testes, mantém diagnóstico seguro testável e registra o hardening |

## Incidente e regularização

O Commit 11 falhou no workflow `Regras e interface`: 142 testes foram iniciados, com 1 falha e 25 erros de interface; a etapa PostgreSQL foi pulada. A causa foi o gate prematuro em `app.main()` que abortava a interface experimental quando `DATABASE_URL` estava ausente, impedindo a fixture SQLite controlada dos testes de interface.

A regularização restaura o desenho anterior: sem `DATABASE_URL`, a aplicação pode renderizar em SQLite e o gate de criação experimental continua sendo `experimental_storage_ready`. Quando uma `DATABASE_URL` real é fornecida e a construção do repositório falha, a interface exibe somente tipo/categoria/SQLSTATE, nunca a mensagem bruta da exceção, URL, usuário ou senha.

Há teste específico para garantir a classificação e a ausência da mensagem potencialmente sensível no retorno do helper. O CI completo do Commit 12 deve ser a evidência de regularização; não considerar a branch candidata a congelamento enquanto esse CI não estiver verde.

## Deploy de teste

O deploy de teste foi configurado no Streamlit Community Cloud para a branch `feat/protocolo-experimental-v1`, com PostgreSQL Neon. A conexão foi validada após correção de autenticação. Isso é evidência operacional de ambiente de teste, não resultado científico e não autoriza coleta real.

`APP_COMMIT` deve ser atualizado para o SHA do head efetivamente selecionado quando a build candidata for congelada. O valor declarado não prova sozinho o build implantado.

## Próximos gates

1. CI completo verde no commit de regularização.
2. Atualizar `APP_COMMIT` no deploy para o novo head após o CI.
3. Executar dry-run B e A em trilha dedicada.
4. Fechar D16 e calibração D20.
5. Somente depois definir o SHA candidato ao congelamento experimental.

O PR #4 permanece draft e a `main` não deve ser alterada nesta etapa.
