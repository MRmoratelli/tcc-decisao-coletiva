# Piloto técnico da implantação — 12/10/2026

Aplicação: https://tcc-decisao-coletiva-eoiv3pcb5csadiolmfiios.streamlit.app/

Este registro descreve testes automatizados com personagens fictícios. Não é avaliação com participantes reais do TCC e não constitui evidência de utilidade ou imparcialidade da IA.

## Observações no aplicativo publicado

- Chromium abriu a interface pública e recebeu HTTP 200, sem login do proprietário.
- Uma sala fictícia foi criada, e três contextos independentes entraram com credenciais diferentes.
- Com duas respostas e uma ausência, o sistema impediu encerrar por acordo.
- Com três respostas e uma recusa, o sistema continuou impedindo o acordo.
- As três classificações e a tentativa de mediação retornaram falha da IA na interface anterior. O registro apresentou `FALHA_IA` e modelo `gemini-3.8-flash`; não permite atribuir a causa à chave, ao modelo ou à rede.
- A edição da revisão foi interrompida por controles ocultos após redesenho da interface. A atualização de toda a sala a cada cinco segundos foi substituída por atualização de indicadores, mantendo os formulários fora do temporizador.

Execução que confirmou acesso, sessões, ausência, recusa e falha real da IA:
https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/38203909646

## Correções concluídas no repositório

O PR #2 foi integrado em `main`:
https://github.com/MRmoratelli/tcc-decisao-coletiva/pull/2

- Indicadores atualizados automaticamente sem redesenhar os formulários.
- Mudanças de etapa e proposta continuam sendo carregadas automaticamente.
- Botão **Atualizar painel** para obter os detalhes recentes.
- Diagnóstico da IA limitado à etapa, tipo de exceção, status HTTP, versão do SDK e motivos de acesso permitidos. Não registra mensagem bruta, corpo da resposta ou chave.
- Motivos conhecidos de chave inválida ou acesso bloqueado geram orientação de acesso.
- Fallback bem-sucedido remove diagnóstico antigo.
- Validação remota: 46 testes com SQLite e 31 regras também executadas com PostgreSQL, aprovados no commit `93a3a6525df0dcfe534edc32e82842d66287fa56`.

Validação:
https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/38205258827

A atualização do arquivo de entrada em `3d1e8a5756b8a19570e8d7caf82b650e344020ed` alterou somente a docstring; não mudou o comportamento testado. A branch inicial de demonstração também foi avançada para essa versão.

## Bloqueio confirmado na implantação

Na execução abaixo, o site continuou apresentando a legenda antiga e não exibiu **Atualizar painel**, mesmo após esperar dois minutos:
https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/38207156011

O histórico público do GitHub está atualizado, mas a versão nova não foi observada no aplicativo. O commit efetivamente executado no Streamlit não foi confirmado.

## Próxima ação do proprietário

1. No painel https://share.streamlit.io/, localizar a aplicação, abrir o menu de três pontos e selecionar **Reboot**, confirmando a operação.
2. Confirmar que a origem da aplicação é `MRmoratelli/tcc-decisao-coletiva`, branch `main`, arquivo `Prototipo TCC.py`.
3. Conferir a presença de **Atualizar painel** em uma sala e repetir o piloto completo.

Guia oficial:
https://docs.streamlit.io/deploy/streamlit-community-cloud/manage-your-app/reboot-your-app

## Estado da etapa

- Acesso público, criação da sala, três sessões, bloqueio por ausência e bloqueio por recusa: observados.
- Correções de código e testes automatizados: concluídos.
- Correções efetivamente carregadas no site: ainda não observadas.
- Revisão, nova votação, acordo e exports no piloto remoto completo: pendentes de reexecução.
- Integração real do Gemini: falhou na versão anterior; motivo específico ainda pendente.
- Persistência após reinício do servidor: não testada.
- Experimento com 3 a 5 pessoas reais: não realizado.
