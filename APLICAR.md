# Aplicar e fechar esta etapa

O código para demonstração está no repositório próprio [MRmoratelli/tcc-decisao-coletiva](https://github.com/MRmoratelli/tcc-decisao-coletiva), branch `main`. O [PR #1](https://github.com/MRmoratelli/tcc-decisao-coletiva/pull/1) foi integrado após os testes aprovados. A implantação web deve ser configurada no Streamlit para usar `main`.

## Arquivos

Os arquivos da aplicação ficam na raiz do repositório. O nome `Prototipo TCC.py` foi mantido, mas seu conteúdo agora chama `app.py`. `decision.py` contém as regras e o banco; `ai_service.py` integra a IA. `requirements.txt` instala as dependências. Todos esses arquivos são necessários para executar a aplicação.

O pacote não contém banco de dados, senhas, chaves de API nem credenciais reais. O workflow de testes usa um banco temporário e credenciais fictícias de teste.

## Implantação para mostrar ao grupo

1. Confira o `README.md`, as regras e os resultados em [GitHub Actions](https://github.com/MRmoratelli/tcc-decisao-coletiva/actions).
2. Entre em [share.streamlit.io](https://share.streamlit.io/) com sua conta e crie uma aplicação. Use Repository `MRmoratelli/tcc-decisao-coletiva`, Branch `main` e Main file path `Prototipo TCC.py`. Como alternativa, use **Paste GitHub URL** e cole `https://github.com/MRmoratelli/tcc-decisao-coletiva/blob/main/Prototipo%20TCC.py`.
3. Em Advanced settings, selecione Python `3.12` e configure Secrets conforme o exemplo do `README.md`. A IA precisa de `GEMINI_API_KEY`; o fluxo humano também pode ser demonstrado sem chave.
4. Clique em Deploy. Compartilhe com o grupo o endereço fornecido pelo Streamlit, crie uma sala e distribua credenciais individuais. Confira uma sala em pelo menos dois navegadores/perfis diferentes.
5. Antes do experimento com dados a preservar, configure PostgreSQL externo e faça o piloto abaixo.

Para executar localmente, instale `requirements.txt` e use `python -m streamlit run "Prototipo TCC.py"`.

## Suas decisões

| O que falta | Quem decide | Como fechar |
|---|---|---|
| Armazenamento do experimento | Responsável pela implantação | Escolher PostgreSQL externo e inserir DATABASE_URL em Secrets; a hospedagem web pode continuar igual |
| Pauta e proposta inicial | Grupo do experimento | Preencher na criação da sala; o software aceita temas variados |
| Protocolo e questionário | Grupo e orientador | Aprovar procedimento, métricas e instrumento antes da coleta; a comparação com/sem IA é opcional, ainda não confirmada |

Na implantação, configure `GEMINI_API_KEY` e `GEMINI_MODEL` em Secrets; não publique a chave no repositório. Configure `DATABASE_URL` para preservar os dados. Sem ela, SQLite serve à demonstração em uma instância, mas seus arquivos locais no Community Cloud não têm persistência garantida.

## Piloto antes do experimento

- Crie uma sala com os participantes do piloto e salve os acessos.
- Registre aceite, ressalva e não aceite; confirme que uma ausência impede acordo.
- Publique uma revisão e confirme que ninguém aparece aceitando a nova versão automaticamente.
- Confira o limite de três rodadas e os resultados de encerramento.
- Com API configurada, confira a sugestão real da IA e sua revisão humana. Simule indisponibilidade para confirmar que o histórico e o fluxo humano continuam disponíveis.
- Baixe JSON/CSV e confirme a preservação dos registros no PostgreSQL após reiniciar o app de teste.

Fechamento da etapa de desenvolvimento: código revisado, testes da interface e PostgreSQL aprovados, implantação configurada e piloto remoto concluído. A avaliação com 3 a 5 pessoas vem depois e deve ser descrita como exploratória.
