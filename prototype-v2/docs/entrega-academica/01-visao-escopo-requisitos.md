# ENG-D01 — Visão, escopo e requisitos

O artefato estrutura a deliberação sobre uma proposta. Foi desenvolvido no contexto de Design Science Research para registrar decisões coletivas, preservar divergências e apoiar o moderador na preparação de novas versões.

| ID | Requisito verificável |
|---|---|
| RF01 | Criar sala com título, 2 a 15 participantes, proposta e contexto opcional. Revisar a proposta com Gemini e permitir continuação sem revisão em caso de indisponibilidade. |
| RF02 | Comparar a reformulação com o rascunho analisado, desconsiderando diferenças de espaços e quebras de linha. Quando idêntica, preservar o parecer e ocultar a ação de aplicar a sugestão. |
| RF03 | Compartilhar um convite, exibir o termo e registrar concordância explícita e sua versão antes de conceder acesso de participante. |
| RF04 | Oferecer `ACEITO` e `REJEITO`. Permitir um voto por participante em cada rodada. O aceite é incondicional e sem justificativa. A rejeição exige justificativa. |
| RF05 | Permitir revisão consultiva da justificativa mediante autorização específica. A tela registra a justificativa com o voto de rejeição. |
| RF06 | Conceder cinco minutos por participante na primeira rodada de sala nova via convite, a partir do primeiro ingresso. Nas seguintes, iniciar o mesmo prazo para os elegíveis na publicação. |
| RF07 | Mostrar ao moderador quem ainda não entrou, permitir encerramento manual e preservar a diferença entre ausência e abstenção de quem entrou. |
| RF08 | Preparar análise e síntese a partir das manifestações após o encerramento, quando houver material textual e mediação automática habilitada. |
| RF09 | Permitir revisão humana, edição e publicação deliberada de nova proposta. Preservar versões e vínculos que sustentam as mudanças. |
| RF10 | Registrar consenso quando todos os elegíveis aceitam a mesma proposta. Permitir encerramento do processo sem consenso, com justificativa. |
| RF11 | Registrar saída, contestação aplicável, exportação JSON, restauração em nova sala e questionário exploratório pós-sessão. |

| ID | Requisito não funcional |
|---|---|
| RNF01 | Computar elegibilidade, prazo, voto e consenso no servidor. |
| RNF02 | Manter credenciais fora dos textos enviados à IA, persistir hashes de acesso e validar permissões por função. |
| RNF03 | Persistir histórico por snapshots e serializar alterações concorrentes da mesma sala. |
| RNF04 | Validar JSON da IA, os vínculos com as fontes e a aprovação humana da publicação. |
| RNF05 | Preservar histórico de salas e exportações compatíveis com as versões anteriores do esquema. |

O escopo atual cobre apoio à deliberação. A funcionalidade de consulta factual externa da entrega anterior foi desativada. Registros históricos compatíveis permanecem legíveis. Indicadores técnicos e respostas do questionário têm interpretação exploratória.

Fontes: [domínio](../../server/domain.ts), [API](../../server/app.ts), [formulário inicial](../../src/components/InitialProposalForm.tsx), [sala](../../src/components/RoomWorkspace.tsx).
