# ENG-D02 — Casos de uso

| Caso | Ator e condição | Fluxo e resultado |
|---|---|---|
| UC01 — Criar sala | Moderador, formulário válido | Solicita o parecer inicial, mantém ou edita a proposta e confirma a criação. Se aparecer uma reformulação com mudança real, pode aplicá-la. Se a IA falhar, pode continuar com o próprio texto. Recebe um link do grupo. |
| UC02 — Entrar por convite | Participante e vaga disponível | Abre o convite, lê o termo e marca a concordância. O servidor ocupa a vaga, grava a versão do termo e inicia o prazo individual da primeira rodada se estiver aberta. Retornar com o mesmo acesso retoma o prazo original. |
| UC03 — Consultar proposta | Participante ou moderador autorizado | Consulta versão, estado da rodada e histórico disponível para seu papel. O rascunho de mediação permanece privado até a publicação. |
| UC04 — Registrar posição | Participante habilitado e dentro do prazo | Escolhe **Aceito** ou **Rejeito**. O aceite é enviado diretamente. A rejeição inclui justificativa e pode ser revisada pela IA mediante autorização. O servidor recusa duplicidade e voto fora do prazo. |
| UC05 — Encerrar rodada | Moderador, rodada em votação | Confere as pendências e confirma. Quem ingressou e não votou tem abstenção registrada. Quem ainda não entrou fica sem voto naquela rodada. O encerramento da rodada pode ser seguido de mediação. |
| UC06 — Revisar mediação | Moderador, rodada encerrada | Examina manifestações, análise e síntese. Pode revisar manualmente, especialmente se o serviço de IA estiver indisponível. |
| UC07 — Publicar revisão | Moderador, proposta pronta | Confirma o texto que será publicado. O servidor registra a intervenção e abre nova rodada com prazo comum para os participantes elegíveis. |
| UC08 — Encerrar processo | Sistema ou moderador | O sistema registra consenso pela aceitação explícita de todos os elegíveis na mesma proposta. O moderador pode encerrar sem consenso com justificativa. |
| UC09 — Registrar saída | Moderador | Registra desistência ou abandono. O histórico preserva votos anteriores. A próxima rodada considera os participantes ativos já ingressados no momento da publicação. |
| UC10 — Contestar parecer | Participante autorizado | Seleciona análise ou parecer disponível e registra sua contestação vinculada. |
| UC11 — Exportar ou restaurar | Moderador | Exporta JSON. A restauração valida o conteúdo, cria outra sala e reemite acessos. |
| UC12 — Responder avaliação | Participante, processo encerrado | Envia o questionário exploratório. O moderador pode consultar o resumo e as respostas exportadas. |

As figuras [F01 e F02](figuras/CATALOGO.md) mostram a divisão de responsabilidades.

Fontes: [rotas da API](../../server/app.ts) e [componentes da sala](../../src/components/RoomWorkspace.tsx).
