# ENG-D05 — Modelagem e Persistência de Dados

Processo de decisao · UVA · Engenharia da Computação
Versão 1.0 ·24/11/2026 · Origem CONSOLIDADO e RETROSPECTIVO
Commit científico `63189e5f21dd2794f5677894dc6cae04597095f5`.

TCC: Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva. Universidade Veiga de Almeida — Engenharia da Computação. Orientador: Prof. Carlos Alvaro de Macedo Soares Quintella.

## Separação física e lógica

As migrações 001–003 e server/db.ts definem a estrutura abaixo. Este documento verifica o esquema declarado no código, sem inspecionar tabelas ou dados da produção. A aplicação atual usa snapshots JSONB. Entidades como propostas e votos não são tabelas independentes. dc2_contributions é tabela legada conservada pela migração inicial, sem constituir o armazenamento principal dos novos fluxos.

### F07 — DER físico declarado nas migrações

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F07.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F07 DER físico declarado nas migrações](https://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/MRmoratelli/tcc-decisao-coletiva/9b15c14928e6a28ba0408f5a1aba5b9b04a88416/prototype-v2/docs/entrega-academica/diagramas/F07.puml)

Legenda sugerida — DER físico declarado nas migrações. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

### F08 — Modelo lógico dentro de JSONB

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F08.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F08 Modelo lógico dentro de JSONB](https://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/MRmoratelli/tcc-decisao-coletiva/9b15c14928e6a28ba0408f5a1aba5b9b04a88416/prototype-v2/docs/entrega-academica/diagramas/F08.puml)

Legenda sugerida — Modelo lógico dentro de JSONB. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

## Dicionário físico e restrições

### dc2_rooms

```sql
id UUID PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  proposal TEXT NOT NULL,
  proposal_review JSONB NOT NULL,
  moderator_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### dc2_participants

```sql
id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES dc2_rooms(id) ON DELETE CASCADE,
  alias VARCHAR(8) NOT NULL,
  secret_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, alias),
  UNIQUE(room_id, secret_hash)
```

### dc2_contributions

```sql
id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES dc2_rooms(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES dc2_participants(id),
  text TEXT NOT NULL,
  review JSONB NOT NULL,
  user_choice VARCHAR(24) NOT NULL CHECK(user_choice IN ('ENVIAR','ENVIAR_COM_RESSALVA')),
  receipt_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### dc2_snapshots

```sql
room_id UUID NOT NULL REFERENCES dc2_rooms(id),
 revision INTEGER NOT NULL CHECK (revision > 0),
 state JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(room_id,revision)
```

### dc2_migrations

```sql
version VARCHAR(80) PRIMARY KEY,
 checksum CHAR(64) NOT NULL,
 applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### dc2_provider_budget

```sql
id SMALLINT PRIMARY KEY CHECK (id=1),
 state JSONB NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Os tipos, chaves e constraints do bloco acima são transcrição estrutural das migrações. Há índice dc2_contributions_room_time sobre room_id/created_at. dc2_snapshots usa PK(room_id,revision), revision>0. dc2_provider_budget é ledger singleton com id=1 e JSONB de contadores/reservas, sem FK artificial para cada voto. A migração003 recupera uso externo prévio quando aplicável; não foi executada nesta etapa.

## Dicionário lógico do snapshot

|Estrutura|Campos principais|Finalidade e vínculo|
|---|---|---|
|decision|id,originId,title,status,createdAt,closedAt,closureReason|Identifica processo e encerramento|
|participants|id,alias|Habilitados e pseudônimos; credenciais fora do estado|
|proposals|id,version,parentId,content,review,intervention|Versões e revisão humana|
|rounds|id,number,proposalId,status,openedAt,closedAt|Rodada corresponde a proposta|
|votes|id,participantId,roundId,proposalId,choice,justification,createdAt|Posição formal vinculada|
|contributions|id,participantId,roundId,proposalId,originalText,text,review,contest|Original e enviado preservados|
|analyses|id,proposalId,roundId,sourceFingerprint,result,model,promptVersion|Interpretação e atualidade das fontes|
|syntheses|id,analysisId,result,publishedProposalId,humanCoverage|Rascunho e publicação humana|
|factualChecks|claims, fontes e metadados do contrato factual|Resultados consultivos externos|
|events|id,at,actor,type,detail|Sequência operacional|
|evaluations|participantId,input,applicationContext|Resposta individual e contexto|
|mediation|roundId,fingerprint,status,startedAt,detail|Preparação automática opcional|

## Atualização e concorrência

Repository.mutate inicia transação, bloqueia dc2_rooms com FOR UPDATE, recupera snapshot mais recente e compara expectedRevision. Executa função de domínio, valida o estado e insere revision+1. COMMIT confirma; erro provoca ROLLBACK. A autorização consulta hashes das credenciais. A leitura normal seleciona última revisão. O código de aplicação não atualiza snapshots antigos, mas isso não prova imutabilidade administrativa do banco.

## Recuperação e transporte

Reconexão recupera o último snapshot. Exportação gera formato dc2-consensus/version2 e remove reviewRequests temporários. Importação valida o estado e cria nova sala/acessos. Não sobrescreve a sala de origem. Cópias de segurança, política de retenção e recuperação de desastre dependem de gestão externa e não foram testadas nesta etapa. Conteúdo livre pode conter dado pessoal. Não divulgar snapshots reais para demonstração.

## Referências técnicas verificáveis

- [server/migrations/001_remote_rooms.sql](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/63189e5f21dd2794f5677894dc6cae04597095f5/prototype-v2/server/migrations/001_remote_rooms.sql)
- [server/migrations/002_consensus.sql](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/63189e5f21dd2794f5677894dc6cae04597095f5/prototype-v2/server/migrations/002_consensus.sql)
- [server/migrations/003_provider_budget.sql](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/63189e5f21dd2794f5677894dc6cae04597095f5/prototype-v2/server/migrations/003_provider_budget.sql)
- [server/db.ts](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/63189e5f21dd2794f5677894dc6cae04597095f5/prototype-v2/server/db.ts)
- [shared/contracts.ts](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/63189e5f21dd2794f5677894dc6cae04597095f5/prototype-v2/shared/contracts.ts)

## Antecedente histórico

O Modelo de Dados v1.1 de06/11 descreve o protótipo anterior, com nomes como dc_rooms e estados COLETA/REVISAO/ENCERRADA. Essas estruturas não foram apresentadas como esquema físico V2. A especificação integrada17/11 já descrevia o agregado JSONB em dc2_snapshots; esta consolidação confere as migrações001–003 e os contratos do commit final. O custo crescente de snapshots e a dependência das validações de aplicação permanecem limitações.
