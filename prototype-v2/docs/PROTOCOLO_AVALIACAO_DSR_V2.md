# PROTOCOLO AVALIAÇÃO DSR V2

Versão 0.3 pré-avaliação. Data-base 19/11/2026. Situação: documento atualizado para apreciação do orientador, sem ratificação formal presumida.

Projeto Processo de decisao. TCC Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva. Engenharia da Computação, Universidade Veiga de Almeida. Orientador Carlos Alvaro de Macedo Soares Quintella.

## 1 DECISÕES INCORPORADAS

A situação-problema pertence integralmente aos participantes: organizar seu próprio churrasco. Os pesquisadores disponibilizam o artefato e suporte técnico; não criam o problema, não impõem alternativas, não elaboram objeções fictícias e não determinam resultados. Os aspectos de data, horário, local, alimentação, bebidas, quantidades, custos, transporte e responsabilidades são possibilidades da decisão abrangente, sujeitos à definição e mudança pelos integrantes.

A avaliação principal compreende um grupo preexistente de aproximadamente dez integrantes, uma sala e uma condição exclusivamente V2 assistida por IA. Não haverá comparação experimental sem IA. O desenho A/B, os instrumentos D19/SUS/D20 e a taxonomia contextual antiga permanecem apenas históricos.

A proposta metodológica é avaliação exploratória naturalística estruturada como estudo de caso único, sujeita à ratificação acadêmica. Uma unidade coletiva de decisão não equivale a dez processos independentes por haver cerca de dez questionários. Fases temáticas não são necessariamente rodadas: o software abre nova rodada ao publicar versão revisada e recolher posições sobre ela.

Consenso exige ACEITO explícito de todos os habilitados na mesma versão; abstenção e silêncio não contam como aceitação. Encerrar sem consenso é legítimo. Não serão fabricadas divergências ou novas rodadas.

Conforme orientação comunicada pelo orientador, não é necessária submissão do procedimento planejado ao Comitê de Ética da UVA. Isso não constitui parecer formal informado de aprovação ou dispensa. A submissão não é pendência deste protocolo.

## 2 ARTEFATO E CONTROLE DE VERSÃO

React, TypeScript e Vite no frontend; Node.js e TypeScript no backend; PostgreSQL Neon; Gemini no backend; HTTPS no Render. Base desta atualização: branch feat/vite-typescript-decisao-generica, HEAD ef8c588d206c201dcacd9fe53a71a6e94a280088 antes das alterações. Gemini 3.5 Flash-Lite e prompt consensus-consultive-v2.0 preservados. Registrar SHA implantado, versão factual e disponibilidade efetiva na sessão, sem expor credenciais.

A verificação factual consultiva usa Tavily Search básica para recuperação e Gemini 3.5 Flash-Lite para classificação e interpretação. Uma consulta pública real, com três fontes e um crédito, foi validada tecnicamente em 19/11/2026; isso não demonstra acurácia geral. Fontes, trechos, datas disponíveis, horários, incertezas e contestações são exportáveis. Os novos tetos internos são 100 buscas/dia UTC e 15/minuto, com orçamento mensal conservador de 1.000 reservas e controle compartilhado persistente no PostgreSQL V2. Não são franquia diária do provedor nem garantia de 100 verificações completas. Gemini factual: 250 chamadas/dia UTC e 12/minuto; quota gratuita observada no projeto: 500/dia, 15/minuto e 250 mil tokens de entrada/minuto, compartilhada com mediação. A quota diária do provedor usa meia-noite do Pacífico. Falhas e limites serão relatados, sem ativar faturamento.

## 3 PROCEDIMENTO OPERACIONAL E ANÁLISE

As subseções seguintes reproduzem as definições metodológicas consolidadas para permitir aplicação autônoma deste protocolo.

### 3.1 PARTICIPANTES E PAPÉIS

Prevê-se aproximadamente dez participantes de um grupo preexistente que possui interesse real na decisão. O número efetivo será informado após a utilização, distinguindo convidados, participantes habilitados, participantes que se manifestaram e respondentes do questionário. A conveniência de acesso ao grupo não será apresentada como amostragem probabilística.

O recrutamento será documentado antes da aplicação. A proposta de procedimento consiste em convite ao próprio grupo, com explicação da finalidade acadêmica, participação voluntária e possibilidade de recusa sem consequência para a convivência. O canal, o responsável pelo convite e a relação dos pesquisadores com os integrantes precisam ser registrados. Não há, nesta versão, evidência suficiente para declarar idade, profissão, escolaridade ou vínculos pessoais específicos.

Propõem-se como critérios de participação: pertencer ao grupo envolvido na organização, ter interesse na decisão, compreender as informações sobre a pesquisa e conseguir utilizar a ferramenta com a orientação técnica oferecida. Não haverá cadastro formal adicional nem coleta de perfis pessoais para fins científicos; serão mantidas somente as identidades técnicas necessárias e as informações mínimas sobre participação e tratamento de dados. A composição dos habilitados será definida antes da abertura; uma desistência durante a sessão será registrada, sem remover retroativamente uma objeção para produzir unanimidade.

O moderador será integrante do grupo responsável pelo TCC. Facilitará operacionalmente a utilização, revisará e publicará propostas e registrará o encerramento, sem votar pelos integrantes que organizam o churrasco ou pressionar consenso. Não será criado um voto de moderador para substituir manifestação de participante.

Os pesquisadores disponibilizam o sistema, apresentam informações sobre o procedimento e oferecem suporte técnico. Intervenções de conteúdo, se excepcionalmente ocorrerem, deverão constar do diário de sessão como desvios, com sua possível influência discutida. Relações anteriores entre pesquisadores e participantes serão relatadas apenas na medida necessária para compreender acesso, influência e limites do caso.

### 3.2 CONTEXTO DA DECISÃO

O grupo possui necessidade própria de organizar seu churrasco. Objetivos, alternativas, necessidades e restrições serão apresentados pelos integrantes. Os pesquisadores não fornecerão perfis fictícios, preferências predeterminadas ou uma alternativa considerada correta. A proposta inicial deverá expressar o que o grupo deseja decidir, podendo ser mantida, ampliada ou reformulada pelos usuários.

A decisão poderá incluir data, horário, local, alimentação, bebidas, quantidades, custos, transporte, responsabilidades e outros aspectos levantados espontaneamente. As fases temáticas servem à organização da conversa. Uma fase só corresponde a nova rodada quando houver publicação de uma nova versão e recolhimento das posições sobre ela. O registro do tema, isoladamente, não cria nova rodada ou novo caso.

Será conservado um registro inicial do contexto tal como apresentado pelo grupo, seguido das mudanças de escopo. Para preservar privacidade, endereços exatos, contatos, informações de saúde e dados financeiros identificáveis serão evitados nos textos enviados à IA. Caso uma necessidade sensível seja relevante, os participantes serão orientados a expressá-la de forma mínima e não identificável.

### 3.3 PROCEDIMENTO PROSPECTIVO

O procedimento abaixo organiza a aplicação sem prescrever a posição dos integrantes ou um número mínimo de divergências. Data, modalidade presencial ou remota, duração disponível e responsáveis serão registrados antes da sessão. A aplicação poderá terminar com consenso ou sem consenso.

1. Informar finalidade acadêmica, registros previstos, envio autorizado de textos mínimos ao Gemini e alegações públicas à Tavily, acesso aos dados, desistência e possibilidade de uso de trechos; registrar concordância voluntária.
2. Orientar o uso técnico da ferramenta, explicar os papéis, as posições possíveis e a diferença entre sugestão da IA e decisão humana.
3. Solicitar ao próprio grupo que apresente sua necessidade e os aspectos que deseja resolver, conservando esse registro.
4. Formular a proposta inicial com os participantes; solicitar parecer consultivo quando autorizado e registrar a decisão humana de manter, editar ou reformular.
5. Criar uma sala com composição definida e distribuir individualmente os acessos, identificando participantes por pseudônimos.
6. Receber manifestações individuais sobre a versão vigente, com justificativa obrigatória para rejeição e possibilidade de abstenção.
7. Disponibilizar pareceres consultivos sobre contribuições, permitindo edição e contestação sem eliminação automática do conteúdo.
8. Examinar as objeções registradas, premissas, evidências apresentadas, interesses comuns, conflitos e incertezas.
9. Quando necessário, solicitar síntese conciliadora e realizar revisão humana, preservando a saída original e as mudanças propostas.
10. Publicar nova versão somente por ação do moderador, com razão registrada e preservação do encadeamento.
11. Receber novas manifestações sobre a versão publicada, sem reaproveitar votos anteriores como aceitação. Prosseguir apenas enquanto houver necessidade deliberativa legítima.
12. Registrar consenso explícito ou encerramento sem consenso, com razão, incidentes e eventuais interrupções.
13. Oferecer individualmente a variante DSR-1.1-NATURALISTICO após encerramento legítimo, com consenso ou sem consenso, independentemente do número de rodadas. Antes da coleta científica, concluir revisão metodológica e pré-teste da variante.
14. Exportar e conferir os registros, separar dados científicos de ensaios sintéticos e executar o plano de análise.

Uma falha do Gemini será registrada como incidente da condição assistida. A possibilidade de prosseguir sem parecer é uma salvaguarda de continuidade, não um grupo experimental sem IA. Se a falha impedir a aplicação prevista, seu impacto e o eventual encerramento serão relatados sem substituição silenciosa da intervenção.

### 3.4 INSTRUMENTOS DE COLETA

O instrumento de referência é o Questionário de Avaliação de Artefato — Design Science Research, versão 1.0, de 16/11/2026, fornecido pelo orientador. O original permanece integralmente preservado no Anexo A e no arquivo de origem. Para aplicação após uma ou mais rodadas, foi implementada a proposta DSR-1.1-NATURALISTICO, sujeita a revisão metodológica e pré-teste antes da coleta. Serão preservados seus 22 itens fechados e quatro questões abertas. A escala corresponde a 1, discordo totalmente; 2, discordo; 3, nem concordo nem discordo; 4, concordo; e 5, concordo totalmente, com opção N/A, não se aplica. A ausência de resposta será registrada separadamente. O texto original está no Anexo A; a versão de aplicação, suas instruções e a alteração explícita de A4 estão em DSR_1_1_NATURALISTICO.md. A1–A3 e os 22 itens fechados não mudaram; A4 passa a “Que funcionalidade deveria ser modificada ou acrescentada para usos futuros?”.

As dimensões são utilidade percebida, itens 01–03; eficácia na construção de consenso, 04–07; qualidade da IA, 08–11; transparência e confiança, 12–15; usabilidade, 16–19; e adoção e aplicabilidade, 20–22. As denominações pertencem ao instrumento; respostas nessas dimensões não comprovam eficácia objetiva ou qualidade factual.

O instrumento é preliminar e não possui validação psicométrica demonstrada. Não corresponde à System Usability Scale (SUS), preservada apenas no histórico do projeto, nem permite calcular um escore SUS. O item 03, sobre valor agregado em comparação com discussão convencional, será interpretado exclusivamente como percepção subjetiva, sem alegação de comparação experimental realizada.

Os demais instrumentos são a exportação operacional da sala e um diário estruturado de sessão. O diário registrará orientação técnica, fases temáticas, pausas, incidentes, intervenções e alterações de escopo. Não se prevê gravação audiovisual nesta proposta. A versão do protocolo, a referência do software e a configuração do modelo serão registradas para permitir interpretar o que foi utilizado.

### 3.5 INDICADORES E DEFINIÇÕES OPERACIONAIS

Os indicadores distinguem contagens produzidas pelo sistema, interpretações da IA e julgamentos humanos. Nenhum rótulo de objeção atendida será tratado como fato objetivo apenas porque foi gerado pelo modelo. O Quadro 4 fixa a leitura dos registros antes da coleta.

Quadro 4 — Indicadores previstos para o caso

| Indicador | Definição e fonte | Limite de interpretação |
|---|---|---|
| Rodadas e versões | Número de rodadas abertas e propostas publicadas; exportação | Uma fase temática sem publicação não aumenta a contagem |
| Manifestações | Registros de contribuições e votos, apresentados separadamente | Reenvios e revisões não são novos participantes |
| Objeções | Registros REJEITO e rejeições vigentes por rodada | Contagens diferentes; repetição não comprova manipulação |
| Mudanças | Versões após V1 e motivos de publicação | Não demonstra melhoria substantiva |
| Cobertura | Atendida, parcial ou não atendida, atribuída pela IA e pelo moderador separadamente | Julgamentos falíveis, sem equivalência a avaliação independente |
| Duração | Criação até encerramento, segundo carimbos de tempo | Inclui espera; discussão ativa exige diário próprio |
| Resultado formal | Consenso ou encerramento sem consenso; abertos e interrupções discriminados | Consenso não equivale a qualidade, convicção ou justiça |
| Percepções | Frequências por item e respostas abertas individuais | Observações vinculadas ao mesmo processo coletivo |
| Fidelidade percebida e registros | Percepções do questionário e exame descritivo dos textos disponíveis | Não haverá avaliação independente adicional, rubrica ou nota de fidelidade |

Fonte: autores, com base no instrumento do orientador e na implementação V2.

Com apenas um processo coletivo, o resultado será relatado como ocorrência singular. Uma proporção de consenso de 0/1 ou 1/1, caso apresentada para compatibilidade com o software, não estimará uma taxa populacional. Restaurações e importações serão deduplicadas pelo identificador de origem e não acrescentarão casos.

### 3.6 PLANO DE ANÁLISE

A análise quantitativa será descritiva. Para cada item, serão apresentados número de participantes habilitados, respondentes, respostas válidas 1–5, frequências de cada valor, N/A e ausências. N/A e ausências não serão convertidos em zero nem incluídos no denominador da média. A não resposta de um participante ao formulário inteiro será contada separadamente das questões ausentes em formulários enviados. Serão informados versão/variante, número de rodadas e resultado, sem misturar automaticamente condições de exposição. Percentuais, se utilizados, indicarão seu denominador.

Médias dos valores 1–5 poderão complementar as frequências, com cautela por se tratar de respostas ordinais e amostra pequena. As médias por dimensão calculadas pelo software agregam os valores efetivamente respondidos; serão acompanhadas do número de respostas e não chamadas de escores psicométricos validados. Não serão imputados dados nem realizados testes de significância, comparações causais ou estimativas de eficácia geral.

As respostas abertas serão examinadas por codificação temática humana. O procedimento proposto compreende leitura integral, identificação de unidades de sentido, elaboração de códigos, agrupamento em temas e revisão dos temas contra os textos. Serão conservados código, definição, excerto pseudonimizado, responsável e memorando analítico. Um segundo pesquisador poderá revisar a codificação e as divergências serão registradas; a designação dos analistas será completada antes da análise. Não se atribuirá à IA a produção de uma avaliação humana independente.

O processo coletivo será reconstruído em ordem temporal, associando proposta, rodada, manifestações, análises, síntese e revisão publicada. Serão examinados exemplos de objeções preservadas, parcialmente incorporadas e não atendidas, assim como casos que contradigam avaliações positivas do questionário. Falhas de IA, fontes inexistentes, omissões, direcionamento percebido e diferenças entre saída original e revisão humana receberão exame explícito.

Não haverá avaliação humana independente adicional da fidelidade das sínteses. A análise utilizará a percepção captada pelo questionário e o exame descritivo dos registros disponíveis, sem inventar rubricas, avaliadores ou notas. As funções opcionais de cobertura existentes no software não constituem uma medida científica independente adotada neste protocolo.

### 3.7 APLICAÇÃO APÓS UMA OU MAIS RODADAS

O orientador comunicou a possibilidade de utilizar o instrumento existente ou elaborar instrumento fundamentado para processos encerrados antes da segunda rodada. O grupo optou pela proposta de variante DSR-1.1-NATURALISTICO: 22 itens e quatro abertas, com instruções de decisão real, N/A explícito para experiência não vivenciada e alteração identificada de A4. Isso não equivale a ratificação formal da redação adaptada nem validação psicométrica. A implementação está disponível para pré-teste; revisão metodológica e pré-teste com pessoas de características próximas às do grupo devem preceder a coleta científica.

Consenso e encerramento sem consenso na primeira rodada são legítimos. O formulário abre somente após encerramento. Não se fabrica divergência, voto ou nova versão para desbloqueá-lo. Itens sobre objeções, aproximação de posições, reformulação, sínteses e alterações continuam visíveis, com N/A disponível, sem seleção automática da nota 3 ou de N/A. Qualquer resposta pode permanecer ausente. O item 20 permanece hipotético como no original e deve ser examinado no pré-teste; não foi reescrito silenciosamente.

O FEDS fundamenta a escolha do episódio naturalístico e a explicitação da estratégia de avaliação (Venable, Pries-Heje e Baskerville, 2016). Não fornece validação do questionário ou uma regra de número de rodadas. A fundamentação de instruções, opções de resposta, não resposta, pré-teste e documentação da adaptação provém das boas práticas da AAPOR e do padrão A2 do U.S. Census Bureau. Essas recomendações orientam o procedimento; não constituem aprovação institucional do instrumento.

Versão, variante, base original, quantidade de rodadas, resultado, encerramento e exposição operacional registrada são conservados com cada nova resposta. Dados antigos mantêm sua versão, respostas e condição original de duas rodadas. Não se preenchem retrospectivamente metadados ausentes. Relatórios separam versões e número de rodadas; A4 adaptada não é automaticamente equivalente à original.

### 3.8 PRIVACIDADE E PARTICIPAÇÃO VOLUNTÁRIA

Conforme orientação comunicada pelo orientador ao grupo, o procedimento planejado neste Trabalho de Conclusão de Curso (TCC) não necessita de submissão ao Comitê de Ética da Universidade Veiga de Almeida (UVA). Registra-se essa orientação sem atribuir ao Comitê parecer formal de aprovação ou dispensa que não foi informado. A submissão não é tratada como pendência ou requisito de execução.

Antes da utilização, os participantes receberão informação sobre finalidade acadêmica, dados registrados, assistência consultiva e envio autorizado de proposta, contribuições e justificativas à API Gemini e da pergunta pública mínima à Tavily Search, uma interface de programação de aplicações. Serão explicados os acessos dos pesquisadores e moderador, o uso de trechos na monografia e os limites da pseudonimização em um grupo pequeno. Participar da decisão e autorizar o uso de seus registros na pesquisa são questões que deverão ser esclarecidas sem coerção.

A identificação utilizará P01, P02 e assim sucessivamente. Contatos de recrutamento e registros de concordância ficarão separados dos dados da sala. Textos livres serão revisados para minimizar identificadores antes da divulgação. Os participantes serão orientados a não inserir dados pessoais desnecessários ou sensíveis; os pseudônimos, sozinhos, não tornam anônimos os relatos.

A participação será voluntária, com possibilidade de não responder ao questionário, interromper o uso e solicitar retirada do uso acadêmico de conteúdo identificável. O procedimento de solicitação, o contato responsável e o marco após o qual resultados agregados ou já publicados não poderão ser individualizados precisam constar da informação prévia. Não se prometerá eliminação de dados de todos os ambientes de terceiros sem capacidade comprovada.

Propõe-se acesso operacional do moderador aos registros da sala e acesso de pesquisa apenas aos integrantes responsáveis pela análise, com cópia protegida e sem credenciais em relatórios. Responsável nominal pela guarda, local institucional ou conta autorizada, prazo de retenção, cópias de segurança e forma de eliminação permanecem para definição do grupo e orientador antes da coleta. A V2 conserva snapshots por acréscimo e não oferece, na evidência examinada, fluxo comprovado de exclusão granular; o atendimento a solicitações exigirá procedimento próprio, autorizado e documentado, sem alteração nesta execução acadêmica.

O uso de excertos na monografia será informado previamente. Cada trecho será pseudonimizado, reduzido ao necessário e examinado quanto ao risco de reconhecimento; conteúdos potencialmente identificáveis dependerão de autorização específica ou serão parafraseados ou omitidos. Se um participante não concordar com o envio de seu texto ao Gemini, o texto não será enviado. A viabilidade de sua participação nessa avaliação assistida será então discutida sem pressioná-lo a consentir.

### 3.9 LIMITAÇÕES DO DELINEAMENTO

O estudo contempla um único processo coletivo e uma amostra reduzida, sem grupo de controle. Relações anteriores, contexto do evento, familiaridade com tecnologia, influência do moderador e expectativas sobre a IA podem afetar a utilização e as respostas. Não será possível isolar o efeito causal da assistência automatizada nem generalizar estatisticamente os achados.

A dependência do Gemini envolve variação de respostas, configuração, disponibilidade e mudanças do serviço. A rastreabilidade permite identificar a configuração registrada, mas não garante reprodução textual idêntica. Os testes técnicos não substituem avaliação científica, e os julgamentos do moderador não substituem avaliação independente.

O consenso formal informa apenas que todos os habilitados registraram aceitação sobre uma mesma versão. Não demonstra convicção, justiça, correção factual, qualidade substantiva ou execução do churrasco. Uma sessão sem consenso permanece informativa. A ausência de experiência em certas funcionalidades será apresentada por N/A e pelos registros; a disponibilidade da verificação factual não garante sua correção. Falhas de provedores e fontes desatualizadas serão explicitadas, evitando seleção de evidências que favoreça uma conclusão.

## 4 PREPARAÇÃO E REGISTRO DA APLICAÇÃO

Antes da aplicação, completar: data, modalidade, intervalo disponível, forma de recrutamento sem cadastro adicional, identidade funcional do moderador integrante do TCC, papéis dos pesquisadores, informação e concordância, guarda, prazo de retenção e contato responsável. Conferir acessos individualizados, conectividade, versão do instrumento e exportação disponível. Não executar testes sintéticos dentro da sala científica nem importar o ensaio fictício como caso real.

Registrar a formulação espontânea do problema, composição inicial dos habilitados, proposta confirmada pelo grupo e mudanças de escopo. O diário de sessão deve indicar fases temáticas, pausas, auxílio técnico, intervenção de conteúdo excepcional, falha da IA e motivo de encerramento. A orientação técnica não poderá determinar votos.

A composição inicial deve ser documentada. Se houver desistência, registrar efeitos no processo sem apagar retrospectivamente a posição para produzir consenso. Distinguir desistência da pesquisa, ausência de resposta e abstenção. Não prometer exclusão técnica granular sem procedimento comprovado e autorizado.

Separar identificadores e consentimentos dos dados da sala. Exportações restauradas preservam originId e serão deduplicadas. Não reunir sessões sintéticas na amostra. Nenhuma sessão interrompida ou sem consenso será omitida por desfavorecer o resultado.

## 5 DECISÕES A RATIFICAR OU COMPLETAR

1. Ratificação do desenho naturalístico como estudo de caso único.
2. Canal e responsável pelo convite e relação de acesso ao grupo, sem cadastro científico ou coleta adicional de perfis.
3. Revisão metodológica da proposta DSR-1.1-NATURALISTICO e pré-teste de compreensão, navegação e interpretação de N/A antes da coleta; registrar achados e versão final.
4. Responsável pela guarda, local, acessos, prazo, cópias, contato, retenção e retirada do uso acadêmico.

Estão definidos: problema autônomo do churrasco; grupo aproximado de dez integrantes; condição única com IA; moderador integrante do TCC sem voto pelos demais; ausência de avaliação independente adicional de fidelidade; encerramento com ou sem consenso; possibilidade técnica de questionário em uma rodada por variante identificada; orientação de desnecessidade de submissão ao Comitê. Nenhuma aprovação formal inexistente é atribuída.

## 6 HISTÓRICO E FONTES

Versão 0.1 de 17/11/2026: preparação prospectiva, com contexto e amostra ainda indefinidos e menção a comparação alternativa. Versão 0.2 de 18/11/2026: incorpora decisões do grupo, retira comparação da execução atual e detalha avaliação naturalística, instrumentos e dados. Versão 0.3 de 19/11/2026: registra Tavily/Gemini reais, tetos persistentes e variante proposta DSR-1.1-NATURALISTICO após encerramento de uma ou mais rodadas; incorpora moderador e ausência de avaliação independente adicional. O histórico anterior permanece nos commits, sem alterar main, backup ou Streamlit.

Fontes: Hevner et al. (2004); Peffers et al. (2007); Venable, Pries-Heje e Baskerville (2016); Yin (2018); documentos do orientador de 16/11/2026; monografia oficial e sua aba V2; código e INTEGRACAO_REAL_V2.md na referência identificada. A orientação sobre Comitê e as decisões atuais do grupo foram comunicadas no comando de consolidação acadêmica de 18/11/2026, sem atribuir ratificação formal a todo o protocolo.


Referências adicionais da adaptação: VENABLE, J.; PRIES-HEJE, J.; BASKERVILLE, R. FEDS: a Framework for Evaluation in Design Science Research. European Journal of Information Systems, v. 25, p. 77–89, 2016. DOI: 10.1057/ejis.2014.36. AAPOR. Best Practices for Survey Research. Disponível em: https://aapor.org/standards-and-ethics/best-practices/. U.S. CENSUS BUREAU. Statistical Quality Standards: A2, Developing Data Collection Instruments and Supporting Materials, especialmente A2-3.3 e A2-4. Revisão consultada de 29 set. 2026. Disponível em: https://www2.census.gov/about/policies/quality/quality-standards.pdf. Acesso às fontes em: 19 nov. 2026.

## 7 EVIDÊNCIA TÉCNICA DA VERSÃO DE APLICAÇÃO

Código 98781dca1a4ca58a548c8d4b6f4be8bcb8432bcf, 74 testes e CI aprovados; variante demonstrada em sessão sintética encerrada na rodada 1 com consenso e sem consenso. Exportação e importação preservaram respostas e versões. Resultados exclusivamente técnicos em evidence/LIMITES_DSR_VALIDACAO.json, separados do pré-teste com respondentes e da avaliação científica.

# ANEXO A QUESTIONÁRIO ORIGINAL DO ORIENTADOR

Questionário de Avaliação de Artefato. Design Science Research (DSR) | Sistema de Decisão por Consenso Assistido por IA. Versão 1.0. Instrumento preliminar para avaliação com usuários. 16/11/2026.

Apresentação e instruções originais: Este questionário avalia a utilidade, eficácia, qualidade da IA, transparência, usabilidade e aplicabilidade do artefato. Responda após realizar uma simulação de decisão coletiva com pelo menos duas rodadas. Não há respostas certas ou erradas. A participação deve ser voluntária e as respostas tratadas conforme o protocolo ético da pesquisa.

Identificador do participante: __________________ Data: __________ Cenário: __________________

Escala: 1 = Discordo totalmente; 2 = Discordo; 3 = Nem concordo nem discordo; 4 = Concordo; 5 = Concordo totalmente; N/A = Não se aplica.

## Utilidade percebida

01. O sistema contribuiu para compreender melhor o problema decisório.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

02. O sistema ajudou a identificar aspectos relevantes que eu não havia considerado.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

03. O uso do sistema agregou valor em comparação com uma discussão convencional.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

## Eficácia na construção de consenso

04. A análise das objeções ajudou a compreender as divergências entre participantes.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

05. A proposta reformulada incorporou adequadamente as preocupações apresentadas.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

06. O sistema facilitou a aproximação entre posições inicialmente divergentes.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

07. As alterações propostas preservaram os objetivos essenciais da decisão.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

## Qualidade da IA

08. A IA identificou adequadamente ambiguidades ou vieses na proposta inicial.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

09. As avaliações das objeções foram coerentes e fundamentadas.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

10. As sugestões de reformulação foram relevantes e viáveis.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

11. A IA distinguiu adequadamente fatos, hipóteses e interpretações.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

## Transparência e confiança

12. Consegui compreender por que a IA sugeriu determinadas alterações.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

13. Foi possível identificar quais objeções foram atendidas ou permaneceram sem solução.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

14. Minha autonomia para aceitar ou rejeitar propostas foi preservada.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

15. O sistema tratou adequadamente posições minoritárias ou divergentes.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

## Usabilidade

16. Foi fácil compreender as etapas do processo decisório.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

17. Foi fácil registrar minha posição e justificar uma objeção.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

18. A apresentação das propostas e análises facilitou acompanhar as rodadas.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

19. O esforço necessário para utilizar o sistema foi aceitável.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

## Adoção e aplicabilidade

20. Eu utilizaria o sistema em uma situação real de decisão coletiva.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

21. O sistema seria útil em equipes, conselhos ou grupos de trabalho.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

22. Os benefícios percebidos justificam o tempo necessário para utilizá-lo.

Resposta: 1  |  2  |  3  |  4  |  5  |  N/A

## Questões abertas

A1. Qual foi a principal contribuição do sistema para a tomada de decisão?

Resposta: __________________________________________________________

A2. Em que momento a IA interpretou inadequadamente uma proposta ou objeção?

Resposta: __________________________________________________________

A3. Você percebeu favorecimento de alguma posição? Descreva.

Resposta: __________________________________________________________

A4. Que funcionalidade deveria ser modificada ou acrescentada antes do uso real?

Resposta: __________________________________________________________

Fonte: documento original fornecido pelo orientador em 16/11/2026. Itens, escala e condição original preservados. O delineamento de caso real não adota automaticamente a recomendação histórica de cenário imposto ou comparação sem IA.
