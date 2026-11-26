# ENG-D04 — Modelagem estrutural e comportamental

| Conceito | Representação no código |
|---|---|
| Sala e decisão | Identidade de sala no repositório e `decision` no snapshot. Estados `OPEN`, `CONSENSUS` e `CLOSED_WITHOUT_CONSENSUS`. |
| Proposta e rodada | Cada proposta tem versão e vínculo com a anterior. Cada versão corresponde a uma rodada. A rodada pode estar aberta ou encerrada enquanto a decisão ainda tramita. |
| Participante | Identificador interno, pseudônimo, concordância de pesquisa e eventual saída registrada. |
| Temporização | `Round.voting` inclui elegibilidade e prazo comum. Na primeira rodada de novas salas via convite, `participantStarts` registra o início individual. |
| Voto e justificativa | O voto referencia participante, rodada e proposta. Na rejeição da interface, a justificativa acompanha o voto. O snapshot pode conter o parecer e a versão original do texto associados. |
| Análise e síntese | Referenciam rodada, proposta e fontes. A síntese pode originar uma nova proposta após confirmação do moderador. |

Na primeira rodada, o servidor registra o primeiro ingresso válido e preserva seu horário se a pessoa retornar. Quando todos entram, a rodada pode expirar pelo último prazo individual. Pode terminar antes por conclusão da votação ou confirmação do moderador. A partir da segunda rodada, o prazo comum começa na publicação. A regra individual é aplicada às salas novas criadas via convite. Salas anteriores seguem os prazos registrados.

As figuras [F06 e F09–F13](figuras/CATALOGO.md) incluem estrutura de domínio, sequências, atividade, estados e dependências. A figura F06 é uma representação dos tipos TypeScript, e F13 descreve a composição do servidor.

Fontes: [esquemas e transições](../../server/domain.ts), [repositório](../../server/db.ts) e [orquestração](../../server/automatic.ts).
