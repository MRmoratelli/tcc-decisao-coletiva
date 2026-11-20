# Estabilização V2 — ensaio sintético de 20/11/2026

**Natureza:** evidência técnica sintética, não científica. Nenhum participante real; nenhuma resposta DSR criada.

**Decisão: NO-GO para a liberação integral pelos critérios estritos solicitados.** Os dois defeitos prioritários não se reproduziram neste ensaio com Gemini real. Permanecem duas verificações incompletas por limitação do navegador remoto: captura do JSON efetivamente exportado e observação simultânea da sincronização entre sessões.

## Versão e ambiente
- Branch de aplicação: `feat/vite-typescript-decisao-generica`.
- HEAD e SHA ativo: `d8294b95033fdb3b7002151184588c47a0f59a3c`.
- Render: `tcc-decisao-v2-test`, deploy `dep-dc0b9jgm7kps73es314g`, live na conferência anterior; /api/health lido no navegador remoto retornou status ok, version 2 e o mesmo commit.
- CI já conferido: TypeScript frontend/backend, build Vite e 86 testes aprovados, zero falhas. [CI](https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/44816307149). Não houve alteração executável nem repetição desnecessária da suíte.
- Navegador utilizado: TinyFish em nuvem. Nenhum navegador ou terminal Windows utilizado.

## Sala
- Código: `8DAEC1E5E5`.
- Título: TESTE TÉCNICO V2 — ESTABILIZAÇÃO 20/11 — NÃO CIENTÍFICO.
- Uma sala criada, três identidades fictícias e um moderador técnico.
- PostgreSQL: revisão final 10, CONSENSUS; 3 participantes, 2 propostas, 2 rodadas, 6 votos, 2 contribuições técnicas, 1 análise, 1 síntese, 13 eventos, 0 avaliações.
- O snapshot adjacente contém os dados efetivamente lidos do banco. **Não é o JSON gerado pelo botão de exportação.**

## Fluxo observado e conferido
| Etapa | Resultado e limite |
|---|---|
| Quatro opções e credenciais individuais | As quatro posições foram observadas; três entradas individuais e acesso do moderador funcionaram. Regressões de autorização já aprovadas no CI. Não se repetiu auditoria de segurança. |
| Primeira rodada | P01 ACEITO; P02 ACEITO_COM_RESSALVAS; P03 REJEITO, com justificativas nos dois últimos. Sem consenso. |
| Reformulação de P02 | Parecer Gemini real; sugestão selecionada; um registro, sem exigência redundante de “sem parecer”. Banco preserva original, sugestão, texto enviado, status OK e appliedRewrite=true. |
| Duplicidade visual | Três posições vigentes, uma por participante, observadas na interface. As duas contribuições técnicas vinculadas permaneceram no histórico sem serem somadas aos votos. |
| Análise coletiva | Resposta real salva, com APOIO, RESSALVA e OBJECAO separados; três IDs e citações literais conferidos diretamente no banco. |
| Síntese | Resposta real salva, sem INVALID_LINKS. consideredSourceIds cobre exatamente os três votos da rodada 1; sourceIds das mudanças são válidos; somente o REJEITO de P03 aparece nas classificações formais e voteIds. Ressalva de P02 aparece separadamente no changeLog. |
| Reconciliação e falhas | Não há AI_FAILURE nem SYNTHESIS_LINKS_RECONCILED na sala. Não se afirma que a função de recuperação foi exercitada pelo provedor nesta sessão; suas regressões já passaram no CI. |
| Revisão humana | APROVACAO_HUMANA, sem edição textual: o moderador aprovou a sugestão com motivo registrado. Original e publicado estão preservados em campos separados; changes vazio. Não se descreve como edição humana. |
| Publicação | V2 e rodada 2 criadas e persistidas. Os três participantes estavam PENDENTE; votos anteriores não foram reutilizados. |
| Segunda rodada e consenso | Três novos ACEITO pela interface; processo OPEN com 1/3 e 2/3, CONSENSUS somente com 3/3. Snapshots 7–10 comprovam a progressão. |
| Persistência | Sala reaberta pelo moderador e estado conferido por SELECT somente de leitura. Não foi forçada reinicialização do serviço. |
| Exportação | Botão clicado; a ferramenta não capturou o download, não intercepta fetch/XHR e não permite POST ou avaliação JS. GET na rota POST não é teste válido de falha da API. Exportação integral **não verificada**. |
| Sincronização automática | Reentrada atualizada comprovada. Observação simultânea de polling/atualização sem recarga **não verificada**: a ferramenta não oferece múltiplas abas/sessões no mesmo contexto. |
| Alternativa de navegador | Busca de integrações não disponibilizou outro navegador em nuvem operacional. Não foi usado o navegador local como substituto. |

## Evidências reais de Gemini
Os registros persistidos do parecer de P02, análise e síntese têm modelo `gemini-3.5-flash-lite` e promptVersion `consensus-consultive-v2.5-formal-rejections`. Foram três operações de mediação bem-sucedidas observadas. Não houve FakeAI nem pesquisa factual/Tavily nesta sala (`factualChecks=[]`). Metadados de configuração factual de /api/health não foram tratados como prova do modelo de mediação.

- Contribuição de P02: `302cb052-c8c5-4b4d-a4e7-e99577bc26b9`.
- Análise: `1e864794-eee4-4ef7-847b-a2626af7fd6d`, 2026-11-20T23:31:01.707Z (20:31:01 em São Paulo).
- Síntese: `e190ecb6-d5f0-4f63-a659-4a255822f891`, 2026-11-20T23:31:08.079Z (20:31:08 em São Paulo).
- Consenso: 2026-11-20T23:37:25.805Z (20:37:25 em São Paulo).

A síntese sugeriu a sala B no térreo com acesso por rampa e reservou R$ 20 para bebidas sem açúcar, mantendo o restante para lanche. O aviso de viabilidade diz que a disponibilidade da sala alternativa deve ser confirmada; **não houve verificação externa de disponibilidade**. O caso inteiro é fictício.

[Execução inicial](https://agent.tinyfish.ai/runs/23393f89-03c1-4696-938c-12d4321ed71e) e [conclusão da segunda rodada](https://agent.tinyfish.ai/runs/cdff3d5c-c782-436b-ad40-916b863d6782). Esses relatórios automatizados têm imprecisões textuais: o primeiro contou eventos como votos; o segundo inferiu campos de proveniência pela interface. Este relatório usa o snapshot PostgreSQL para corrigir tais pontos. Antes da rodada 2 havia 3 votos; depois dela, 6. P02 review.appliedRewrite=true é distinto de APROVACAO_HUMANA na proposta V2. Não se inferiu reconciliação implícita: não houve evento de reconciliação.

## Correções e preservação
Nenhuma correção adicional de código, mudança de configuração, migração ou novo deploy foi necessária para os fluxos executados. Esta branch contém somente documentação e evidências, sem integração à branch implantada. SHA final de aplicação permanece `d8294b95033fdb3b7002151184588c47a0f59a3c`.

Somente a sala sintética indicada recebeu escritas do teste. A sala interrompida 6E918FBB5E e demais sessões científicas não foram acessadas pelo navegador nem alteradas. main, backup, PR #4, V1, Neon histórico, documentos científicos, instrumentos, credenciais e permissões foram preservados. As consultas PostgreSQL foram SELECT e restritas à sala sintética. Nenhuma coleta científica foi iniciada.

## Pendências de liberação
1. Obter e validar os bytes da exportação JSON oficial pelo mecanismo da aplicação.
2. Observar a atualização entre sessões sem recarga no cenário publicado.

A decisão NO-GO indica incompletude desses gates obrigatórios, não reprodução da falha de síntese ou descoberta de defeito crítico nos fluxos que passaram. A aprovação futura também não será garantia absoluta de disponibilidade do Gemini ou de outros serviços externos.
