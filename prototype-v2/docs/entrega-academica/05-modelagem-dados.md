# ENG-D05 — Modelagem e Persistência de Dados

Processo de decisao · UVA · Engenharia da Computação
Versão1.0 ·24/11/2026 · Origem CONSOLIDADO e RETROSPECTIVO
Commit científico `63189e5f21dd2794f5677894dc6cae04597095f5`.

## Separação física e lógica

As migrações001–003 e server/db.ts definem a estrutura abaixo. Este documento verifica o esquema declarado no código, sem inspecionar tabelas ou dados da produção. A aplicação atual usa snapshots JSONB. Entidades como propostas e votos não são tabelas independentes. dc2_contributions é tabela legada conservada pela migração inicial, sem constituir o armazenamento principal dos novos fluxos.

### F07 — DER físico declarado nas migrações

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F07.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F07 DER físico declarado nas migrações](https://www.plantuml.com/plantuml/png/~h407374617274756d6c0a736b696e706172616d2064656661756c74466f6e7453697a652031340a736b696e706172616d20736861646f77696e672066616c73650a736b696e706172616d206261636b67726f756e64436f6c6f722077686974650a656e74697479206463325f726f6f6d73207b0a2a6964203a2055554944203c3c504b3e3e0a2d2d0a636f6465203a207661726368617228313029203c3c55513e3e0a746f706963203a20746578740a70726f706f73616c203a20746578740a70726f706f73616c5f726576696577203a206a736f6e620a6d6f64657261746f725f68617368203a2063686172283634290a637265617465645f6174203a2074696d657374616d70747a0a7d0a656e74697479206463325f7061727469636970616e7473207b0a2a6964203a2055554944203c3c504b3e3e0a2d2d0a726f6f6d5f6964203a2055554944203c3c464b3e3e0a616c696173203a20766172636861722838290a7365637265745f68617368203a2063686172283634290a637265617465645f6174203a2074696d657374616d70747a0a7d0a656e74697479206463325f736e617073686f7473207b0a2a726f6f6d5f6964203a2055554944203c3c504b2c464b3e3e0a2a7265766973696f6e203a20696e7465676572203c3c504b3e3e0a2d2d0a7374617465203a206a736f6e620a637265617465645f6174203a2074696d657374616d70747a0a7d0a656e74697479206463325f636f6e747269627574696f6e73207b0a2a6964203a2055554944203c3c504b3e3e0a2d2d0a726f6f6d5f6964203a2055554944203c3c464b3e3e0a7061727469636970616e745f6964203a2055554944203c3c464b3e3e0a74657874203a20746578740a726576696577203a206a736f6e620a757365725f63686f696365203a2076617263686172283234290a726563656970745f68617368203a206368617228363429203c3c55513e3e0a637265617465645f6174203a2074696d657374616d70747a0a7d0a656e74697479206463325f6d6967726174696f6e73207b0a2a76657273696f6e203a207661726368617228383029203c3c504b3e3e0a2d2d0a636865636b73756d203a2063686172283634290a6170706c6965645f6174203a2074696d657374616d70747a0a7d0a656e74697479206463325f70726f76696465725f627564676574207b0a2a6964203a20736d616c6c696e74203c3c504b3e3e0a2d2d0a7374617465203a206a736f6e620a757064617465645f6174203a2074696d657374616d70747a0a7d0a6463325f726f6f6d73207c7c2d2d6f7b206463325f7061727469636970616e74730a6463325f726f6f6d73207c7c2d2d6f7b206463325f736e617073686f74730a6463325f726f6f6d73207c7c2d2d6f7b206463325f636f6e747269627574696f6e730a6463325f7061727469636970616e7473207c7c2d2d6f7b206463325f636f6e747269627574696f6e730a6e6f746520626f74746f6d206f66206463325f636f6e747269627574696f6e73203a20546162656c61206c65676164613b20666c75786f20617475616c2075736120736e617073686f74730a40656e64756d6c)

Legenda sugerida — DER físico declarado nas migrações. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

### F08 — Modelo lógico dentro de JSONB

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F08.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F08 Modelo lógico dentro de JSONB](https://www.plantuml.com/plantuml/png/~h407374617274756d6c0a736b696e706172616d2064656661756c74466f6e7453697a652031340a736b696e706172616d20736861646f77696e672066616c73650a736b696e706172616d206261636b67726f756e64436f6c6f722077686974650a656e74697479204465636973696f6e0a656e74697479205061727469636970616e740a656e746974792050726f706f73616c0a656e7469747920526f756e640a656e7469747920566f74650a656e7469747920436f6e747269627574696f6e0a656e7469747920416e616c797369730a656e746974792053796e7468657369730a656e74697479204576656e740a4465636973696f6e207c7c2d2d7c7b205061727469636970616e74203a20686162696c6974610a4465636973696f6e207c7c2d2d7c7b2050726f706f73616c203a20636f6e73657276610a50726f706f73616c207c7c2d2d7c7c20526f756e64203a20636f72726573706f6e64650a526f756e64207c7c2d2d6f7b20566f7465203a207265636562650a5061727469636970616e74207c7c2d2d6f7b20566f7465203a2072656769737472610a526f756e64207c7c2d2d6f7b20436f6e747269627574696f6e203a207265636562650a526f756e64207c7c2d2d6f7b20416e616c79736973203a2066756e64616d656e74610a416e616c79736973207c7c2d2d6f7b2053796e746865736973203a206f7269656e74610a4465636973696f6e207c7c2d2d6f7b204576656e74203a2072656769737472610a6e6f746520626f74746f6d203a204d6f64656c6f206c6f6769636f3b20656e74696461646573206e616f2073616f20746162656c617320696e646570656e64656e7465730a40656e64756d6c)

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
