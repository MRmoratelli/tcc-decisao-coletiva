# Atualização prospectiva da monografia — artefato V2
Data-base: 17 de novembro de 2026. Situação: redação de trabalho para revisão acadêmica. A implementação técnica não equivale à aprovação do delineamento de pesquisa.

## Nota de transição e preservação
Este texto atualiza prospectivamente os capítulos afetados pela especificação do orientador e pelo questionário de Design Science Research (DSR), ambos de 16/11/2026. O conteúdo anterior permanece como registro da versão Python/Streamlit e do protocolo então planejado. Não se trata de resultados adicionais daquele experimento.

A versão anterior utilizava cenário escolar, taxonomia contextual de objeções e regra operacional que admitia aceitação com ressalvas. A V2 adota proposta genérica e consenso por aceitação explícita de todos os habilitados na mesma versão. Os instrumentos históricos de percepção (D19), a System Usability Scale (SUS) e a avaliação humana de classificação e fidelidade (D20) e o desenho A/B anterior são preservados como materiais históricos, sem presunção de aplicação automática à nova intervenção.

A manutenção de React, TypeScript e Vite, bem como de participação remota com autenticação e persistência central, constitui decisão do grupo. A especificação do orientador descrevia simulação local com Svelte e armazenamento no navegador. Essas diferenças precisam ser identificadas na apresentação do artefato e não são atribuídas ao orientador.

## Siglas empregadas nesta versão

API — Application Programming Interface.
DSR — Design Science Research.
DSRM — Design Science Research Methodology.
GDSS — Group Decision Support Systems.
HMAC — Hash-based Message Authentication Code.
HTTP — Hypertext Transfer Protocol.
HTTPS — Hypertext Transfer Protocol Secure.
IA — Inteligência artificial.
JSON — JavaScript Object Notation.
JSONB — Tipo binário de armazenamento JSON do PostgreSQL.
LLM — Large Language Model; plural LLMs.
MVP — Minimum Viable Product.
SUS — System Usability Scale; instrumento histórico, sem transferência de propriedades ao questionário V2.

## 1 INTRODUÇÃO — versão prospectiva
A decisão coletiva exige que informações, objetivos, restrições e justificativas de pessoas diferentes sejam considerados na elaboração de uma proposta comum. O registro de uma escolha não permite, isoladamente, compreender as razões da discordância nem acompanhar como essas razões foram incorporadas a uma revisão. Sistemas de apoio à decisão em grupo podem estruturar essa interação, mas seus mecanismos de agregação e facilitação precisam preservar a representação do dissenso.

A literatura já reunida nesta monografia fundamenta a distinção entre processo, satisfação e qualidade da decisão. Bang e Frith (2017) discutem condições de decisão em grupo; Tran, Felfernig e Le (2024) apresentam diferentes modelos de consenso; os trabalhos de facilitação por grandes modelos de linguagem (Large Language Models — LLMs) examinados nos capítulos teóricos indicam possibilidades de organização e síntese, acompanhadas de limites. A mudança tecnológica não elimina essas distinções.

O problema investigado na V2 consiste em apoiar pequenos grupos na formulação de um problema, no registro das manifestações e na revisão de propostas, sem conferir autoridade decisória à inteligência artificial. A análise automatizada pode apontar ambiguidades, premissas e divergências, mas também pode interpretar inadequadamente uma objeção, omitir preocupações ou exercer influência sobre a direção da discussão.

A questão de pesquisa prospectiva é: como um sistema genérico de decisão por consenso assistido por inteligência artificial pode apoiar a formulação de propostas, a compreensão das objeções e a revisão iterativa de alternativas, preservando autonomia, rastreabilidade e responsabilidade humana?

O objetivo geral é desenvolver e avaliar exploratoriamente um artefato computacional para apoiar decisões coletivas genéricas por consenso, com assistência consultiva de inteligência artificial durante o processo.

Os objetivos específicos passam a compreender: OE01, manter a fundamentação sobre decisão coletiva, consenso e facilitação por inteligência artificial (IA); OE02, especificar requisitos derivados dos problemas e riscos identificados; OE03, definir um método com posições explícitas, objeções justificadas, rodadas e unanimidade na mesma versão; OE04, implementar interface React, interface de programação de aplicações (Application Programming Interface — API), implementada em Node.js, persistência PostgreSQL e contratos Gemini; OE05, demonstrar tecnicamente o fluxo com identidades sintéticas e, após definição do protocolo, com usuários; OE06, avaliar utilidade, eficácia percebida, qualidade da IA, transparência, usabilidade e aplicabilidade, distinguindo percepções de indicadores operacionais e avaliações humanas.

A justificativa técnica decorre da necessidade de conectar formulação, manifestação, interpretação, revisão e encerramento em um histórico examinável. A contribuição proposta é uma configuração de engenharia e avaliação exploratória; não se afirma prioridade científica, superioridade universal ou ausência de soluções anteriores semelhantes.

O escopo admite propostas de equipes, planejamento, prioridades e avaliação de alternativas. Título, problema, decisão pretendida e texto da proposta são estruturados; objetivos, alternativas, restrições, critérios de sucesso e contexto podem ser acrescentados. Valores financeiros e categorias escolares não são obrigatórios. O cadastro aceita de dois a trinta participantes, mas esse limite de entrada não representa capacidade empiricamente validada. O ensaio técnico descrito na entrega utiliza três identidades sintéticas. O cenário científico definitivo permanece PENDENTE DE DEFINIÇÃO; exemplos de prioridades de projeto são utilizados exclusivamente como testes técnicos sintéticos.

A V2 não estabelece maioria simples como consenso. Cada habilitado precisa registrar ACEITO sobre a mesma versão. REJEITO exige justificativa; ABSTENHO e ausência de resposta não equivalem a aceite. O processo pode terminar sem consenso, com razões registradas. A unanimidade formal não demonstra convicção genuína, justiça ou qualidade substantiva.

## 2 FUNDAMENTAÇÃO TEÓRICA — atualização prospectiva
A fundamentação existente sobre sistemas de apoio à decisão em grupo (Group Decision Support Systems — GDSS), compartilhamento de informação, dissenso e influência social permanece pertinente. O novo recorte exige separar o conceito amplo de consenso da condição operacional específica implementada. A diversidade de modelos examinada por Tran, Felfernig e Le (2024) não autoriza apresentar qualquer indicador de convergência como aceitação explícita unânime.

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
A pesquisa permanece orientada pela Design Science Research, com referência à Design Science Research Methodology (DSRM) de Peffers et al. (2007) e aos princípios de Hevner et al. (2004). A V2 constitui uma iteração do artefato motivada pela revisão do problema e dos critérios de solução.

A identificação do problema enfatiza formulação insuficiente, dificuldade de representar divergências e riscos da facilitação automatizada. Os objetivos da solução são operacionalizados em requisitos, contratos e invariantes de consenso. O projeto e desenvolvimento compreendem domínio, interface, API e persistência. A demonstração técnica utiliza dados sintéticos. A avaliação com usuários permanece prospectiva e depende de procedimento atualizado.

O protocolo A/B anterior não é presumido válido: a intervenção, o domínio da tarefa, as posições, a regra de encerramento e o instrumento mudaram. Eventual comparação com condição sem IA pode fortalecer a avaliação, conforme o documento do orientador, mas exige cenários equivalentes, alocação e procedimentos definidos. Não se declara tal comparação implementada ou aprovada.

O procedimento recomendado utiliza um cenário com posições divergentes, pelo menos duas rodadas e questionário individual pós-sessão. A participação deve ser voluntária. Se o grupo alcançar consenso na primeira rodada, não se deve produzir discordância artificial para cumprir o procedimento; a ocorrência é registrada e o instrumento previsto para duas rodadas não é disponibilizado nessa sessão. O detalhamento prospectivo consta em PROTOCOLO_AVALIACAO_DSR_V2, sujeito à ratificação; o protocolo anterior continua histórico.

O instrumento preliminar do orientador, versão 1.0 de 16/11/2026, contém 22 itens fechados: utilidade percebida, itens 01–03; eficácia na construção de consenso, 04–07; qualidade da IA, 08–11; transparência e confiança, 12–15; usabilidade, 16–19; adoção e aplicabilidade, 20–22. As quatro questões abertas A1–A4 são mantidas integralmente. A escala admite valores de 1 a 5, N/A e ausência, registrados separadamente.

O instrumento é original e não possui validação psicométrica demonstrada. Não é uma versão da SUS nem permite herdar suas propriedades de medida. Pré-teste, exame de conteúdo e, para alegações psicométricas, estudo apropriado da estrutura e consistência permanecem necessários. D19, SUS e D20 continuam históricos até nova decisão acadêmica.

Os indicadores automáticos incluem resultado formal, rodadas, manifestações, objeções e duração. Na implementação, duração corresponde ao intervalo entre criação da sala e encerramento, incluindo espera por entrada; não representa exclusivamente tempo de discussão ativa. O relatório distingue quantidade de registros de rejeição da quantidade de rejeições vigentes por rodada.

A taxa de consenso é calculada entre processos concluídos únicos, com deduplicação de restaurações pelo identificador de origem. Processos abertos não entram no denominador. A interpretação depende de cenários, composição dos grupos e condições de aplicação efetivamente documentados.

Cobertura de objeções e fidelidade são avaliações humanas, separadas das sugestões da IA. A aplicação permite ao moderador registrar cobertura e representação fiel, mas esses registros não constituem avaliação independente. Seleção de avaliadores, cegamento, rubrica, adjudicação e qualidade argumentativa exigem definição antes da coleta; nenhum escore é fabricado enquanto esses elementos estiverem pendentes.

A análise descritiva apresenta frequências e denominadores por item, N/A, ausências e médias exploratórias dos valores respondidos. As médias das dimensões implementadas não são tratadas como escores latentes validados. As respostas abertas são exportadas para codificação temática humana, com códigos, memorandos e síntese a produzir a partir do material efetivamente coletado.

Privacidade e ética exigem minimização de dados, identificação Pxx, informação prévia sobre envio ao Gemini e restrição das respostas individuais. Pseudonimização não equivale a anonimato garantido: texto livre e exportações podem conter elementos identificáveis. Recrutamento, consentimento, retenção e eventual exclusão precisam estar definidos no protocolo de uso real.

## 5 ARTEFATO PROPOSTO E DESENVOLVIMENTO — versão prospectiva
O frontend mantém React, TypeScript e Vite já iniciados, com extração e ampliação dos componentes existentes. ProposalEditor estrutura o problema; ReviewCard apresenta pareceres; RoomWorkspace organiza rodadas e revisão; EvaluationForm operacionaliza o instrumento. A interface conserva rótulos, foco visível, estados de carregamento e mensagens de erro.

A API Node.js/TypeScript centraliza autenticação, autorização, validação, persistência e Gemini. As credenciais não são enviadas nos endereços de navegação e permanecem em memória no navegador. O servidor utiliza código de autenticação de mensagem baseado em hash (Hash-based Message Authentication Code — HMAC) para armazenamento das credenciais de acesso, além de chave distinta para comprovantes de pareceres. Essa proteção não substitui Hypertext Transfer Protocol Secure (HTTPS), gestão de segredos e controles da hospedagem.

O PostgreSQL recebe exclusivamente o esquema V2 isolado. O modelo conceitual compreende Decision, Proposal, Participant, Round, Vote, ObjectionAnalysis, Synthesis e AuditEvent. No produto mínimo viável (Minimum Viable Product — MVP), as entidades de processo são agregados tipados em JavaScript Object Notation (JSON), armazenados no tipo binário JSONB do PostgreSQL em snapshots, com tabelas relacionais para salas e credenciais. Não se afirma que todas as entidades estejam normalizadas em tabelas independentes.

Cada mutação bloqueia a sala em transação, compara a revisão esperada e acrescenta novo snapshot. A aplicação não atualiza nem apaga snapshots anteriores. Esse histórico por acréscimo não constitui proteção criptográfica contra um administrador do banco e aumenta o volume de armazenamento.

O método parte de uma proposta V1 confirmada pelo moderador. Participantes registram posições e razões, podem analisar contribuições e contestar pareceres. O moderador solicita análise de objeções e síntese, revisa os campos da proposta e confirma a publicação de V2. Os votos anteriores permanecem vinculados a V1; todas as posições em V2 começam pendentes.

A integração Gemini ocorre por AIAdapter, com modelo configurável, instruções versionadas, JSON Schema e validação Zod. Respostas inválidas, omissão detectável de objeções, IDs inexistentes e citações ausentes do original são recusados como falhas de assistência. A aplicação continua oferecendo envio sem parecer e revisão manual. A validação não certifica verdade factual ou fidelidade semântica.

A síntese identifica alterações, suas justificativas, objeções atendidas, parcialmente atendidas ou não atendidas, impasses e alertas de viabilidade. Essas classificações são sugestões da IA até exame humano. Uma nova manifestação após a análise torna sua base desatualizada para a síntese e exige reanálise.

A autorização no servidor delimita a sala e o papel. O participante não recebe credenciais de terceiros nem suas respostas DSR. Manifestações e análises alheias ficam ocultas antes de seu primeiro registro na versão vigente, com limites de influência anteriormente discutidos.

A exportação JSON versão 2 conserva o processo e dados de avaliação, sem credenciais. A recuperação valida vínculos e resultado formal, cria outra sala e reemite acessos, preservando a origem para deduplicação. Arquivos importados conservam proveniência declarada; sua autoria externa não é autenticada pelo sistema.

Os testes automatizados abrangem regras de domínio, API, contratos de IA, migrações, recuperação e componentes React. A evidência anterior utilizou requisições via Hypertext Transfer Protocol (HTTP) e PostgreSQL embarcado PGlite, com IA sintética. Na integração posterior, o Neon real recebeu as migrações 001/002 em projeto separado e uma sessão técnica com três identidades fictícias, duas rodadas, exportação, restauração e reconexão em novo processo. Essa demonstração utilizou o fluxo manual, sem chamadas Gemini. O serviço V2 foi preparado no Render, mas o envio das credenciais depende de autorização específica; não há implantação pública funcional comprovada. Esses registros não constituem avaliação com usuários ou resultados científicos.

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
As referências a seguir correspondem às fontes efetivamente citadas nesta aba prospectiva, com metadados já presentes na monografia. O corpus completo e as notas de consulta continuam na aba histórica. Para Tessler et al. foi consultado o resumo; a discussão de Parisi et al. utiliza a versão dos autores identificada no histórico. A revisão aqui é editorial, sem nova auditoria bibliográfica.

BANG, Dan; FRITH, Chris D. Making better decisions in groups. Royal Society Open Science, v. 4, n. 8, art. 170193, 2017. DOI: https://doi.org/10.1098/rsos.170193.

DELIĆ, Amra et al. Supporting Group Decision-Making: Insights from a Focus Group Study. In: Proceedings of the 32nd ACM Conference on User Modeling, Adaptation and Personalization (UMAP ’24), 1–4 jul. 2024, Cagliari, Itália. New York: ACM, p. 301–306. DOI: https://doi.org/10.1145/3627043.3659538.

HEVNER, Alan R. et al. Design Science in Information Systems Research. MIS Quarterly, v. 28, n. 1, p. 75–105, 2004. DOI: https://doi.org/10.2307/25148625.

MA, Shuai et al. Towards Human-AI Deliberation: Design and Evaluation of LLM-Empowered Deliberative AI for AI-Assisted Decision-Making. In: Proceedings of the 2025 CHI Conference on Human Factors in Computing Systems (CHI ’25), 2025. Article 261, 23 p. DOI: https://doi.org/10.1145/3706598.3713423.

PARISI, Aaron et al. Real-Time Group Dynamics with LLM Facilitation: Evidence from a Charity Allocation Task. In: Proceedings of the 2026 ACM Conference on Fairness, Accountability, and Transparency (FAccT ’26), Montreal, 25–28 jun. 2026. New York: ACM, p. 25–59. DOI: https://doi.org/10.1145/3805689.3812253.

PEFFERS, Ken et al. A Design Science Research Methodology for Information Systems Research. Journal of Management Information Systems, v. 24, n. 3, p. 45–77, 2007. DOI: https://doi.org/10.2753/MIS0742-1222240302.

PÉREZ, Ignacio Javier et al. On dynamic consensus processes in group decision making problems. Information Sciences, v. 459, p. 20–35, 2018. DOI: https://doi.org/10.1016/j.ins.2018.05.017.

STAB, Christian; GUREVYCH, Iryna. Parsing Argumentation Structures in Persuasive Essays. Computational Linguistics, v. 43, n. 3, p. 619–659, 2017. DOI: https://doi.org/10.1162/COLI_a_00295.

TESSLER, Michael Henry et al. AI can help humans find common ground in democratic deliberation. Science, v. 386, eadq2852, 2024. DOI: https://doi.org/10.1126/science.adq2852.

TRAN, Thi Ngoc Trang; FELFERNIG, Alexander; LE, Viet Man. An overview of consensus models for group decision-making and group recommender systems. User Modeling and User-Adapted Interaction, v. 34, p. 489–547, 2024. DOI: https://doi.org/10.1007/s11257-023-09380-z.
