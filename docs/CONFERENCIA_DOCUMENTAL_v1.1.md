# Conferência documental — v1.1

## Base e limite desta operação

Conferência realizada sobre a documentação e o código do Commit 8, `25eff66cb970b63abb2b4561fb01793546f262f2`, na branch `feat/protocolo-experimental-v1`. Esta é a verificação necessária à redação técnica do Commit 9, **não a auditoria final integrada nem uma avaliação científica**. Não houve execução de deploy, piloto ou experimento com participantes reais.

A árvore do repositório e a lista de commits do PR #4 foram consultadas antes das edições. Python, testes, requisitos de instalação e workflow foram comparados à base para manter o commit somente documental.

## Inventário documental anterior

| Arquivo existente | Situação encontrada | Tratamento |
|---|---|---|
| `README.md` | Descrição da etapa técnica anterior, com categorias livres, visibilidade aberta, operação humana genérica e contagem histórica 44/31 | Atualizado como entrada vigente da documentação v1.1; conteúdo anterior copiado literalmente para `docs/historico/README_tecnico_pre_v1.1.md` |
| `APLICAR.md` | Guia anterior de publicação em main e piloto, com comparação ainda opcional e fluxo humano genérico | Corpo original preservado; aviso de histórico no início e links para os documentos vigentes |
| `docs/` | Diretório inexistente nessa base | Criado para protocolo, checklist, mapa e esta conferência |
| Requisitos/arquitetura com IDs RF/RNF | Nenhum documento formal correspondente localizado no repositório; os dois Markdown anteriores também não traziam esses identificadores | Nenhum mapeamento artificial criado; o mapeamento formal permanece no pacote documental externo do TCC |

`.github/workflows/tests.yml`, `.devcontainer/devcontainer.json`, `.gitignore` e `requirements.txt` são configurações/fontes técnicas; não foram reescritos como documentação vigente. O arquivo de entrada conserva uma docstring histórica com referência a atualização de piloto técnico; esse texto não é evidência de piloto executado nesta operação e não foi alterado.

A cópia histórica do README provém exatamente do arquivo do baseline acima (blob Git `e13a9f2a61896ff9087fa5be4bbe7084b9415df9`). Suas afirmações datadas e links antigos são histórico, não relato de verificação atual de implantação ou resultados.

## Divergências documentais tratadas

| Descrição anterior | Estado real documentado na v1.1 | Evidência principal |
|---|---|---|
| Categorias livres para todo fluxo | Livres apenas no genérico; CAT01–CAT09 no experimental | `experiment_config.TAXONOMY`, `Repository._validated_category`, seletor de `app.manifestations` |
| Todos veem manifestações uns dos outros | Participante experimental sem resposta atual não vê dados decisórios alheios; moderador vê | `participant_has_current_response`, `participant_visibility_blocked`, `live_consensus`, painéis |
| Pseudônimos persistentes e lista de ausentes no prompt | Na mediação experimental, M01…Mn temporários e `missing_count`; classificação não envia identidade | `AIService.classify`, `AIService.mediate` |
| Fluxo humano continua após falha, sem distinguir condição | Fallback humano identificado só para classificação de A; mediação A exige base IA e duas falhas levam à opção de cancelamento | `set_category`, `mediation_attempt_state`, `begin_ai_mediation`, `save_mediation`, `publish_revision`, `finish` |
| Fallback de modelos aplicável sem distinção | Somente genérico; experimental mantém um modelo e configuração fixada | `app.main`, `AIService.__init__`, `ensure_ai_configuration` |
| SQLite apenas desaconselhado no experimento | Gate de criação formal na interface exige PostgreSQL; domínio SQLite permanece para testes | `experimental_storage_ready`, `login_screen` |
| Revisão humana livre como alternativa geral | B usa template/coverage; A exige mediação IA válida e nota de revisão | `validated_manual_mediation`, `manual_mediation_form`, `publish_revision` |
| Tema/proposta livres como única operação | Cenário escolar habilitado por padrão no experimental, com dados financeiros estruturados e V1 fixa; salas livres/antigas não são convertidas | `scenario_definition`, `validate_scenario_allocation`, `session_scenario`, `proposal_financial_state` |
| Histórico de edições pode sugerir cópia integral de textos antigos | Eventos de manifestação guardam metadados sem duplicar justificativas; export conserva textos vigentes e não recria substituídos | `submit_response`, `research_export` |
| Exports genéricos sem manifesto distinto | JSON schema 2 distingue `experiment`/`exporter`, cenário, execuções, cobertura e revisão | `runtime_identity`, `_experiment_manifest`, `research_export`, `export_panel` |
| Contagem antiga de testes como estado atual | Baseline do Commit 8: 142 SQLite/IA simulada/Streamlit e 84 regras PostgreSQL | [CI aprovado do Commit 8](https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/42259638747) |
| Instruções de main/deploy como próximo passo | PR #4 continua draft; sem merge/deploy; próxima etapa é auditoria final separada | Governança desta entrega e metadados do PR |

As funcionalidades foram introduzidas nos Commits 1–8, conforme [mapa](MAPA_COMMITS_v1.1.md). Não se reescreveu a cronologia para alegar que sempre existiram.

## Delimitação do fechamento técnico

A conferência documental não identificou uma divergência funcional nova que tenha sido corrigida neste commit. Nenhuma correção funcional foi embutida, e a auditoria final continua necessária. A documentação passou a explicitar limites verificáveis:

- Cegamento é inicial por participante/versão; a visão é liberada após resposta e há edições posteriores possíveis.
- Histórico não recupera integralmente justificativas substituídas numa mesma manifestação.
- Arquivo administrativo de acessos contém credenciais; não se confunde com JSON/CSV de pesquisa.
- `APP_COMMIT` é declaração; não houve comprovação de build no Streamlit.
- Cenário livre/antigo não recebe validação financeira por inferência; prosa e justiça da distribuição exigem conferência humana.
- Coverage e nota de revisão têm validação estrutural, sem provar fidelidade/neutralidade.
- `requirements.txt` utiliza faixas; o ambiente efetivamente escolhido precisa ser registrado antes da coleta.
- CI usa dados sintéticos e serviços temporários, sem validar conta Gemini, banco externo ou prontidão de piloto real.

Esses limites devem ser considerados na auditoria final e no plano de avaliação; não foram transformados em requisitos novos nem resolvidos artificialmente pela redação. D16 e D17 permanecem abertos. Se a auditoria identificar incompatibilidade entre esses comportamentos e o desenho exigido, registrar bloqueador e decisão futura, sem ocultar alteração funcional em documentação.

O checklist é um instrumento de liberação futura, inicialmente desmarcado. O CI do Commit 9 deve rodar a suíte original, com 142/84 como referência e sem modificar testes para obter aprovação. Seu resultado/identidade final são evidências do GitHub Actions e do relatório da operação, não uma afirmação antecipada dentro do próprio commit.
