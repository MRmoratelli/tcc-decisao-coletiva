# Revisão inicial assistida — V2
A revisão da proposta inicial passa a anteceder a criação da sala, mantendo somente título, quantidade de participantes, proposta e contexto opcional.

## Fluxo
1. Revisar proposta inicial com IA envia o rascunho ao endpoint já existente e recebe parecer e comprovante assinado. Nenhuma sala é criada.
2. Resumo e reformulação aparecem na mesma tela. Detalhes ficam em seção expansível.
3. O moderador usa a sugestão, mantém seu texto ou edita os campos.
4. Criar sala com esta proposta confirma explicitamente a publicação da primeira versão.
5. Em caso de falha, o texto é mantido e Criar sala sem revisão da IA registra a escolha. A automação das rodadas seguintes permanece disponível.

## Rastreabilidade
A criação com initialReviewMode REVIEWED verifica o comprovante contra o rascunho efetivamente analisado, conserva initialDraft, parecer e escolha humana, e registra a versão publicada e sua intervenção. Não repete a chamada ao Gemini na criação.
BYPASSED exige razão explícita e não adota sugestão ou comprovante. O fluxo anterior da API permanece compatível para clientes já abertos.
A instrução de revisão pede clareza, ambiguidades e lacunas, sem inventar datas, custos ou condições ausentes. O parecer permanece consultivo, falível e sujeito a confirmação humana.

## Validação
Testes de interface e integração verificam os quatro campos, ausência de sala antes da confirmação, uso/edição/manutenção da proposta, falha e continuação explícita, comprovante adulterado recusado, chamada única ao provedor e preservação de original, sugestão e versão publicada na exportação/importação.

Resultado: 102 testes aprovados, sem falhas; TypeScript e Vite aprovados.
