# Atualização prospectiva da monografia — artefato V2
Data-base: 17 de novembro de 2026. Situação: redação de trabalho para revisão acadêmica. A implementação técnica não equivale à aprovação do delineamento de pesquisa.

## Nota de transição e preservação
Este texto atualiza prospectivamente os capítulos afetados pela especificação do orientador e pelo questionário DSR, ambos de 16/11/2026. O conteúdo anterior permanece como registro da versão Python/Streamlit e do protocolo então planejado. Não se trata de resultados adicionais daquele experimento.

A versão anterior utilizava cenário escolar, taxonomia contextual de objeções e regra operacional que admitia aceitação com ressalvas. A V2 adota proposta genérica e consenso por aceitação explícita de todos os habilitados na mesma versão. Instrumentos D19, SUS e D20 e o desenho A/B anterior são preservados como materiais históricos, sem presunção de aplicação automática à nova intervenção.

A manutenção de React, TypeScript e Vite, bem como de participação remota com autenticação e persistência central, constitui decisão do grupo. A especificação do orientador descrevia simulação local com Svelte e armazenamento no navegador. Essas diferenças precisam ser identificadas na apresentação do artefato e não são atribuídas ao orientador.

## 1 INTRODUÇÃO — versão prospectiva
A decisão coletiva exige que informações, objetivos, restrições e justificativas de pessoas diferentes sejam considerados na elaboração de uma proposta comum. O registro de uma escolha não permite, isoladamente, compreender as razões da discordância nem acompanhar como essas razões foram incorporadas a uma revisão. Sistemas de apoio à decisão em grupo podem estruturar essa interação, mas seus mecanismos de agregação e facilitação precisam preservar a representação do dissenso.

A literatura já reunida nesta monografia fundamenta a distinção entre processo, satisfação e qualidade da decisão. Bang e Frith (2017) discutem condições de decisão em grupo; Tran, Felfernig e Le (2024) apresentam diferentes modelos de consenso; os trabalhos de facilitação por grandes modelos de linguagem examinados nos capítulos teóricos indicam possibilidades de organização e síntese, acompanhadas de limites. A mudança tecnológica não elimina essas distinções.

O problema investigado na V2 consiste em apoiar pequenos grupos na formulação de um problema, no registro das manifestações e na revisão de propostas, sem conferir autoridade decisória à inteligência artificial. A análise automatizada pode apontar ambiguidades, premissas e divergências, mas também pode interpretar inadequadamente uma objeção, omitir preocupações ou exercer influência sobre a direção da discussão.

A questão de pesquisa prospectiva é: como um sistema genérico de decisão por consenso assistido por inteligência artificial pode apoiar a formulação de propostas, a compreensão das objeções e a revisão iterativa de alternativas, preservando autonomia, rastreabilidade e responsabilidade humana?

O objetivo geral é desenvolver e avaliar exploratoriamente um artefato computacional para apoiar decisões coletivas genéricas por consenso, com assistência consultiva de inteligência artificial durante o processo.

Os objetivos específicos passam a compreender: OE01, manter a fundamentação sobre decisão coletiva, consenso e facilitação por IA; OE02, especificar requisitos derivados dos problemas e riscos identificados; OE03, definir um método com posições explícitas, objeções justificadas, rodadas e unanimidade na mesma versão; OE04, implementar interface React, API Node.js, persistência PostgreSQL e contratos Gemini; OE05, demonstrar tecnicamente o fluxo com identidades sintéticas e, após definição do protocolo, com usuários; OE06, avaliar utilidade, eficácia percebida, qualidade da IA, transparência, usabilidade e aplicabilidade, distinguindo percepções de indicadores operacionais e avaliações humanas.

A justificativa técnica decorre da necessidade de conectar formulação, manifestação, interpretação, revisão e encerramento em um histórico examinável. A contribuição proposta é uma configuração de engenharia e avaliação exploratória; não se afirma prioridade científica, superioridade universal ou ausência de soluções anteriores semelhantes.

O escopo admite propostas de equipes, planejamento, prioridades e avaliação de alternativas. Título, problema, decisão pretendida e texto da proposta são estruturados; objetivos, alternativas, restrições, critérios de sucesso e contexto podem ser acrescentados. Valores financeiros e categorias escolares não são obrigatórios. O cadastro aceita de dois a trinta participantes, mas esse limite de entrada não representa capacidade empiricamente validada. O ensaio técnico descrito na entrega utiliza três identidades sintéticas.

A V2 não estabelece maioria simples como consenso. Cada habilitado precisa registrar ACEITO sobre a mesma versão. REJEITO exige justificativa; ABSTENHO e ausência de resposta não equivalem a aceite. O processo pode terminar sem consenso, com razões registradas. A unanimidade formal não demonstra convicção genuína, justiça ou qualidade substantiva.

## 2 FUNDAMENTAÇÃO TEÓRICA — atualização prospectiva
A fundamentação existente sobre Group Decision Support Systems, compartilhamento de informação, dissenso e influência social permanece pertinente. O novo recorte exige separar o conceito amplo de consenso da condição operacional específica implementada. A diversidade de modelos examinada por Tran, Felfernig e Le (2024) não autoriza apresentar qualquer indicador de convergência como aceitação explícita unânime.

A iteração é tratada como relação entre uma proposta, suas manifestações e uma versão revisada. Pérez et al. (2018) oferecem enquadramento para processos dinâmicos; essa referência não determina um número universal de rodadas. Na V2 não há limite rígido de três versões. Uma alteração publicada encerra a rodada anterior e exige novas posições, preservando o histórico.

Objeções não são classificadas em taxonomia fixa. A análise consultiva explicita pertinência, premissas, evidências apresentadas, riscos e incertezas. A contribuição de Stab e Gurevych (2017) permanece conceitual para distinguir elementos argumentativos; não constitui validação das interpretações do modelo nem de um instrumento de qualidade argumentativa da V2.

A inteligência artificial participa da análise inicial, do parecer sobre contribuições, da organização das objeções e da síntese conciliadora. Os trabalhos de Ma et al. (2025) e Tessler et al. (2024), já examinados na monografia, sustentam a discussão sobre interação iterativa e formulações compartilhadas nos respectivos contextos. Seus resultados não são transferidos automaticamente ao artefato desenvolvido.

A governança exige manter separadas sugestão algorítmica, julgamento do moderador e posição do participante. Os riscos de direcionamento discutidos a partir de Parisi et al. (2026), e as preocupações de controle e privacidade apresentadas por Delić et al. (2024), justificam mecanismos de contestação, explicitação de limitações e revisão humana. Esses controles não provam neutralidade nem eliminam influência.

A distinção factual é explícita: coerência com o contexto fornecido difere de confirmação por fonte externa. Como o adaptador não consulta fontes independentes, a aplicação apenas identifica alegações que precisam de evidência ou não são verificáveis. Não há capacidade implementada de declarar fatos externamente confirmados, e referências inexistentes não devem ser produzidas.

A autonomia envolve aceitar, rejeitar ou abster-se, editar um texto e contestar interpretações da IA. O parecer não pode censurar automaticamente uma objeção legítima. A preservação técnica da manifestação, por sua vez, não demonstra que o grupo ou o moderador a tenha considerado adequadamente; essa distinção orienta a avaliação de fidelidade.

## 3 TRABALHOS RELACIONADOS — atualização da derivação das funcionalidades
O corpus e as limitações de acesso às fontes, já registrados na monografia, são preservados. Esta atualização modifica a ligação entre barreiras e funcionalidades, sem reiniciar a auditoria bibliográfica nem afirmar que a configuração proposta esteja ausente da literatura.

As dificuldades de compartilhamento de informação e manifestação de razões justificam a combinação de posição explícita e justificativa. A exposição prévia a opiniões alheias fundamenta o controle de visibilidade antes do primeiro registro na versão vigente. Esse controle não elimina influência social e não apaga o conhecimento das rodadas anteriores.

O risco de simplificação de argumentos motiva a retirada da categoria temática obrigatória. Na V2, textos permanecem acompanhados de pareceres que podem ser contestados. A rastreabilidade passa a conservar sucessivos registros textuais de contribuições e votos, em vez de depender apenas de metadados de edição.

Os trabalhos de facilitação já analisados justificam investigar a síntese de interesses e divergências. A funcionalidade correspondente produz mudanças sugeridas, suas justificativas e vínculos com objeções. A validação estrutural exige que as rejeições sejam representadas e identificadas, mas a adequação semântica dessa representação requer exame humano.

Os riscos de consenso artificial fundamentam três controles: unanimidade determinística de ACEITO, publicação humana da revisão e possibilidade de encerramento sem consenso. A avaliação distingue a ocorrência formal de consenso da percepção de contribuição do sistema e da fidelidade da síntese.

A antiga sequência classificação em CAT01–CAT09, contagem por categoria e mediação contextual é substituída, prospectivamente, por análise argumentativa consultiva, preservação de posições minoritárias, síntese com cobertura de objeções e revisão humana. As antigas referências a concordância com uma categoria adjudicada não constituem automaticamente medidas adequadas para o novo artefato.

A matriz técnica de rastreabilidade associa problema, requisito, funcionalidade, componente, teste e critério de avaliação. Ela deve acompanhar a apresentação do desenvolvimento como evidência do percurso de projeto, não como evidência de eficácia científica.

## 4 METODOLOGIA DA PESQUISA — versão prospectiva
A pesquisa permanece orientada pela Design Science Research, com referência à Design Science Research Methodology de Peffers et al. (2007) e aos princípios de Hevner et al. (2004). A V2 constitui uma iteração do artefato motivada pela revisão do problema e dos critérios de solução.

A identificação do problema enfatiza formulação insuficiente, dificuldade de representar divergências e riscos da facilitação automatizada. Os objetivos da solução são operacionalizados em requisitos, contratos e invariantes de consenso. O projeto e desenvolvimento compreendem domínio, interface, API e persistência. A demonstração técnica utiliza dados sintéticos. A avaliação com usuários permanece prospectiva e depende de procedimento atualizado.

O protocolo A/B anterior não é presumido válido: a intervenção, o domínio da tarefa, as posições, a regra de encerramento e o instrumento mudaram. Eventual comparação com condição sem IA pode fortalecer a avaliação, conforme o documento do orientador, mas exige cenários equivalentes, alocação e procedimentos definidos. Não se declara tal comparação implementada ou aprovada.

O procedimento recomendado utiliza um cenário com posições divergentes, pelo menos duas rodadas e questionário individual pós-sessão. A participação deve ser voluntária. Se o grupo alcançar consenso na primeira rodada, não se deve produzir discordância artificial para cumprir o procedimento; a ocorrência é registrada e o instrumento previsto para duas rodadas não é disponibilizado nessa sessão.

O instrumento preliminar do orientador, versão 1.0 de 16/11/2026, contém 22 itens fechados: utilidade percebida, itens 01–03; eficácia na construção de consenso, 04–07; qualidade da IA, 08–11; transparência e confiança, 12–15; usabilidade, 16–19; adoção e aplicabilidade, 20–22. As quatro questões abertas A1–A4 são mantidas integralmente. A escala admite valores de 1 a 5, N/A e ausência, registrados separadamente.

O instrumento é original e não possui validação psicométrica demonstrada. Não é uma versão da SUS nem permite herdar suas propriedades de medida. Pré-teste, exame de conteúdo e, para alegações psicométricas, estudo apropriado da estrutura e consistência permanecem necessários. D19, SUS e D20 continuam históricos até nova decisão acadêmica.

Os indicadores automáticos incluem resultado formal, rodadas, manifestações, objeções e duração. Na implementação, duração corresponde ao intervalo entre criação da sala e encerramento, incluindo espera por entrada; não representa exclusivamente tempo de discussão ativa. O relatório distingue quantidade de registros de rejeição da quantidade de rejeições vigentes por rodada.

A taxa de consenso é calculada entre processos concluídos únicos, com deduplicação de restaurações pelo identificador de origem. Processos abertos não entram no denominador. A interpretação depende de cenários, composição dos grupos e condições de aplicação efetivamente documentados.

Cobertura de objeções e fidelidade são avaliações humanas, separadas das sugestões da IA. A aplicação permite ao moderador registrar cobertura e representação fiel, mas esses registros não constituem avaliação independente. Seleção de avaliadores, cegamento, rubrica, adjudicação e qualidade argumentativa exigem definição antes da coleta; nenhum escore é fabricado enquanto esses elementos estiverem pendentes.

A análise descritiva apresenta frequências e denominadores por item, N/A, ausências e médias exploratórias dos valores respondidos. As médias das dimensões implementadas não são tratadas como escores latentes validados. As respostas abertas são exportadas para codificação temática humana, com códigos, memorandos e síntese a produzir a partir do material efetivamente coletado.

Privacidade e ética exigem minimização de dados, identificação Pxx, informação prévia sobre envio ao Gemini e restrição das respostas individuais. Pseudonimização não equivale a anonimato garantido: texto livre e exportações podem conter elementos identificáveis. Recrutamento, consentimento, retenção e eventual exclusão precisam estar definidos no protocolo de uso real.

## 5 ARTEFATO PROPOSTO E DESENVOLVIMENTO — versão prospectiva
O frontend mantém React, TypeScript e Vite já iniciados, com extração e ampliação dos componentes existentes. ProposalEditor estrutura o problema; ReviewCard apresenta pareceres; RoomWorkspace organiza rodadas e revisão; EvaluationForm operacionaliza o instrumento. A interface conserva rótulos, foco visível, estados de carregamento e mensagens de erro.

A API Node.js/TypeScript centraliza autenticação, autorização, validação, persistência e Gemini. As credenciais não são enviadas em URL e permanecem em memória no navegador. O servidor utiliza HMAC para armazenamento das credenciais de acesso, além de chave distinta para comprovantes de pareceres. Essa proteção não substitui HTTPS, gestão de segredos e controles da hospedagem.

O PostgreSQL recebe exclusivamente o esquema V2 isolado. O modelo conceitual compreende Decision, Proposal, Participant, Round, Vote, ObjectionAnalysis, Synthesis e AuditEvent. No MVP, as entidades de processo são agregados JSONB tipados em snapshots, com tabelas relacionais para salas e credenciais. Não se afirma que todas as entidades estejam normalizadas em tabelas independentes.

Cada mutação bloqueia a sala em transação, compara a revisão esperada e acrescenta novo snapshot. A aplicação não atualiza nem apaga snapshots anteriores. Esse histórico por acréscimo não constitui proteção criptográfica contra um administrador do banco e aumenta o volume de armazenamento.

O método parte de uma proposta V1 confirmada pelo moderador. Participantes registram posições e razões, podem analisar contribuições e contestar pareceres. O moderador solicita análise de objeções e síntese, revisa os campos da proposta e confirma a publicação de V2. Os votos anteriores permanecem vinculados a V1; todas as posições em V2 começam pendentes.

A integração Gemini ocorre por AIAdapter, com modelo configurável, instruções versionadas, JSON Schema e validação Zod. Respostas inválidas, omissão detectável de objeções, IDs inexistentes e citações ausentes do original são recusados como falhas de assistência. A aplicação continua oferecendo envio sem parecer e revisão manual. A validação não certifica verdade factual ou fidelidade semântica.

A síntese identifica alterações, suas justificativas, objeções atendidas, parcialmente atendidas ou não atendidas, impasses e alertas de viabilidade. Essas classificações são sugestões da IA até exame humano. Uma nova manifestação após a análise torna sua base desatualizada para a síntese e exige reanálise.

A autorização no servidor delimita a sala e o papel. O participante não recebe credenciais de terceiros nem suas respostas DSR. Manifestações e análises alheias ficam ocultas antes de seu primeiro registro na versão vigente, com limites de influência anteriormente discutidos.

A exportação JSON versão 2 conserva o processo e dados de avaliação, sem credenciais. A recuperação valida vínculos e resultado formal, cria outra sala e reemite acessos, preservando a origem para deduplicação. Arquivos importados conservam proveniência declarada; sua autoria externa não é autenticada pelo sistema.

Os testes automatizados abrangem regras de domínio, API, contratos de IA, migrações, recuperação e componentes React. O ensaio de integração utiliza HTTP real e PostgreSQL embarcado PGlite, com IA sintética. Essa evidência verifica funcionamento técnico nas condições testadas. Não equivale a integração real com Neon/Gemini, implantação pública, ensaio de carga ou avaliação com usuários.

## 6 RESULTADOS — estrutura para preenchimento posterior
6.1 Caracterização das sessões: cenário, participantes pseudonimizados, condições, versão do código, modelo e prompts efetivamente utilizados.
6.2 Demonstração técnica: identificação das execuções e seus limites, separada das evidências de usuários.
6.3 Indicadores operacionais: processos concluídos, consenso, encerramento sem consenso, rodadas, duração e manifestações.
6.4 Avaliação DSR: frequências por item e dimensão, N/A, ausências e denominadores.
6.5 Respostas abertas: códigos, temas, exemplos autorizados e casos divergentes.
6.6 Cobertura e fidelidade: procedimento humano, concordâncias/divergências e limitações.
Não há resultados científicos a preencher nesta entrega. Números de testes não representam participantes nem eficácia.

## 7 DISCUSSÃO — estrutura para preenchimento posterior
Confrontar as evidências coletadas com a questão de pesquisa e com os limites da literatura já examinada.
Distinguir percepção favorável, convergência formal, fidelidade da síntese e qualidade substantiva.
Examinar omissões, direcionamento, posições minoritárias, atuação do moderador e casos sem consenso.
Explicitar limitações de amostra, cenário, desenho, modelo e infraestrutura. Não inferir causalidade a partir de diferenças descritivas sem suporte do delineamento.

## 8 CONCLUSÃO — estrutura prospectiva
Retomar objetivos e contribuição de engenharia, vinculando cada conclusão a evidência identificável.
Descrever o apoio consultivo efetivamente implementado e suas limitações.
Reservar conclusões sobre utilidade, eficácia percebida e qualidade da mediação para dados de avaliação obtidos sob protocolo atualizado.
Indicar evoluções de segurança, avaliação independente, fontes verificáveis e comparação de condições apenas como trabalhos futuros quando não executadas.

## Pendências para revisão acadêmica
Ratificar novo recorte e redação da questão/objetivos; definir cenário, amostra e condições; pré-testar o instrumento; estabelecer consentimento e tratamento dos dados; definir rubrica e avaliadores de fidelidade/argumentação; decidir sobre comparador sem IA.
A formatação segue a estrutura e as citações autor-data da monografia existente. Paginação, sumário, listas e consolidação final no modelo UVA permanecem dependentes da incorporação e revisão editorial, sem alegação de conformidade final certificada.

## Referências preservadas
As referências bibliográficas abaixo são reproduzidas do bloco de referências da monografia consultada. Mantêm-se suas notas de versão e limites de acesso; esta atualização não representa nova auditoria bibliográfica.

ACKERMANN, Fran. Group Support Systems: Past, Present, and Future. In: KILGOUR, D. Marc; EDEN, Colin (ed.). Handbook of Group Decision and Negotiation. Cham: Springer, 2020. p. 1–29. DOI: 10.1007/978-3-030-12051-1_47-1. Versão citada: edição on-line de 2020; texto integral não acessível nesta conferência. A edição de 2021 possui identificador editorial distinto e não a substitui.
ALSOBAY, Mohammed et al. Bringing Everyone to the Table: An Experimental Study of LLM-Facilitated Group Decision Making. Proceedings of the ACM on Human-Computer Interaction, v. 10, n. 6, p. 1–36, 2026. DOI: 10.1145/3816907. Texto consultado: versão dos autores, arXiv:2508.08242v2, revisada em 2 jul. 2026. Disponível em: https://arxiv.org/html/2508.08242v2.
BANG, Dan; FRITH, Chris D. Making better decisions in groups. Royal Society Open Science, v. 4, n. 8, art. 170193, 2017. DOI: 10.1098/rsos.170193.
CARNEIRO, João et al. Group decision support systems for current times: Overcoming the challenges of dispersed group decision-making. Neurocomputing, v. 423, p. 735–746, 2021. DOI: 10.1016/j.neucom.2020.04.100.
CHIANG, Chun-Wei et al. Enhancing AI-Assisted Group Decision Making through LLM-Powered Devil's Advocate. In: Proceedings of the ACM International Conference on Intelligent User Interfaces (IUI ’24), 2024. p. 103–119. DOI: 10.1145/3640543.3645199.
COFFENG, Tessa et al. Quality of group decisions by board members: a hidden-profile experiment. Management Decision, v. 59, n. 13, p. 38–55, 2021. DOI: 10.1108/MD-07-2020-0893.
DELIĆ, Amra et al. Supporting Group Decision-Making: Insights from a Focus Group Study. In: Proceedings of the 32nd ACM Conference on User Modeling, Adaptation and Personalization (UMAP ’24), 1–4 jul. 2024, Cagliari, Itália. New York: ACM, p. 301–306. DOI: 10.1145/3627043.3659538.
GILARDI, Fabrizio; ALIZADEH, Meysam; KUBLI, Maël. ChatGPT outperforms crowd workers for text-annotation tasks. Proceedings of the National Academy of Sciences, v. 120, n. 30, e2305016120, 2023. DOI: 10.1073/pnas.2305016120.
GREGOR, Shirley; HEVNER, Alan R. Positioning and Presenting Design Science Research for Maximum Impact. MIS Quarterly, v. 37, n. 2, p. 337⁠–⁠355, 2013. DOI: 10.25300/MISQ/2013/37.2.01.
HEVNER, Alan R. et al. Design Science in Information Systems Research. MIS Quarterly, v. 28, n. 1, p. 75–105, 2004. DOI: 10.2307/25148625.
KRAEMER, Kenneth L.; KING, John Leslie. Computer-based systems for cooperative work and group decision making. ACM Computing Surveys, v. 20, n. 2, p. 115–146, 1988. DOI: 10.1145/46157.46158.
LAM, Simon S. K. The Effects of Group Decision Support Systems and Task Structures on Group Communication and Decision Quality. Journal of Management Information Systems, v. 13, n. 4, p. 193–215, 1997. DOI: 10.1080/07421222.1997.11518148. Resumo consultado em: https://www.jmis-web.org/articles/579.
LAM, Simon S. K.; SCHAUBROECK, John M. Improving group decisions by better pooling information: A comparative advantage of group decision support systems. Journal of Applied Psychology, v. 85, n. 4, p. 565–573, 2000. DOI: 10.1037/0021-9010.85.4.565.
LOURENÇO, Douglas Fabiano; CARMONA, Elenice Valentim; LOPES, Maria Helena Baena de Moraes. Translation and Cross-Cultural Adaptation of the System Usability Scale to Brazilian Portuguese. Aquichan, v. 22, n. 2, e2228, 2022. DOI: 10.5294/aqui.2022.22.2.8.
LU, Li; YUAN, Y. Connie; MCLEOD, Poppy Lauretta. Twenty-Five Years of Hidden Profiles in Group Decision Making: A Meta-Analysis. Personality and Social Psychology Review, v. 16, n. 1, p. 54–75, 2012. DOI: 10.1177/1088868311417243.
MA, Shuai et al. Towards Human-AI Deliberation: Design and Evaluation of LLM-Empowered Deliberative AI for AI-Assisted Decision-Making. In: Proceedings of the 2025 CHI Conference on Human Factors in Computing Systems (CHI ’25), 2025. Article 261, 23 p. DOI: 10.1145/3706598.3713423.
PAPACHRISTOU, Marios; YANG, Longqi; HSU, Chin-Chia. Leveraging Large Language Models for Collective Decision-Making. Proceedings of the ACM on Human-Computer Interaction, v. 9, n. 7, art. CSCW237, 44 p., 2025. DOI: 10.1145/3757418. Nesta auditoria, foram consultados os metadados e o resumo editorial; o texto integral não foi acessado.
PARISI, Aaron et al. Real-Time Group Dynamics with LLM Facilitation: Evidence from a Charity Allocation Task. In: Proceedings of the 2026 ACM Conference on Fairness, Accountability, and Transparency (FAccT ’26), Montreal, 25–28 jun. 2026. New York: ACM, p. 25–59. DOI: 10.1145/3805689.3812253. Texto consultado: versão dos autores, arXiv:2605.14097v2, revisada em 29 maio 2026. Disponível em: https://arxiv.org/html/2605.14097v2.
PEFFERS, Ken et al. A Design Science Research Methodology for Information Systems Research. Journal of Management Information Systems, v. 24, n. 3, p. 45–77, 2007. DOI: 10.2753/MIS0742-1222240302.
PÉREZ, Ignacio Javier et al. On dynamic consensus processes in group decision making problems. Information Sciences, v. 459, p. 20–35, 2018. DOI: 10.1016/j.ins.2018.05.017.
SCHULZ-HARDT, Stefan et al. Group decision making in hidden profile situations: Dissent as a facilitator for decision quality. Journal of Personality and Social Psychology, v. 91, n. 6, p. 1080–1093, 2006. DOI: 10.1037/0022-3514.91.6.1080.
STAB, Christian; GUREVYCH, Iryna. Parsing Argumentation Structures in Persuasive Essays. Computational Linguistics, v. 43, n. 3, p. 619–659, 2017. DOI: 10.1162/COLI_a_00295.
TESSLER, Michael Henry et al. AI can help humans find common ground in democratic deliberation. Science, v. 386, eadq2852, 2024. DOI: 10.1126/science.adq2852. Resumo consultado em: https://deepmind.google/research/publications/65220/.
TRAN, Thi Ngoc Trang; FELFERNIG, Alexander; LE, Viet Man. An overview of consensus models for group decision-making and group recommender systems. User Modeling and User-Adapted Interaction, v. 34, p. 489–547, 2024. DOI: 10.1007/s11257-023-09380-z.
VENABLE, John; PRIES-HEJE, Jan; BASKERVILLE, Richard. FEDS: a Framework for Evaluation in Design Science Research. European Journal of Information Systems, v. 25, p. 77⁠–⁠89, 2016. DOI: 10.1057/ejis.2014.36.
ZHANG, Hengjie et al. Consensus efficiency in group decision making: A comprehensive comparative study and its optimal design. European Journal of Operational Research, v. 275, n. 2, p. 580–598, 2019. DOI: 10.1016/j.ejor.2018.11.052.

