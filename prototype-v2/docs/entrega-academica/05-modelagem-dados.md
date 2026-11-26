# ENG-D05 — Modelagem e persistência de dados

## Modelo físico PostgreSQL

| Tabela | Chaves e dados |
|---|---|
| `dc2_rooms` | UUID primário, código único de dez caracteres, título, proposta e parecer iniciais, hash de moderador e criação. |
| `dc2_participants` | UUID primário, FK da sala, pseudônimo, hash de acesso e data de criação. Restrições de unicidade de pseudônimo e hash por sala. |
| `dc2_snapshots` | Chave composta por sala e revisão. Estado integral como JSONB e data de criação. |
| `dc2_contributions` | Estrutura histórica declarada na migração inicial, com FKs de sala e participante. No fluxo V2 documentado, os registros de deliberação são gravados no snapshot. |
| `dc2_migrations` | Versão, checksum e data de aplicação. |
| `dc2_provider_budget` | Linha identificada por `id = 1`, com estado JSONB do orçamento de chamadas externas. |

## Dados lógicos do snapshot

| Estrutura | Conteúdo |
|---|---|
| `decision`, `initialDraft`, `proposals` | Estado geral, rascunho inicial, versões publicadas e intervenções humanas. |
| `participants`, `enrollment`, `researchConsents` | Identidade pseudonimizada, vagas ocupadas, versão e horário do aceite. |
| `rounds[].voting` | Elegíveis, prazo comum, início individual quando aplicável e causa de encerramento com abstenções. |
| `votes`, `contributions`, `contests` | Posições, justificativas, pareceres associados a textos e contestações. |
| `analyses`, `syntheses`, `mediation` | Manifestações vinculadas por identificador, rascunhos e estado da preparação. |
| `events`, `evaluations`, `factualChecks` | Eventos do processo, respostas do questionário e registros factuais históricos compatíveis. |

O repositório usa transação e `FOR UPDATE` na sala para sincronizar cada mutação, consulta a revisão mais recente e insere outra revisão ao final. O JSON exportado contém estado e resultados derivados com validação na restauração. Na restauração, outra sala recebe novos acessos. O arquivo exportado pode conter manifestações e respostas de participantes, portanto seu compartilhamento segue as condições da pesquisa.

Figuras [F07 e F08](figuras/CATALOGO.md). Fontes: [migrações](../../server/migrations/), [repositório](../../server/db.ts) e [esquema de estado](../../server/domain.ts).
