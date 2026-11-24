# ENG-D05 — Modelagem e Persistência de Dados

Processo de decisao · UVA · Engenharia da Computação
Versão 1.0 ·24/11/2026 · Origem CONSOLIDADO e RETROSPECTIVO
Commit científico `63189e5f21dd2794f5677894dc6cae04597095f5`.

TCC: Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva. Universidade Veiga de Almeida — Engenharia da Computação. Orientador: Prof. Carlos Alvaro de Macedo Soares Quintella.

## Separação física e lógica

As migrações 001–003 e server/db.ts definem a estrutura abaixo. Este documento verifica o esquema declarado no código, sem inspecionar tabelas ou dados da produção. A aplicação atual usa snapshots JSONB. Entidades como propostas e votos não são tabelas independentes. dc2_contributions é tabela legada conservada pela migração inicial, sem constituir o armazenamento principal dos novos fluxos.

### F07 — DER físico declarado nas migrações

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F07.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F07 DER físico declarado nas migrações](https://www.plantuml.com/plantuml/png/0Oa4Tlj0StHXSdHrRMmASsjfRd1XSc5j86HbPc5rR7H6RsvqKsbwPI0nD0fpQsbkS65oOMqWSsXXP6ztQMvd86PXR7Db2dDhQMvmON9XRI1YOMDhPt9lTMvaGsziRt8WTsXfT6KAPMvqQNHv86HZCbzoRszjSo1x2YffP20w85LLIKGWF3nGIpu-2Yqj2cDlP6KWEY1sON9ZQ65oA34mAI0yF5LHFZuAT6zmQMCWEY1qPNXq2d1oRt1lSs5i83eWT6LuT0fmSczmRtDXR5zoPNPfPNSWEY1gSszkOWfjRsHbSc5qRt9VQ65pQ20w86DeON8eDZGf2cDoPM5qPMHVONGWEY1qQMrbStHXRN1qUWfz2cLkT6bqUI1aOp9VS65oT6bZQN1XRdHp87iAAcba83eWLLL9H20yF51BFZuABIqASczlRLzfP20w85LLIKGWF3n6Ipu-2c5iQM5p83eWTc5oOsXXSYWuAGfpPMDoPNHVQ65pQ20w86DeON8eDZGf2cDoPM5qPMHVONGWEY1qQMrbStHXRN1qUWfz2cLkT6bqUI1aOp9VSsvXS7DeRtHp87iAAd9lRsrVQMGWEY1LLKb483myK4iiHai-FWegScLsQNDfRsuWEY1fRdHbPsLo83myK4i-FWejBGfpT65qPI0w86fpRsvY2cDoPM5qPMHVONGWEY1qQMrbStHXRN1qUWfz2cLkT6bqUI1aOp9VOszkT79fOdLqQMzkSo1x2YffP20w85LLIKGWF3nGIpu-2Yqj2d9lRsrVQMGWEY1LLKb483myHai-FWfmON9qQMDfS65kT5zfP20w85LLIKGWF3n6Ipu-2dHbU7GWEY1qPNXq2d9bTcbbTo0w86fpRsvY2dLpPN9VOsXlQMDb83eWTc5oOsXXSYWoD2aAScLZPMbmT5zeONDe83eWOsXXSYWsD2aWF3nLKJu-2cDoPM5qPMHVONGWEY1qQMrbStHXRN1qUWfz2cLkT6bqUI1aOp9VRMbdSc5qQMzkSo1x2YfsPN9pQMzk83eWTc5oOsXXSYWuC2aWF3nGIpu-2Yqj2cDePMDhStLj83eWOsXXSYWsD2aAON1mR6bbP5zXT20w87HfRMLpT65jS7Hw2dqAPMvqQNHv86HZCbzmSczsQMHbSbzYTMHdPNGWUmegQMGWEY1pRM5iR6bkT20yF51BFZuABIqAStHXT6KWEY1gSszkOWfrS6HXT6LaNs5q83eWT6bjPNDqOMrmT7eAVGfaOp9VSczlRNCWV7mjBMzx86HZCbzmON9qQMDfS65kT7CAP6CoNt9lRsrp87nyBIrlUo1aOp9VSsvXS7DeRtHp2cHZCbzoRszjSo1yV2qjRtiWP6CoNsDlRdHoQM9rT6blRdCAP6CoNt1XSdHfOsbmOMvqSo1yV2qjRtiWP6CoNsDlRdHoQM9rT6blRdCARczqPI1YRtHqRsqWRsOWP6CoNsDlRdHoQM9rT6blRdCWEY1KOM9bR64WR6LdOMHXEo1cR7LuRo1XT7LXR21rSs4WSsvXS7DeRtHp2a1bRcHrRMm0)

Legenda sugerida — DER físico declarado nas migrações. Fonte — elaboração retrospectiva dos autores com base no commit científico,24/11/2026.

### F08 — Modelo lógico dentro de JSONB

Origem RETROSPECTIVA, elaboração24/11/2026. Fonte — código no SHA científico. Fonte editável [PlantUML](diagramas/F08.puml). Imagem renderizável abaixo; estado da inspeção em [catálogo](figuras/CATALOGO.md).

![F08 Modelo lógico dentro de JSONB](https://www.plantuml.com/plantuml/png/~h407374617274756d6c0a736b696e706172616d2064656661756c74466f6e7453697a652031340a736b696e706172616d20736861646f77696e672066616c73650a736b696e706172616d206261636b67726f756e64436f6c6f722077686974650a656e74697479204465636973696f6e0a656e74697479205061727469636970616e740a656e746974792050726f706f73616c0a656e7469747920526f756e640a656e7469747920566f74650a656e7469747920436f6e747269627574696f6e0a656e7469747920416e616c797369730a656e746974792053796e7468657369730a656e74697479204576656e740a4465636973696f6e207c7c2d2d7c7b205061727469636970616e74203a20686162696c6974610a4465636973696f6e207c7c2d2d7c7b2050726f706f73616c203a20636f6e73657276610a50726f706f73616c207c7c2d2d7c7c20526f756e64203a20636f72726573706f6e64650a526f756e64207c7c2d2d6f7b20566f7465203a207265636562650a5061727469636970616e74207c7c2d2d6f7b20566f7465203a2072656769737472610a526f756e64207c7c2d2d6f7b20436f6e747269627574696f6e203a207265636562650a526f756e64207c7c2d2d6f7b20416e616c79736973203a2066756e64616d656e74610a416e616c79736973207c7c2d2d6f7b2053796e746865736973203a206f7269656e74610a4465636973696f6e207c7c2d2d6f7b204576656e74203a2072656769737472610a6e6f746520626f74746f6d206f66204465636973696f6e203a204d6f64656c6f206c6f6769636f3b20656e74696461646573206e616f2073616f20746162656c617320696e646570656e64656e7465730a40656e64756d6c)

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
