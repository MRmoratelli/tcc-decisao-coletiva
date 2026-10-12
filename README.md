# Sistema de decisão coletiva com IA

Aplicação web em Python/Streamlit para discutir e ajustar **uma proposta de tema livre**, em até três rodadas. A IA organiza objeções e sugere um texto de compromisso. A decisão pertence aos participantes; o moderador revisa sugestões, publica versões e confirma o encerramento.

Esta implementação parte de `diiegosl/chatbot-ia`, branch `matheus-dev`, commit `85aed29862b28b7324e67742d2e9364996d87abf`. O código para demonstração está em [MRmoratelli/tcc-decisao-coletiva](https://github.com/MRmoratelli/tcc-decisao-coletiva), branch `main`. A branch original já compartilhava votos em memória com `st.cache_resource` e mantinha histórico de pareceres. Aqui, esses dados passam a ser separados por sala e armazenados em banco, com participantes definidos, controle de versões e regras explícitas de aceitação.

## Regras da decisão

| Manifestação | Significado | Permite acordo? |
|---|---|---|
| Aceito | Aceita o texto atual | Sim |
| Aceito com ressalvas | Aceita o texto atual e registra preocupações, sem exigir uma alteração | Sim |
| Não aceito | Uma alteração ou condição ainda é necessária para aceitar | Não |
| Sem resposta | Participante ainda não se manifestou | Não |

A regra de acordo é **todos os participantes cadastrados aceitarem a mesma versão**, com ou sem ressalvas. Não é uma regra de maioria. Uma nova versão exige novas manifestações de todos. Ninguém é removido da lista para facilitar o acordo. Cada participante tem uma manifestação atual por versão; suas edições anteriores ficam na trilha de eventos.

Há no máximo três versões: proposta inicial e duas revisões. Pode haver acordo já na primeira. Na terceira rodada, o encerramento registra `ACORDO`, `SEM_ACORDO` (todos responderam e existe recusa) ou `INCONCLUSIVO` (existe ausência). Interrupções antecipadas são `CANCELADA`, com motivo obrigatório. Encerramento impede alterações posteriores.

## Fluxo de uso

1. O moderador cria uma sala com tema, contexto, proposta inicial e participantes. A lista aceita de 2 a 30 pessoas; o experimento planejado reúne **3 a 5 pessoas no total**.
2. Salva as credenciais de acesso. Cada pessoa recebe o mesmo endereço web e código da sala, mas uma credencial individual diferente. A credencial do moderador deve ser guardada separadamente. Ela não tem recuperação automática.
3. Os participantes entram remotamente e registram ou editam sua posição. Os indicadores leem o banco a cada cinco segundos. Os formulários permanecem estáveis durante a edição; **Atualizar painel** carrega os detalhes mais recentes. Mudanças de etapa ou de versão são carregadas automaticamente.
4. Durante a coleta, o moderador pode corrigir ou agrupar categorias. As categorias são livres e dependem do tema. Nenhuma preocupação é apagada ao aceitar a proposta.
5. O moderador pausa a coleta. As manifestações ficam congeladas para revisão. Pode reabrir a coleta para completar ou corrigir respostas, gerar sugestão de IA ou escrever uma revisão humana.
6. Revisa o texto e publica outra versão, ou encerra se a regra de acordo estiver satisfeita. Ao atingir a terceira rodada, pode encerrar com o resultado disponível.
7. Exporta JSON e CSV para análise. O JSON inclui versões, manifestações, histórico de edições, categorias, sugestões, origens, modelos, versões dos prompts, falhas e horários em UTC.

Se o moderador também participar da decisão, deve ser incluído na lista e usar sua credencial de participante em outro navegador/perfil. Acesso de moderador não vota. Convites perdidos podem ser redefinidos pelo moderador; isso invalida a credencial antiga e preserva a identidade e os votos.

Uma credencial identifica o acesso autorizado dentro da sala, não autentica uma identidade civil. Compartilhá-la permite a outra pessoa agir como seu titular. Os membros da sala veem posições e justificativas uns dos outros. Os exports usam P01, P02 etc., excluem nomes de cadastro e credenciais; o texto livre ainda pode conter dados pessoais.

## IA e Pareto

- A classificação sugere **uma categoria principal por manifestação**, reutilizando categorias da sala quando possível. O texto original é preservado; portanto, múltiplas objeções num único comentário não são contadas separadamente no gráfico.
- O Pareto conta categorias da versão atual em ordem decrescente e calcula o percentual acumulado. Não classificados e textos sem objeção explícita não entram nesse denominador. A interface informa os não classificados.
- O referencial de 80% descreve concentração de frequências. Não mede gravidade, não garante resolver 80% dos conflitos e não dispensa analisar objeções minoritárias.
- A mediação recebe contexto, proposta e todas as justificativas da versão, com pseudônimos e lista de ausentes. Produz síntese, sugestão e uma análise de cobertura por pessoa que respondeu. A validação confere formato e referências; não comprova a correção semântica dessa análise.
- O moderador decide quais mudanças apresentar ao grupo. Publicar uma sugestão revisada registra `IA_REVISADA_POR_HUMANO`; uma redação independente registra `HUMANA` e sua justificativa.
- Falhas da API são registradas como falhas. Não há proposta genérica fabricada para representar sucesso da IA. O voto é salvo **antes** da classificação. O fluxo humano continua disponível.
- `GEMINI_FALLBACK_MODELS` permite modelos alternativos explicitamente configurados, sem prometer que trocar de modelo evita uma cota compartilhada. O modelo que respondeu fica registrado.

## Executar localmente

Recomendado: Python 3.12.

```bash
python -m pip install -r requirements.txt
python -m streamlit run "Prototipo TCC.py"
```

O arquivo de entrada foi mantido para compatibilidade com a implantação existente. `app.py` contém a interface, `decision.py` contém as regras e o armazenamento, e `ai_service.py` contém a integração consultiva com Gemini.

Sem configuração, o sistema usa `data/decisoes.sqlite3`. SQLite compartilha os registros entre navegadores conectados à **mesma instância** e conserva dados enquanto o arquivo continuar disponível. Não usa `session_state` para armazenar votos; ele guarda apenas autenticação e estado temporário da interface.

## Publicar no Streamlit Community Cloud

Em [share.streamlit.io](https://share.streamlit.io/), crie uma aplicação usando estes campos:

| Campo | Valor |
|---|---|
| Repository | `MRmoratelli/tcc-decisao-coletiva` |
| Branch | `main` |
| Main file path | `Prototipo TCC.py` |
| Python version (Advanced settings) | `3.12` |

A revisão foi integrada a `main` pelo [PR #1](https://github.com/MRmoratelli/tcc-decisao-coletiva/pull/1). Publicar os arquivos no GitHub é uma etapa separada de criar a aplicação no Streamlit. Confira o guia [Deploy an app](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/deploy). A opção **Paste GitHub URL** aceita o [arquivo de entrada em main](https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/main/Prototipo%20TCC.py).

Configure em **Advanced settings → Secrets** antes da implantação, em **Settings → Secrets** de uma aplicação existente, ou localmente em `.streamlit/secrets.toml`, sem publicar o arquivo no GitHub:

```toml
GEMINI_API_KEY = "SUA_CHAVE"
GEMINI_MODEL = "gemini-3.8-flash"
# Opcional: modelos disponíveis para sua chave, separados por vírgula.
# GEMINI_FALLBACK_MODELS = "OUTRO_MODELO_DISPONIVEL"

# Necessário para armazenamento durável no Community Cloud:
DATABASE_URL = "postgresql://USUARIO:SENHA@HOST:5432/BANCO?sslmode=require"
```

As mesmas configurações podem ser fornecidas como variáveis de ambiente, que têm prioridade. `SQLITE_PATH` permite mudar o caminho local de demonstração. O app não aceita outros tipos de URL de banco e não faz fallback silencioso para SQLite se o PostgreSQL configurado falhar.

**Para o experimento formal, configure PostgreSQL externo antes da coleta.** A própria documentação do Streamlit informa que o Community Cloud não garante persistência dos arquivos locais: [armazenamento local](https://docs.streamlit.io/develop/concepts/connections/connecting-to-data). Nenhum banco externo foi criado ou configurado nesta entrega. Use uma conexão PostgreSQL fornecida pelo serviço escolhido, com TLS, e um usuário limitado ao banco do projeto. O app cria apenas tabelas com prefixo `dc_`. Baixe também os históricos de cada sessão.

As escritas no SQLite usam `BEGIN IMMEDIATE`. No PostgreSQL, alterações bloqueiam a linha da sala com `SELECT FOR UPDATE`. Cada operação verifica credencial, função, etapa e versão dentro da transação; chamadas da IA ficam fora dos bloqueios. Resultados atrasados da IA não substituem edições ou revisões humanas. O app não usa conexões SQLite globais entre threads.

Modelo e disponibilidade de API dependem da conta. Confira o modelo habilitado antes do piloto e fixe seu identificador durante a coleta. Documentação utilizada: [SDK Google Gen AI](https://googleapis.github.io/python-genai/), [fragmentos Streamlit](https://docs.streamlit.io/develop/api-reference/execution-flow/st.fragment).

Os votos antigos em memória não possuem participantes e versões compatíveis com estas regras e não são migrados automaticamente. Se precisarem ser preservados, exporte ou registre o histórico do app anterior antes de aplicar a mudança. Use uma sala nova para o piloto.

## Validação

```bash
python -m unittest discover -s tests -v
```

Os testes de regras cobrem aceitação unânime com ressalvas, ausências, recusas, versões antigas, limite de rodadas, autenticação por sala, edições concorrentes, publicação simultânea, persistência, origem das revisões e exports sem credenciais. Os testes de IA usam respostas simuladas para verificar falhas e validação; não medem qualidade real de mediação.

Os testes da interface usam `streamlit.testing.v1.AppTest` para criar sala, usar sessões independentes, manifestar posições, publicar revisão e encerrar. Se Streamlit não estiver instalado, são marcados como não executados. `APP_TESTS_REQUIRED=1` faz a execução falhar nesse caso. O workflow de CI instala as dependências, exige esses testes e repete as regras com PostgreSQL em um serviço temporário.

**Validação remota aprovada (11/10/2026):** o commit `11f220bc8c57f39a0c0a73c972e0f48d9f78a70e` passou nos 44 testes com SQLite, incluindo três testes da interface com Streamlit/AppTest, e nos 31 testes de regras também executados com PostgreSQL 16. Consulte a [execução aprovada no GitHub Actions](https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/38179742597). Os arquivos foram integrados a `main`. Testes automatizados não validam a qualidade real do Gemini nem substituem o piloto com navegadores e a avaliação do grupo.

Para repetir as regras com um PostgreSQL de teste, configure `TEST_DATABASE_URL` e execute:

```bash
python -m unittest discover -s tests -p test_decision.py -v
```

Use um banco exclusivo para testes: eles criam salas próprias e não apagam registros. Para a confirmação final no ambiente implantado, faça um piloto com navegadores reais e verifique acesso remoto, atualização do painel, API Gemini e persistência após reiniciar o app.

## Decisões pendentes para o TCC

| Decisão | Momento | Impacto no código |
|---|---|---|
| Serviço/banco PostgreSQL e credenciais da implantação | Antes do piloto remoto com dados a preservar | Só configuração em Secrets; suporte já implementado |
| Tema, contexto, proposta e participantes do experimento | Com o grupo, antes da coleta | Preenchimento da sala; não exige alterar código |
| Protocolo final de avaliação e instrumento de questionário | Com o orientador/grupo, antes da coleta | Exports e modo sem IA já disponíveis; questionário ainda externo |

O modo sem IA existe para permitir uma eventual comparação, mas o desenho de duas sessões com o mesmo grupo ainda precisa ser aprovado. Um grupo de 3 a 5 pessoas permite uma avaliação exploratória, sem afirmar causalmente eficácia ou generalizar para outras populações. Registre tema, condição, ordem das sessões, tempo, número de rodadas, resultado e percepções dos participantes conforme o protocolo aprovado.

No TCC, descreva o artefato como **sistema de apoio à decisão coletiva**, com IA consultiva, análise descritiva de objeções e validação humana. Testes de software demonstram o cumprimento das regras; o experimento é a etapa que deve avaliar utilidade, clareza e percepção de imparcialidade.
