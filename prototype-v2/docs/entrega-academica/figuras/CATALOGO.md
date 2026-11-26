# Catálogo de figuras — V2 congelada

Modelos de engenharia elaborados a partir do commit `ea225a5`. O código Mermaid de cada figura está neste arquivo e pode ser editado e exportado para a monografia. Os identificadores F01–F13 são deste catálogo. Na monografia, use a numeração institucional.

## F01 — Casos de uso da deliberação

```mermaid
flowchart TD
 M[Moderador] --> C[Criar sala]
 M --> P[Publicar revisão]
 M --> E[Encerrar rodada]
 U[Participante] --> I[Editar justificativa]
 U --> V[Registrar voto]
 V --> K{Todos aceitaram?}
 K -->|Sim| O[Consenso]
 K -->|Não| D[Rodada segue ou encerra sem consenso]
```

## F02 — Casos de uso de apoio

```mermaid
flowchart TD
 M[Moderador] --> X[Exportar JSON]
 M --> R[Restaurar cópia]
 M --> D[Registrar saída]
 U[Participante] --> T[Contestar parecer]
 U --> Q[Responder questionário]
 X --> A[Histórico]
 R --> B[Nova sala]
```

## F03 — Contexto do sistema

```mermaid
flowchart TD
 M[Moderador] --> S[V2 Decisão Coletiva]
 U[Participantes] --> S
 S --> N[(Banco isolado)]
 S --> G[Gemini API]
 S --> J[Exportação JSON]
```

## F04 — Componentes da aplicação

```mermaid
flowchart TD
 C[React] --> A[API Express]
 A --> D[Domínio]
 A --> O[Mediação automática]
 D --> S[Repositório]
 O --> D
 O --> G[Adaptador Gemini]
 G --> F[Fila e orçamento]
 S --> B[(PostgreSQL)]
 F --> B
```

## F05 — Implantação da V2 de validação

```mermaid
flowchart TD
 C[Navegador] -->|HTTPS| R[Render Web Service]
 G[Commit congelado] -->|Build| R
 R -->|Frontend e API| C
 R -->|PostgreSQL| N[(Neon de validação)]
 R -->|Requisição estruturada| A[Gemini API]
```

## F06 — Estruturas de domínio

```mermaid
classDiagram
 class Estado
 class Decisao
 class Proposta
 class Rodada
 class Voto
 class Participante
 Estado *-- Decisao
 Estado *-- Proposta
 Estado *-- Rodada
 Estado *-- Participante
 Proposta "1" -- "1" Rodada
 Rodada "1" -- "0..*" Voto
 Participante "1" -- "0..*" Voto
```

## F07 — Entidades físicas e chaves

```mermaid
erDiagram
 dc2_rooms ||--o{ dc2_participants : possui
 dc2_rooms ||--o{ dc2_snapshots : versiona
 dc2_rooms ||--o{ dc2_contributions : historico
 dc2_participants ||--o{ dc2_contributions : autoria
 dc2_rooms {
   uuid id PK
   varchar code UK
 }
 dc2_participants {
   uuid id PK
   uuid room_id FK
 }
 dc2_snapshots {
   uuid room_id PK, FK
   integer revision PK
   jsonb state
 }
 dc2_contributions {
   uuid id PK
   uuid room_id FK
   uuid participant_id FK
 }
```

## F08 — Relações no estado JSONB

```mermaid
flowchart TD
 S[Snapshot] --> E[Inscrições e participantes]
 S --> P[Propostas e rodadas]
 S --> H[Histórico e avaliações]
 E -->|Participante| I[Início individual]
 P -->|Rodada| I
 E -->|Autor| V[Votos e justificativas]
 P -->|Versão| V
 V --> A[Análise e síntese]
 A -->|Publicação confirmada| P
```

## F09 — Ingresso e voto

```mermaid
sequenceDiagram
 participant P as Participante
 participant C as Cliente
 participant A as API e domínio
 participant B as PostgreSQL
 P->>C: Aceita o termo
 C->>A: Solicita ingresso
 A->>B: Grava aceite e início individual
 A-->>C: Retorna acesso à sala
 P->>C: Registra posição
 C->>A: Envia voto e justificativa, se houver
 A->>A: Verifica elegibilidade e prazo
 A->>B: Persiste nova revisão
 A-->>C: Confirma o voto
```

## F10 — Assistência e publicação

```mermaid
sequenceDiagram
 participant M as Moderador
 participant A as API e domínio
 participant G as Gemini
 participant P as Participante
 A->>G: Envia dados para análise
 G-->>A: Retorna análise estruturada
 A->>G: Solicita síntese com fontes
 G-->>A: Retorna rascunho
 A-->>M: Oferece revisão privada
 M->>A: Confirma proposta a publicar
 A-->>P: Disponibiliza nova rodada
```

## F11 — Atividade da votação

```mermaid
flowchart TD
 I[Participante entra] --> R{Primeira rodada?}
 R -->|Sim| T[Iniciar prazo individual]
 R -->|Não| C[Consultar prazo comum]
 T --> P{Prazo vigente?}
 C --> P
 P -->|Não| F[Prazo encerrado]
 P -->|Sim| V{Posição}
 V -->|Aceito| A[Registrar aceite]
 V -->|Rejeito| J[Preencher justificativa]
 J --> Q[Revisar com IA se desejar]
 Q --> O[Registrar rejeição]
```

## F12 — Estados da decisão e eventos

```mermaid
stateDiagram-v2
 [*] --> Aberta: Criar sala
 Aberta --> Aberta: Encerrar rodada e publicar nova versão
 Aberta --> Consenso: Aceites unânimes na versão vigente
 Aberta --> SemConsenso: Moderador encerra com justificativa
 Consenso --> [*]
 SemConsenso --> [*]
```

## F13 — Dependências do servidor

```mermaid
classDiagram
 class APIExpress
 class Dominio
 class Repository
 class AIAdapter
 class GeminiAdapter
 class GeminiQueue
 class PostgresProviderBudget
 APIExpress ..> Dominio
 APIExpress ..> Repository
 APIExpress ..> AIAdapter
 AIAdapter <|.. GeminiAdapter
 GeminiAdapter --> GeminiQueue
 GeminiQueue ..> PostgresProviderBudget
```

Em F07, as migrações também declaram `dc2_migrations` e `dc2_provider_budget`, tabelas administrativas sem FK de sala. A modelagem F06 projeta tipos TypeScript e relações do snapshot. Em F10, pressupõe-se rodada já encerrada, processo aberto e manifestações textuais disponíveis.
