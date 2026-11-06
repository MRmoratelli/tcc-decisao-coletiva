# Protocolo Experimental v1.1

## 1. Identificação e status

TCC: **Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva**.

Documento técnico/operacional da branch `feat/protocolo-experimental-v1`, PR #4 em rascunho. A base funcional é o Commit 8, `25eff66cb970b63abb2b4561fb01793546f262f2`; o Commit 9 consolida documentação sem alterar essa implementação. A v1.1 substitui as instruções técnicas anteriores desta branch, preservadas em [histórico](historico/README_tecnico_pre_v1.1.md) e no [APLICAR.md sinalizado como histórico](../APLICAR.md).

**STATUS TÉCNICO: implementação técnica candidata ao congelamento experimental, pendente dos gates pré-piloto.** As funções previstas nos Commits 1–8 estão implementadas e cobertas pela suíte. Isso não significa metodologia final aprovada, eficácia comprovada, D16/D17 resolvidos, deploy conferido/congelado, piloto ou experimento executado. Não presume aprovação do orientador.

Esta é a documentação do comportamento técnico e da operação candidata. Não fecha amostra, instrumentos, autorização institucional ou critérios científicos ainda pendentes. Não inicia coleta, merge, deploy ou auditoria final.

## 2. Objetivo e comparação A × B

Comparar dois processos estruturalmente equivalentes de apoio à decisão coletiva sobre uma proposta evolutiva:

- **A:** IA assiste classificação e mediação; a publicação permanece humana.
- **B:** o moderador executa manualmente classificação e mediação dentro da mesma estrutura, taxonomia, análise descritiva, versionamento e regra de acordo.

A comparação é **mesmo processo estruturado com IA versus contrapartida manual padronizada**. Não é processo estruturado versus discussão livre. O modo genérico com IA desativada não deve ser confundido com a condição B experimental.

Usar o mesmo moderador entre condições e manter equivalentes cenário, instruções e demais controles aprovados é obrigação do procedimento, não uma igualdade pessoal/experimental automaticamente verificada pelo sistema. Amostra, origem dos participantes e condições de participação dependem de D17; a amostra prevista é pequena e a análise deve ser predominantemente descritiva/exploratória.

## 3. Perfis, acesso e fases

O moderador cria a sala, guarda sua credencial separada, distribui código e credenciais individuais, acompanha a coleta, revisa categorias, pausa/reabre quando permitido, registra mediação, publica e confirma encerramento. Seu acesso não vota. A implementação admite uma credencial individual de participante separada se alguém acumular funções, mas isso não aprova esse arranjo para a avaliação; o perfil metodológico deve seguir o procedimento validado.

No modo experimental, a interface solicita quantidade e gera `P01…Pn` em vez de cadastro civil. O limite técnico é 2–30 participantes e o valor sugerido pela interface é 5; isso não substitui a definição amostral. As credenciais autorizam ações dentro da sala, sem autenticar identidade civil. Não compartilhar acessos. `reset_invitation()` invalida a credencial anterior preservando participante e histórico; não há recuperação automática da credencial de moderador.

| Fase interna | Operação |
|---|---|
| `COLETA` | Participantes registram/editam manifestações; moderador classifica/revisa categorias; participante pode contestar sua categoria atual |
| `REVISAO` | Coleta congelada; moderador registra mediação, revisa/publica ou encerra |
| `ENCERRADA` | Consulta/exportação; operações normais de alteração do processo são bloqueadas |

Corrigir categoria após pausa exige reabrir `COLETA`. Finalize classificações/contestações antes de iniciar a mediação. Depois de uma execução IA sem sucesso confirmado, a reabertura é bloqueada para preservar o conjunto congelado entre tentativas.

## 4. Fluxo em até três rodadas

1. Criar sessão e V1, escolher A ou B e manter o cenário escolar habilitado para este exercício. Guardar os acessos de forma confidencial.
2. Cada participante avalia a proposta vigente e registra posição/justificativa antes de observar informações decisórias dos demais daquela versão.
3. Classificar manifestações: IA em A; moderador em B. Tratar revisões e contestações durante a coleta. Em A, eventual contingência de classificação precisa ser identificada como fallback técnico.
4. Moderador pausa a coleta e confere posições, preocupações, categorias e divergências descritivas. O gráfico também pode ser consultado durante a coleta, respeitando a política de visibilidade.
5. Registrar mediação válida: IA em A; template manual em B. Não publicar uma nova versão experimental sem essa base.
6. Revisar a sugestão, justificar alterações da IA e registrar/confirmar os cinco valores estruturados quando o cenário estiver habilitado.
7. Publicar V2: todas as pessoas precisam manifestar-se novamente. Respostas anteriores são históricas e não contam para a versão atual.
8. Repetir o fluxo para V3, se necessário. **V1 é a rodada 1; há no máximo duas revisões, três versões avaliadas e nenhuma V4.**

A publicação não é automática, não é obrigatória se já houver acordo e não pode criar uma quarta rodada. Sem acordo em V1/V2, a sessão pode continuar conforme o fluxo ou ser cancelada com motivo; não pode ser encerrada normalmente como `SEM_ACORDO` antes de V3. A regra não impõe por si só um tempo máximo nem um temporizador de conexão do participante.

## 5. Posições e regra de acordo

| Interface | Identificador interno | Semântica operacional |
|---|---|---|
| ACEITO | `ACEITO` | Aceita esta versão da proposta |
| ACEITO COM RESSALVAS | `ACEITO_COM_RESSALVAS` | Aceita esta versão e registra preocupação; não exige alteração para aceitá-la |
| NÃO ACEITO | `NAO_ACEITO` | Exige alteração/condição para aceitar |
| Sem resposta | Ausência de registro para a versão | Não representa aceitação |

A fronteira ressalva/rejeição é declarada pelo participante; não é uma verdade objetiva determinada pela IA. Justificativa é obrigatória para ressalva/rejeição. Uma aceitação pode conter texto/preocupação. Ressalvas não são apagadas por contarem como aceite.

`ACORDO` exige todos os participantes esperados com manifestação na **mesma proposta ativa**, apenas `ACEITO` ou `ACEITO_COM_RESSALVAS`. Uma ausência ou uma rejeição bloqueia acordo. Não há maioria automática, eliminação de participante para facilitar acordo, limiar de 80% ou decisão da IA.

## 6. Taxonomia canônica de objeções

Fonte de rótulos e descrições: `experiment_config.TAXONOMY`. Os textos abaixo correspondem à definição implementada, sem constituir validação científica das categorias.

| Código | Rótulo | Descrição canônica |
|---|---|---|
| CAT01 | Impacto pedagógico | Contribuição para ensino e aprendizagem. |
| CAT02 | Abrangência de beneficiários | Quantidade ou grupos beneficiados ou prejudicados. |
| CAT03 | Urgência e prioridade | Necessidade temporal, gravidade ou ordem de atendimento. |
| CAT04 | Viabilidade de implementação | Possibilidade prática de executar a melhoria. |
| CAT05 | Inclusão e acessibilidade | Equidade, inclusão e necessidades de acessibilidade. |
| CAT06 | Sustentabilidade do investimento | Duração do benefício, manutenção ou efeitos de médio e longo prazo. |
| CAT07 | Adequação orçamentária | Valor insuficiente ou excessivo, redistribuição, equilíbrio ou incompatibilidade financeira. |
| CAT08 | Informação ou justificativa insuficiente | Falta de informação necessária para avaliar ou aceitar a proposta. |
| CAT09 | Conflito entre múltiplos critérios | Dois ou mais critérios igualmente essenciais, sem predominância segura de um deles. |

`Sem objeção explicitada` (`NO_OBJECTION`) e `Não classificada` (`UNCLASSIFIED`) são estados técnicos, não novas categorias de divergência. No experimento não se admite rótulo livre. Ressalva/rejeição não pode ser classificada manualmente como ausência de objeção. A classificação é de uma categoria principal por manifestação; múltiplas preocupações no mesmo texto não se tornam automaticamente múltiplas contagens.

**CAT01–CAT09 são categorias de objeção. CAT_INV01–CAT_INV05 são itens financeiros do cenário.** Não são taxonomias intercambiáveis.

## 7. Contestação e revisão de categoria

Cadeia: classificação inicial → participante consulta a própria categoria → sugere outra CAT01–CAT09 → moderador decide a categoria final.

A contestação não muda automaticamente a classificação. Só o titular pode contestar sua própria manifestação, na versão/edição atual, durante `COLETA`. É necessário já haver categoria atribuída; `Não classificada` não abre contestação. Há no máximo uma contestação por edição, com sugestão diferente da categoria atual. Editar a manifestação inicia outra edição e preserva a contestação anterior como histórico.

A trilha mantém categoria IA quando existente, revisão humana, sugestão do participante, edição associada, status `PENDENTE`/`RESOLVIDA`, categoria final e horários. A mesma possibilidade vale em B e após fallback técnico de classificação em A. O moderador permanece responsável pela correção formal.

## 8. Cegamento pré-manifestação

Antes de registrar uma manifestação válida na versão ativa, o participante vê tema, contexto, proposta, distribuição financeira, número da rodada, instruções, avisos e formulário. A distribuição financeira é parte da proposta, não agregado de respostas.

Ficam ocultos: posições, justificativas, identidades associadas a respostas, categorias, contestações de outros, frequências/gráfico, contagens de respostas/rejeições, faltantes, consenso, mediação e histórico detalhado. O painel ao vivo mostra somente rodada e mensagem neutra. O histórico inteiro, inclusive versões anteriores, é ocultado por simplicidade metodológica enquanto esse bloqueio estiver ativo.

A visualização permitida é liberada **após salvamento válido**; validação fracassada não libera. V2/V3 restabelecem o bloqueio individual. Acesso de moderador mantém visão integral. JSON/CSV de pesquisa continuam exclusivos do moderador mesmo depois da resposta.

O bloqueio considera `participant_id` e proposta ativa, nunca respostas de versões anteriores. Encerramento não libera automaticamente a visão de quem não respondeu. Após liberação, a interface ainda admite edição durante `COLETA`; portanto não há cegamento permanente nem garantia de independência de edições posteriores à exposição. O software controla exposição inicial, não comprova ausência de influência psicológica.

## 9. Condição A — IA consultiva e revisão humana

Manifestação persistida → classificação contextual IA → revisão/contestação → análise descritiva → mediação IA → revisão humana obrigatória → valores financeiros confirmados → publicação.

A classificação recebe tema, contexto, proposta, posição, justificativa sanitizada e taxonomia. Quando válido, o cenário/alocação estruturados também compõem o contexto. Não precisa de identidade de participante.

A mediação considera as manifestações da versão congelada e produz `summary`, `suggested_text` e `coverage`. A IA não vota, não altera a manifestação original, não publica nem encerra. Não é necessário que devolva uma distribuição financeira em JSON: o moderador registra os valores estruturados na revisão.

Antes de publicar, selecionar mediação IA `OK`, da mesma proposta/revisão. Se o texto for mantido, registrar explicitamente **“Publicada sem alteração de conteúdo.”**; se alterado, exigir justificativa. A indicação “sem alteração” diz respeito ao texto da sugestão; a confirmação financeira é separada. Alterações podem corrigir omissão, inferência indevida, redação ou restrição, com base nas manifestações, sem inserir preferência pessoal. A checagem estrutural da nota não comprova a validade semântica dessa justificativa.

A mediação original permanece em `dc_mediations`; a publicação mantém `source_mediation_id`. O evento `PROPOSTA_PUBLICADA` registra origem, `changed_from_source`, `review_note`, vínculo e, quando aplicável, alocação. O evento já contém responsável operacional e timestamp. A não pode trocar sua base por uma mediação humana independente, inclusive depois de falha IA.

## 10. Condição B — contrapartida manual estruturada

Manifestação persistida → classificação manual CAT01–CAT09 → revisão/contestação → mesma análise descritiva → mediação manual padronizada → valores financeiros confirmados → publicação.

`ai_enabled=False` desativa classificação/mediação por IA neste fluxo. B não usa reescrita ou resumo IA escondido. O moderador classifica na coleta e registra uma mediação `HUMANA` estruturada em `dc_mediations`, sem tabela adicional.

Template obrigatório:

| Bloco | Campo em `details_json` | Conteúdo |
|---|---|---|
| Divergências identificadas | `divergences` | Categorias/pontos de conflito registrados |
| Condições/preocupações registradas | `conditions` | Condições explicitadas pelos participantes |
| Pontos de convergência | `convergences` | Convergências realmente observáveis |
| Alterações propostas | `changes` | Mudanças sugeridas para a próxima versão |
| Verificação de restrições | `restrictions` e `restriction_checks` | Conferência manual de orçamento/restrições, limites do cenário, nenhum recurso indisponível e nenhuma demanda eliminada silenciosamente |
| Justificativa das alterações | `rationale` | Relação das mudanças com manifestações |
| Proposta revisada sugerida | `suggested_text` | Texto proposto pelo moderador |

Os seis blocos textuais devem ser preenchidos. Quando não houver ponto identificado, registrar explicitamente essa ausência sem inventar conteúdo. Conferências manuais não são prova de fidelidade nem substituem a validação financeira objetiva da publicação.

Cada manifestação atual deve ter uma entrada de cobertura, com `response_id`, `response_edit`, pseudônimo local, categoria, tratamento e nota operacional:

| Tratamento | Uso |
|---|---|
| `CONTEMPLADA` | A preocupação foi considerada atendida pela mediação |
| `PARCIAL` | Atendimento parcial, com razão registrada |
| `NAO_CONTEMPLADA` | Não atendimento, com razão registrada |
| `SEM_OBJECAO` | Manifestação classificada sem objeção explícita; não exige nota artificial |

Coverage é rastreabilidade declarada, **não pontuação de qualidade**. O sistema valida estrutura, unicidade/vínculos e coerência técnica de `SEM_OBJECAO`, não se a síntese efetivamente representou a preocupação. Categorias ainda não classificadas impedem salvar mediação manual completa.

Pedidos incompatíveis devem permanecer explícitos. O moderador busca uma proposta viável e registra o que ficou parcial/não contemplado, sem atribuir peso por preferência pessoal, usar frequência como regra de vitória ou inventar argumento, critério ou prioridade. Não há otimizador.

## 11. Divergências e frequência

A/B usam `app.pareto()` e os mesmos dados de categorias da versão vigente. Ordenação: frequência decrescente; empate: rótulo em ordem lexicográfica. O percentual acumulado divide pelas manifestações com categoria contabilizada. `NO_OBJECTION` e `UNCLASSIFIED` não compõem o denominador; os não classificados são informados separadamente.

Não existe corte automático de 80%, escolha da categoria “vencedora”, peso automático, MCDM ou fronteira de Pareto. O referencial gráfico de 80% descreve frequências, sem medir gravidade, causalidade ou importância. Textos e objeções minoritárias permanecem acessíveis segundo a política de visibilidade. Armazenamento/acesso não comprovam preservação semântica na síntese.

## 12. Falhas técnicas

### 12.1 Modelo único e tentativas internas

No modo experimental, somente o primário de `GEMINI_MODEL` é usado; `GEMINI_FALLBACK_MODELS` é ignorado tanto pela montagem da configuração quanto pelo serviço IA. Fora dele, o fluxo genérico mantém alternativas configuradas.

`AIService._call_with_retry()` faz até **três tentativas totais por execução** para erros 500/502/503/504 ou `TimeoutError`, com esperas de 2 e 4 segundos entre tentativas quando necessárias. Falhas não transitórias não recebem essas repetições. Não são três tentativas adicionais e não existe loop ilimitado. O SDK é configurado com uma tentativa própria; o limite é controlado no serviço.

Códigos preservados: `SEM_CHAVE`, `COTA_OU_LIMITE`, `MODELO_INDISPONIVEL`, `ACESSO_API`, `RESPOSTA_INVALIDA`, `SERVICO_INDISPONIVEL`, `TEMPO_ESGOTADO`, `FALHA_IA`. Diagnósticos técnicos não devem incluir a mensagem privada/corpo da exceção ou credenciais.

### 12.2 Classificação IA

Manifestação salva antes da chamada → tentativa IA/retries → falha persistente registrada → categoria `Não classificada` → moderador pode usar **Classificar como fallback técnico** com CAT01–CAT09.

O estado final é `classification_status=FALLBACK_HUMANO`; a tentativa/falha original e o evento `CLASSIFICACAO_FALLBACK_HUMANO` preservam a origem. A categoria humana não é gravada falsamente em `category_ai`. Correção normal e contestação são eventos distintos. Esse fallback não transforma A em B nem autoriza mediação humana em A; deve ser considerado na análise futura.

### 12.3 Mediação IA

A execução é reservada de forma transacional em `dc_mediations`, com `EM_EXECUCAO`, **antes** da chamada externa. Isso bloqueia duplicação concorrente. O resultado atualiza a mesma reserva para `OK` ou `FALHA`; retries internos não viram linhas separadas.

1. Execução 1, com as tentativas internas previstas.
2. Somente se falhar, oferecer **Tentar mediação IA novamente**: última execução controlada para o mesmo `proposal_id + revision`, modelo, prompts e manifestações congeladas.
3. Se a execução 2 tiver sucesso, permitir a revisão/publicação normal. Sucesso na execução 1 não habilita repetição desnecessária.
4. Se ambas falharem, bloquear nova execução, publicação e encerramento normal, sem substituir por mediação humana. Oferecer cancelamento técnico pelo moderador.

Motivo do botão de cancelamento técnico:

> Falha técnica persistente da mediação IA após tentativas previstas no protocolo experimental.

Resultado: `CANCELADA`. Manifestações, duas falhas, códigos e eventos são preservados. Não converter falha técnica em `SEM_ACORDO`/`INCONCLUSIVO`, não fabricar resumo local nem reaproveitar proposta anterior como sucesso IA. A reabertura após tentativa sem sucesso confirmado é bloqueada para não mudar dados entre execuções.

Se o resultado não puder ser confirmado (por exemplo, interrupção após a reserva), a execução permanece `EM_EXECUCAO`, sem nova chamada automática. Conferir o estado; se não recuperável, cancelar preservando a incerteza. Não há timeout administrativo automático que transforme esse estado em falha ou sucesso.

### 12.4 Banco, conexão e credenciais

Falha de banco mostra erro e interrompe a operação; não há reconstrução manual de registros ou fallback automático para outro banco. Chamadas IA não mantêm uma transação de banco aberta. Não há temporizador automático de cinco minutos para perda de internet do participante. Problemas de conexão seguem o procedimento operacional a validar, sem inventar registros. Redefinição de convite preserva identidade/histórico e invalida a credencial antiga.

## 13. Configuração e identidade da versão

| Referência canônica | Valor nesta implementação |
|---|---|
| Documento | Protocolo Experimental v1.1 |
| `EXPERIMENT_RELEASE` | `experimental-v1` |
| `EXPERIMENT_CONFIG_VERSION` | `experimento-v1` |
| `TAXONOMY_VERSION` | `taxonomia-v1` |
| `CLASSIFICATION_VERSION` | `classificacao-v1` |
| `MEDIATION_VERSION` | `mediacao-v1` |
| `EXPERIMENT_SCENARIO_VERSION` | `cenario-escola-v1` |
| `MAX_ROUNDS` | 3 |
| `MAX_MEDIATION_EXECUTIONS` | 2 por proposta/revisão |

A revisão documental v1.1 **não altera** as constantes de release ou de prompt. A sessão A fixa configuração não secreta por evento `CONFIGURACAO_IA_FIXADA`: modelo, versões de classificação/mediação, taxonomia e temperatura 0. Divergência bloqueia a continuidade com outra configuração; restaurar a original ou cancelar. Isso não garante determinismo de um serviço externo nem fixa todas as condições internas do provedor.

`APP_COMMIT` vem da configuração da implantação; aceita hexadecimal de 7–40 caracteres e ausente/inválido fica `null`. Não é consultado no GitHub, não é inferido da `main` e não comprova o código implantado. É registrado na criação da sessão, separado do build do exportador. Sua ausência não bloqueia criação no código, mas deve ser resolvida no precheck. Chave ausente também não é gate de criação; em A resulta em falha `SEM_CHAVE`, razão para verificar a configuração antes de uso com participantes.

As configurações operacionais e exemplos sem segredos estão no [README](../README.md#executar-e-configurar). D16 continua aberta: a conta/modalidade Gemini e a disponibilidade do modelo precisam ser confirmadas, não inferidas do default codificado.

## 14. PostgreSQL e arquitetura operacional

A aplicação carrega sem PostgreSQL, mas `app.experimental_storage_ready()`/`login_screen()` bloqueiam criação experimental formal com SQLite e explicam `DATABASE_URL`. SQLite continua permitido para demonstração genérica e instâncias de domínio usadas pela suíte; isso não constitui autorização de coleta experimental nele. Não há bypass produtivo de teste introduzido para criar uma sala formal.

PostgreSQL externo precisa ser configurado e verificado operacionalmente; a presença da URL não garante disponibilidade, backup ou durabilidade. URL não suportada/serviço indisponível não provocam substituição silenciosa por SQLite.

| Componente | Responsabilidade |
|---|---|
| `Prototipo TCC.py` | Entrada que chama `app.main()` |
| `app.py` | Interface, cegamento, criação formal, confirmação humana, campos financeiros e exportação do moderador |
| `decision.py` | Acesso por credencial, estados/regras, transações, persistência, reservas, vínculos e export |
| `ai_service.py` | Payload externo, sanitização, modelo/retries e validação estrutural de respostas |
| `experiment_config.py` | Constantes não secretas, taxonomia de objeções e cenário financeiro |

Persistência: `dc_rooms`, `dc_participants`, `dc_proposals`, `dc_responses`, `dc_category_contests`, `dc_mediations`, `dc_events`. Escritas usam `BEGIN IMMEDIATE` em SQLite e bloqueio da linha da sala com `SELECT FOR UPDATE` em PostgreSQL. Etapa, versão e credencial são verificadas no domínio. Nem todo vínculo lógico é uma FK SQL: `source_mediation_id` é validado pela aplicação.

Não há documento formal de RF/RNF/arquitetura versionado na base auditada do repositório. **O mapeamento formal permanece no pacote documental externo do TCC.** Não se criaram IDs RF/RNF nem se editaram documentos externos congelados neste commit.

## 15. Cenário experimental oficial

`cenario-escola-v1`: situação **simulada**, sem escola específica observada, custos reais coletados ou solução ótima conhecida. Uma escola pública recebe R$ 80.000 extraordinários diante de demandas de R$ 145.000; não é possível atender integralmente todas simultaneamente.

| Item do cenário | Nome exibido | Teto | V1 |
|---|---|---:|---:|
| CAT_INV01 | Melhoria das salas de aula | R$ 40.000 | R$ 25.000 |
| CAT_INV02 | Computadores/equipamentos de informática | R$ 35.000 | R$ 25.000 |
| CAT_INV03 | Biblioteca/material de estudo | R$ 20.000 | R$ 10.000 |
| CAT_INV04 | Climatização | R$ 30.000 | R$ 15.000 |
| CAT_INV05 | Acessibilidade | R$ 20.000 | R$ 5.000 |
| **Total** | | **R$ 145.000** | **R$ 80.000** |

O contexto configurado pressupõe condições mínimas obrigatórias de segurança/acessibilidade; o item representa melhorias adicionais. Não trata obrigações legais como preferência negociável nem faz afirmação de conformidade normativa.

Critérios qualitativos fornecidos no contexto: impacto pedagógico, abrangência de beneficiários, urgência, viabilidade, inclusão e sustentabilidade. Não recebem pesos nem score automático. O cenário fica habilitado por padrão na criação experimental e é vinculado à sessão. Desabilitá-lo cria uma sessão livre, fora deste exercício financeiro; não usar essa opção nas condições escolares A/B. Sessões antigas não são automaticamente convertidas pelo texto.

## 16. Validação financeira e publicação

`validate_scenario_allocation()` é a mesma regra em A e B. Exige exatamente cinco itens conhecidos, valores inteiros finitos em reais, sem booleanos/strings/centavos, não negativos, dentro dos tetos e com total até R$ 80.000. Rejeita item ausente, desconhecido ou recurso adicional estruturado. V1 tem os valores oficiais fixos. Todos os itens continuam representados mesmo com valor zero.

Saldo não alocado é permitido: total R$ 75.000 implica saldo R$ 5.000 do mesmo orçamento. Não é verba nova. A fonte de verdade é:

```json
{
  "items": {"CAT_INV01": 25000, "CAT_INV02": 25000, "CAT_INV03": 10000, "CAT_INV04": 15000, "CAT_INV05": 5000},
  "total": 80000,
  "unallocated": 0,
  "currency": "BRL"
}
```

O moderador informa os valores na seção **Distribuição financeira da proposta**, observa total/saldo e confirma sua coerência com o texto antes de publicar. Recalcular valores preserva o rascunho e exige nova confirmação da distribuição. A validação também ocorre no domínio; não depende só dos limites dos widgets.

A alocação inicial fica no evento `SALA_CRIADA`; V2/V3, em `PROPOSTA_PUBLICADA`, vinculados à `proposal_id`. O cenário está em `SESSAO_EXPERIMENTAL_CONFIGURADA`. Não foi necessária migração estrutural. Mudança financeira pode constituir nova versão mantendo a prosa explicativa; sem mudança de texto ou alocação não há nova proposta. O texto continua relevante e não é substituído por uma redação gerada automaticamente a partir dos números.

A IA recebe cenário/alocação vigente como contexto quando válidos, mas continua devolvendo sugestão consultiva em texto. O moderador confirma os cinco valores tanto em A quanto em B. O sistema não extrai números da prosa como única verdade e não verifica semanticamente promessas de doações, justiça, benefício ou qualidade: o texto também precisa de conferência humana. Não existe otimizador, pesos, ranking, MCDM, AHP, TOPSIS ou algoritmo de melhor distribuição.

Configuração financeira não reconhecida, registro ausente ou inconsistente gera aviso/status explícito e bloqueia nova publicação financeira. O export não inventa alocações de versões antigas ou sem cenário habilitado. Participantes veem os valores da proposta vigente antes de responder, sem receber manifestações alheias por essa visualização.

## 17. Privacidade e minimização

A identificação operacional experimental é `P01…Pn`; não se exige nome civil, e-mail, matrícula, idade, gênero ou localização. O aviso no campo de justificativa pede que esses dados não sejam inseridos.

Antes da API, `sanitize_external_text()` aplica substituições heurísticas de e-mail, telefone brasileiro evidente, CPF formatado e documentos identificáveis por padrões/rótulos, preservando valores monetários do cenário. O original necessário à pesquisa permanece em `dc_responses`. A classificação não recebe identidade de participante. A mediação usa `M01…Mn` temporários por chamada, remapeados localmente para cobertura, e `missing_count` em vez da identidade dos ausentes. Credenciais de sala/participantes não entram no payload textual; a chave do serviço é usada pelo SDK para autenticação e não é dado de pesquisa.

`MANIFESTACAO_REGISTRADA` não duplica `argument` nem `previous.argument`; preserva metadados de edição. A manifestação vigente por pessoa/versão pode ser atualizada. Portanto, o histórico não é uma gravação integral de todos os textos anteriores, e o export não recria conteúdo descartado. Esse limite deve ser considerado ao planejar análises de primeira resposta versus edições posteriores.

JSON de pesquisa/CSV removem campos estruturados de credenciais e aliases civis e não importam a chave da API, `DATABASE_URL` ou secrets. Texto científico livre não é automaticamente anonimizado no export. Um participante/moderador ainda pode inserir dado pessoal no conteúdo; revisar a política de acesso, anonimização/descarte e uso do provedor conforme D16/D17, sem presumir aprovação ética ou conformidade legal integral.

**Separação obrigatória:** `acessos_<codigo>.json`, gerado pelo painel de convites, é um arquivo confidencial com credenciais. Não é `research_export`, não deve integrar dataset, repositório ou material público. A política de exclusão de tokens refere-se ao pacote de pesquisa, não a esse arquivo administrativo de acessos.

## 18. Exportação e reconstrução — schema 2

Somente moderador exporta. JSON é o pacote completo dos dados disponíveis; CSV é uma visão simplificada de manifestações. Arquivos experimentais usam código de sala e timestamp, sem nomes/tokens no nome: `experimento_<codigo>_<timestamp>.json` e `manifestacoes_<codigo>_<timestamp>.csv`.

| Bloco/campo | Conteúdo e limite |
|---|---|
| `schema_version` | 2; cenário/alocações são extensões compatíveis |
| `exported_at` | Data/hora de geração, em UTC |
| `experiment` | Identidade histórica registrada da sessão: condição A/B, release/configuração, cenário, modelo/prompts quando fixados, limites, armazenamento e build declarado na criação |
| `exporter` | Ambiente que gerou o arquivo; não é retroatribuído à sessão. Pode indicar build diferente do inicial |
| `room` | Tema, contexto, estado, revisão, proposta ativa, criação, resultado, encerramento e motivo |
| `scenario` | Versão, orçamento, itens/tetos, moeda e V1 quando habilitado; `null` se não habilitado |
| `participants` | IDs técnicos necessários e pseudônimos; sem aliases civis/tokens |
| `proposals` | Rodada, texto, pai, origem, `source_mediation_id`, horários, alocação, total, saldo e `human_review` quando registrado |
| `responses` | Texto original vigente por versão/edição, posição, categoria IA/final, revisão manual, status/modelo/prompt, timestamps, fallback e vínculo com falha original |
| `category_contests` | Manifestação/edição, pseudônimo, categoria sugerida, status, resolução e horários |
| `mediations` | Origem, revisão, `EM_EXECUCAO`/`FALHA`/`OK`, síntese, sugestão, `details_json`, `details`, coverage, modelo/prompt, falha, duração técnica e execução 1/2 quando registrada |
| `events` | Trilha operacional, responsável pseudonimizado, timestamps, `payload_json` e payload estruturado sem campos de credenciais |

A configuração IA congelada é reutilizada de `CONFIGURACAO_IA_FIXADA`. Em B, modelo, prompts usados e temperatura são `null`/não aplicáveis; a presença de versões definidas no software não significa que B chamou IA. Sessões antigas sem metadados ficam como `not_recorded`, não recebem um SHA/modelo inventado. JSON interno ilegível é sinalizado por erro de parse, sem inventar conteúdo substituto.

A reconstrução permite seguir sessão → configuração → V1 → manifestações → classificação → contestação/fallback → mediação → revisão humana → V2/V3 → resultado. A revisão publicada referencia a sugestão original, o texto publicado, `changed_from_source`, nota, responsável e timestamp. Para contingência de classificação, código da falha original e evento de fallback ficam distinguíveis. Para mediação IA, o número da execução vem de `MEDIACAO_INICIADA`; retries internos não são confundidos com execuções.

O CSV contém rodada, participante, posição, argumento, categoria final/IA, status, modelo/prompt de classificação e atualização. Campos textuais com início de fórmula são escapados. Não incorpora toda a auditoria nem substitui instrumentos externos de avaliação.

Os timestamps permitem análise temporal posterior, mas não se calcula automaticamente “tempo de decisão” ou eficácia. O export conserva dados operacionais disponíveis; não implementa avaliadores de referência, dupla codificação, adjudicação, matriz de confusão, precisão, fidelidade semântica, SUS ou análise estatística.

## 19. Resultados possíveis e precedência

| Resultado | Regra em `Repository.finish()` |
|---|---|
| `ACORDO` | Todos responderam à versão ativa e não há `NAO_ACEITO`; pode ocorrer em V1, V2 ou V3 |
| `SEM_ACORDO` | Na terceira rodada, todos responderam e existe rejeição |
| `INCONCLUSIVO` | Na terceira rodada, existe ausência; tem precedência sobre rejeição quando ambas existem |
| `CANCELADA` | Interrupção solicitada pelo moderador com motivo obrigatório, inclusive falha técnica persistente |

Na condição A, falha persistente de mediação ou execução em andamento impede encerramento normal/publicação; cancelamento preserva o estado registrado. O software oferece a ação humana de cancelamento, não inventa automaticamente resultado substantivo. A ausência não é removida para produzir acordo. Nenhum resultado desta tabela foi observado em experimento real por esta entrega documental.

## 20. Evidência técnica, limitações e gates

A referência funcional do Commit 8 tem **142 testes SQLite + IA simulada + Streamlit e 84 testes de regras repetidos em PostgreSQL, aprovados**: [CI do baseline](https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/42259638747). O workflow permanece o mesmo e deve executar integralmente no Commit 9. Alteração inesperada nas contagens exige investigação, não edição de testes para obter aprovação.

A suíte usa dados sintéticos, `streamlit.testing.v1.AppTest`, IA simulada e PostgreSQL temporário; não valida implantação externa nem comportamento real de uma conta Gemini. Não demonstra eficácia científica, precisão medida, preferência, satisfação, SUS ou significância. Não substitui piloto futuro autorizado, avaliação ou auditoria final.

Limitações explícitas: sanitização heurística; texto livre potencialmente pessoal; build declarado; dependências em faixas de versões; IA não determinística e sujeita a omissão/distorção/steering; revisão humana também sujeita a erro; independência apenas anterior ao primeiro registro válido de cada versão; textos antigos substituídos não recuperáveis integralmente; frequências descritivas; validação financeira sem semântica/justiça; inexistência de solução ótima universal definida; amostra pequena e generalização limitada. Resultados futuros não podem ser antecipados.

**D16 permanece pendente:** definição operacional final de modalidade/conta Gemini utilizada. **D17 permanece pendente:** confirmar com orientador origem dos participantes e procedimentos de consentimento/ética/CEP/TCLE conforme aplicável, sem concluir exigência institucional por suposição. Até essas respostas, não concluir composição final nem procedimento ético.

Usar o [checklist pré-piloto](CHECKLIST_PRE_PILOTO_v1.1.md) e solicitar separadamente a **AUDITORIA FINAL DO PACOTE EXPERIMENTAL v1.1**. Não há autorização automática de merge, retirada de draft, deploy, piloto ou experimento, e não existe Commit 10 previsto.
