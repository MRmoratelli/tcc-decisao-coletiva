# Checklist pré-piloto v1.1

## Estado e uso

**Gates de liberação pendentes; este arquivo não registra execução de piloto.** Preencher evidência, responsável e data somente após conferência real, com o orientador/grupo quando necessário. Itens inicialmente desmarcados não são autorização para operar. O CI sintético já aprovado no Commit 8 (142/84) não equivale a validar a futura implantação ou liberar participantes.

Referências: [protocolo](PROTOCOLO_EXPERIMENTAL_v1.1.md), [README](../README.md) e [mapa de commits](MAPA_COMMITS_v1.1.md). A implementação é candidata; o próximo passo é a auditoria final solicitada separadamente, sem Commit 10 automático.

## Decisões e autorização

- [ ] **D16 — definir modalidade/conta Gemini a ser usada no experimento.** Registrar a decisão real; não presumir gratuita/paga, disponibilidade ou política de dados.
- [ ] **D17 — confirmar com orientador necessidade e procedimento de ética/CEP/TCLE e origem dos participantes.** Confirmar se serão integrantes do grupo ou externos, sem presumir resposta institucional.
- [ ] Composição final, participação, consentimento e critérios de inclusão definidos conforme orientação recebida.
- [ ] Nenhum dado real coletado antes da liberação metodológica/ética necessária.
- [ ] Instrumentos, roteiro e critérios científicos aplicáveis definidos; não inferir D20 ou instrumentos a partir das funcionalidades do software.

## Ambiente da versão escolhida

- [ ] PostgreSQL persistente configurado; disponibilidade, acesso, política de backup e persistência após reinício conferidos no ambiente escolhido.
- [ ] `GEMINI_API_KEY` configurada para condição A, fora do repositório e do dataset.
- [ ] `GEMINI_MODEL` confirmado disponível na conta e congelado; nenhum fallback de modelo no modo experimental.
- [ ] `APP_COMMIT` configurado com o SHA da build efetivamente selecionada, sem inferir de `main`.
- [ ] `EXPERIMENT_MODE` habilitado.
- [ ] CI verde no SHA exato selecionado para a próxima etapa; conferir suíte completa SQLite/Streamlit e regras PostgreSQL. Baseline documental: 142 e 84, sem mudança silenciosa na contagem.
- [ ] Build/deploy conferido manualmente; verificar branch/SHA de origem e comparar com o valor declarado de `APP_COMMIT`.
- [ ] Versões efetivas de Python/dependências e configuração de modelo/prompts/taxonomia registradas para o estudo; `requirements.txt` contém faixas, não um lock completo.
- [ ] Configuração de execução mantida estável durante cada sessão; divergência precisa ser resolvida sem alterar silenciosamente a condição experimental.

## Cenário e equivalência A × B

- [ ] Cenário `cenario-escola-v1` conferido e habilitado nas duas condições; não usar sala livre para representar o cenário escolar.
- [ ] V1 **25/25/10/15/5 mil reais** conferida; total R$ 80.000 e saldo zero.
- [ ] Cinco itens, tetos de R$ 40.000/35.000/20.000/30.000/20.000 e demandas totais de R$ 145.000 conferidos.
- [ ] Contexto simulado, premissa de segurança/acessibilidade e critérios comuns apresentados da mesma forma; não atribuir pesos automáticos.
- [ ] Mesmo moderador operacional e demais controles entre condições conferidos conforme o protocolo validado, sem presumir que o software verifica identidade pessoal.
- [ ] Condição A testada com dados sintéticos: classificação, sugestão IA, nota de revisão e confirmação financeira.
- [ ] Condição B testada com dados sintéticos: taxonomia manual, template completo e coverage, sem chamadas IA.
- [ ] Restrição financeira exercitada com valores sintéticos válidos/inválidos, saldo não alocado e publicação bloqueada quando necessário.
- [ ] Coerência entre texto e valores estruturados conferida humanamente; o validador não interpreta a prosa nem julga justiça.

## Acessos e operação

- [ ] Credenciais de participantes geradas e distribuídas individualmente, usando P01…Pn.
- [ ] Credencial de moderador guardada separadamente; testar redefinição de convite sem trocar identidade, quando necessário.
- [ ] Arquivo `acessos_<codigo>.json` protegido como material administrativo confidencial; não anexar ao JSON/CSV de pesquisa.
- [ ] Moderador conhece protocolo de falhas: fallback de classificação identificado; no máximo duas execuções de mediação IA; nunca substituir falha persistente de A por mediação humana.
- [ ] Moderador conhece regra de cegamento: nenhum dado decisório alheio antes da resposta atual; V2/V3 restabelecem o bloqueio.
- [ ] Moderador conhece regra de revisão humana: manter sugestão original, justificar alteração e registrar publicação sem alteração quando aplicável.
- [ ] Moderador conhece regra de acordo e precedência dos estados finais, sem maioria, limiar de 80% ou V4.
- [ ] Fluxo de ponta a ponta sintético conferido com perfis independentes e dados fictícios, inclusive falha, cancelamento e preservação do histórico.
- [ ] Tratamento operacional de conexão/perda de acesso e de execução `EM_EXECUCAO` sem resultado confirmado definido, sem reconstrução manual de dados.

## Dados e instrumentos

- [ ] Export JSON conferido: schema 2, `experiment` versus `exporter`, build declarado, configuração, cenário, V1/V2/V3, categorias, contestações/fallbacks, mediações, revisão e encerramento.
- [ ] Export CSV conferido: textos originais necessários, pseudônimos, categorias, modelo/prompt, horários e escape de fórmulas.
- [ ] Conferida a exclusão de campos de credenciais/secrets do pacote de pesquisa e a possibilidade de dados pessoais em texto livre; aplicar procedimento de acesso/anonimização/descarte definido após D16/D17.
- [ ] Limite do histórico de edições considerado no plano analítico: metadados são preservados, mas textos substituídos em uma mesma manifestação não são reconstruídos integralmente.
- [ ] Formulário/questionário pós-sessão preparado fora ou dentro do sistema conforme decisão metodológica posterior. Não considerar questionário/SUS implementado por esta versão.
- [ ] Estratégia de análise compatível com amostra pequena e limites exploratórios; não confundir acordo, satisfação, usabilidade, fidelidade e qualidade da decisão.

## Registro de liberação futura

| Campo | Preencher após verificação |
|---|---|
| Responsável pela conferência | Pendente |
| Data | Pendente |
| SHA/build escolhida | Pendente |
| Evidência do CI dessa build | Pendente |
| Evidência da conferência do deploy | Pendente |
| Decisão D16 | Pendente |
| Orientação/decisão D17 | Pendente |
| Pendências remanescentes | Pendente |
| Autorização para a etapa seguinte | Não presumida |

Nenhum item acima foi fechado automaticamente por esta atualização documental. Não fazer merge, retirar o PR #4 de draft, fazer deploy ou iniciar piloto/experimento com base apenas na existência deste checklist.
