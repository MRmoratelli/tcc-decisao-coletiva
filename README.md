# Sistema de Inteligência Artificial Aplicado à Tomada de Decisão Coletiva

## Status técnico — documentação v1.1

**Implementação técnica candidata ao congelamento experimental, pendente dos gates pré-piloto.** A implementação funcional dos Commits 1–8 está concluída para o protocolo técnico descrito nesta v1.1. Isso não representa aprovação metodológica final, eficácia científica, experimento executado, deploy experimental congelado ou versão em produção. **D16 e D17 permanecem pendentes.**

A documentação corresponde à branch `feat/protocolo-experimental-v1`, PR [#4, em rascunho](https://github.com/MRmoratelli/tcc-decisao-coletiva/pull/4), sobre a base funcional `25eff66cb970b63abb2b4561fb01793546f262f2`. A `main` continua na referência `b342030bb80eb4d03ff0ee39cb5d7751bfc88336`. Esta entrega documental não autoriza merge, deploy, piloto ou coleta com participantes reais.

A v1.1 substitui as instruções técnicas anteriores como referência desta branch. O [README anterior foi preservado literalmente](docs/historico/README_tecnico_pre_v1.1.md), e [APLICAR.md](APLICAR.md) está identificado como histórico. As funções experimentais foram introduzidas progressivamente nos Commits 1–8; não existiam todas na versão antiga.

## Documentos de entrada

- [Protocolo Experimental v1.1](docs/PROTOCOLO_EXPERIMENTAL_v1.1.md): regras, operação, arquitetura e exportação.
- [Checklist pré-piloto v1.1](docs/CHECKLIST_PRE_PILOTO_v1.1.md): gates operacionais ainda a conferir.
- [Mapa dos nove commits](docs/MAPA_COMMITS_v1.1.md): funcionalidades e identidade Git.
- [Conferência da documentação anterior](docs/CONFERENCIA_DOCUMENTAL_v1.1.md): inventário, substituições e limites desta atualização.

## Finalidade e método

Artefato acadêmico desenvolvido no contexto de Design Science Research (DSR), em Python/Streamlit, para pequenos grupos discutirem **uma proposta evolutiva por sessão**, em até três rodadas. Estrutura posições e justificativas, classifica objeções, apresenta divergências descritivas e apoia mediação. A IA é consultiva: não vota, não publica versões nem encerra sessões. O moderador revisa e opera o fluxo; a decisão permanece com os participantes.

| Posição exibida | Estado interno | Significado | Permite acordo? |
|---|---|---|---|
| ACEITO | `ACEITO` | Aceita a versão vigente | Sim |
| ACEITO COM RESSALVAS | `ACEITO_COM_RESSALVAS` | Aceita a versão e mantém preocupações registradas | Sim |
| NÃO ACEITO | `NAO_ACEITO` | Exige alteração para aceitar | Não |
| Ausência | Não há resposta atual | Não equivale a aceite | Não |

Justificativa é obrigatória para ressalva/rejeição. Cada pessoa mantém uma manifestação vigente por proposta; uma nova versão exige novas manifestações. Há V1, V2 e V3, sem V4. Acordo exige todos os participantes esperados na mesma versão e nenhuma rejeição; não depende de maioria, frequência ou corte de 80%. As ressalvas permanecem registradas.

Os resultados são `ACORDO`, `SEM_ACORDO`, `INCONCLUSIVO` e `CANCELADA`. Antes da terceira rodada, o encerramento normal exige acordo; cancelamento exige motivo. Na terceira rodada, ausência tem precedência sobre rejeição para distinguir inconclusão de ausência de acordo. Consulte as regras completas no protocolo.

## Condições experimentais e papel humano

| Função | Condição A | Condição B |
|---|---|---|
| Coleta individual e regra decisória | Mesmo processo estruturado | Mesmo processo estruturado |
| Classificação | IA, com revisão humana e fallback técnico identificado quando necessário | Moderador, manualmente |
| Taxonomia | CAT01–CAT09 | CAT01–CAT09 |
| Divergências | Mesma contagem e visualização determinísticas | Mesma contagem e visualização determinísticas |
| Mediação | Sugestão IA com revisão humana obrigatória | Template manual obrigatório com cobertura |
| Publicação e alocação financeira | Ação humana, com validação das mesmas restrições | Ação humana, com validação das mesmas restrições |

B é a **contrapartida manual do mesmo processo**, não discussão livre sem estrutura. A origem da mediação precisa corresponder à condição. Publicar V2/V3 experimental exige uma mediação válida, vinculada à proposta e à revisão atuais. Em A, alteração do texto exige nota; texto mantido recebe registro explícito de publicação sem alteração. A sugestão original permanece recuperável.

O moderador classifica/revisa categorias durante `COLETA`, pausa para `REVISAO`, solicita/registra mediação e publica ou encerra. A credencial de moderador não vota. Usar o mesmo moderador entre condições é um controle operacional, não uma igualdade de identidade verificada pelo software.

## Taxonomia, contestação e divergências

Os rótulos canônicos de `experiment_config.py` são:

| Código | Categoria de objeção |
|---|---|
| CAT01 | Impacto pedagógico |
| CAT02 | Abrangência de beneficiários |
| CAT03 | Urgência e prioridade |
| CAT04 | Viabilidade de implementação |
| CAT05 | Inclusão e acessibilidade |
| CAT06 | Sustentabilidade do investimento |
| CAT07 | Adequação orçamentária |
| CAT08 | Informação ou justificativa insuficiente |
| CAT09 | Conflito entre múltiplos critérios |

`Sem objeção explicitada` e `Não classificada` são estados técnicos. Uma categoria principal não representa separadamente todas as objeções de um texto. O participante pode contestar a própria classificação uma vez por edição e sugerir outro código existente; a categoria só muda após decisão do moderador. A trilha mantém classificação, sugestão e categoria final.

A análise ordena categorias por frequência decrescente, com desempate lexicográfico. O percentual acumulado usa apenas categorias contabilizadas; estados técnicos não entram no denominador. A linha de 80% é descritiva. Não existe corte automático, fronteira de Pareto, ranqueamento de pessoas ou otimização. Objeções raras continuam disponíveis; preservação técnica não comprova preservação semântica na mediação.

## Cegamento e privacidade

No modo experimental, antes de responder à proposta vigente, o participante vê contexto, proposta, distribuição financeira, instruções e formulário. Posições, justificativas, categorias, contagens, faltantes, consenso, mediação e histórico detalhado ficam ocultos. Após resposta válida, a visualização permitida é liberada. V2/V3 restabelecem o bloqueio individual. O moderador mantém visão integral; o histórico anterior também é ocultado enquanto o participante está cego.

A criação experimental recebe quantidade de participantes e gera `P01…Pn`, sem exigir nome civil, e-mail ou matrícula. A classificação externa não recebe identidade de participante. A mediação usa `M01…Mn` temporários por chamada, remapeados localmente, e apenas a quantidade de ausentes. Há aviso ao participante e sanitização heurística antes da API; o texto original permanece local. Eventos de manifestação conservam metadados, sem duplicar justificativas integrais.

JSON de pesquisa e CSV excluem campos de credenciais e aliases civis. **O arquivo separado de acessos contém credenciais e é confidencial; não faz parte do dataset de pesquisa.** Sanitização e pseudonimização não garantem anonimização de texto livre nem conformidade legal integral. Não há aprovação ética presumida.

## Cenário e restrições financeiras

O cenário simulado `cenario-escola-v1` fica habilitado por padrão na criação experimental. Seus itens financeiros **CAT_INV01–CAT_INV05 não são as categorias de objeção**:

| Item financeiro | Demanda máxima | V1 |
|---|---:|---:|
| CAT_INV01 — Melhoria das salas de aula | R$ 40.000 | R$ 25.000 |
| CAT_INV02 — Computadores/equipamentos de informática | R$ 35.000 | R$ 25.000 |
| CAT_INV03 — Biblioteca/material de estudo | R$ 20.000 | R$ 10.000 |
| CAT_INV04 — Climatização | R$ 30.000 | R$ 15.000 |
| CAT_INV05 — Acessibilidade | R$ 20.000 | R$ 5.000 |
| **Total** | **R$ 145.000** | **R$ 80.000** |

V2/V3 exigem cinco valores estruturados em reais inteiros, não negativos, dentro de cada teto e com total até R$ 80.000. Saldo não alocado é permitido e pertence ao mesmo orçamento. Itens desconhecidos ou recursos adicionais estruturados são rejeitados. A/B usam a mesma função de validação. O moderador confirma os valores e sua coerência com o texto; a IA não precisa gerar JSON financeiro.

A configuração do cenário e as alocações ficam nos eventos, associadas à proposta, e são exportadas no schema 2. A validação não interpreta números da prosa nem decide justiça, qualidade ou solução ótima. Sessões livres/antigas não são convertidas por inferência do texto. Para o exercício escolar, não desabilite o cenário na criação.

## Falhas e armazenamento

Em A, falha persistente de **classificação** preserva a manifestação e permite classificação humana de contingência com CAT01–CAT09, ação explícita e status `FALLBACK_HUMANO`. A falha original é rastreável; `category_ai` não recebe falsamente a categoria humana.

Para **mediação IA**, uma reserva é persistida antes da API. Há uma execução inicial e, somente após falha, uma última execução controlada por `proposal_id + revision`. Cada execução conserva até três tentativas internas para falhas transitórias, com backoff; não se troca de modelo. Terceira execução e concorrência indevida são bloqueadas. Entre tentativas, as manifestações não podem ser reabertas/editadas. Duas falhas impedem continuidade normal em A e oferecem cancelamento técnico `CANCELADA`, sem substituição por mediação humana. Execução sem resultado confirmado permanece bloqueada; não há repetição automática em estado incerto. B continua manual e não chama IA.

**A interface bloqueia criação experimental formal sem PostgreSQL.** SQLite continua válido no modo genérico e em testes de domínio. A disponibilidade/durabilidade do PostgreSQL externo precisa ser conferida; não é garantida apenas pela configuração. Falha de banco não provoca reconstrução manual de registros nem fallback silencioso para SQLite.

## Executar e configurar

Recomendado conforme o CI: Python 3.12. Para demonstração genérica com dados fictícios:

```bash
python -m pip install -r requirements.txt
# Configure EXPERIMENT_MODE=0 no ambiente, ou deixe ausente.
python -m streamlit run "Prototipo TCC.py"
```

Sem `DATABASE_URL`, o modo genérico usa `data/decisoes.sqlite3`. Fora do modo experimental há categorias livres, visibilidade compartilhada e fluxo humano genérico; isso não representa o controle B do protocolo.

As variáveis de ambiente têm prioridade sobre `.streamlit/secrets.toml`/Secrets do Streamlit. Nunca versione esse arquivo nem valores reais de credenciais. Os exemplos abaixo são placeholders, não uma configuração pronta ou já executada:

```toml
EXPERIMENT_MODE = "1"
DATABASE_URL = "postgresql://USUARIO:SENHA@HOST:5432/BANCO?sslmode=require"
GEMINI_API_KEY = "SUBSTITUIR_FORA_DO_REPOSITORIO"
GEMINI_MODEL = "gemini-3.5-flash-lite" # candidato técnico; validar na conta antes de usar
# APP_COMMIT deve ser o SHA da build efetivamente selecionada; não preencher com suposição.
# APP_COMMIT = "SHA_HEXADECIMAL_DA_BUILD"
```

| Variável | Uso real |
|---|---|
| `EXPERIMENT_MODE` | Ativa com `1`, `true`, `yes` ou `on`; distingue o protocolo das funções genéricas |
| `DATABASE_URL` | Conexão PostgreSQL; obrigatória no gate de criação experimental |
| `GEMINI_API_KEY` | Autenticação do SDK, necessária operacionalmente para A; não usada em B |
| `GEMINI_MODEL` | Modelo primário a verificar/congelar na conta; não presumir disponibilidade do default codificado |
| `GEMINI_FALLBACK_MODELS` | Alternativos separados por vírgula apenas no modo genérico; ignorados no experimental |
| `APP_COMMIT` | Build declarada, hexadecimal de 7–40 caracteres; ausente/inválida vira `null`, sem bloquear criação |
| `SQLITE_PATH` | Caminho de SQLite para demonstração/testes, não substitui PostgreSQL no experimento |

Em A são fixados por sessão modelo, versões de prompts, taxonomia e política `temperature_policy=provider_default`, com `temperature=null`. O campo de temperatura é omitido da requisição; não se presume um valor numérico ou determinismo do provedor. O default experimental candidato é `gemini-3.5-flash-lite`; `GEMINI_MODEL` explícito continua tendo prioridade. O modo genérico mantém seu default e as regras de fallback anteriores; B não chama IA. Configuração divergente bloqueia continuidade. Sessões antigas conservam a configuração original: não continuar uma sala com outra configuração nem reescrever seu histórico.

`APP_COMMIT` continua uma declaração, não prova de deploy. `checkout_commit` registra separadamente o HEAD lido do checkout Git sem alterações rastreadas, quando verificável; em ausência/erro retorna `null`, sem inferir a partir da declaração ou do HEAD remoto. A identidade da sessão não é retroatribuída pelo exportador. A modalidade/conta Gemini continua em **D16**. A conferência técnica não fecha G06/G10 nem libera experimento científico. Ver [recuperação técnica Gemini](docs/RECUPERACAO_GEMINI_v1.0.md).

## Arquitetura, exportação e testes

`Prototipo TCC.py` chama `app.main()`. `app.py` contém interface/gates; `decision.py`, regras/transações e export; `ai_service.py`, integração/sanitização/validação de saída; `experiment_config.py`, versões, taxonomia e cenário. Há sete entidades operacionais, incluindo `dc_category_contests`. O mapeamento formal de RF/RNF permanece no pacote documental externo do TCC; não foram inventados IDs neste repositório.

JSON schema 2 é o pacote de pesquisa/auditoria; CSV é uma visão simplificada. `experiment` descreve a identidade histórica registrada; `exporter`, o ambiente que gerou o arquivo. O JSON encadeia configuração, propostas, manifestações, classificações, contestações/fallbacks, mediações, revisões e encerramento. Classificações IA passam a registrar duração/SDK e diagnóstico seguro nos eventos/JSON; mediações preservam duração e SDK em seus detalhes. O CSV mantém o contrato anterior. Campos ausentes em sessões antigas não são inventados. Edições guardam metadados; textos substituídos em uma mesma manifestação não são reconstruídos integralmente.

```bash
# SQLite + IA simulada + Streamlit; em shells POSIX:
APP_TESTS_REQUIRED=1 GEMINI_API_KEY='' python -m unittest discover -s tests -v
# PostgreSQL de testes exclusivo, após configurar TEST_DATABASE_URL:
python -m unittest discover -s tests -p test_decision.py -v
```

Não aponte `TEST_DATABASE_URL` para dados de pesquisa: a suíte cria salas e não limpa todos os registros. O workflow [Regras e interface](.github/workflows/tests.yml) usa Python 3.12 e PostgreSQL temporário. Referência anterior à recuperação: **143 testes gerais e 84 de regras PostgreSQL**, no [CI d07d15d](https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/42733999999). A recuperação acrescenta testes de configuração, SDK, cobertura e identidade; as contagens/resultados do candidato devem ser conferidos no CI de seu SHA exato, sem tratar testes novos como execuções científicas. Consulte o [PR #4](https://github.com/MRmoratelli/tcc-decisao-coletiva/pull/4).

## Limites e próximos gates

Não houve experimento científico nesta entrega. Testes automatizados não comprovam utilidade, fidelidade, neutralidade, precisão em português, satisfação, SUS, melhora decisória ou causalidade. A amostra prevista é pequena e a análise deverá ser predominantemente descritiva, sem generalização automática. O padrão do provedor não garante determinismo; a IA pode omitir, distorcer ou direcionar, exigindo revisão e avaliação. O SDK google-genai está fixado em 2.34.0; as demais dependências usam faixas e o ambiente efetivo precisa ser registrado antes da coleta.

**D16:** modalidade/conta Gemini a definir. **D17:** confirmar com orientador origem dos participantes, consentimento e exigências institucionais de ética/CEP/TCLE, conforme aplicável. Não concluir esses itens automaticamente. Instrumentos, avaliação objetiva D20 e tratamento científico posterior não foram implementados por este commit.

Próxima etapa: **AUDITORIA FINAL DO PACOTE EXPERIMENTAL v1.1**, a solicitar separadamente. Não há Commit 10 previsto, e esta documentação não inicia a auditoria, o piloto ou o experimento.
