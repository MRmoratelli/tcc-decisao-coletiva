# Registro de congelamento do artefato V2
Data: 21/11/2026 (America/Sao_Paulo). Projeto: Processo de decisao. TCC: Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva — UVA.

## Situação
O responsável informou que a coleta real ainda não começou. Foi estabelecida uma versão técnica de referência anterior à coleta, validada e recuperável por commit/tag. Nenhum dado desta validação é resultado científico. Este registro não substitui a conferência dos materiais de campo nem declara a monografia integralmente atualizada.

## Identificação exata
| Item | Valor |
|---|---|
| Tag | v2.0.0-dsr-20261121 |
| Commit de execução | a7b169edd5561bdf454e9bf302da3ca740dc19c5 |
| Árvore de execução | b48a172d0498091f506e316c6eac1c35d00d794c |
| Branch de referência | freeze/v2-dsr-20261121 |
| Código da aplicação | prototype-v2/ |
| Aplicação | https://tcc-decisao-v2-test.onrender.com/ |
| Serviço Render | srv-dbugi3dg1s2s73bpt3f0 |
| Deploy de referência | dep-dc0oiaek1f9s739q1eag |
| Modelo principal | gemini-3.5-flash-lite |
| Prompt principal | consensus-consultive-v2.6-initial-proposal |
| Consulta factual opcional | Tavily + Gemini; factual-tavily-gemini-v2.1 |
| Concordância eletrônica | 1.1-2026-11-21 |
| Instrumento incorporado | DSR-1.1-NATURALISTICO / POS_ENCERRAMENTO_NATURALISTICO |
| Dependências | package-lock.json incluído na tag; @google/genai 1.52.0 |
| Implantação automática | autoDeploy=no; autoDeployTrigger=off |

Release: https://github.com/MRmoratelli/tcc-decisao-coletiva/releases/tag/v2.0.0-dsr-20261121

O package.json mantém sua versão interna 0.2.0; a identificação oficial desta etapa é a tag acima, sempre acompanhada do commit. Não houve alteração cosmética de código para numerar o congelamento.

O Render permanece ligado à branch feat/vite-typescript-decisao-generica, com deploy automático desligado. A troca para a branch freeze não foi realizada: o painel exigiu nova autorização GitHub. Para evitar publicação manual acidental de código posterior, qualquer recuperação/deploy durante a coleta deve selecionar explicitamente o commit acima. Fixar a branch freeze no painel é uma proteção adicional pendente, não uma mudança funcional já executada.

## Comportamento preservado
1. Moderador informa título, quantidade fixa de participantes (2 a 15), proposta e contexto opcional. A IA oferece revisão antes da criação; o moderador mantém, usa ou edita a sugestão e confirma a proposta publicada. Original, parecer e decisão humana permanecem rastreáveis. Há continuação explícita sem revisão quando a IA falha.
2. Participante acessa link único, lê o termo integral e marca voluntariamente uma caixa inicialmente desmarcada. A concordância registrada não é voto e não se repete por rodada na mesma sala.
3. Revisar o argumento com IA é uma ação anterior ao registro da posição. O participante decide usar ou descartar a sugestão e depois registra sua manifestação.
4. Cada participante tem uma posição por rodada. ACEITO, ACEITO_COM_RESSALVAS, REJEITO e ABSTENCAO são distintos; pendência e silêncio não equivalem a aceitação. Consenso exige ACEITO de todos os participantes previstos na versão corrente.
5. Após todos votarem, sem consenso, análise e síntese podem ser geradas automaticamente. A síntese é rascunho privado do moderador até revisão e publicação humana. A nova proposta abre nova rodada sem transportar os votos.
6. Falhas transitórias na IA principal têm até três tentativas, orçamento total de 60 s e até 30 s por chamada, com espera progressiva. 503 persistente continua sendo falha explícita; não há troca silenciosa de modelo. O tratamento não garante disponibilidade do provedor nem é descrito como política idêntica do módulo factual.
7. Histórico e exportação JSON preservam o processo. Credenciais de acesso não integram a exportação científica.

A IA é consultiva. Sua presença não prova fidelidade semântica em todos os casos: o moderador deve conferir intenção, restrições e ausência de informações inventadas antes de publicar.

## Evidência técnica concluída
Execução: https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/44911797430
Código do ensaio: commit 8b71e6324f078c787181f2eaf2a634a298706f06, branch validation/v2-freeze-20261121. Esse commit acrescenta somente o teste e seu workflow; não é o commit da aplicação publicada.

- Build TypeScript/Vite: aprovado.
- Testes automatizados: 109 aprovados; zero falhas, cancelamentos ou ignorados.
- Ensaio via API no serviço publicado e no commit exato: aprovado.
- Gemini real: revisão inicial, revisão de argumento, análise e síntese.
- Três acessos simultâneos simulados: identidades distintas; retorno idempotente.
- Três concordâncias e seis votos em duas rodadas.
- Rascunho privado, publicação humana simulada, nova rodada sem votos anteriores e consenso unânime final.
- JSON completo exportado e validado pelo domínio.
- Sala técnica: 180B446272. Excluir de qualquer conjunto de dados científicos.
- Início: 21/11/2026 11:02:22 BRT; fim: 11:02:45 BRT.
- SHA-256 do JSON: 262b84f876bb780a543e8ce3cf40793523134e450116f0cd3879d5d7c6a73384.
- SHA-256 do ZIP do ensaio: 77da6daa44452a3a821f79ac053eda01cfdca1fbec406a3b9ae5db5aebf18384.

Relatório estruturado preservado junto deste registro: VALIDATION_REPORT.json.
Exportação sintética completa: artifact v2-freeze-synthetic-evidence, ID 14709709105, no workflow. A retenção do artifact expira em 21/12/2026; conservar uma cópia se for necessário manter o JSON integral além desse prazo. O resumo estruturado versionado não depende dessa retenção.

O ensaio é técnico por API com verificações React na suíte; não foi uma sessão de usabilidade com pessoas. Não exercitou todas as consultas factuais externas possíveis, dispositivos ou condições de carga. A declaração aiConfigured e a configuração de Tavily não substituem uma consulta factual real.

## O que fica congelado
Código e schemas, prompts, regras, telas, termo eletrônico, instrumento incorporado, dependências travadas e configurações documentadas. As chaves permanecem privadas no backend e não fazem parte de anexos ou versões.

O modelo é identificado pelo nome fornecido pelo serviço. Não é possível congelar pesos, disponibilidade, atualização interna de aliases, índices da web ou respostas do provedor. Na IA principal, temperatura, topP e seed não são fixados pelo código: aplicam-se os padrões do provedor. Guardar entradas, saídas, horários, modelo e versão do prompt permite rastrear a execução, sem prometer reprodução textual exata.

## Recuperação e preservação
1. Recuperar o código pela tag/commit; o GitHub fornece ZIP/TAR do código-fonte na release. Confirmar o SHA antes de implantar.
2. Usar npm ci e o package-lock da versão, seguido de npm run build em prototype-v2. Iniciar conforme o comando já configurado no Render.
3. Preservar as variáveis privadas e a conexão PostgreSQL existentes. Não limpar o banco, trocar permissões ou executar migração destrutiva para restaurar código.
4. Implantar explicitamente o commit congelado, mantendo auto-deploy desligado.
5. Conferir /api/health: status ok, commit exato e IA configurada. Um teste adicional, se necessário, deve usar sala identificada como técnica e nunca a sessão real.
6. Ao final de cada sessão real, exportar o JSON, conferir abertura/integridade, registrar SHA-256 e guardar cópia restrita em local de backup. O registro de versão e o backup dos dados são coisas distintas. Este trabalho não criou nem testou restauração física do banco.
7. Não compartilhar credenciais do moderador, chaves Gemini/Tavily ou strings do banco. O link do participante é destinado ao grupo.

main, backup, PR #4, Streamlit V1 e Neon histórico foram preservados.

## Controle de alterações
- Não acrescentar funcionalidades, trocar modelo, prompts, termo, regra de consenso ou questionário durante a coleta.
- Desenvolver melhorias em outra branch, sem publicação na aplicação da coleta.
- Diante de falha que impeça a sessão: registrar horário, sala, etapa, código de erro e impacto; preservar os dados; interromper ou remarcar conforme o roteiro, em vez de tratar a falha como resultado válido.
- Correção indispensável exige novo commit/tag, teste proporcional à alteração, justificativa e identificação das sessões afetadas. Não mover esta tag nem reescrever seu histórico.
- A release e a tag estão registradas; não foi configurada uma regra administrativa que torne sua exclusão/movimentação impossível. A preservação também depende do controle operacional do responsável.

## Conferência antes de convidar pessoas
| Passo | Estado nesta execução |
|---|---|
| Coleta real ainda não iniciada | Informado pelo responsável |
| Código exato e referência recuperável | Concluído |
| Build, testes e ensaio sintético | Concluído |
| Deploy automático desligado | Confirmado pelo conector Render |
| Branch de deploy alterada para freeze | Pendente; proteção adicional |
| Materiais de informação, roteiro e questionário externo alinhados | Não verificados nesta execução |
| Link externo de respostas e teste de submissão | Não verificados nesta execução |
| Nova sala exclusiva da coleta e quantidade correta | A criar no início da sessão |
| Autorização/concordância de cada pessoa | Deve ocorrer na entrada real |
| Diário da sessão e destino restrito dos exports | Preparar/conferir antes da sessão |

Não reutilizar a sala 180B446272 nem qualquer sala sintética para coleta. Na criação real, confirmar antes a quantidade de participantes: vagas pendentes impedem unanimidade. Aplicar o questionário somente após o encerramento real, com ou sem consenso e independentemente do número de rodadas, mantendo N/A e omissões voluntárias conforme DSR-1.1.

## Texto proposto para a monografia
Texto para inserir após revisão de coerência com os capítulos atuais; não significa que os documentos acadêmicos já foram editados:

> Antes do início da coleta, foi estabelecida a versão de referência do artefato V2, identificada pela tag v2.0.0-dsr-20261121 e pelo commit a7b169edd5561bdf454e9bf302da3ca740dc19c5, em 21 de novembro de 2026. A configuração utiliza o modelo Gemini gemini-3.5-flash-lite e o prompt principal consensus-consultive-v2.6-initial-proposal. A IA atua de maneira consultiva desde a revisão da proposta inicial e nas etapas de revisão de argumentos, análise e síntese; a publicação de propostas permanece condicionada à decisão humana. A concordância com a pesquisa é registrada separadamente das posições de decisão. O consenso requer aceitação explícita de todos os participantes previstos na rodada corrente. A verificação técnica incluiu build, 109 testes automatizados aprovados e uma sessão integralmente sintética no ambiente publicado, cujos registros não integram a amostra científica. O congelamento identifica código e configuração, sem implicar determinismo ou disponibilidade contínua dos serviços externos.

Alinhamentos necessários:
- Método: caracterizar a avaliação exploratória/naturalística efetivamente realizada; não introduzir grupo controle ou comparação causal que não ocorrerá.
- Descrição do artefato: registrar os fluxos simplificados, a IA inicial, a mediação automática com publicação humana e a separação entre concordância e voto.
- Instrumentos/apêndices: identificar a versão DSR-1.1 naturalística, termo vigente, roteiro e checklist; eliminar instruções antigas que exijam exatamente duas rodadas se não correspondem ao protocolo atual.
- Resultados: reservar a apresentação de dados reais para depois da coleta; evidência sintética deve ser apresentada como verificação técnica.
- Limitações: explicitar dependência externa, respostas variáveis e escopo do ensaio.

## Próxima ação operacional
Conferir o pacote de campo (termo, roteiro, questionário e destino das exportações) contra esta versão. Depois abrir uma nova sala real com a quantidade correta, registrar a versão no diário e iniciar os convites. O congelamento técnico por si só não atesta que esses materiais externos estejam prontos.
