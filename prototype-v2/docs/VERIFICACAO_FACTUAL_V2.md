# Verificação factual externa consultiva — V2

Versão funcional: `factual-grounding-v1.0`. Data-base: 18/11/2026, America/Sao_Paulo. Implementação técnica pré-avaliação; não constitui resultado científico.

## Escopo e arquitetura

A operação `POST /api/rooms/:code/fact-check` é independente de `analyzeProposal`, `analyzeContribution`, `analyzeObjections` e `synthesizeProposal`. Esses quatro contratos conservam seus schemas e o modelo operacional existente. O prompt consultivo passa a `consensus-consultive-v2.1-factual-context` para reconhecer evidências registradas sem lhes atribuir autoridade decisória.

Somente o backend utiliza a chave Gemini existente. O novo adaptador fixa `gemini-2.5-flash-lite`, sem fallback automático para modelos ou serviços pagos. A implementação usa o SDK já instalado; não adiciona dependências, tabelas ou migrações. Os registros são campos opcionais com valores padrão nos snapshots JSONB V2 existentes.

O participante ou moderador separa uma alegação pública, de até 1.200 caracteres, e concorda com seu envio. Uma heurística local evita pesquisar preferências explícitas, restrições e identificadores reconhecidos. Quando necessário, uma chamada sem ferramentas classifica o texto e o decompõe em até três unidades: fatos, preferências, restrições individuais, opiniões, hipóteses ou informação insuficiente. Uma relação causal pode ser decomposta em evento, efeito e nexo causal. Cada fato público recebe sua própria chamada com `tools: [{ googleSearch: {} }]`; as demais categorias não recebem pesquisa externa.

O filtro de privacidade é preventivo e limitado, não um detector completo de dados pessoais. A interface solicita apenas o fato público mínimo e proíbe nomes, contatos, endereços privados e URLs. A rota rejeita identificadores comuns antes de persistir ou transmitir. Não existe recuperação de URLs arbitrárias pelo servidor; o Google Search seleciona as fontes. O fato de uma preferência não exigir pesquisa não confirma nem invalida a escolha do participante. Argumentos mistos podem exigir reformulação para separar os fatos.

## Evidências e estados

São conservados: texto original, trecho literal que originou a unidade, classificação, consulta, interpretação da IA, fontes, URLs, trechos associados, horário UTC, modelo solicitado e retornado, versão, limitações e código de falha saneado. Datas das fontes são preenchidas somente quando fornecidas nos metadados; não são deduzidas de datas escritas pelo modelo.

| Estado | Significado operacional |
| --- | --- |
| EVIDÊNCIA FAVORÁVEL | O mecanismo retornou fontes e trechos vinculados, interpretados como favoráveis à alegação. |
| EVIDÊNCIA CONTRÁRIA | O mecanismo retornou fontes e trechos vinculados, interpretados como contrários à alegação. |
| EVIDÊNCIA INSUFICIENTE | Não foi demonstrado suporte rastreável suficiente, associação, atualidade ou resposta conclusiva. |
| NÃO VERIFICÁVEL | Preferência, restrição, opinião, hipótese ou informação insuficiente; não equivale a falsidade. |
| VERIFICAÇÃO INDISPONÍVEL | Serviço desativado, sem acesso, quota atingida, erro de classificação ou falha externa. |

Nenhum estado demonstra verdade absoluta. URLs escritas no texto do modelo não são usadas como fontes. A normalização aceita apenas `groundingMetadata.groundingChunks[].web`, relaciona `groundingSupports[].groundingChunkIndices` a trechos presentes na resposta e exige consultas e `searchEntryPoint.renderedContent`. Fontes sem vínculo não sustentam os dois estados conclusivos. Metadados ausentes, inválidos ou incompletos não viram confirmação. Os trechos exibidos são trechos da resposta associados pelo provedor, não citações literais certificadas da página de origem. Não há uma leitura independente das páginas.

Para preços atuais, câmbio, clima ou outros fatos temporais, a classificação solicita `timeSensitive=true`; a confirmação exige datas fornecidas pelo provedor dentro das últimas 72 horas, sem datas futuras. A falta dessas datas resulta em evidência insuficiente, mesmo quando há links. Esse critério conservador não torna uma previsão meteorológica adequada à data ou ao local por si só: a interpretação ainda pode errar. Informações antigas continuam identificadas por seu horário de consulta e não devem ser tratadas como atualização permanente.

As sugestões de pesquisa Google são apresentadas a partir do HTML original retornado, em iframe isolado, sem scripts nem acesso à origem da aplicação, com abertura de links. O HTML não é reconstruído a partir do texto do modelo. Os links de fontes abrem em nova aba com `noopener noreferrer`.

## Autonomia, autorização e histórico

A consulta exige credencial da sala e vínculo com a proposta e rodada atuais. Até se manifestar, o participante acessa somente seus próprios registros factuais; o moderador mantém a visão operacional da sala. A gravação é incremental, com repetição apenas da transação em conflitos de revisão; não repete a chamada externa. Se a proposta mudar durante a consulta, o resultado não é aplicado.

Consultar, falhar ou contestar não registra voto, altera objeção, publica proposta nem declara consenso. O participante pode contestar seu próprio parecer antes de votar e manter sua objeção. Pareceres visíveis ao grupo podem ser contestados segundo a autorização já existente. Na mediação, os registros identificados e suas incertezas são contexto consultivo; a análise e a síntese guardam os identificadores factuais considerados. Evidências novas invalidam uma análise anterior para publicação sem nova análise. A revisão e a publicação permanecem humanas e consenso continua exigindo ACEITO explícito de todos na mesma versão. Abstenção e ausência de resposta não são aceitação.

Exportação conserva as evidências, fontes, vínculos, horários e contestações, sem credenciais. Importação cria uma sala nova e marca as evidências `IMPORTED_UNAUTHENTICATED`: não há prova criptográfica de origem externa, por isso esses registros não alimentam a mediação como evidências verificadas. Snapshots anteriores sem campos factuais continuam legíveis. Nenhum registro histórico é convertido em pesquisa externa retrospectiva.

## Gratuidade, acesso e limites

As variáveis `FACTUAL_SEARCH_ENABLED` e `FACTUAL_FREE_TIER_CONFIRMED` ficam desligadas por padrão. A segunda é uma declaração operacional após inspeção da conta, não uma consulta automática ao faturamento. Não há função para ativar billing, cadastrar cartão ou contratar serviços.

Inspeção autenticada do projeto exclusivo `tcc-decisao-v2` em 18/11/2026: painel indicou **Nível gratuito**; a cota do modelo 2.5 Flash-Lite era **10 RPM, 250 mil TPM e 20 RPD**, sem consumo prévio exibido. A cota agregada da família Search Grounding 2.5 não substitui o limite menor do modelo. A documentação pública de preços informa grounding gratuito para 2.5 Flash-Lite, enquanto a documentação de modelos alerta para restrição de acesso a projetos que não utilizaram 2.5 anteriormente. A presença de uma cota no painel não comprova acesso efetivo; somente uma chamada real pode confirmá-lo.

Limites locais conservadores: 10 chamadas totais ao provedor por dia UTC e processo, 4 por minuto, no máximo duas simultâneas, 12 requisições factuais por IP/minuto e 40 registros por sala. Classificação também consome uma chamada: um texto com três fatos pode consumir quatro chamadas. Não são dez pesquisas completas por dia. Cache por sala, texto e versão por dez minutos reduz repetições; a resposta informa o horário original. O cache em memória e os contadores reiniciam com o processo e não coordenam múltiplas instâncias. O limite efetivo do provedor e o projeto gratuito permanecem a barreira de conta; não se recomenda escalar essa configuração para múltiplas instâncias sem um orçamento persistente compartilhado.

Timeout externo de 30 segundos, saída limitada, até três alegações, doze fontes por alegação e limite serializado por registro. 429/403/404/400, falta de chave, falhas e ausência de metadados são conservados como indisponibilidade/insuficiência, sem retry automático ou troca de modelo. A aplicação pode continuar deliberando sem a pesquisa. Antes de cada sessão, conferir novamente tier, disponibilidade, quotas e políticas do provedor. O conteúdo transmitido está sujeito ao tratamento previsto para a modalidade gratuita Gemini; não enviar dados pessoais ou sensíveis.

## Testes e evidências

`server/factual.test.ts` usa exclusivamente fixtures sintéticas e não realiza chamadas externas. Abrange suporte favorável e contrário, fontes escritas apenas pelo modelo, vínculo ausente, opinião/preferência/restrição, decomposição causal, fonte antiga, ausência de datas, falhas/quotas, cache, privacidade e trechos originais inventados. `server/factual-api.test.ts` usa PGlite e adaptadores sintéticos: dez identidades enviam verificações simultaneamente, com autorização, visibilidade, contestação, exportação/importação e consenso apenas após o décimo ACEITO. Os testes React verificam fontes, isolamento das sugestões e concordância explícita.

As regressões dos quatro contratos e das regras de consenso permanecem na suíte. Resultados de execução: `docs/evidence/FACTUAL_TESTS.txt`. TypeScript frontend/backend e build Vite são verificados separadamente e no CI. Testes locais não comprovam acesso ao Google Search. O relatório de execução remota deve registrar separadamente o sucesso ou bloqueio real, SHA, HTTPS, persistência Neon, contratos Gemini e observação da interface móvel. Nenhuma identidade sintética corresponde a participante da avaliação acadêmica.

## Decisões metodológicas recebidas nesta execução

Não foi modificada a monografia consolidada ou a redação do instrumento DSR. Para a próxima revisão acadêmica:

- O grupo preexistente, com aproximadamente dez integrantes, organiza seu próprio churrasco; os pesquisadores não criaram ou impuseram a situação-problema.
- O moderador será um integrante do grupo responsável pelo TCC: facilita a operação e revisa propostas, sem votar pelos participantes que organizam o churrasco.
- Não será exigido cadastro formal adicional ou coleta de perfis pessoais. Identidades técnicas, participação voluntária e informação mínima sobre tratamento dos dados permanecem necessárias.
- Não haverá avaliação humana independente adicional da fidelidade das sínteses; a análise utilizará o questionário DSR e os registros disponíveis. Não se presume rubrica, avaliador ou nota científica de fidelidade.
- A aplicação do questionário em uma rodada aguarda decisão do orientador. O instrumento e a regra operacional atual de pelo menos duas rodadas foram preservados. Não fabricar discordância ou nova rodada.
- A orientação já comunicada pelo orientador é de desnecessidade de submissão ao Comitê de Ética da UVA para o procedimento previsto; isso não constitui parecer formal do Comitê nem elimina deveres de privacidade.

## Fontes técnicas primárias

Consultadas em 18/11/2026; políticas e acesso podem mudar:

- https://ai.google.dev/gemini-api/docs/google-search — ferramentas, metadados e apresentação de grounding.
- https://ai.google.dev/gemini-api/docs/grounding/search-suggestions — apresentação das sugestões de pesquisa.
- https://ai.google.dev/gemini-api/docs/pricing — preços e modalidade gratuita por modelo.
- https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite — capacidades e restrições de acesso.
- https://ai.google.dev/gemini-api/docs/rate-limits — limites por projeto e modalidade.
- Painel autenticado do projeto exclusivo V2 no Google AI Studio: tier e limites efetivos. Nenhuma credencial foi copiada para esta documentação.
