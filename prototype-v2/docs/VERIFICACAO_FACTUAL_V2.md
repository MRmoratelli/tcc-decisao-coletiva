# Verificação factual consultiva — Tavily + Gemini 3.5

Versão: `factual-tavily-gemini-v2.0`. Data-base: 19/11/2026. Exclusivamente implementação e validação técnicas; não constitui avaliação científica com participantes.

## Estado de validação

A implementação local passou em **64 testes sintéticos**, TypeScript frontend/backend e build Vite. Os testes utilizam respostas simuladas identificadas e PostgreSQL embarcado; não comprovam acesso externo real. Evidências: `evidence/TAVILY_TESTS.txt` e `evidence/TAVILY_BUILD.json`.

O acesso Tavily foi autenticado pelo usuário. A inspeção confirmou Researcher, pay-as-you-go desligado e uso inicial zero da chave existente. Essa chave foi configurada somente no backend Render, sem criar conta/credencial, ativar faturamento ou persistir o valor em arquivos/repositório. O diagnóstico após deploy confirmou presença de chave e guarda de gratuidade ativo. A consulta real foi executada: uma Search básica retornou três fontes e uso de um crédito. O Gemini 3.5 classificou e interpretou a alegação. Os detalhes observados estão no fechamento abaixo e em `evidence/TAVILY_REAL.json`.

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

Exportações conservam fontes, trechos, metadados, interpretação e contestação. Importação cria uma sala nova, reemite credenciais e marca as evidências `IMPORTED_UNAUTHENTICATED`; elas não alimentam a mediação como evidências autenticadas e não são reutilizadas pelo cache. Arquivos anteriores sem fatos continuam legíveis. A entrega Tavily inicial usou os snapshots JSONB existentes. A ampliação de 19/11/2026 acrescenta exclusivamente a tabela dc2_provider_budget pela migração aditiva 003_provider_budget, para reservas compartilhadas persistentes; não há nova dependência ou alteração de snapshots antigos.

A rota continua exigindo credencial da sala e vínculo com versão/rodada atual. Visibilidade preserva o isolamento antes da primeira manifestação. Novas evidências exigem nova análise antes de gerar outra síntese. Conflitos de revisão repetem somente a gravação incremental, sem repetir a pesquisa externa. Dados de sessões existentes e histórico não são alterados por essa integração.

## Segurança e gratuidade

`TAVILY_API_KEY` permanece exclusivamente no backend Render. Não usar variável `VITE_*`, parâmetro de URL, frontend, logs, exemplos, exportações ou relatórios para o valor da chave. Nenhuma conta ou chave de terceiros é criada por esta implementação.

Os dois guardas existentes `FACTUAL_SEARCH_ENABLED` e `FACTUAL_FREE_TIER_CONFIRMED` continuam aplicáveis. O novo `TAVILY_RESEARCHER_CONFIRMED=true` somente deve ser definido após confirmar o plano Researcher e pay-as-you-go desligado. É uma declaração operacional, não consulta automática ao estado de faturamento. Sem confirmação/chave, a operação retorna indisponibilidade e não ativa pagamentos nem tenta outro provedor pago.

A documentação primária Tavily, consultada em 19/11/2026, informa Researcher gratuito com 1.000 créditos mensais e **1 crédito por Search básica**. Isso é regra pública, distinta do consumo observado da conta. O sistema solicita `include_usage: true` e só informa como medido o valor efetivamente retornado.

Limites locais por processo e dia UTC: **100 buscas Tavily/dia UTC e 15/minuto**, **250 chamadas Gemini factuais/dia UTC e 12/minuto**, no máximo dez operações externas simultâneas, com reservas de concorrência por até 90 segundos. Classificação e interpretação consomem chamadas Gemini distintas; uma frase causal com três fatos pode consumir três buscas e quatro chamadas Gemini. Cache por sala/texto/versão por dez minutos deduplica solicitações simultâneas. A rota admite 60 requisições factuais por IP/minuto e até 200 registros por sala, incluindo falhas e classificações sem busca. O limite global de reservas continua prevalecendo. O tamanho máximo de importação permanece 8 MB; volume de registros não é garantia de cabimento de qualquer arquivo extremo.

No runtime Render, os contadores e as reservas usam PostgreSQL V2 com bloqueio transacional de uma linha e horário do banco. Deploys e instâncias concorrentes compartilham os mesmos tetos. O cache de dez minutos permanece por processo; resultados recentes persistidos continuam reutilizáveis nas condições já documentadas. Somente os testes/desenvolvimento sem banco usam o controle em memória. Banco indisponível bloqueia a nova transmissão, sem retorno silencioso a orçamento volátil. A migração inicial recupera o uso Tavily real conhecido por request_id único dos snapshots, sem copiar textos ou identidades. Reservas são conservadas mesmo em falhas, pois a cobrança efetiva pode ser desconhecida. Quota esgotada, 429, 432/433, erros de autenticação, timeout, JSON inválido ou resposta acima de 256 KB são tratados sem retry automático, contratação ou troca de provedor. Timeout Tavily: 25 segundos; Gemini: 30 segundos. A deliberação continua disponível sem a pesquisa.

O filtro de dados pessoais é preventivo, não completo. Não incluir nomes, contatos, endereço privado, informações de saúde ou URLs na consulta. O classificador recebe somente o texto mínimo autorizado. Conteúdo de fontes pode conter erros ou instruções maliciosas; é tratado como dado não confiável. Não há leitura independente das páginas, garantia de exaustividade, prova causal automática ou auditoria externa de segurança.

## Cobertura técnica

A suíte contempla fato corroborado/contradito, evidência inconclusiva, preferência/restrição/opinião sem pesquisa, decomposição causal, fonte antiga/sem data, nenhum resultado, citação inventada, escopo incompatível, falha Tavily, créditos, limites locais, privacidade, cache, compatibilidade histórica, autorização, contestação, persistência/exportação/importação, dez identidades simultâneas, quatro contratos Gemini e regras de consenso. Testes React verificam fontes, datas, relevância e ausência de widget Google nos registros novos.

A consulta real de baixo consumo, a observação móvel, a exportação/importação e a persistência remota foram executadas e aprovadas nos limites do fechamento técnico abaixo. A monografia, o questionário DSR e suas regras operacionais não foram alterados. Permanecem as decisões metodológicas já comunicadas: grupo com problema próprio, moderador integrante do TCC sem voto pelos participantes, sem coleta adicional de perfis, sem avaliação humana independente adicional e decisão do questionário em uma rodada pendente do orientador.

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

## Retomada após falha temporária Gemini

A revalidação remota encontrou TIMEOUT 504 e TRANSPORT 503 no parecer inicial existente, além de uma classificação factual indisponível. Esses eventos não foram apresentados como sucesso. A classificação factual pelo Gemini 3.5 também teve uma chamada real aprovada, preservada no preflight. A nova operação pode retomar essa classificação persistida do mesmo texto/proposta, versão e dia UTC, quando a proveniência é LIVE_PROVIDER e o modelo é o autorizado. Arquivos importados e dados enviados pelo cliente não fornecem esse plano. `classificationSourceCheckId` explicita a origem; não há nova classificação presumida.

Se a recuperação Tavily tiver ocorrido e somente a interpretação falhar temporariamente, uma tentativa posterior reutiliza as fontes e metadados persistidos por até dez minutos, mantendo o request_id e o horário originais. `retrieval.reusedFromCheckId` registra a origem. O valor `creditsUsed` continua sendo o valor retornado da chamada original e não deve ser somado novamente: deduplicar por request_id. A interface identifica que nenhuma nova busca ocorreu. Datas e escopo ainda passam pelas mesmas validações. Resultados positivos continuam no cache normal; somente falhas recuperáveis permitem nova tentativa, sempre dentro dos limites locais. Não há retry externo automático nem troca de modelo/provedor pago. Testes verificam uma busca e duas tentativas de interpretação, com um único crédito original de fixture.

## Fechamento executado — 19/11/2026

Código publicado: `43e6dc5c216c59f636670f9c601d7e28d133256b`; Render `dep-dbvi2t2fngtc73cb9pvg` live. HTTPS e `/api/health` responderam 200, com Tavily configurada, guarda gratuito ativo e Gemini 3.5. [CI 44564443893](https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/44564443893) aprovado: **64 testes**, TypeScript frontend/backend e build Vite.

Às **13:21:05 de 19/11/2026 (Brasília)**, a Tavily recuperou três resultados para “A Lua é um satélite natural da Terra”. Requisição `70e04d3c-95f2-40e9-be4c-b19dec026cb7`; Search básica; **1 crédito informado pela API**, também observado na conta (0 → 1). Plano Researcher e pay-as-you-go desligado conferidos. Nenhuma nova conta/chave ou cobrança foi ativada.

Fontes recebidas, com títulos, URLs, trechos e escores efetivos conservados no relatório:

1. [Escola Kids/UOL — Lua](https://escolakids.uol.com.br/geografia/lua-satelite-da-terra.htm).
2. [Material educacional de Praia Grande — A Lua (PDF)](https://dpid.cidadaopg.sp.gov.br/pde/arquivos/1620150381790~5%C2%BAano%20-%20Ci%C3%AAncias%20v.02%20-%20Semanas%207%20e%208.pdf).
3. [Segredos do Mundo/R7 — Lua](https://segredosdomundo.r7.com/lua).

As três datas de publicação vieram ausentes e permaneceram nulas. A aplicação não obteve essas referências da prosa do Gemini: elas vieram dos resultados Tavily, com identificadores e hash da resposta. Os trechos usados pelo Gemini foram conferidos literalmente contra os trechos retornados. Isso demonstra a origem recuperada e o vínculo da interpretação, sem certificar a exatidão integral das páginas.

O Gemini 3.5 retornou **EVIDÊNCIA FAVORÁVEL** às 13:24:05, com três vínculos literais. Houve falhas temporárias 503/504: classificação persistida e recuperação recente foram retomadas com proveniência explícita; a interpretação bem-sucedida usou a mesma requisição Tavily, sem nova busca. O preflight dos contratos antigos encontrou falha temporária no parecer de proposta; os quatro contratos passaram na regressão automatizada, mas não foram todos revalidados com chamadas reais nesta execução. Uma tentativa posterior do roteiro autônomo também recebeu 502 no parecer antigo; a conferência final de persistência foi feita por leitura/exportação, sem novas chamadas de provedores.

A sala técnica com dez identidades fictícias teve duas rodadas, 20 votos, dois registros de contestação e cinco registros factuais (incluindo falhas/preferência). O parecer favorável não alterou a rejeição nem a abstenção. O operador técnico revisou a proposta pelo papel de moderador; na nova versão, nove aceitações mantiveram OPEN e a décima concluiu CONSENSUS. Nenhuma resposta DSR ou nota humana foi fabricada. Exportação, importação em sala nova com credenciais reemitidas e marcação de proveniência importada, e leitura persistida Neon foram verificadas. A sala Google histórica permaneceu idêntica.

Interface conferida em viewport 375 × 812, sem transbordamento horizontal (largura útil 360). Fontes, incertezas, escores e ausência de datas foram exibidos; o link Escola Kids abriu a URL recebida. Evidências: [parecer móvel](evidence/TAVILY_MOBILE_INTERPRETATION.jpg), [fontes móveis](evidence/TAVILY_MOBILE_SOURCES.jpg), [relatório real](evidence/TAVILY_REAL.json), [exportação sintética](evidence/TAVILY_SESSION_SYNTHETIC.json). As imagens são recortes da página responsiva para documentar os painéis.

O ensaio demonstra o fluxo técnico para uma alegação pública estável. Não demonstra acurácia geral, verificação eficaz de preços/clima atuais, inferência causal ou avaliação científica com o grupo do churrasco. Fontes atuais continuam sujeitas à exigência de metadados temporais; ausência de data pode levar à insuficiência. Monografia e questionário não foram alterados.

## Ampliação de tetos e dependências — 19/11/2026

Os valores 100/dia e 15/minuto são tetos do backend, não uma franquia diária ou capacidade garantida. O controle mensal limita a 1.000 reservas no mês UTC; resultados de cache/reutilização não reservam nova busca. A conta gratuita Tavily sem pay-as-you-go é uma barreira adicional. O uso fora desta aplicação e diferenças do período do provedor não são medidos por esse ledger; o painel e as recusas do provedor continuam prevalecendo. Não foram consumidos 100 créditos reais para os testes.

O painel autenticado do projeto tcc-decisao-v2 confirmou Gemini 3.5 Flash-Lite no nível gratuito com **15 RPM, 500 RPD e 250.000 tokens de entrada/minuto**. O painel mostrou picos históricos de 3 RPM, 4,09 mil TPM e 14 RPD no intervalo selecionado; esses picos não são saldo disponível atual. A documentação informa quota por projeto, compartilhada entre chaves, e reset diário à meia-noite do Pacífico. O orçamento factual de 250/dia UTC e 12/minuto deixa margem nominal para mediação; as quatro funções antigas continuam sujeitas à quota comum do provedor, sem garantias de disponibilidade. Tokens e chamadas externas ao fluxo factual podem reduzir a capacidade. Não há garantia de 100 verificações completas/dia ou 15 verificações completas/minuto.

Um fato simples normalmente exige uma classificação e uma interpretação (duas chamadas Gemini para uma Search). Uma decomposição em três fatos pode exigir quatro chamadas Gemini e três Search. O ensaio sintético de 100 verificações simples respeitou a distribuição temporal e usou 200 respostas Gemini simuladas; não prova throughput real. Testes PostgreSQL verificaram 100 reservas entre instâncias e bloqueio da 101ª após recriar o serviço, 15/16 no minuto, barreira mensal, concorrência, expiração de reservas e indisponibilidade do banco. Falhas não são reembolsadas no contador local e não disparam novas chamadas automaticamente.

Testes de questionário incluem encerramento com e sem consenso na primeira rodada, duas rodadas, N/A, ausência, versão original, importação e dez identidades fictícias. Documentos: [variante proposta](DSR_1_1_NATURALISTICO.md), [protocolo 0.3](PROTOCOLO_AVALIACAO_DSR_V2.md), [trechos capítulos 4 e 5](TRECHOS_ATUALIZACAO_CAP4_CAP5_V2.md), [testes](evidence/LIMITES_DSR_TESTS.txt), [TypeScript/build](evidence/LIMITES_DSR_BUILD.json). Os testes técnicos não substituem revisão metodológica e pré-teste de compreensão antes da coleta.
