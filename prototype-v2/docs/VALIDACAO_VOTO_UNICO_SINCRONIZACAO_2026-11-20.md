# V2 — voto único e atualização automática

**Data local:** 20/11/2026, São Paulo. Evidências técnicas sintéticas; não representam coleta científica.

## Resultado
Implementado, integrado e publicado: um voto por participante em cada rodada. Após o envio, o formulário dá lugar à mensagem de espera. Uma nova versão publicada pelo moderador é recebida pela consulta automática existente e libera o formulário novamente. O envio do novo voto continua sendo uma ação explícita do participante.

## Versão
- Aplicação: `da17ed77d4237191474bb4d7438bef982e8c0509`.
- [PR #6](https://github.com/MRmoratelli/tcc-decisao-coletiva/pull/6), integrada somente em `feat/vite-typescript-decisao-generica`.
- Render: `tcc-decisao-v2-test`; deploy `dep-dc0dtkc9v7es739u9ueg`, live.
- CI da PR e do merge aprovado: TypeScript frontend/backend, build Vite e 89 testes, zero falhas. [CI da PR](https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/44840484348).
- /api/health lido pelo navegador em nuvem: status ok e SHA correspondente.

## Implementação e regressões
A regra do domínio recusa um segundo voto do mesmo participante na rodada atual com HTTP 409. O bloqueio é aplicado também quando o cliente tenta enviar com uma revisão atualizada; os testes HTTP verificam concorrência e ausência de contribuições/eventos adicionais após recusa. A transação preserva o primeiro voto.

O frontend oculta o formulário após votar, informa que o participante deve aguardar e continua recebendo atualizações da sala. Quando chega nova versão, um rascunho vazio não exige confirmação de reutilização. Rascunhos não enviados continuam preservados e exigem revisão explícita. A consulta de revisão permanece a cada quatro segundos com a página ativa; o intervalo não é garantia de latência.

O leitor de estados e a importação continuam aceitando históricos anteriores que contêm atualizações de voto, sem reescrever esses registros. Nenhuma migração foi introduzida.

## Teste publicado em duas sessões de nuvem
Sala: `E59662052A`, **TESTE TÉCNICO V2 — VOTO ÚNICO E SINCRONIZAÇÃO — NÃO CIENTÍFICO**. Duas identidades fictícias. Somente P01 votou neste teste de regressão; P02 permaneceu pendente, por isso a sala permaneceu OPEN.

1. P01 enviou REJEITO na rodada 1; a interface apresentou “Voto registrado nesta rodada” e removeu o formulário.
2. O navegador de P01 permaneceu na mesma página, sem Atualizar, recarga, navegação ou reentrada.
3. Um segundo navegador independente, como moderador, publicou a V2 com o marcador “SINCRONIZAÇÃO CONFIRMADA — 15h”.
4. P01 recebeu automaticamente o aviso da nova rodada, a proposta revisada e o formulário limpo, sem confirmação de reutilizar texto vazio.
5. P01 leu a nova proposta e enviou explicitamente ACEITO na rodada 2; a mensagem de espera reapareceu.

Os snapshots PostgreSQL comprovam a sequência: revisão 2 contém o REJEITO da rodada 1; revisão 3 contém a rodada 2 publicada e nenhum voto nela; revisão 4 acrescenta um único ACEITO vinculado à rodada 2. O REJEITO original permanece intacto. Nenhum voto foi transferido ou produzido pelo polling.

Horários do banco: publicação em 2026-11-21T00:05:19.379Z (21:05:19 de 20/11 em São Paulo), novo voto em 2026-11-21T00:05:40.163Z. Não se mede a latência exata do polling a partir desses dois horários: o segundo inclui a ação de votar.

[Observador P01](https://agent.tinyfish.ai/runs/addbc07b-edf1-4d8a-88aa-68d0233dfc07) e [publicação do moderador](https://agent.tinyfish.ai/runs/b6a154bc-03f2-40f2-a42c-ea5e63ba7fa5).

O primeiro navegador de preparação ficou temporariamente preso no carregamento da ferramenta depois de criar a sala. A mesma sala foi retomada em outra sessão. Os relatórios automáticos também escreveram “rodada 1” junto da V2 e usaram formulação ambígua sobre P01 atualizar para ACEITO; os dados confirmam rodada 2 e um novo envio explícito do participante. Não se registram essas imprecisões como comportamento do produto.

## Preservação e escopo
Somente a nova sala sintética recebeu dados deste teste. main, backup, PR #4, V1, sessões científicas, documentos, credenciais e permissões foram preservados. Nenhuma coleta ou resposta DSR foi criada. Nenhum terminal, navegador ou arquivo Windows foi utilizado.

A exportação oficial foi confirmada pelo usuário nesta conversa e não foi modificada. A validação real anterior de Gemini na sala 8DAEC1E5E5 permanece evidência separada; este teste não faz novas chamadas Gemini nem usa FakeAI para alegar integração real.

A mudança solicitada está publicada e validada nos testes de regressão e na interface remota. Este relatório e o snapshot adjacente são somente evidências, sem integração à branch da aplicação.
