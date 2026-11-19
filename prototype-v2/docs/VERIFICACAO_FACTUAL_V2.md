# Verificação factual consultiva — Tavily + Gemini 3.5

Versão: `factual-tavily-gemini-v2.0`. Data-base: 19/11/2026. Exclusivamente implementação e validação técnicas; não constitui avaliação científica com participantes.

## Estado de validação

A implementação local passou em **62 testes sintéticos**, TypeScript frontend/backend e build Vite. Os testes utilizam respostas simuladas identificadas e PostgreSQL embarcado; não comprovam acesso externo real. Evidências: `evidence/TAVILY_TESTS.txt` e `evidence/TAVILY_BUILD.json`.

Na preparação, o painel Tavily apresentou a tela de login. A presença de chave no backend, plano Researcher e pay-as-you-go desligado ainda precisam ser confirmados. Não foi criada conta nem credencial, ativado faturamento ou realizada chamada Tavily real nesta etapa preparatória. O resultado externo deve ser atualizado somente após execução efetiva. Uma tela de cota, uma chave configurada ou os testes sintéticos não demonstram recuperação de fontes.

## Fluxo e preservação

1. O usuário separa uma alegação pública mínima, com até 1.200 caracteres, e concorda com o envio ao Gemini e à Tavily quando necessário.
2. Preferências explícitas, restrições e identificadores reconhecidos são tratados localmente, sem pesquisa. Outros textos são classificados pelo `gemini-3.5-flash-lite`, sem ferramentas externas, em até três unidades: fato verificável, preferência, restrição individual, opinião, hipótese ou informação insuficiente.
3. Cada fato público recebe sua própria Tavily **Search API**, sempre `basic`, `max_results: 3`, `topic: general`, `auto_parameters: false`, sem resposta gerada Tavily, extração integral, imagens ou endpoints Extract/Crawl/Research/Map. A solicitação pede metadados de data e uso de créditos. Para fatos atuais, o filtro semanal ajuda a recuperação, mas não prova atualidade.
4. O backend conserva os resultados reais utilizáveis e envia ao Gemini a alegação e esses resultados como dados não confiáveis. O modelo interpreta os trechos e devolve referências a identificadores existentes, com citação literal do trecho correspondente.
5. O backend valida os vínculos, comunica limitações e grava o parecer no histórico da sala. A interface mostra a alegação, a interpretação, os trechos vinculados, as fontes e as incertezas separadamente.

Os quatro contratos Gemini anteriores, seus schemas e o modelo operacional não foram modificados. A integração factual continua uma operação separada. Análises e sínteses recebem somente contexto factual Tavily da proposta atual, com identificadores, fontes, limites e texto das contestações. Nenhuma consulta registra voto, elimina objeção, publica proposta ou declara consenso. Publicação permanece humana, consenso exige ACEITO explícito de todos na mesma versão e encerramento sem consenso continua possível.

## Contratos e integridade das fontes

Novos registros informam `retrievalProvider: TAVILY`, `classificationModel`, `model`, `version`, `provenance` e os vínculos da sala/proposta/rodada/participante. Cada alegação conserva:

- Texto original e trecho literal que a originou, categoria, pergunta pública mínima e necessidade de atualidade.
- Estado, explicação consultiva, modelo efetivamente retornado, horário UTC, limitações e código de falha saneado.
- Resultados Tavily com URL e título recebidos, trecho (`excerpt`), escore de relevância quando fornecido, identificador opcional do provedor, hash do conteúdo e indicação de truncamento em 3.500 caracteres.
- Data original de metadados (`publishedAtRaw`) e normalização quando reconhecida; valores ausentes permanecem nulos. A data é estimativa Tavily de publicação ou atualização, não certificação da publicação original. Nenhuma data é preenchida pelo Gemini.
- Metadados da Search API: busca básica, consulta efetiva, `request_id`, horário, resultados recebidos/retidos, `usage.credits`, tempo de resposta quando disponível e hash da resposta. Uso ausente permanece nulo, sem estimativa apresentada como medição.
- `evidenceLinks`, referências interpretativas com sourceId, citação literal, relação de apoio/contradição/contexto e explicação. São vínculos produzidos pelo Gemini e validados contra o conteúdo Tavily, não metadados Google Grounding.

Resultados recuperados não são confirmação automática. EVIDÊNCIA FAVORÁVEL/CONTRÁRIA exige um vínculo literal utilizável, escopo declarado compatível e relação correspondente; fontes conflitantes, referências inventadas ou escopo incompatível resultam em EVIDÊNCIA INSUFICIENTE. Um escore alto de relevância não é probabilidade de verdade. Relevância abaixo de 0,35 em fonte vinculada leva a insuficiência. Alegações atuais exigem datas de fontes vinculadas dentro das últimas 72 horas, sem datas futuras; datas antigas ou ausentes não comprovam preços, clima ou câmbio atuais.

Os estados são EVIDÊNCIA FAVORÁVEL, EVIDÊNCIA CONTRÁRIA, EVIDÊNCIA INSUFICIENTE, NÃO VERIFICÁVEL e VERIFICAÇÃO INDISPONÍVEL. Nenhum significa comprovação absoluta. O participante pode contestar e manter sua posição.

O Gemini não recebe autorização para inventar URLs ou datas e não fornece esses campos no contrato de interpretação. Apenas URLs HTTPS públicas retornadas pela Tavily são exibidas; URLs internas, endereços IP, credenciais embutidas e portas são recusados. O servidor não navega nem faz fetch nas URLs retornadas ou fornecidas pelo usuário: a única requisição de busca é ao endpoint fixo `https://api.tavily.com/search`, com redirecionamentos HTTP desabilitados.

## Histórico, persistência e autorização

Os schemas aceitam explicitamente tanto a versão histórica `factual-grounding-v1.0`, com modelo 2.5, quanto a nova versão Tavily. Nenhum registro antigo é reescrito ou rotulado como pesquisa Tavily. Seus campos Google permanecem exclusivamente no contrato e na apresentação históricos. Não há `groundingSupports`, `searchEntryPoint` ou sugestões Google nos novos registros Tavily.

Exportações conservam fontes, trechos, metadados, interpretação e contestação. Importação cria uma sala nova, reemite credenciais e marca as evidências `IMPORTED_UNAUTHENTICATED`; elas não alimentam a mediação como evidências autenticadas e não são reutilizadas pelo cache. Arquivos anteriores sem fatos continuam legíveis. Não há nova dependência, tabela ou migração SQL; são usados os snapshots JSONB V2 existentes.

A rota continua exigindo credencial da sala e vínculo com versão/rodada atual. Visibilidade preserva o isolamento antes da primeira manifestação. Novas evidências exigem nova análise antes de gerar outra síntese. Conflitos de revisão repetem somente a gravação incremental, sem repetir a pesquisa externa. Dados de sessões existentes e histórico não são alterados por essa integração.

## Segurança e gratuidade

`TAVILY_API_KEY` permanece exclusivamente no backend Render. Não usar variável `VITE_*`, parâmetro de URL, frontend, logs, exemplos, exportações ou relatórios para o valor da chave. Nenhuma conta ou chave de terceiros é criada por esta implementação.

Os dois guardas existentes `FACTUAL_SEARCH_ENABLED` e `FACTUAL_FREE_TIER_CONFIRMED` continuam aplicáveis. O novo `TAVILY_RESEARCHER_CONFIRMED=true` somente deve ser definido após confirmar o plano Researcher e pay-as-you-go desligado. É uma declaração operacional, não consulta automática ao estado de faturamento. Sem confirmação/chave, a operação retorna indisponibilidade e não ativa pagamentos nem tenta outro provedor pago.

A documentação primária Tavily, consultada em 19/11/2026, informa Researcher gratuito com 1.000 créditos mensais e **1 crédito por Search básica**. Isso é regra pública, distinta do consumo observado da conta. O sistema solicita `include_usage: true` e só informa como medido o valor efetivamente retornado.

Limites locais por processo e dia UTC: **10 buscas Tavily/dia e 3/minuto**, **30 chamadas Gemini factuais/dia e 6/minuto**, no máximo duas operações externas simultâneas. Classificação e interpretação consomem chamadas Gemini distintas; uma frase causal com três fatos pode consumir três buscas e quatro chamadas Gemini. Cache por sala/texto/versão por dez minutos deduplica solicitações simultâneas. A rota mantém 12 requisições factuais por IP/minuto e 40 registros por sala.

Os contadores e o cache em memória reiniciam com o processo; não coordenam múltiplas instâncias. Manter a instância única e o plano gratuito sem pay-as-you-go. Para escalar, seria necessário orçamento compartilhado persistente e nova avaliação de custos. Quota esgotada, 429, 432/433, erros de autenticação, timeout, JSON inválido ou resposta acima de 256 KB são tratados sem retry automático, contratação ou troca de provedor. Timeout Tavily: 25 segundos; Gemini: 30 segundos. A deliberação continua disponível sem a pesquisa.

O filtro de dados pessoais é preventivo, não completo. Não incluir nomes, contatos, endereço privado, informações de saúde ou URLs na consulta. O classificador recebe somente o texto mínimo autorizado. Conteúdo de fontes pode conter erros ou instruções maliciosas; é tratado como dado não confiável. Não há leitura independente das páginas, garantia de exaustividade, prova causal automática ou auditoria externa de segurança.

## Cobertura técnica

A suíte contempla fato corroborado/contradito, evidência inconclusiva, preferência/restrição/opinião sem pesquisa, decomposição causal, fonte antiga/sem data, nenhum resultado, citação inventada, escopo incompatível, falha Tavily, créditos, limites locais, privacidade, cache, compatibilidade histórica, autorização, contestação, persistência/exportação/importação, dez identidades simultâneas, quatro contratos Gemini e regras de consenso. Testes React verificam fontes, datas, relevância e ausência de widget Google nos registros novos.

A consulta real de baixo consumo, a observação móvel e a persistência remota só poderão ser marcadas como aprovadas após execução efetiva. A monografia, o questionário DSR e suas regras operacionais não foram alterados. Permanecem as decisões metodológicas já comunicadas: grupo com problema próprio, moderador integrante do TCC sem voto pelos participantes, sem coleta adicional de perfis, sem avaliação humana independente adicional e decisão do questionário em uma rodada pendente do orientador.

## Referências técnicas primárias

- https://docs.tavily.com/documentation/api-reference/endpoint/search
- https://docs.tavily.com/documentation/api-credits
- https://docs.tavily.com/documentation/rate-limits
- https://ai.google.dev/gemini-api/docs/structured-output
- https://render.com/docs/configure-environment-variables

O mecanismo anterior e seu bloqueio real 404 estão preservados na revisão Git `4cb80ec27c6734567df53c48640703c63f3838dc` e nos arquivos `evidence/FACTUAL_*`. Esses arquivos históricos não comprovam a nova integração Tavily.

## Execução remota de baixo consumo

Executar somente após conferir a presença da chave privada no Render, Researcher gratuito e pay-as-you-go desligado:

    node --import tsx server/live-tavily.ts --run --origin=https://tcc-decisao-v2-test.onrender.com

O roteiro verifica os guardas sem consumir busca quando a configuração está incompleta, cria somente uma sala nova com dez identidades fictícias e realiza uma busca para uma alegação pública. Credenciais técnicas da sala ficam em `.private/tavily-validation-access.json`, ignorado pelo Git; nenhuma chave de provedor é lida no cliente. O resultado e os metadados reais ficam em `evidence/TAVILY_REAL.json`. A etapa inicial para no rascunho da síntese. Para concluir o teste, o operador técnico precisa revisar a proposta e registrar `confirm: true`, `synthesisId`, `proposal` e `reason` em `.private/tavily-approved-proposal.json`; somente então usar `--finish`. Isso é revisão operacional de dados sintéticos, não avaliação humana científica. Após concluído, novas execuções com o checkpoint verificam persistência sem repetir as chamadas externas. Não distribuir arquivos privados.
